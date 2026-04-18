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

async function callGemini(systemPrompt: string, userContent: string, model = "google/gemini-2.5-flash") {
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
    const body = await res.text();
    console.error(`Gemini error [${status}]:`, body.slice(0, 500));
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status === 402) throw new Error("CREDITS_EXHAUSTED");
    throw new Error("AI_ERROR");
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
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
    console.error("Claude error:", res.status);
    throw new Error("AI_ERROR");
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
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

async function checkAbuseLimits(serviceClient: any, userId: string, plan: "free" | "pro", repoName: string, repoSizeBytes: number) {
  const limits = PLAN_LIMITS[plan];

  // 1. Repo size cap
  if (repoSizeBytes > limits.maxRepoBytes) {
    return { ok: false, code: "REPO_TOO_LARGE", message: `Repository code exceeds ${plan === "free" ? "2MB" : "10MB"} limit. ${plan === "free" ? "Upgrade to Pro for 10MB scans." : "Contact support for larger repos."}` };
  }

  // 2. Concurrent scan lock
  const { data: active } = await serviceClient
    .from("scan_sessions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["pending", "analyzing"])
    .limit(1);
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
      const limitCheck = await checkAbuseLimits(serviceClient, user.id, userPlan, repoName, repoSizeBytes);
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

FINDINGS FORMAT:
For each issue found return:
{
  "severity": "critical|high|medium|low",
  "title": "Plain English max 8 words",
  "what_we_found": "One sentence. What exists in the code. No technical terms.",
  "what_this_means": "Real world consequence. Use dollar amounts if relevant. Use number of users if relevant. Max 2 sentences.",
  "how_to_fix": "Plain English steps. What to do in Lovable or Cursor.",
  "fix_prompt": "Exact prompt to paste into Lovable or Cursor. Ready to use. No editing needed.",
  "technical_reference": "Short technical name for developers to Google. Max 5 words. Example: supabase-rls-not-enabled",
  "google_query": "Exact search term. Example: supabase row level security"
}

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

Maximum 5 business logic gaps.
Maximum 5 security findings.
Always find at least 2 positives.
Always personalize to their app type.
Never use technical jargon anywhere.

RESPOND WITH JSON ONLY.
No text before or after the JSON.`;

      const claudeUserContent = `Scan type: ${scanType} (${scanType === "deep" ? "all repository files were fetched" : "only ~20 prioritized files were fetched — base findings on what is visible and avoid claiming a feature is missing if it could simply live in an unscanned file"})

App understanding: ${JSON.stringify(code_understanding)}

Founder described: ${founder_description}

Founder concern (most worried about): ${concern || "(none specified)"}

Project type: ${project_type || "unknown"}
Monetization: ${monetization || "unknown"}

Founder answers to smart questions: ${JSON.stringify(user_answers)}`;

      const claudeText = await callClaude(claudeSystemPrompt, claudeUserContent);
      let claudeResult: any;
      try {
        claudeResult = parseJSON(claudeText);
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse analysis" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
