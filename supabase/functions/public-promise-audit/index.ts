// Anonymous "Promise Audit" — extracts marketing claims from a public URL
// using deterministic heuristics (no AI). No login. Rate-limited per IP per day.

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

function verifyPromises(opts: {
  url: string;
  promises: Promise_[];
  signals: SiteSignals;
}): RealityCheck[] {
  return opts.promises.map((p, index) => {
    const s = opts.signals;
    const lower = p.claim.toLowerCase();
    let status: RealityStatus = "unverified";
    let evidence = "No signal found on the homepage.";

    // "No login / no account needed" — directly observable on the homepage.
    if (/\bno (login|signup|account)\b/.test(lower)) {
      const hasAccountFlow = s.has_signup || s.has_login;
      status = hasAccountFlow ? "missing" : "backed";
      evidence = hasAccountFlow
        ? "Promises no login/account, but a sign-up or login CTA is visible."
        : "No sign-up or login CTA is visible — consistent with the promise.";
      return { index, status, evidence };
    }

    // Free / trial offers are checkable via the sign-up flow.
    if (/\b(free|trial)\b|no credit card/.test(lower)) {
      status = s.has_signup ? "backed" : "missing";
      evidence = s.has_signup
        ? "A sign-up CTA is visible, backing the free/trial promise."
        : "No sign-up CTA is visible, so the free/trial promise has no on-site support.";
      return { index, status, evidence };
    }

    // Social proof ("trusted by", "customers", "teams", ...).
    if (/\b(customers|trusted by|loved by|teams|users|testimonials?)\b/.test(lower)) {
      status = s.has_social_proof ? "backed" : "missing";
      evidence = s.has_social_proof
        ? "Customer or testimonial mentions found on the homepage."
        : "The homepage shows no customer or testimonial evidence.";
      return { index, status, evidence };
    }

    switch (p.category) {
      case "auth": {
        if (s.has_signup || s.has_login) {
          status = "backed";
          evidence = "A sign-up or login flow is visible on the homepage.";
        } else {
          status = "missing";
          evidence = "No sign-up or login flow is visible on the homepage.";
        }
        break;
      }

      case "payments": {
        const payBrand = ["stripe", "paypal", "shopify"].find((b) =>
          s.brands_mentioned.includes(b),
        );
        if (payBrand) {
          status = "backed";
          evidence = payBrand[0].toUpperCase() + payBrand.slice(1) + " is mentioned on the homepage.";
        } else if (s.has_pricing) {
          status = "unverified";
          evidence = "A pricing page exists, but no payment provider is named.";
        } else {
          status = "missing";
          evidence = "No payment provider or pricing evidence is visible on the homepage.";
        }
        break;
      }

      case "security": {
        if (s.trust_badges.length > 0) {
          status = "backed";
          evidence = "Security signals on the homepage: " + s.trust_badges.slice(0, 3).join(", ") + ".";
        } else if (s.https) {
          status = "backed";
          evidence = "The site is served over HTTPS.";
        } else if (/(encrypt|end-to-end|secure|soc|gdpr|complian|safety)/.test(lower)) {
          status = "missing";
          evidence = "No security badges or certifications are visible on the homepage.";
        } else {
          status = "unverified";
          evidence = "No security certifications are visible on the homepage.";
        }
        break;
      }

      case "integration": {
        const brand = KNOWN_BRANDS.find((b) => new RegExp("\\b" + b + "\\b", "i").test(p.claim));
        if (brand) {
          if (s.brands_mentioned.includes(brand)) {
            status = "backed";
            evidence = brand[0].toUpperCase() + brand.slice(1) + " is mentioned on the homepage.";
          } else {
            status = "missing";
            evidence = "The claim names " + brand + ", but it doesn't appear on the homepage.";
          }
        } else if (s.brands_mentioned.length > 0) {
          status = "backed";
          evidence = "Integrations named on the homepage: " + s.brands_mentioned.slice(0, 4).join(", ") + ".";
        } else {
          status = "unverified";
          evidence = "No integration partners are named on the homepage.";
        }
        break;
      }

      case "support": {
        status = s.has_contact_email ? "backed" : "unverified";
        evidence = s.has_contact_email
          ? "A contact email is listed on the homepage."
          : "No contact email is visible on the homepage.";
        break;
      }

      case "performance": {
        status = "unverified";
        evidence = /\d+\s*(ms|sec|seconds|fps|%)/.test(lower)
          ? "A performance number is claimed, but it isn't measurable from the homepage."
          : "No performance benchmark is measurable from the homepage.";
        break;
      }

      case "ai": {
        status = "unverified";
        evidence = "No AI capability test is possible from the homepage alone.";
        break;
      }

      case "data": {
        status = "unverified";
        evidence = "No product data sample is visible on the homepage.";
        break;
      }

      case "feature":
      default: {
        if (s.has_signup || s.has_pricing) {
          status = "backed";
          evidence = "The product is offered via a sign-up or pricing page.";
        } else if (s.has_social_proof) {
          status = "backed";
          evidence = "Adoption is implied by customer mentions on the homepage.";
        } else {
          status = "unverified";
          evidence = "No product availability evidence is visible on the homepage.";
        }
        break;
      }
    }

    return { index, status, evidence };
  });
}

