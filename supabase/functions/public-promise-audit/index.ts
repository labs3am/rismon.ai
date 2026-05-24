// Anonymous "Promise Audit" — extracts marketing claims from a public URL
// using Lovable AI. No login. Rate-limited per IP per day.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rismon-debug",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAILY_LIMIT = 3;
const FETCH_TIMEOUT_MS = 8000;
const JINA_TIMEOUT_MS = 15000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeUrl(raw: string): URL | null {
  try {
    const trimmed = raw.trim();
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!/\./.test(u.hostname)) return null;
    // Block local/private hosts.
    const h = u.hostname.toLowerCase();
    if (
      h === "localhost" ||
      h.endsWith(".local") ||
      h.startsWith("127.") ||
      h.startsWith("10.") ||
      h.startsWith("192.168.") ||
      /^169\.254\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)
    ) return null;
    return u;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function extractMeta(html: string, name: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  return html.match(re)?.[1] || "";
}

function extractTitle(html: string): string {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageText(url: string): Promise<{ text: string; title: string; description: string; html: string }> {
  let html = "";
  let title = "";
  let description = "";
  try {
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, {
      headers: { "User-Agent": "RismonBot/1.0 (+https://rismon.ai)" },
      redirect: "follow",
    });
    if (res.ok) {
      html = await res.text();
      title = extractTitle(html);
      description = extractMeta(html, "description") || extractMeta(html, "og:description");
    }
  } catch {/* fall through to jina */}

  let text = stripHtml(html);
  // SPA fallback: short text or no headings -> rendered fetch via r.jina.ai.
  // Jina can be flaky/slow on cold calls, so retry once before giving up.
  const headings = (html.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi) || []).length;
  if (text.length < 2000 || headings < 2) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const jinaRes = await fetchWithTimeout(`https://r.jina.ai/${url}`, JINA_TIMEOUT_MS, {
          headers: { "User-Agent": "RismonBot/1.0" },
        });
        if (jinaRes.ok) {
          const md = await jinaRes.text();
          const stripped = md.replace(/^Title:.*$/m, "").replace(/^URL Source:.*$/m, "").replace(/^Markdown Content:/m, "").trim();
          if (stripped.length > text.length) text = stripped;
          if (!title) title = md.match(/^Title:\s*(.+)$/m)?.[1] || "";
          if (text.length >= 200) break;
        }
      } catch {/* retry */}
      if (attempt === 0) await new Promise(r => setTimeout(r, 600));
    }
  }

  // Always fold title + meta description into the text corpus so minimal
  // SPA pages with good metadata still pass the 80-char floor.
  const metaBlob = [title, description].filter(Boolean).join(" — ");
  if (metaBlob && !text.includes(metaBlob)) {
    text = `${metaBlob}\n\n${text}`.trim();
  }

  return {
    text: text.slice(0, 8000),
    title,
    description,
    html,
  };
}

type Promise_ = {
  claim: string;
  category: string;
  clarity: "clear" | "vague";
  why: string;
};

type RealityStatus = "backed" | "unverified" | "missing";
type RealityCheck = {
  index: number;
  status: RealityStatus;
  evidence: string;
};

type SiteSignals = {
  https: boolean;
  has_privacy: boolean;
  has_terms: boolean;
  has_pricing: boolean;
  has_signup: boolean;
  has_login: boolean;
  has_contact_email: boolean;
  has_social_proof: boolean;
  brands_mentioned: string[];
  trust_badges: string[];
  word_count: number;
};

const KNOWN_BRANDS = [
  "stripe","paypal","google","github","slack","notion","figma","openai","anthropic",
  "aws","azure","gcp","supabase","firebase","vercel","cloudflare","auth0","clerk",
  "twilio","sendgrid","mailgun","resend","intercom","hubspot","salesforce","shopify",
  "linkedin","facebook","meta","apple","microsoft","linear","jira","zapier","webhook",
];

const TRUST_KEYWORDS = [
  "soc 2","soc2","iso 27001","iso27001","gdpr","hipaa","pci dss","pci-dss","ccpa",
  "ssl","tls","encrypted","end-to-end","2fa","sso","oauth","verified","badge",
];

