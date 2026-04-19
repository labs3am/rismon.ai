import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// SECTION 1: Pre-scan deterministic security checks (regex)
// ============================================================
function runSecurityPreChecks(codeBundle: string) {
  const findings: any[] = [];
  const secretPatterns = [
    { pattern: /sk-[a-zA-Z0-9]{20,}/g, type: "OpenAI API key" },
    { pattern: /AIza[a-zA-Z0-9]{35}/g, type: "Google API key" },
    { pattern: /ghp_[a-zA-Z0-9]{30,}/g, type: "GitHub token" },
    { pattern: /rk_live[a-zA-Z0-9_]*/g, type: "Stripe secret key" },
    { pattern: /sk_live[a-zA-Z0-9_]*/g, type: "Stripe secret key" },
    { pattern: /r_[a-zA-Z0-9]{30,}/g, type: "Razorpay key" },
  ];
  for (const sp of secretPatterns) {
    if (sp.pattern.test(codeBundle)) {
      findings.push({ type: "exposed_secret", key_type: sp.type, severity: "critical", found: true });
    }
  }
  if (/eyJhbGciOiJIUzI1NiJ9/.test(codeBundle) && /service_role/.test(codeBundle)) {
    findings.push({ type: "exposed_secret", key_type: "Supabase service role key", severity: "critical", found: true });
  }
  return findings;
}