const CLAIM_CATEGORY_KEYWORDS: [string, string[]][] = [
  ["ai", ["artificial intelligence", "machine learning", "/\\bai\\b/", "gpt", "llm", "copilot", "chatbot", "automat", "generative", "predictive", "recommend"]],
  ["auth", ["sign in", "sign-in", "log in", "log-in", "login", "signup", "sign up", "sso", "oauth", "password", "two-factor", "2fa", "single sign-on"]],
  ["integration", ["integration", "integrat", "connect", "sync", "import", "export", "api", "apis", "webhook", "sdks", "plugin", "extension", "works with", "native"]],
  ["payments", ["payment", "checkout", "billing", "invoice", "subscription", "refund", "stripe", "paypal", "pricing", "per month", "/mo", "pay-as-you-go"]],
  ["data", ["analytics", "dashboard", "reports", "insights", "metrics", "tracking", "monitor", "measur", "kpi"]],
  ["security", ["secure", "security", "encrypted", "encryption", "end-to-end", "privacy", "gdpr", "soc 2", "soc2", "complian", "certified", "ssl"]],
  ["performance", ["fast", "faster", "speed", "performance", "seconds", "millisecond", "instant", "real-time", "realtime", "scale", "lightning"]],
  ["support", ["support", "help center", "customer service", "24/7", "onboarding", "documentation", "docs", "tutorial", "community"]],
  ["feature", ["feature", "features", "editor", "workspace", "collaborat", "template", "templates", "build", "create", "customize", "all-in-one", "suite", "everything you need"]],
];

const PROMISE_MARKERS = /(free|trial|guarantee|unlimited|no credit card|no login|no signup|money-back|real-?time|in seconds|just seconds|under \d+|within \d+|in \d+|100%|24\/7)/i;
const CONCRETE_TERMS = /(api|sdk|webhook|oauth|sso|export|import|template|dashboard|ios|android|plugin|extension|pdf|csv|json|free|trial|unlimited|24\/7|every|end-to-end|encryption|soc 2|gdpr|\d)/i;
const VAGUE_TERMS = ["powerful", "seamless", "easy", "easily", "best", "great", "amazing", "beautiful", "modern", "effortless", "ultimate", "perfect", "revolutionary", "world-class", "cutting-edge", "game-changing", "simple", "fastest", "unique", "magic"];
const LEGAL_FOOTER = /(cookie|copyright|all rights reserved|©|privacy policy|terms of service|unsubscribe|newsletter)/i;
const NAV_CTA = ["home", "sign up", "sign in", "log in", "login", "signup", "get started", "start free", "try free", "join now", "pricing", "features", "blog", "docs", "documentation", "about", "about us", "contact", "contact us", "help", "faq", "search", "menu", "back to top", "read more", "learn more", "book a demo", "request access", "open source", "security", "status", "changelog", "careers", "get the app", "download", "subscribe", "terms", "privacy", "email", "email address", "password", "remember me", "forgot password", "full name", "submit"];

function kwMatch(lower: string, term: string): boolean {
  if (term.startsWith("/") && term.endsWith("/")) {
    return new RegExp(term.slice(1, -1), "i").test(lower);
  }
  return lower.includes(term);
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 5);
}

