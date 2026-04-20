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

// Hybrid: try Claude first (preserves the original report voice/structure).
// On 429 / 529 / 5xx, fall back to Lovable AI Gemini 2.5 Pro using the EXACT
// same system prompt — Claude's prompt already enforces the report style and
// JSON shape, so the output stays consistent.
async function callClaudeWithFallback(systemPrompt: string, userContent: string) {
  try {
    return await callClaude(systemPrompt, userContent);
  } catch (e: any) {
    if (e?.message === "CLAUDE_RETRYABLE") {
      console.warn(`Claude unavailable (${e.status}). Falling back to Gemini 2.5 Pro with Claude's prompt.`);
      // Reuse Claude's system prompt verbatim so the report style matches.
      // Do NOT append HOUSE_STYLE here — Claude's prompt already defines the voice.
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
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
    throw e;
  }
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
  try_pro: {
    weeklyScans: Infinity,
    monthlyScans: 100,
    maxRepoBytes: 10 * 1024 * 1024, // 10MB
    duplicateBlockHours: 0,
    edgeFunctionScan: true,
    verificationPass: true,
    emailDelivery: true,
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

async function checkAbuseLimits(serviceClient: any, userId: string, plan: "free" | "try_pro" | "pro", repoName: string, repoSizeBytes: number, currentScanSessionId?: string | null) {
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

    // Get user plan and deep_scan_credits from profiles
    const { data: profileRow } = await serviceClient
      .from("profiles")
      .select("plan, deep_scan_credits")
      .eq("id", user.id)
      .single();
    const rawPlan = profileRow?.plan || "free";
    const userPlan: "free" | "try_pro" | "pro" =
      rawPlan === "pro" ? "pro" : rawPlan === "try_pro" ? "try_pro" : "free";
    const deepScanCredits: number = profileRow?.deep_scan_credits ?? 3;
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
      // Check deep_scan_credits for try_pro before calling Claude
      if (userPlan === "try_pro" && deepScanCredits <= 0) {
        return new Response(
          JSON.stringify({ error: "No deep scan credits remaining", code: "no_credits" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scanTypeHint = scan_type === "deep"
        ? "This is a Deep Scan covering the complete codebase."
        : "This is a Quick Scan covering the most critical files only.";

      const claudeSystemPrompt = `You are Rismon, an expert at analyzing apps built with AI coding platforms like Lovable, Bolt, Cursor, and Replit.

${scanTypeHint}

CRITICAL CONTEXT:
These apps have a specific architecture:

1. GitHub contains React/TypeScript frontend code only.

2. Database lives in Supabase. Tables are NOT stored in GitHub. If you see supabase.from() calls the database EXISTS. NEVER say database is missing just because SQL files are not in GitHub.

3. Authentication is Supabase Auth. If you see supabase.auth calls real authentication EXISTS. NEVER say auth is fake if supabase.auth is used.

4. Backend logic lives in Supabase Edge Functions. If you see supabase.functions.invoke() a real backend EXISTS.

5. Payments are detected from imports. If Stripe/Razorpay/Paddle detected payment system EXISTS.

YOUR ONLY JOB:
Find gaps between what the founder meant to build and what was built. Find security issues that could hurt their business or users.

CRITICAL LANGUAGE RULES:
You are writing for someone who has never written a single line of code.

FORBIDDEN WORDS - NEVER USE THESE:
RLS, Row Level Security, JWT, CORS, CSP, XSS, CSRF, SQL injection, API endpoint, REST, GraphQL, Authentication, Authorization, Sanitization, Validation, Frontend, Backend, Server-side, Environment variable, Supabase, PostgreSQL, any database terms, any programming language names, any technical acronyms at all.

REQUIRED LANGUAGE:
Use everyday English only. Use "your app" not "the codebase". Use "your users data" not "database records". Use "anyone can access" not "unauthorized access". Use "your secret key" not "API key". Use "payment check" not "subscription validation". Always explain real world impact. Always use dollar amounts when relevant. Always use "you" and "your" to personalize.

TEST EVERY SENTENCE:
Would a restaurant owner understand this? If no — rewrite it completely.

WHAT TO LOOK FOR:

1. PAYMENT AND ACCESS GAPS
Check if payment logic is enforced:
- Free tier limits enforced server-side?
- Paid features checked before access?
- Subscription verified on every request?
- Trial expiry actually stops access?

2. DATA SEPARATION GAPS
Can users see each other's data?
- Missing user filter in queries?
- Shared data that should be private?
- Admin data visible to regular users?

3. ROLE AND PERMISSION GAPS
- Admin routes protected properly?
- Role checks in backend not just UI?
- Elevated permissions restricted?

4. BUSINESS RULE GAPS
- Usage limits actually enforced?
- Referral or discount rules limited?
- Cancellation logic correct?

5. SECURITY ISSUES
Run ALL five checks below on every scan. These checks are MANDATORY and independent of what the founder described. If a pattern exists in the code, flag it. No benefit of the doubt. No assumptions of safety.

CHECK A — EXPOSED SECRET KEYS:
Scan every frontend file for these exact patterns:
  - sk- (OpenAI key pattern)
  - const.*key.*= (any hardcoded key assignment)
  - VITE_ prefix variables assigned key values
  - apiKey = "..." (any hardcoded value in quotes)
  - Authorization.*Bearer.*" (hardcoded Bearer tokens)
If ANY of these patterns exist in a frontend file: CRITICAL severity. Always flag. Never skip.

CHECK B — DATA LEAK (missing user filter):
Look for Supabase queries like .from('tableName').select('*') that do NOT have .eq('user_id', ...) or any equivalent user-scoping filter.
If a user-owned table is queried without a user filter: CRITICAL severity. "All your users can see each other's data."

CHECK C — UNPROTECTED ADMIN PAGES:
Look for page components where:
  - The component name or route path contains "admin"
  - AND the component does NOT redirect unauthenticated users
  - AND there is no auth check before rendering
If found: CRITICAL severity. "Anyone who guesses the URL can access your admin panel."

CHECK D — HARDCODED BYPASS VALUES:
Look for patterns like:
  - const isPro = true
  - const isAdmin = true
  - Any boolean flag hardcoded to true inside auth or payment logic
If found: CRITICAL severity. "Your payment or permission check is permanently bypassed."

CHECK E — MISSING DATABASE PROTECTION:
If Supabase tables appear in the code (via .from() calls) but NO migration files contain any policy definitions (CREATE POLICY, ENABLE ROW LEVEL SECURITY, ALTER TABLE ... ENABLE ROW LEVEL SECURITY):
HIGH severity. "Your database tables may be completely open — anyone could read or delete all your users' data directly."

6. FALSE PROMISE DETECTION
These checks are MANDATORY on every scan. Search the homepage (index.html, landing page components, marketing copy in any component) for these exact claims. Then verify the claim against the actual code. If the code does not back up the claim, flag it as a false promise. No benefit of the doubt — if the code evidence is absent, flag it.

PROMISE A — "encrypted" or "end-to-end encrypted":
Search the codebase for encryption libraries (e.g. crypto, tweetnacl, libsodium, sjcl, CryptoJS, SubtleCrypto, webcrypto, forge).
If the homepage claims encryption but NO encryption library is imported or used anywhere: flag as false promise. Medium severity. "Your homepage promises encryption your app does not actually do."

PROMISE B — "real-time" or "live updates":
Search for WebSocket usage (new WebSocket, socket.io, ws://, wss://) OR Supabase realtime subscriptions (.channel(), .on('postgres_changes', ...), supabase.channel).
If the homepage claims real-time but NONE of these patterns exist: flag as false promise. Medium severity. "Your homepage says updates are live but the app actually requires a page refresh."

PROMISE C — "AI-powered" or "powered by AI":
Search backend/edge functions for AI API calls (openai, anthropic, @anthropic-ai, gemini, googleapis/ai, cohere, replicate).
  - If AI calls exist ONLY in frontend files with a hardcoded or VITE_-prefixed key: flag as BOTH a false promise AND a security issue (Critical). "Your AI key is exposed to anyone who opens your app."
  - If NO AI API calls exist anywhere: flag as false promise. Medium severity. "Your homepage claims AI features but no AI service is connected."

PROMISE D — "sync with [ServiceName]" or "integrates with [ServiceName]":
For each named third-party service in the homepage copy (e.g. Slack, Notion, Google Sheets, Zapier, HubSpot, Salesforce), search the codebase for that service's API domain or SDK import.
If the named integration is not found in the code: flag as false promise. Medium severity. "Your homepage advertises a [ServiceName] integration that does not exist in the code."

PROMISE E — "team collaboration", "invite your team", or "invite members":
Search for team/organisation logic: org_id, team_id, organization, invite, member_role, workspace.
If the homepage mentions team features but NO such logic exists in the code: flag as false promise. Medium severity. "Your homepage promises team features but there is no team logic in the app."

FOR EVERY FINDING USE THIS EXACT FORMAT:
Plain English title (max 8 words)
Plain English explanation (2-3 sentences)
Real world business impact (1-2 sentences)
Technical reference (5 words max)
Google search term to learn more
Exact fix prompt for Lovable or Cursor

SCORING:
Start at 100.
Deduct for each finding:
Critical: -25 points
High: -15 points
Medium: -8 points
Low: -2 points
False promise: -8 points each (applied in addition to the above if the false promise is also flagged as a separate severity)
Minimum score: 0. Maximum score: 100.

CRITICAL SCORE CAPS — APPLY THESE AFTER ALL DEDUCTIONS:
If 1 or more critical findings exist: score = min(score, 60)
If 2 or more critical findings exist: score = min(score, 35)
If 3 or more critical findings exist: score = min(score, 20)
A score of 90 or above is IMPOSSIBLE if any critical finding exists. Enforce this strictly.

LAUNCH READINESS:
90-100: Ready to launch
70-89: Almost ready
50-69: Needs work
30-49: Not ready
0-29: Critical issues

RESPOND IN THIS EXACT JSON FORMAT:
{
  "score": number,
  "grade": "A|B|C|D|F",
  "launch_status": "ready|almost|needs_work|not_ready|critical",
  "summary": "2 sentences. What app does well and biggest concern. Plain English.",
  "business_logic_gaps": [
    {
      "severity": "critical|high|medium|low",
      "title": "Plain English max 8 words",
      "explanation": "Plain English 2-3 sentences",
      "business_impact": "Real world consequence",
      "technical_reference": "5 words max technical term",
      "google_query": "exact search term",
      "fix_prompt": "Exact prompt to paste into Lovable or Cursor"
    }
  ],
  "security_findings": [
    {
      "severity": "critical|high|medium|low",
      "title": "Plain English max 8 words",
      "explanation": "Plain English 2-3 sentences",
      "business_impact": "Real world consequence",
      "technical_reference": "5 words max technical term",
      "google_query": "exact search term",
      "fix_prompt": "Exact prompt to paste into Lovable or Cursor"
    }
  ],
  "false_promises": [
    {
      "severity": "critical|medium",
      "claim": "Exact wording found on the homepage",
      "title": "Plain English max 8 words",
      "explanation": "Plain English 2-3 sentences",
      "business_impact": "Real world consequence",
      "technical_reference": "5 words max technical term",
      "google_query": "exact search term",
      "fix_prompt": "Exact prompt to paste into Lovable or Cursor"
    }
  ],
  "what_app_does_right": [
    "One sentence per positive finding"
  ],
  "next_step": "Single most important action to take first"
}

Maximum 5 business logic gaps. Maximum 5 security findings. Maximum 5 false promises. Always find at least 2 positives. Always include next_step. RESPOND WITH JSON ONLY. No other text.`;

      const claudeUserContent = `Scan type: ${scanType} (${scanType === "deep" ? "all repository files were fetched" : "only ~20 prioritized files were fetched — base findings on what is visible and avoid claiming a feature is missing if it could simply live in an unscanned file"})

App understanding: ${JSON.stringify(code_understanding)}

Founder described: ${founder_description}

Founder concern (most worried about): ${concern || "(none specified)"}

Project type: ${project_type || "unknown"}
Monetization: ${monetization || "unknown"}

Founder answers to smart questions: ${JSON.stringify(user_answers)}`;

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
        };
      };

      if (claudeResult && (claudeResult.business_logic_gaps || claudeResult.security_findings || typeof claudeResult.score === "number")) {
        const gapsArr = Array.isArray(claudeResult.business_logic_gaps) ? claudeResult.business_logic_gaps : [];
        const secArr = Array.isArray(claudeResult.security_findings) ? claudeResult.security_findings : [];
        const promisesArr = Array.isArray(claudeResult.false_promises) ? claudeResult.false_promises : [];
        const works = Array.isArray(claudeResult.what_works) ? claudeResult.what_works : [];

        const score = typeof claudeResult.score === "number" ? claudeResult.score : null;
        const summary = [claudeResult.summary, claudeResult.verdict].filter(Boolean).join(" ");

        claudeResult = {
          ...claudeResult,
          intent_match_score: score,
          gaps: gapsArr.map((g: any, i: number) => mapFinding(g, i, "g")),
          security_issues: secArr.map((s: any, i: number) => mapFinding(s, i, "s")),
          false_promises: promisesArr.map((p: any, i: number) => mapFinding(p, i, "p")),
          what_works: works,
          unknown_features: Array.isArray(claudeResult.unknown_features) ? claudeResult.unknown_features : [],
          summary: summary || claudeResult.summary || "",
        };
      }

      // Stage 4: Verification pass (Pro only) — Gemini Pro re-checks each gap against the facts
      if (limits.verificationPass && Array.isArray(claudeResult.gaps) && claudeResult.gaps.length > 0) {
        try {
          const verifySystem = `You verify whether each claimed gap is actually supported by the evidence. For each gap, decide: is the claim "what was built" actually true given the code understanding? Mark each gap "confirmed" or "rejected" with one short reason.

Return ONLY:
{ "verified": [{ "id": "g1", "verdict": "confirmed|rejected", "reason": "one short sentence" }] }`;
          const verifyUser = `Code understanding: ${JSON.stringify(code_understanding)}

Founder description: ${founder_description}

Claimed gaps to verify: ${JSON.stringify(claudeResult.gaps)}`;
          const verifyText = await callGemini(verifySystem, verifyUser, "google/gemini-2.5-pro");
          const verified = parseJSON(verifyText);
          if (Array.isArray(verified?.verified)) {
            const rejectedIds = new Set(verified.verified.filter((v: any) => v.verdict === "rejected").map((v: any) => v.id));
            claudeResult.gaps = claudeResult.gaps.filter((g: any) => !rejectedIds.has(g.id));
            claudeResult.verification_applied = true;
            claudeResult.verification_dropped = rejectedIds.size;
          }
        } catch (e) {
          console.error("Verification pass failed (non-fatal):", e);
        }
      }

      claudeResult.plan_at_scan = userPlan;
      claudeResult.scan_type = scan_type || (userPlan === "free" ? "quick" : "deep");
      claudeResult.edge_functions_scanned = limits.edgeFunctionScan;

      // Deduct one deep_scan_credit for try_pro after successful scan
      if (userPlan === "try_pro") {
        await serviceClient
          .from("profiles")
          .update({ deep_scan_credits: Math.max(0, deepScanCredits - 1) })
          .eq("id", user.id)
          .eq("plan", "try_pro");
      }

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
      // Monthly counter (pro and try_pro)
      if (userPlan === "pro" || userPlan === "try_pro") {
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