// ============================================================
// SECTION 1b: Pre-analysis — deterministic feature detection
// ============================================================
function runPreAnalysis(codeBundle: string) {
  const code = codeBundle.toLowerCase();

  const paymentKeywords = /stripe|lemonsqueezy|lemon\s*squeezy|paddle|razorpay|loadstripe|paymentintent|checkout\.session/i;
  const hasPayments = paymentKeywords.test(codeBundle);

  let paymentProvider: string | null = null;
  if (hasPayments) {
    if (/stripe|loadstripe/i.test(codeBundle)) paymentProvider = "Stripe";
    else if (/lemonsqueezy|lemon\s*squeezy/i.test(codeBundle)) paymentProvider = "Lemon Squeezy";
    else if (/paddle/i.test(codeBundle)) paymentProvider = "Paddle";
    else if (/razorpay/i.test(codeBundle)) paymentProvider = "Razorpay";
    else paymentProvider = "Other";
  }

  const hasUserAccounts = /supabase\.auth|signin|signup|signIn|signUp|user\.id|auth\.users/i.test(codeBundle);

  const hasAdminRoutes = /\/admin|isadmin|admin_role|role\s*===?\s*['"]admin['"]/i.test(codeBundle);

  const hasFreePaidTiers = /\bplan\b|\bsubscription\b|\bispro\b|\bisfree\b|\btier\b|\bpremium\b/i.test(codeBundle);

  let detectedAppType = "unknown";
  if (hasPayments && hasFreePaidTiers) detectedAppType = "SaaS";
  else if (hasPayments) detectedAppType = "E-commerce/Marketplace";
  else if (hasUserAccounts) detectedAppType = "User App";

  let detectedPlatform = "unknown";
  if (/from ['"]@supabase\/supabase-js['"]/i.test(codeBundle)) detectedPlatform = "Supabase";
  if (/from ['"]react['"]/i.test(codeBundle)) detectedPlatform = detectedPlatform === "Supabase" ? "React + Supabase" : "React";

  return {
    hasPayments,
    paymentProvider,
    hasUserAccounts,
    hasAdminRoutes,
    hasFreePaidTiers,
    detectedAppType,
    detectedPlatform,
  };
}

// ============================================================
// SECTION 1c: Backend verification — fetch ground truth from
// the user's actual Supabase project (RLS status + policies)
// using the public RPC `rismon_security_metadata` they install.
// ============================================================
async function fetchBackendGroundTruth(projectUrl: string, anonKey: string) {
  // Try the read-only RPC the user pasted into their Supabase.
  // If it doesn't exist, gracefully return null (no ground truth available).
  try {
    const rpcRes = await fetch(`${projectUrl}/rest/v1/rpc/rismon_security_metadata`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (rpcRes.ok) {
      const data = await rpcRes.json();
      // Expected shape: { tables: [{ table, rls_enabled, policies: [{ name, cmd, qual, with_check }] }] }
      if (data && Array.isArray(data.tables)) return { source: "rpc", ...data };
    }
  } catch (e) {
    console.log("RPC ground truth fetch failed (expected if not installed):", (e as Error).message);
  }
  // Fallback: at least confirm the project responds (table list only — no RLS info)
  try {
    const res = await fetch(`${projectUrl}/rest/v1/`, { headers: { apikey: anonKey } });
    if (res.ok) {
      const tables = await res.json();
      const tableList = typeof tables === "object" ? Object.keys(tables) : [];
      return { source: "introspection", tables: tableList.map((t) => ({ table: t, rls_enabled: null, policies: null })) };
    }
  } catch { /* ignore */ }
  return null;
}

// Drop or downgrade findings that the backend ground truth contradicts.
// Returns the filtered findings + a list of dropped finding ids for transparency.
function reconcileFindingsAgainstGroundTruth(findings: any[], groundTruth: any): { kept: any[]; dropped: any[] } {
  if (!Array.isArray(findings) || findings.length === 0) return { kept: findings || [], dropped: [] };
  if (!groundTruth || !Array.isArray(groundTruth.tables) || groundTruth.source !== "rpc") {
    // No verified ground truth — mark every DB-related finding as "unverified" so the UI can show it gently.
    const kept = findings.map((f) => {
      const text = `${f?.title || ""} ${f?.what_we_found || ""} ${f?.what_this_means || ""} ${f?.technical_reference || ""}`.toLowerCase();
      const dbRelated = /\brls\b|row[\s-]?level|policy|policies|access rule|anyone can read|public read|public write|expose|exposed|leak|table|database/.test(text);
      if (dbRelated && (!f.confidence || f.confidence === "verified")) {
        return { ...f, confidence: "unverified", confidence_reason: "We could not check your database directly — connect Supabase to verify." };
      }
      return f;
    });
    return { kept, dropped: [] };
  }
  const tablesWithRls = new Set(
    groundTruth.tables.filter((t: any) => t.rls_enabled === true).map((t: any) => String(t.table).toLowerCase())
  );
  const kept: any[] = [];
  const dropped: any[] = [];
  for (const f of findings) {
    const blob = `${f?.title || ""} ${f?.what_we_found || ""} ${f?.what_this_means || ""} ${f?.technical_reference || ""}`.toLowerCase();
    const claimsMissingRls = /\brls\b|row[\s-]?level|access rule|anyone can read|public read|public write|missing polic|no polic|exposed.*table|table.*expos/.test(blob);
    if (claimsMissingRls) {
      // Find which tables are mentioned. If ALL mentioned tables have RLS on, drop the finding.
      const mentionedTables: string[] = [];
      for (const t of groundTruth.tables) {
        const tname = String(t.table).toLowerCase();
        if (tname && blob.includes(tname)) mentionedTables.push(tname);
      }
      if (mentionedTables.length > 0 && mentionedTables.every((t) => tablesWithRls.has(t))) {
        dropped.push({ id: f.id, title: f.title, reason: "Database confirmed RLS is enabled for the mentioned tables." });
        continue;
      }
      // Generic claim with no specific table → mark unverified instead of dropping
      if (mentionedTables.length === 0) {
        kept.push({ ...f, confidence: "unverified", confidence_reason: "Generic claim with no specific table — could not match against your database." });
        continue;
      }
    }
    // Default: mark as verified if not already labeled
    kept.push({ ...f, confidence: f.confidence || "verified" });
  }
  return { kept, dropped };
}

// ============================================================
// SECTION 1d: Prompt hardening — evidence + speculation + whitelist filters
// applied to AI output AFTER parsing, BEFORE returning to the user.
// ============================================================

const BANNED_SPECULATION = [
  "might", "may be", "could be", "appears to", "possibly", "seems to",
  "potentially", "likely vulnerable", "in theory", "it's possible that",
  "this could lead to", "may allow", "could allow",
];

const VERIFIABLE_CATEGORIES = new Set([
  "rls",
  "admin_access",
  "payment_validation",
  "secret_exposure",
]);

// Tactic 1: Drop findings that lack mandatory evidence (file_path + line_number + code_snippet).
// Tactic 2: Force any "verified" finding outside the whitelist down to "unverified".
// Tactic 3: Drop findings whose prose contains banned speculative phrases.
function hardenFindings(findings: any[]): { kept: any[]; dropped: any[] } {
  if (!Array.isArray(findings)) return { kept: [], dropped: [] };
  const kept: any[] = [];
  const dropped: any[] = [];

  for (const f of findings) {
    const hasFile = typeof f?.file_path === "string" && f.file_path.trim().length > 0;
    const hasLine = typeof f?.line_number === "number" && f.line_number > 0;
    const hasSnippet = typeof f?.code_snippet === "string" && f.code_snippet.trim().length > 0;
    if (!hasFile || !hasLine || !hasSnippet) {
      dropped.push({
        id: f?.id, title: f?.title,
        reason: "Discarded: missing required evidence (file_path, line_number, or code_snippet).",
      });
      continue;
    }

    const prose = `${f?.what_we_found || ""} ${f?.what_this_means || ""} ${f?.how_to_fix || ""}`.toLowerCase();
    const hit = BANNED_SPECULATION.find((p) => prose.includes(p));
    if (hit) {
      dropped.push({
        id: f?.id, title: f?.title,
        reason: `Discarded: speculative phrase "${hit}".`,
      });
      continue;
    }

    let confidence = (f?.confidence || "unverified").toLowerCase();
    if (confidence === "verified" && !VERIFIABLE_CATEGORIES.has((f?.category || "").toLowerCase())) {
      confidence = "unverified";
      f.confidence_reason = (f.confidence_reason || "") +
        " (Auto-downgraded: this category cannot be verified without backend access.)";
    }
    if (confidence !== "verified") confidence = "unverified";

    kept.push({ ...f, confidence });
  }
  return { kept, dropped };
}

// Tactic 5 — cap each category at 5, sorted by severity.
const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
function capFindings(findings: any[], max = 5): any[] {
  if (!Array.isArray(findings)) return [];
  return [...findings]
    .sort((a, b) => (SEVERITY_RANK[(b?.severity || "medium").toLowerCase()] || 2) -
                    (SEVERITY_RANK[(a?.severity || "medium").toLowerCase()] || 2))
    .slice(0, max);
}

// Tactic 4 — self-check pass. Asks a cheap model to confirm each finding's
// code_snippet actually proves the claim. Rejected ids are dropped.
async function selfCheckFindings(findings: any[], codeUnderstanding: any): Promise<{ kept: any[]; dropped: any[] }> {
  if (!Array.isArray(findings) || findings.length === 0) return { kept: findings || [], dropped: [] };
  const checkable = findings.map((f) => ({
    id: f.id, title: f.title, claim: f.what_we_found,
    file_path: f.file_path, line_number: f.line_number, code_snippet: f.code_snippet,
  }));
  const system = `You are a strict code reviewer. For each finding, judge whether the code_snippet PROVES the claim. Be skeptical. If the snippet is unrelated, ambiguous, or insufficient — reject. Return ONLY:
{ "results": [{ "id": "...", "verdict": "confirmed|rejected", "reason": "one short sentence" }] }`;
  const user = `App context: ${JSON.stringify(codeUnderstanding).slice(0, 2000)}

Findings to verify:
${JSON.stringify(checkable, null, 2)}`;
  try {
    const text = await callGemini(system, user, "google/gemini-2.5-flash");
    const parsed = parseJSON(text);
    const verdicts = Array.isArray(parsed?.results) ? parsed.results : [];
    const rejectedMap = new Map<string, string>();
    for (const v of verdicts) {
      if (v?.verdict === "rejected" && v?.id) rejectedMap.set(v.id, v.reason || "Self-check rejected.");
    }
    const kept = findings.filter((f) => !rejectedMap.has(f.id));
    const dropped = findings
      .filter((f) => rejectedMap.has(f.id))
      .map((f) => ({ id: f.id, title: f.title, reason: `Self-check: ${rejectedMap.get(f.id)}` }));
    return { kept, dropped };
  } catch (e) {
    console.error("Self-check pass failed (non-fatal):", (e as Error).message);
    return { kept: findings, dropped: [] };
  }
}

// ============================================================
// SECTION 1e: File re-read verifier — the main accuracy moat.
// For each Claude finding, we pull the cited file from the code bundle
// and ask Gemini: "Does this REAL file actually prove Claude's claim?"
// Gemini sees the full file, not a snippet Claude wrote, so it can
// catch lies, missing context (e.g. parent ProtectedRoute), and stale
// line numbers. Rejected findings are dropped.
// ============================================================

// The bundle format is: `=== <path> ===\n<content>\n\n` (set in Analyze.tsx).
// Pull a single file's content out by exact path match.
function extractFileFromBundle(bundle: string, path: string): string | null {
  if (!bundle || !path) return null;
  const marker = `=== ${path} ===`;
  const start = bundle.indexOf(marker);
  if (start === -1) {
    // Try basename match as fallback (Claude sometimes drops the leading folder)
    const base = path.split("/").pop();
    if (!base) return null;
    const re = new RegExp(`=== [^\\n]*${base.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")} ===`);
    const m = bundle.match(re);
    if (!m || m.index === undefined) return null;
    const s = m.index + m[0].length;
    const e = bundle.indexOf("\n=== ", s);
    return bundle.slice(s, e === -1 ? undefined : e).trim();
  }
  const contentStart = start + marker.length;
  const next = bundle.indexOf("\n=== ", contentStart);
  return bundle.slice(contentStart, next === -1 ? undefined : next).trim();
}

// Verify each finding by sending the cited file (max ~6KB) + the claim to Gemini.
async function verifyFindingsAgainstRealFiles(
  findings: any[],
  codeBundle: string,
  edgeBundle: string,
): Promise<{ kept: any[]; dropped: any[] }> {
  if (!Array.isArray(findings) || findings.length === 0) return { kept: findings || [], dropped: [] };
  if (!codeBundle && !edgeBundle) return { kept: findings, dropped: [] };

  // Verify in parallel — each finding is an independent Gemini call.
  const results = await Promise.all(findings.map(async (f) => {
    const path = f?.file_path;
    if (!path) return { f, verdict: "skipped", reason: "no file_path" };

    // Try frontend bundle first, then edge function bundle
    let fileContent = extractFileFromBundle(codeBundle, path);
    if (!fileContent) fileContent = extractFileFromBundle(edgeBundle, path);

    if (!fileContent) {
      // File wasn't in the scanned bundle — could be a fabricated path.
      // Don't auto-reject (might be legit unscanned file); mark unverified.
      return {
        f: { ...f, confidence: "unverified",
             confidence_reason: "Cited file was not in the scanned bundle — could not fact-check." },
        verdict: "unverifiable",
        reason: "file not in bundle",
      };
    }

    // Trim to ~6KB to keep costs sane and stay within model limits.
    const trimmed = fileContent.length > 6000
      ? fileContent.slice(0, 6000) + "\n... [truncated]"
      : fileContent;

    const system = `You are a strict code reviewer fact-checking another AI's security finding against the REAL source file.

Rules:
- The finding may be wrong, right, or partially right. Be skeptical.
- Read the WHOLE file before judging. Auth/access checks may live in a parent component, route wrapper, or imported helper not visible here — if the finding ignores that possibility, reject it.
- A finding is "confirmed" only if the file ACTUALLY shows the problem at or near the cited line.
- A finding is "rejected" if the file contradicts the claim, the cited line doesn't show the problem, or the claim depends on context not in the file.
- A finding is "needs_more_context" if the file alone isn't enough to judge (don't use this lazily).

Return ONLY:
{ "verdict": "confirmed" | "rejected" | "needs_more_context", "reason": "one short sentence" }`;

    const user = `Claim from the first AI:
- Title: ${f.title}
- What was found: ${f.what_we_found}
- Cited file: ${path}
- Cited line: ${f.line_number}
- Cited snippet: ${f.code_snippet}

REAL file contents (${path}):
\`\`\`
${trimmed}
\`\`\`

Does the real file prove the claim?`;

    try {
      const text = await callGemini(system, user, "google/gemini-2.5-flash");
      const parsed = parseJSON(text);
      const verdict = (parsed?.verdict || "").toLowerCase();
      const reason = parsed?.reason || "";
      return { f, verdict, reason };
    } catch (e) {
      // On verifier failure, keep the finding but mark unverified.
      return { f: { ...f, confidence: "unverified", confidence_reason: "Verifier could not run — kept as unverified." }, verdict: "skipped", reason: (e as Error).message };
    }
  }));

  const kept: any[] = [];
  const dropped: any[] = [];
  for (const r of results) {
    if (r.verdict === "rejected") {
      dropped.push({ id: r.f.id, title: r.f.title, reason: `File re-read: ${r.reason}` });
    } else if (r.verdict === "needs_more_context") {
      // Keep but downgrade to unverified
      kept.push({ ...r.f, confidence: "unverified",
                  confidence_reason: `File alone wasn't enough: ${r.reason}` });
    } else if (r.verdict === "confirmed") {
      // Promote to verified ONLY if it was already in the verifiable category whitelist.
      // Otherwise keep its current confidence (most likely "unverified" from the whitelist filter).
      const inWhitelist = VERIFIABLE_CATEGORIES.has((r.f.category || "").toLowerCase());
      kept.push({
        ...r.f,
        confidence: inWhitelist ? "verified" : r.f.confidence,
        confidence_reason: `Confirmed by file re-read: ${r.reason}`,
      });
    } else {
      // unverifiable / skipped — keep as-is
      kept.push(r.f);
    }
  }
  return { kept, dropped };
}

// ============================================================
// SECTION 2: AI calls — Gemini (cheap) and Claude (deep)
// ============================================================
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Strict house style for all Gemini calls — short, plain, no fluff
const HOUSE_STYLE = `Strict response rules:
- Plain English. No markdown unless explicitly requested.
- No phrases like "It's important to note", "Additionally", "In conclusion", "Furthermore".
- No preamble. No closing summary. Get to the point.
- Titles maximum 8 words.
- Match a non-technical founder's vocabulary, not engineering jargon.
- Return ONLY valid JSON when asked. No surrounding text. No code fences.`;

async function callGeminiRaw(systemPrompt: string, userContent: string, model: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${systemPrompt}\n\n${HOUSE_STYLE}` },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const status = res.status;
    const body = await res.text().catch(() => "");
    console.error(`Gemini error [${status}] model=${model}:`, body.slice(0, 500));
    const err: any = new Error(status === 429 ? "RATE_LIMITED" : status === 402 ? "CREDITS_EXHAUSTED" : "AI_ERROR");
    err.status = status;
    throw err;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Gemini with auto-retry on 429 + cross-fallback to Claude as last resort.
async function callGemini(systemPrompt: string, userContent: string, model = "google/gemini-2.5-flash") {
  const delays = [1500, 4000, 8000]; // 3 retries with backoff
  let lastErr: any;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await callGeminiRaw(systemPrompt, userContent, model);
    } catch (e: any) {
      lastErr = e;
      // Only retry on 429; bail immediately on 402/other
      if (e?.status !== 429 || attempt === delays.length) break;
      console.warn(`Gemini 429, retrying in ${delays[attempt]}ms (attempt ${attempt + 1}/${delays.length})`);
      await new Promise(r => setTimeout(r, delays[attempt]));
    }
  }
  // Last-resort cross-fallback: try Claude with the same prompt if available
  if (lastErr?.status === 429 && Deno.env.get("ANTHROPIC_KEY")) {
    try {
      console.warn("Gemini exhausted retries. Cross-falling back to Claude.");
      return await callClaude(systemPrompt, userContent);
    } catch (e2) {
      console.error("Claude cross-fallback also failed:", (e2 as Error).message);
    }
  }
  throw lastErr;
}

async function callClaude(systemPrompt: string, userContent: string) {
  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_KEY");
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_KEY not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const status = res.status;
    const errBody = await res.text().catch(() => "");
    console.error(`Claude error [${status}]:`, errBody.slice(0, 300));
    // Tag retryable errors so the wrapper can fall back
    if (status === 429 || status === 529 || status >= 500) {
      const e: any = new Error("CLAUDE_RETRYABLE");
      e.status = status;
      throw e;
    }
    throw new Error("AI_ERROR");
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// Hybrid: Claude Sonnet is the primary engine (best report voice + reasoning).
// On 429 / 529 / 5xx, fall back to Lovable AI Gemini 2.5 Pro using the same
// system prompt so the report style stays consistent.
async function callClaudeWithFallback(systemPrompt: string, userContent: string) {
  // 1) Primary: Claude Sonnet
  try {
    return await callClaude(systemPrompt, userContent);
  } catch (e: any) {
    if (e?.message !== "CLAUDE_RETRYABLE" && e?.message !== "ANTHROPIC_KEY not configured") {
      throw e;
    }
    console.warn(`Claude unavailable (${e?.status || e?.message}). Falling back to Gemini 2.5 Pro.`);
  }

  // 2) Fallback: Lovable AI Gemini 2.5 Pro
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("AI_ERROR");
  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) {
    const status = res.status;
    const body = await res.text().catch(() => "");
    console.error(`Gemini fallback error [${status}]:`, body.slice(0, 300));
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status === 402) throw new Error("CREDITS_EXHAUSTED");
    throw new Error("AI_ERROR");
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(text: string): any {
  let jsonStr = text.trim();
  const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();
  // Find first { and last } to be safe
  const first = jsonStr.indexOf("{");
  const last = jsonStr.lastIndexOf("}");
  if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);
  return JSON.parse(jsonStr);
}

// ============================================================
// SECTION 3: Plan + abuse limits (server-enforced)
// ============================================================
const PLAN_LIMITS = {
  free: {
    weeklyScans: 3,
    monthlyScans: Infinity,
    maxRepoBytes: 2 * 1024 * 1024, // 2MB
    duplicateBlockHours: 24,
    edgeFunctionScan: false,
    verificationPass: false,
    emailDelivery: false,
  },
  pro: {
    weeklyScans: Infinity,
    monthlyScans: 100,
    maxRepoBytes: 10 * 1024 * 1024, // 10MB
    duplicateBlockHours: 0,
    edgeFunctionScan: true,
    verificationPass: true,
    emailDelivery: true,
  },
};

async function checkAbuseLimits(serviceClient: any, userId: string, plan: "free" | "pro", repoName: string, repoSizeBytes: number, currentScanSessionId?: string | null) {
  const limits = PLAN_LIMITS[plan];

  // 1. Repo size cap
  if (repoSizeBytes > limits.maxRepoBytes) {
    return { ok: false, code: "REPO_TOO_LARGE", message: `Repository code exceeds ${plan === "free" ? "2MB" : "10MB"} limit. ${plan === "free" ? "Upgrade to Pro for 10MB scans." : "Contact support for larger repos."}` };
  }

  // 2. Concurrent scan lock
  let activeQuery = serviceClient
    .from("scan_sessions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["pending", "analyzing"]);

  if (currentScanSessionId) {
    activeQuery = activeQuery.neq("id", currentScanSessionId);
  }

  const { data: active } = await activeQuery.limit(1);
  if (active && active.length > 0) {
    return { ok: false, code: "SCAN_IN_PROGRESS", message: "You already have a scan running. Please wait for it to finish." };
  }

  // 3. Duplicate scan block (free only)
  if (limits.duplicateBlockHours > 0 && repoName) {
    const cutoff = new Date(Date.now() - limits.duplicateBlockHours * 60 * 60 * 1000).toISOString();
    const { data: recent } = await serviceClient
      .from("scan_sessions")
      .select("id, report_id")
      .eq("user_id", userId)
      .eq("repo_name", repoName)
      .eq("status", "complete")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1);
    if (recent && recent.length > 0) {
      return { ok: false, code: "DUPLICATE_SCAN", message: "You already scanned this repo in the last 24 hours. Upgrade to Pro for unlimited re-scans.", existingReportId: recent[0].report_id };
    }
  }

  // 4. Weekly scan limit (free)
  if (limits.weeklyScans !== Infinity) {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split("T")[0];
    const { data: usage } = await serviceClient
      .from("scan_usage")
      .select("scan_count")
      .eq("user_id", userId)
      .eq("week_start", mondayStr);
    const total = (usage || []).reduce((s: number, l: any) => s + (l.scan_count || 0), 0);
    if (total >= limits.weeklyScans) {
      return { ok: false, code: "WEEKLY_LIMIT", message: "You've used your 3 free scans this week. Try Pro for $8.99 to run a Deep Scan now, or wait until Monday." };
    }
  }

  // 5. Monthly scan limit (pro)
  if (limits.monthlyScans !== Infinity) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStr = monthStart.toISOString().split("T")[0];
    const { data: monthly } = await serviceClient
      .from("scan_usage_monthly")
      .select("scan_count")
      .eq("user_id", userId)
      .eq("month_start", monthStr)
      .maybeSingle();
    if ((monthly?.scan_count || 0) >= limits.monthlyScans) {
      return { ok: false, code: "MONTHLY_LIMIT", message: "You've reached your 100-scan monthly limit. Resets on the 1st." };
    }
  }

  return { ok: true };
}

// ============================================================
// SECTION 4: Chunking — split large code bundles
// ============================================================
function chunkCodeBundle(codeBundle: string, maxChunkSize = 60000): string[] {
  if (codeBundle.length <= maxChunkSize) return [codeBundle];
  // Split on file boundaries (=== filepath ===)
  const fileBlocks = codeBundle.split(/(?=^=== )/m);
  const chunks: string[] = [];
  let current = "";
  for (const block of fileBlocks) {
    if ((current + block).length > maxChunkSize && current) {
      chunks.push(current);
      current = block;
    } else {
      current += block;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// ============================================================
// SECTION 5: Main handler
// ============================================================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const {
      action,
      codeBundle,
      edgeFunctionBundle,
      tableNames,
      platform,
      code_understanding,
      founder_description,
      user_answers,
      gaps,
      security_issues,
      unknown_features,
      supabase_url: appSupabaseUrl,
      supabase_anon_key: appSupabaseAnonKey,
      app_id,
      github_owner,
      github_repo_name,
      concern,
      project_type,
      monetization,
      scan_type,
      scan_session_id,
    } = body;
    const scanType: "quick" | "deep" = scan_type === "deep" ? "deep" : "quick";

    // Get user plan
    const { data: planData } = await serviceClient.rpc("get_user_plan", { _user_id: user.id });
    const userPlan: "free" | "pro" = (planData === "pro") ? "pro" : "free";
    const limits = PLAN_LIMITS[userPlan];

    // ============================================================
    // ACTION: read_code (stage 1 — extract facts via Gemini)
    // ============================================================
    if (action === "read_code") {
      // Validate repo matches saved app
      if (app_id && github_owner && github_repo_name) {
        const { data: appRecord, error: appErr } = await supabase
          .from("apps")
          .select("github_owner, github_repo_name")
          .eq("id", app_id)
          .eq("user_id", user.id)
          .single();
        if (appErr || !appRecord) {
          return new Response(JSON.stringify({ error: "unauthorized", message: "App not found or not owned by you" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (appRecord.github_owner !== github_owner || appRecord.github_repo_name !== github_repo_name) {
          return new Response(JSON.stringify({ error: "unauthorized", message: "Repository does not match the connected app" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      const repoName = `${github_owner}/${github_repo_name}`;
      const totalBundle = (codeBundle || "") + (edgeFunctionBundle || "");
      const repoSizeBytes = new TextEncoder().encode(totalBundle).length;

      // Enforce all abuse limits BEFORE any AI call
      const limitCheck = await checkAbuseLimits(serviceClient, user.id, userPlan, repoName, repoSizeBytes, scan_session_id);
      if (!limitCheck.ok) {
        return new Response(JSON.stringify({ error: limitCheck.message, code: limitCheck.code, existingReportId: limitCheck.existingReportId }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Pre-scan deterministic checks
      const securityPreFound = runSecurityPreChecks(totalBundle);
      const preAnalysis = runPreAnalysis(totalBundle);

      // Probe Supabase tables
      const rlsFindings: any[] = [];
      if (appSupabaseUrl && appSupabaseAnonKey) {
        try {
          const res = await fetch(`${appSupabaseUrl}/rest/v1/`, {
            headers: { apikey: appSupabaseAnonKey, Authorization: `Bearer ${appSupabaseAnonKey}` },
          });
          if (res.ok) {
            const tables = await res.json();
            const tableList = typeof tables === "object" ? Object.keys(tables) : [];
            if (tableList.length > 0) {
              rlsFindings.push({ type: "tables_detected", tables: tableList, note: "Check if these tables have RLS enabled" });
            }
          }
        } catch { /* ignore */ }
      }

      const preCheckContext = (securityPreFound.length > 0 || rlsFindings.length > 0)
        ? `\n\nPre-scan findings already detected: ${JSON.stringify([...securityPreFound, ...rlsFindings])}\nInclude these in your response and add anything else you find.`
        : "";

      // Stage 1: extract facts via Gemini Flash (cheap, structured)
      const includeEdge = userPlan === "pro" && edgeFunctionBundle;
      const systemPrompt = `You are a code reader. Extract facts from this codebase. Look at: features, user roles, payment code, routes (protected vs public), database tables used, coding patterns, anything that looks unintentional. ${includeEdge ? "Backend logic is included in supabase/functions/* — judge auth, payment, and data-access enforcement based on this code, not just the frontend." : "Note: only frontend code was scanned. Flag features whose backend enforcement cannot be verified."} Then generate up to 8 plain-English questions for the founder, each citing what you found.${preCheckContext}

Return ONLY this JSON:
{
  "app_understanding": {
    "features_found": [],
    "user_roles_found": [],
    "has_payments_code": boolean,
    "has_admin": boolean,
    "has_messaging": boolean,
    "database_tables": [],
    "protected_routes": [],
    "public_routes": [],
    "edge_functions_found": [],
    "unknown_features": [],
    "code_style": "",
    "platform_detected": "",
    "business_type_guess": ""
  },
  "questions": [{ "id": "", "question": "", "context": "", "answer_type": "yes_no|text|select", "options": [] }]
}`;

      // Chunk if needed
      const chunks = chunkCodeBundle(totalBundle);
      let mergedFacts: any = null;

      if (chunks.length === 1) {
        const userContent = `Code:\n${chunks[0]}\n\nDatabase tables: ${tableNames || "unknown"}\nPlatform: ${platform || "unknown"}\nUser plan: ${userPlan}`;
        const text = await callGemini(systemPrompt, userContent);
        mergedFacts = parseJSON(text);
      } else {
        // Per-chunk extraction then merge
        const partials: any[] = [];
        for (let i = 0; i < chunks.length; i++) {
          const userContent = `Code chunk ${i + 1} of ${chunks.length}:\n${chunks[i]}\n\nDatabase tables: ${tableNames || "unknown"}\nPlatform: ${platform || "unknown"}`;
          const text = await callGemini(systemPrompt, userContent);
          try { partials.push(parseJSON(text)); } catch { /* skip bad chunk */ }
        }
        // Merge into one
        const merged: Record<string, any> = {
          features_found: [] as any[], user_roles_found: [] as any[], has_payments_code: false, has_admin: false, has_messaging: false,
          database_tables: [] as any[], protected_routes: [] as any[], public_routes: [] as any[], edge_functions_found: [] as any[], unknown_features: [] as any[],
          code_style: "", platform_detected: "", business_type_guess: "",
        };
        const allQuestions: any[] = [];
        for (const p of partials) {
          const u = p.app_understanding || {};
          (["features_found", "user_roles_found", "database_tables", "protected_routes", "public_routes", "edge_functions_found", "unknown_features"] as const).forEach(k => {
            if (Array.isArray(u[k])) merged[k] = Array.from(new Set([...merged[k], ...u[k]]));
          });
          merged.has_payments_code = merged.has_payments_code || !!u.has_payments_code;
          merged.has_admin = merged.has_admin || !!u.has_admin;
          merged.has_messaging = merged.has_messaging || !!u.has_messaging;
          if (u.code_style && !merged.code_style) merged.code_style = u.code_style;
          if (u.platform_detected && !merged.platform_detected) merged.platform_detected = u.platform_detected;
          if (u.business_type_guess && !merged.business_type_guess) merged.business_type_guess = u.business_type_guess;
          if (Array.isArray(p.questions)) allQuestions.push(...p.questions);
        }
        // Dedupe questions by question text, keep first 8
        const seen = new Set<string>();
        const uniqueQs = allQuestions.filter(q => { if (seen.has(q.question)) return false; seen.add(q.question); return true; }).slice(0, 8);
        mergedFacts = { app_understanding: merged, questions: uniqueQs };
      }

      return new Response(JSON.stringify({ ...mergedFacts, pre_analysis: preAnalysis }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============================================================
    // ACTION: analyze (stage 2 — Claude deep, then Gemini verifies)
    // ============================================================
    if (action === "analyze") {
      const claudeSystemPrompt = `You are Rismon, an expert at analyzing apps built with AI coding platforms like Lovable, Bolt, Cursor, and Replit. You analyze code for non-technical founders who have never written code.

CRITICAL CONTEXT:
These apps have a specific architecture:
1. GitHub contains React/TypeScript frontend code only.
2. Database lives in Supabase. Tables are NOT stored in GitHub. If you see supabase.from() calls the database EXISTS. NEVER say database is missing just because SQL files are not in GitHub.
3. Authentication is Supabase Auth. If you see supabase.auth calls real authentication EXISTS. NEVER say auth is fake if supabase.auth is used in code.
4. Backend logic lives in Supabase Edge Functions. If you see supabase.functions.invoke() a real backend EXISTS.
5. Payments: detect from imports. loadStripe = Stripe. Never assume payment doesn't work just because you see test keys.

PRE-ANALYSIS CONTEXT:
You will receive this data detected from the code automatically:
- hasPayments: true/false
- paymentProvider: which one
- hasUserAccounts: true/false
- hasAdminRoutes: true/false
- hasFreePaidTiers: true/false
- detectedAppType: app type
- detectedPlatform: tech stack
- founderConcern: what worries them
- paidFeatures: what paid users get
- dataPrivacy: data sharing preference
Use this context to make findings specific to their actual app.

APP KIND (CRITICAL):
The founder answers "What kind of app is this?" as the FIRST smart question. Look for "app_kind" in the user_answers JSON.
- "web_app" → Standard web app with UI. Findings about pages, login UI, payments, dashboards all apply.
- "backend_api" → No UI. DO NOT generate findings about missing pages, login UI, homepage, SEO, marketing copy, or frontend forms. Focus on auth on endpoints, input validation, rate limits (if applicable), data exposure.
- "mobile_app" → React Native or similar. The repo may be the backend OR a mobile shell. DO NOT flag missing web pages or web SEO. Focus on API security and data privacy.
- "bot_automation" → Discord/Telegram/Slack bot, scraper, cron job, scheduled task. DO NOT generate findings about pages, login UI, payments (unless detected), or web SEO. Focus on credential safety, error handling, scheduled-task safety.
- "cli_library" → Command-line tool or npm package. DO NOT generate findings about login, pages, payments, or web concerns. Focus on dependency safety, input handling, and published-package risks.
- If the value starts with "other:" the founder typed a free-form description. READ IT and tailor findings to what they describe — do not assume web app defaults.

If app_kind is unset, default to web_app behavior but mention in the summary that you assumed web app.

SMART QUESTION "OTHER" ANSWERS:
Any user_answers value starting with "other:" is the founder's own description (typed free text). Treat the text after the colon as ground truth — weight it more heavily than any code-pattern guess. Example: if payment_webhook="other:Stripe keys are in repo but I haven't built checkout yet" then DO NOT flag a "payment bypass" risk — instead flag "payments not yet implemented; remove unused Stripe keys before publishing."

SCAN TYPE:
You will be told if this is "quick" (free plan, 20 files) or "deep" (pro plan / try pro, full codebase).
For quick scan: Analyze what you have. Note at end of summary: "This was a Quick Scan covering your most critical files."
For deep scan: Full analysis. No disclaimers needed.

YOUR ONLY JOB:
Find gaps between what the founder described and what the code does. Find security issues that could hurt their business.

LANGUAGE RULES - CRITICAL:
NEVER use these technical terms:
- RLS / Row Level Security
- JWT / Token / Bearer
- CORS / CSP / XSS / CSRF
- SQL injection
- Authentication / Authorization (say "login check" instead)
- Vulnerability / CVE / CVSS
- Misconfiguration
- Sanitization / Validation
- Frontend / Backend / Server-side
- Environment variable
- Supabase / PostgreSQL
- Any programming language names
- Any technical acronyms

ALWAYS use plain English:
"login check" not "authentication"
"your secret key" not "API key"
"anyone can read your data" not "RLS misconfigured"
"payment check missing" not "authorization bypass"

TEST EVERY SENTENCE:
"Would someone who runs a restaurant understand this without Googling it?"
If no → rewrite completely.

FINDINGS FORMAT — EVERY field below is REQUIRED. Findings missing any of file_path, line_number, or code_snippet will be DISCARDED.
{
  "severity": "critical|high|medium|low",
  "category": "rls|admin_access|payment_validation|secret_exposure|input_validation|business_logic|other",
  "title": "Plain English max 8 words",
  "what_we_found": "One sentence. What exists in the code. No technical terms.",
  "what_this_means": "Real world consequence. Use dollar amounts if relevant. Use number of users if relevant. Max 2 sentences.",
  "how_to_fix": "Plain English steps. What to do in Lovable or Cursor.",
  "fix_prompt": "Exact prompt to paste into Lovable or Cursor. Ready to use. No editing needed.",
  "technical_reference": "Short technical name for developers to Google. Max 5 words. Example: supabase-rls-not-enabled",
  "google_query": "Exact search term. Example: supabase row level security",
  "confidence": "verified | unverified",
  "confidence_reason": "Why this confidence level — what evidence you have OR what you would need to confirm.",
  "file_path": "Exact path from the code, e.g. src/pages/Admin.tsx. REQUIRED.",
  "line_number": 45,
  "code_snippet": "Verbatim line(s) of code (max 200 chars) that prove the finding. Copy directly from the source. REQUIRED.",
  "evidence": "One short phrase summarizing the proof."
}

CONFIDENCE — STRICT WHITELIST:
Only these categories can EVER be marked "verified":
  - rls               → only if GROUND TRUTH block confirms the table has no policies
  - admin_access      → only if you can quote the exact unprotected route AND the founder said admin should be restricted
  - payment_validation → only if no edge function or webhook handler is present in the scanned code
  - secret_exposure   → only if a real secret pattern was matched (sk_live_, ghp_, AIza...)

Every other category, AND every claim where the backend was not directly inspected, MUST be "unverified".
If you mark something "verified" that does not meet the rule above, the finding will be DROPPED.

BANNED PHRASES — using any of these auto-discards the finding:
  "might", "may be", "could be", "appears to", "possibly", "seems to",
  "potentially", "likely vulnerable", "in theory", "it's possible that",
  "this could lead to", "may allow", "could allow"

Replace banned phrases with concrete statements:
  BAD:  "This might allow users to see other users' data."
  GOOD: "Line 45 of src/pages/Orders.tsx queries the orders table with no user_id filter."

Frontend code without \`.eq('user_id', ...)\` filters is NOT evidence of missing access control. Supabase enforces this at the database via row-level rules. Do NOT flag missing access control unless the GROUND TRUTH block says the table has no rules, OR the founder told you so.

If the GROUND TRUTH block lists a table with rls_enabled=true and policies, do NOT report "anyone can read your data" or "exposed table" for that table. The database is protecting it.

INTENT SCORE FORMULA:
Start with 100 points.
Deduct per finding:
Critical: -20 points
High: -10 points
Medium: -5 points
Low: -2 points
Minimum score: 0
Maximum score: 100

SCORE LABELS:
90-100: "Launch ready"
70-89: "Almost ready"
50-69: "Needs work"
30-49: "Not ready"
0-29: "Critical issues"

REPORT STRUCTURE:
Return ONLY valid JSON:
{
  "score": number,
  "score_label": string,
  "summary": "2-3 sentences. What the app does well. What the biggest concern is. Plain English. Personalized to their specific app type.",
  "verdict": "One sentence. Clear launch recommendation. Example: Fix the paywall issue before your first user signs up.",
  "business_logic_gaps": [findings],
  "security_findings": [findings],
  "what_works": ["One sentence per positive finding. Something they did right."],
  "scan_type": "quick or deep"
}

HARD LIMITS:
- Maximum 5 business_logic_gaps. Pick the 5 most impactful — drop weaker ones.
- Maximum 5 security_findings. Pick the 5 most impactful — drop weaker ones.
- Always find at least 2 positives.
- Always personalize to their app type.
- Never use technical jargon anywhere.

RESPOND WITH JSON ONLY.
No text before or after the JSON.`;

      // Fetch backend ground truth (RLS + policies) BEFORE asking the AI.
      // This stops Claude from hallucinating "missing RLS" findings that aren't true.
      let groundTruth: any = null;
      if (appSupabaseUrl && appSupabaseAnonKey) {
        groundTruth = await fetchBackendGroundTruth(appSupabaseUrl, appSupabaseAnonKey);
      }
      const groundTruthBlock = groundTruth
        ? (groundTruth.source === "rpc"
          ? `\n\nGROUND TRUTH (verified directly from the user's database — DO NOT contradict this):\n${JSON.stringify(groundTruth.tables, null, 2)}\n\nFor every table above where rls_enabled=true and policies exist, the database IS protecting it. Do NOT report "anyone can read this", "exposed table", or "missing access rules" for these tables.`
          : `\n\nBACKEND PARTIAL VISIBILITY: We could only list table names, not their rules. Tables visible: ${JSON.stringify(groundTruth.tables.map((t: any) => t.table))}. Mark all access-control claims as "unverified" since rules could not be checked directly.`)
        : `\n\nNO BACKEND VISIBILITY: The user did not connect their backend (or hasn't installed the Rismon verification function). Mark every claim about database access rules, server validation, or admin enforcement as "unverified" and ask the founder to confirm in plain English.`;

      const claudeUserContent = `Scan type: ${scanType} (${scanType === "deep" ? "all repository files were fetched" : "only ~20 prioritized files were fetched — base findings on what is visible and avoid claiming a feature is missing if it could simply live in an unscanned file"})

App understanding: ${JSON.stringify(code_understanding)}

Founder described: ${founder_description}

Founder concern (most worried about): ${concern || "(none specified)"}

Project type: ${project_type || "unknown"}
Monetization: ${monetization || "unknown"}

Founder answers to smart questions: ${JSON.stringify(user_answers)}${groundTruthBlock}`;

      const claudeText = await callClaudeWithFallback(claudeSystemPrompt, claudeUserContent);
      let claudeResult: any;
      try {
        claudeResult = parseJSON(claudeText);
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse analysis" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ----------------------------------------------------------
      // Normalize new Rismon prompt shape -> legacy shape expected
      // by the rest of the app (DB columns, Analyze.tsx, Report.tsx)
      // New keys: score, score_label, verdict, business_logic_gaps,
      //          security_findings, what_works, summary
      // Legacy keys: intent_match_score, gaps, security_issues,
      //              unknown_features, what_works, summary
      // ----------------------------------------------------------
      const mapFinding = (f: any, idx: number, prefix: string) => {
        const id = f?.id || `${prefix}-${idx + 1}`;
        const severity = (f?.severity || "medium").toLowerCase();
        const title = f?.title || "Issue";
        const what_we_found = f?.what_we_found || f?.you_said || "";
        const what_this_means = f?.what_this_means || f?.business_impact || "";
        const how_to_fix = f?.how_to_fix || "";
        return {
          id,
          severity,
          category: (f?.category || "other").toLowerCase(),
          title,
          // legacy gap fields used by Report.tsx
          you_said: what_we_found,
          what_was_built: what_we_found,
          business_impact: what_this_means,
          // legacy security fields used by Report.tsx
          explanation: what_we_found || what_this_means,
          status: "failed",
          // keep new fields for fix-prompt generation downstream
          what_we_found,
          what_this_means,
          how_to_fix,
          fix_prompt: f?.fix_prompt || "",
          technical_reference: f?.technical_reference || "",
          google_query: f?.google_query || "",
          // confidence transparency
          confidence: (f?.confidence || "unverified").toLowerCase(),
          confidence_reason: f?.confidence_reason || "",
          evidence: f?.evidence || "",
          // hardening — required evidence fields
          file_path: typeof f?.file_path === "string" ? f.file_path : "",
          line_number: typeof f?.line_number === "number" ? f.line_number : 0,
          code_snippet: typeof f?.code_snippet === "string" ? f.code_snippet : "",
        };
      };

      if (claudeResult && (claudeResult.business_logic_gaps || claudeResult.security_findings || typeof claudeResult.score === "number")) {
        const gapsArr = Array.isArray(claudeResult.business_logic_gaps) ? claudeResult.business_logic_gaps : [];
        const secArr = Array.isArray(claudeResult.security_findings) ? claudeResult.security_findings : [];
        const works = Array.isArray(claudeResult.what_works) ? claudeResult.what_works : [];

        const score = typeof claudeResult.score === "number" ? claudeResult.score : null;
        const summary = [claudeResult.summary, claudeResult.verdict].filter(Boolean).join(" ");

        claudeResult = {
          ...claudeResult,
          intent_match_score: score,
          gaps: gapsArr.map((g: any, i: number) => mapFinding(g, i, "g")),
          security_issues: secArr.map((s: any, i: number) => mapFinding(s, i, "s")),
          what_works: works,
          unknown_features: Array.isArray(claudeResult.unknown_features) ? claudeResult.unknown_features : [],
          summary: summary || claudeResult.summary || "",
        };
      }

      // ----------------------------------------------------------
      // Hardening pipeline (applied in order):
      //   A. Reconcile against backend ground truth (drops false-positive RLS claims).
      //   B. Hardening filter — evidence required, banned phrases, whitelist for "verified".
      //   C. Snippet self-check — Gemini Flash judges if the snippet proves the claim.
      //   D. FILE RE-READ verifier — Gemini opens the actual cited file and fact-checks.
      //   E. Cap each category at 5, sorted by severity.
      //   F. Recompute score from "verified" findings only.
      // ----------------------------------------------------------
      const allDropped: any[] = [];
      const claudeGenerated = {
        gaps: (claudeResult.gaps || []).length,
        security: (claudeResult.security_issues || []).length,
      };

      // A. Ground truth reconcile
      const reconciledGaps = reconcileFindingsAgainstGroundTruth(claudeResult.gaps || [], groundTruth);
      const reconciledSec = reconcileFindingsAgainstGroundTruth(claudeResult.security_issues || [], groundTruth);
      claudeResult.gaps = reconciledGaps.kept;
      claudeResult.security_issues = reconciledSec.kept;
      allDropped.push(...reconciledGaps.dropped, ...reconciledSec.dropped);

      // B. Evidence + speculation + whitelist filter
      const hardenedGaps = hardenFindings(claudeResult.gaps);
      const hardenedSec = hardenFindings(claudeResult.security_issues);
      claudeResult.gaps = hardenedGaps.kept;
      claudeResult.security_issues = hardenedSec.kept;
      allDropped.push(...hardenedGaps.dropped, ...hardenedSec.dropped);

      // C. Snippet self-check
      const totalFindings = claudeResult.gaps.length + claudeResult.security_issues.length;
      if ((limits.verificationPass || totalFindings >= 3) && totalFindings > 0) {
        const checkedGaps = await selfCheckFindings(claudeResult.gaps, code_understanding);
        const checkedSec = await selfCheckFindings(claudeResult.security_issues, code_understanding);
        claudeResult.gaps = checkedGaps.kept;
        claudeResult.security_issues = checkedSec.kept;
        allDropped.push(...checkedGaps.dropped, ...checkedSec.dropped);
        claudeResult.self_check_applied = true;
        claudeResult.self_check_dropped = checkedGaps.dropped.length + checkedSec.dropped.length;
      }

      // D. FILE RE-READ verifier — the main accuracy upgrade.
      // Gemini opens the actual cited file from the bundle and fact-checks Claude's claim
      // against the real source code, not just Claude's snippet.
      if (codeBundle || edgeFunctionBundle) {
        const verifiedGaps = await verifyFindingsAgainstRealFiles(
          claudeResult.gaps, codeBundle || "", edgeFunctionBundle || "",
        );
        const verifiedSec = await verifyFindingsAgainstRealFiles(
          claudeResult.security_issues, codeBundle || "", edgeFunctionBundle || "",
        );
        claudeResult.gaps = verifiedGaps.kept;
        claudeResult.security_issues = verifiedSec.kept;
        allDropped.push(...verifiedGaps.dropped, ...verifiedSec.dropped);
        claudeResult.file_reread_applied = true;
        claudeResult.file_reread_dropped = verifiedGaps.dropped.length + verifiedSec.dropped.length;
      }

      // E. Cap each category at 5
      claudeResult.gaps = capFindings(claudeResult.gaps, 5);
      claudeResult.security_issues = capFindings(claudeResult.security_issues, 5);

      if (allDropped.length > 0) claudeResult.dropped_false_positives = allDropped;

      // Filter funnel telemetry — useful for monitoring over-filtering in production logs.
      claudeResult.filter_funnel = {
        claude_generated: claudeGenerated.gaps + claudeGenerated.security,
        final_kept: claudeResult.gaps.length + claudeResult.security_issues.length,
        dropped_total: allDropped.length,
      };

      // E. Recompute score using only "verified" findings
      const allKept = [...claudeResult.gaps, ...claudeResult.security_issues];
      const verifiedOnly = allKept.filter((f: any) => f.confidence === "verified");
      const sevPoints: Record<string, number> = { critical: 20, high: 10, medium: 5, low: 2 };
      const deduction = verifiedOnly.reduce(
        (s: number, f: any) => s + (sevPoints[(f.severity || "medium").toLowerCase()] || 5),
        0,
      );
      claudeResult.intent_match_score = Math.max(0, 100 - deduction);

      claudeResult.backend_verification = groundTruth
        ? (groundTruth.source === "rpc" ? "verified" : "partial")
        : "none";

      claudeResult.plan_at_scan = userPlan;
      claudeResult.edge_functions_scanned = limits.edgeFunctionScan;

      return new Response(JSON.stringify(claudeResult), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============================================================
    // ACTION: generate_fixes (stage 5 — Gemini Flash, cheap & templated)
    // ============================================================
    if (action === "generate_fixes") {
      const systemPrompt = `Generate copy-paste fix prompts for the founder's app. Each prompt must:
- Match the app's exact code style and table names where known
- Be specific to their platform (${platform || "Lovable"})
- Be plain English with step-by-step instructions
- Be ready to paste with no modification

Return ONLY:
{ "fix_prompts": [{ "fix_id": "", "title": "", "platform": "lovable|cursor|supabase|general", "prompt": "", "where_to_paste": "", "expected_result": "" }] }`;

      const userContent = `Platform: ${platform || "unknown"}
Gaps: ${JSON.stringify(gaps)}
Security issues: ${JSON.stringify(security_issues)}
Unknown features: ${JSON.stringify(unknown_features)}
App understanding: ${JSON.stringify(code_understanding)}`;

      const text = await callGemini(systemPrompt, userContent);
      try {
        const parsed = parseJSON(text);
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse fix prompts" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ============================================================
    // ACTION: increment_usage (called after successful scan completion)
    // ============================================================
    if (action === "increment_usage") {
      const now = new Date();
      // Weekly counter (free)
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const mondayStr = monday.toISOString().split("T")[0];
      const { data: existingWeek } = await serviceClient
        .from("scan_usage")
        .select("id, scan_count")
        .eq("user_id", user.id)
        .eq("week_start", mondayStr)
        .maybeSingle();
      if (existingWeek) {
        await serviceClient.from("scan_usage").update({ scan_count: (existingWeek.scan_count || 0) + 1 }).eq("id", existingWeek.id);
      } else {
        await serviceClient.from("scan_usage").insert({ user_id: user.id, week_start: mondayStr, scan_count: 1 });
      }
      // Monthly counter (pro)
      if (userPlan === "pro") {
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const monthStr = monthStart.toISOString().split("T")[0];
        const { data: existingMonth } = await serviceClient
          .from("scan_usage_monthly")
          .select("id, scan_count")
          .eq("user_id", user.id)
          .eq("month_start", monthStr)
          .maybeSingle();
        if (existingMonth) {
          await serviceClient.from("scan_usage_monthly").update({ scan_count: (existingMonth.scan_count || 0) + 1 }).eq("id", existingMonth.id);
        } else {
          await serviceClient.from("scan_usage_monthly").insert({ user_id: user.id, month_start: monthStr, scan_count: 1 });
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("analyze error:", msg);
    if (msg === "RATE_LIMITED") {
      return new Response(JSON.stringify({ error: "AI rate limit hit. Please try again in a minute.", code: "RATE_LIMITED" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (msg === "CREDITS_EXHAUSTED") {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Contact support.", code: "CREDITS_EXHAUSTED" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Analysis failed. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