async function collectSignals(homepageHtml: string, origin: string): Promise<SiteSignals> {
  const lower = homepageHtml.toLowerCase();
  const text = stripHtml(homepageHtml);
  const lowerText = text.toLowerCase();

  const hasPath = async (path: string): Promise<boolean> => {
    if (lower.includes(`href="${path}`) || lower.includes(`href='${path}`)) return true;
    try {
      const r = await fetchWithTimeout(`${origin}${path}`, 4000, {
        method: "GET",
        headers: { "User-Agent": "RismonBot/1.0" },
        redirect: "follow",
      });
      return r.ok;
    } catch { return false; }
  };

  const [hasPrivacy, hasTerms, hasPricing] = await Promise.all([
    hasPath("/privacy"),
    hasPath("/terms"),
    hasPath("/pricing"),
  ]);

  const signupRe = /(sign\s*up|get\s*started|start\s*free|create\s*account|try\s*free|join\s*now)/i;
  const loginRe = /(sign\s*in|log\s*in|login)/i;
  const emailRe = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

  const brands_mentioned: string[] = [];
  for (const b of KNOWN_BRANDS) {
    const re = new RegExp(`\\b${b}\\b`, "i");
    if (re.test(lowerText)) brands_mentioned.push(b);
  }

  const trust_badges: string[] = [];
  for (const k of TRUST_KEYWORDS) {
    if (lowerText.includes(k)) trust_badges.push(k);
  }

  return {
    https: origin.startsWith("https://"),
    has_privacy: hasPrivacy,
    has_terms: hasTerms,
    has_pricing: hasPricing,
    has_signup: signupRe.test(text),
    has_login: loginRe.test(text),
    has_contact_email: emailRe.test(text),
    has_social_proof: /(customers|trusted by|loved by|users|testimonial|review|rating|stars)/i.test(text),
    brands_mentioned: Array.from(new Set(brands_mentioned)).slice(0, 12),
    trust_badges: Array.from(new Set(trust_badges)).slice(0, 8),
    word_count: text.split(/\s+/).length,
  };
}

async function verifyPromises(opts: {
  url: string;
  promises: Promise_[];
  signals: SiteSignals;
}): Promise<RealityCheck[]> {
  if (opts.promises.length === 0) return [];
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) return [];

  const system = `You verify whether a website's marketing promises are actually backed up by what's observable on the site itself.

You receive a list of promises and a set of deterministic SITE SIGNALS pulled from the live homepage and adjacent pages. For each promise, return a verdict:

- "backed"     — Clear on-site evidence supports the promise (matching signal present, brand mentioned, or page exists).
- "unverified" — The promise is plausible but the homepage shows no direct evidence either way. Common for backend features.
- "missing"    — The promise is contradicted by, or noticeably absent from, the site signals (e.g. "free trial" with no signup, "Stripe payments" with no Stripe mention).

Rules:
- One verdict per promise, in the SAME ORDER as input.
- "evidence" = ONE short sentence (max 110 chars) quoting the signal you used, or saying what's missing.
- Be strict. If signals don't support it, prefer "unverified" over "backed".
- Return ONLY valid JSON: { "checks": [{ "index": 0, "status": "backed", "evidence": "..." }, ...] }`;

  const user = `URL: ${opts.url}

SITE SIGNALS (deterministic, scraped from the live site):
${JSON.stringify(opts.signals, null, 2)}

PROMISES TO VERIFY (in order):
${opts.promises.map((p, i) => `${i}. [${p.category}] "${p.claim}"`).join("\n")}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { return []; }
    const raw = Array.isArray(parsed.checks) ? parsed.checks : [];
    const out: RealityCheck[] = [];
    for (const c of raw) {
      const index = Number(c?.index);
      if (!Number.isInteger(index) || index < 0 || index >= opts.promises.length) continue;
      const status: RealityStatus = c.status === "backed" || c.status === "missing" ? c.status : "unverified";
      const evidence = String(c.evidence || "").trim().slice(0, 140);
      out.push({ index, status, evidence });
    }
    const seen = new Set(out.map((c) => c.index));
    for (let i = 0; i < opts.promises.length; i++) {
      if (!seen.has(i)) out.push({ index: i, status: "unverified", evidence: "No signal found on the homepage." });
    }
    return out.sort((a, b) => a.index - b.index);
  } catch {
    return opts.promises.map((_, i) => ({ index: i, status: "unverified" as const, evidence: "Verification skipped." }));
  }
}

async function extractPromises(opts: {
  url: string;
  title: string;
  description: string;
  text: string;
}): Promise<Promise_[]> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

  const system = `You audit marketing copy on landing pages. From the input, extract distinct product claims a buyer would expect to be backed by working code or a real feature.

Rules:
- Maximum 15 claims, minimum 3 if any meaningful text exists.
- Each claim = ONE concrete thing the site promises. No duplicates, no nav labels, no footer links, no cookie banners.
- "category" must be one of: ai, auth, payments, integration, data, security, performance, support, feature, other.
- "clarity" = "clear" if the claim is specific and testable (e.g. "Sign in with Google", "Stripe checkout", "Export to PDF"). "clarity" = "vague" if it's marketing fluff (e.g. "next-generation platform", "world-class", "powerful").
- "why" = ONE short sentence (max 100 chars) explaining the verdict.
- Return ONLY valid JSON matching the schema. No prose, no markdown.`;

  const user = `URL: ${opts.url}
TITLE: ${opts.title}
META DESCRIPTION: ${opts.description}

