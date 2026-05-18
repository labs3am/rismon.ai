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
const JINA_TIMEOUT_MS = 10000;

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

async function fetchPageText(url: string): Promise<{ text: string; title: string; description: string }> {
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
  // SPA fallback: short text or no headings -> rendered fetch via r.jina.ai
  const headings = (html.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi) || []).length;
  if (text.length < 2000 || headings < 2) {
    try {
      const jinaRes = await fetchWithTimeout(`https://r.jina.ai/${url}`, JINA_TIMEOUT_MS, {
        headers: { "User-Agent": "RismonBot/1.0" },
      });
      if (jinaRes.ok) {
        const md = await jinaRes.text();
        // r.jina.ai returns markdown with a header block; strip it.
        const stripped = md.replace(/^Title:.*$/m, "").replace(/^URL Source:.*$/m, "").replace(/^Markdown Content:/m, "").trim();
        if (stripped.length > text.length) text = stripped;
        if (!title) title = md.match(/^Title:\s*(.+)$/m)?.[1] || "";
      }
    } catch {/* keep raw text */}
  }

  return {
    text: text.slice(0, 8000),
    title,
    description,
  };
}

type Promise_ = {
  claim: string;
  category: string;
  clarity: "clear" | "vague";
  why: string;
};

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
      error: "We couldn't read any text from that page. If it's a single-page app, make sure it renders content without JavaScript or try again.",
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

  const { data: inserted } = await supabase
    .from("public_audits")
    .insert({
      url: u.toString(),
      url_host: u.hostname,
      ip_hash: ipHash,
      title: page.title || null,
      promises: promises as any,
      clarity_score: clarityScore,
      promise_count: promises.length,
      clear_count: clearCount,
      vague_count: vagueCount,
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
    clarity_score: clarityScore,
    promise_count: promises.length,
    clear_count: clearCount,
    vague_count: vagueCount,
    remaining_today: isDebug ? 999 : Math.max(0, DAILY_LIMIT - ((recent ?? 0) + 1)),
    debug: isDebug || undefined,
  });
});