function dedupeKey(lower: string): string {
  return lower.replace(/[^a-z0-9]+/g, " ").trim();
}

function extractPromises(opts: {
  url: string;
  title: string;
  description: string;
  text: string;
}): Promise_[] {
  const raw: { text: string; meta: boolean }[] = [];
  const addUnique = (sentence: string, meta: boolean) => {
    const t = sentence.trim();
    if (!t) return;
    const lower = t.toLowerCase();
    if (LEGAL_FOOTER.test(lower)) return;
    const key = dedupeKey(lower);
    if (key.length < 4) return;
    if (raw.some((r) => dedupeKey(r.text.toLowerCase()) === key)) return;
    raw.push({ text: t, meta });
  };

  // 1) Title — the single strongest claim candidate on any landing page.
  if (opts.title) addUnique(opts.title, true);
  // 2) Meta description sentences.
  for (const s of splitSentences(opts.description)) addUnique(s, true);
  // 3) Body text sentences.
  for (const s of splitSentences(opts.text)) addUnique(s, false);

  const score = (c: { text: string; meta: boolean }): number => {
    const lower = c.text.toLowerCase();
    const words = lower.split(/\s+/).length;
    let points = 0;
    let catHits = 0;
    for (const [, kws] of CLAIM_CATEGORY_KEYWORDS) {
      for (const k of kws) if (kwMatch(lower, k)) catHits++;
    }
    points += catHits;
    if (c.meta) points += 3;
    if (PROMISE_MARKERS.test(lower)) points += 2;
    if (/\d/.test(lower)) points += 1;
    if (/[$€£%]/.test(lower)) points += 1;
    if (CONCRETE_TERMS.test(lower)) points += 1;
    for (const v of VAGUE_TERMS) if (lower.includes(v)) points--;
    if (words < 5) points--;
    if (words > 24) points -= 2;
    return points;
  };

  const sorted = raw.slice().sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    if (a.meta !== b.meta) return a.meta ? -1 : 1;
    return b.text.length - a.text.length;
  });

  const pick: typeof sorted = [];
  for (const c of sorted) {
    if (pick.length >= 15) break;
    const lower = c.text.toLowerCase();
    const words = lower.split(/\s+/).length;
    if (words <= 3 && NAV_CTA.some((n) => lower === n || lower.startsWith(n + " "))) continue;
    pick.push(c);
  }

  // Guarantee a minimum of 3 claims when at least 3 meaningful sentences exist.
  if (pick.length < 3) {
    for (const c of sorted) {
      if (pick.length >= 3) break;
      if (!pick.includes(c)) pick.push(c);
    }
  }

  const claims: Promise_[] = [];
  for (const c of pick) {
    const lower = c.text.toLowerCase();
    const claim = c.text.slice(0, 280);

    // Category = keyword family with the most hits (ties go to the earlier family).
    let category = "other";
    let best = 0;
    for (const [cat, kws] of CLAIM_CATEGORY_KEYWORDS) {
      let hits = 0;
      for (const k of kws) if (kwMatch(lower, k)) hits++;
      if (hits > best) {
        best = hits;
        category = cat;
      }
    }

    // Clarity: a concrete detail (number, currency, named brand/feature) → "clear".
    const concrete =
      /\d/.test(lower) ||
      /[$€£%]/.test(lower) ||
      CONCRETE_TERMS.test(lower) ||
      KNOWN_BRANDS.some((b) => new RegExp("\\b" + b + "\\b", "i").test(lower));
    const vagueHits = VAGUE_TERMS.filter((t) => lower.includes(t)).length;
    const clarity: "clear" | "vague" = concrete && vagueHits < 2 ? "clear" : "vague";

    const why =
      clarity === "clear"
        ? "Specific claim — cites a concrete detail (a number, product name, or named feature) a buyer can verify."
        : "Vague claim — marketing language without a concrete detail a buyer can verify.";

    claims.push({ claim, category, clarity, why });
  }

  return claims.slice(0, 15);
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

  // Extract promises via deterministic heuristics (no AI dependency).
  let promises: Promise_[] = [];
  try {
    promises = extractPromises({
      url: u.toString(),
      title: page.title,
      description: page.description,
      text: page.text,
    });
  } catch {
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
    realityChecks = verifyPromises({ url: u.toString(), promises, signals });
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