PAGE TEXT:
${opts.text}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": lovableKey,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (res.status === 429) throw new Error("rate_limited");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) throw new Error(`AI gateway error: ${res.status}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  let parsed: any = {};
  try { parsed = JSON.parse(content); } catch { parsed = {}; }
  const rawList = Array.isArray(parsed.promises) ? parsed.promises
    : Array.isArray(parsed.claims) ? parsed.claims
    : Array.isArray(parsed) ? parsed : [];

  const cleaned: Promise_[] = [];
  for (const p of rawList.slice(0, 15)) {
    if (!p || typeof p !== "object") continue;
    const claim = String(p.claim || p.text || "").trim().slice(0, 280);
    if (!claim) continue;
    const category = ["ai","auth","payments","integration","data","security","performance","support","feature","other"]
      .includes(p.category) ? p.category : "other";
    const clarity = p.clarity === "clear" ? "clear" : "vague";
    const why = String(p.why || "").trim().slice(0, 160);
    cleaned.push({ claim, category, clarity, why });
  }
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const rawUrl = typeof body?.url === "string" ? body.url : "";
  if (!rawUrl || rawUrl.length > 500) return json({ error: "Please provide a valid URL." }, 400);

  const u = normalizeUrl(rawUrl);
  if (!u) return json({ error: "That doesn't look like a public website URL." }, 400);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || "anon";
  const ipHash = await sha256(`audit:${ip}`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Debug bypass — internal testing only. Caller must send the matching
  // x-rismon-debug header. Skips the per-IP daily limit.
  const debugToken = Deno.env.get("RISMON_AUDIT_DEBUG_TOKEN");
  const debugHeader = req.headers.get("x-rismon-debug") || "";
  const isDebug = !!debugToken && debugHeader === debugToken;

  // Rate limit: 3 per IP per 24 hours (skipped for debug callers).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recent } = await supabase
    .from("public_audits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if (!isDebug && (recent ?? 0) >= DAILY_LIMIT) {
    return json({
      error: `Daily limit reached (${DAILY_LIMIT} audits per day). Sign up for unlimited code-verified scans.`,
      rate_limited: true,
    }, 429);
  }

  // Fetch page.
  let page;
  try {
    page = await fetchPageText(u.toString());
  } catch (e) {
    return json({ error: "Couldn't reach that URL. Is it public?" }, 502);
  }

  if (!page.text || page.text.length < 80) {
    return json({
      error: "We couldn't read any meaningful text from that homepage. This usually means the site is JavaScript-only (a blank SPA shell), blocks bots (Cloudflare/anti-scrape), or returned an empty response. Try a different URL — like a marketing page that renders content server-side.",
    }, 422);
  }

  // Extract promises via Lovable AI.
  let promises: Promise_[] = [];
  try {
    promises = await extractPromises({
      url: u.toString(),
      title: page.title,
      description: page.description,
      text: page.text,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "rate_limited") return json({ error: "Our AI is busy right now. Try again in a minute." }, 429);
    if (msg === "credits_exhausted") return json({ error: "AI quota exhausted. Please try again later." }, 402);
    return json({ error: "Couldn't analyze the page right now. Try again." }, 500);
  }

  const clearCount = promises.filter((p) => p.clarity === "clear").length;
  const vagueCount = promises.length - clearCount;
  const clarityScore = promises.length === 0
    ? null
    : Math.round((clearCount / promises.length) * 100);

  // Reality checks — cross-reference promises against live-site signals.
  let signals: SiteSignals | null = null;
  let realityChecks: RealityCheck[] = [];
  try {
    signals = await collectSignals(page.html || "", u.origin);
    realityChecks = await verifyPromises({ url: u.toString(), promises, signals });
  } catch {
    realityChecks = promises.map((_, i) => ({ index: i, status: "unverified" as const, evidence: "Verification skipped." }));
  }
  const backedCount = realityChecks.filter((c) => c.status === "backed").length;
  const realityScore = promises.length === 0
    ? null
    : Math.round((backedCount / promises.length) * 100);

  const { data: inserted } = await supabase
    .from("public_audits")
    .insert({
      url: u.toString(),
      url_host: u.hostname,
      ip_hash: ipHash,
      title: page.title || null,
      promises: promises as any,
      reality_checks: realityChecks as any,
      clarity_score: clarityScore,
      reality_score: realityScore,
      promise_count: promises.length,
      clear_count: clearCount,
      vague_count: vagueCount,
      backed_count: backedCount,
    })
    .select("id")
    .single();

  return json({
    id: inserted?.id || null,
    url: u.toString(),
    host: u.hostname,
    title: page.title,
    description: page.description,
    promises,
    reality_checks: realityChecks,
    signals,
    clarity_score: clarityScore,
    reality_score: realityScore,
    promise_count: promises.length,
    clear_count: clearCount,
    vague_count: vagueCount,
    backed_count: backedCount,
    remaining_today: isDebug ? 999 : Math.max(0, DAILY_LIMIT - ((recent ?? 0) + 1)),
    debug: isDebug || undefined,
  });
});