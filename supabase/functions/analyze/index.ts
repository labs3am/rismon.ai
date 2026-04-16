import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pre-analysis security checks on code bundle
function runSecurityPreChecks(codeBundle: string, supabaseUrl?: string, supabaseAnonKey?: string) {
  const findings: any[] = [];

  // Check 1: Exposed secrets in code
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
      findings.push({
        type: "exposed_secret",
        key_type: sp.type,
        severity: "critical",
        found: true,
      });
    }
  }

  // Check for Supabase service role key in code
  if (/eyJhbGciOiJIUzI1NiJ9/.test(codeBundle) && /service_role/.test(codeBundle)) {
    findings.push({
      type: "exposed_secret",
      key_type: "Supabase service role key",
      severity: "critical",
      found: true,
    });
  }

  // Check 3: Environment variable usage
  const usesEnvVars = /process\.env|import\.meta\.env/.test(codeBundle);
  const hasHardcodedKeys = secretPatterns.some(sp => sp.pattern.test(codeBundle));
  if (hasHardcodedKeys && !usesEnvVars) {
    findings.push({
      type: "env_vars_not_used",
      severity: "high",
      found: true,
      detail: "Secrets found in code but no environment variable usage detected",
    });
  }

  return findings;
}

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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, codeBundle, tableNames, platform, code_understanding, founder_description, user_answers, gaps, security_issues, unknown_features, supabase_url: appSupabaseUrl, supabase_anon_key: appSupabaseAnonKey, app_id, github_owner, github_repo_name } = await req.json();

    // Server-side scan limit enforcement (3 scans per week)
    if (action === "read_code") {
      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const now = new Date();
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const mondayStr = monday.toISOString().split("T")[0];
      const { data: usageRows } = await serviceClient
        .from("scan_usage")
        .select("scan_count")
        .eq("user_id", user.id)
        .eq("week_start", mondayStr);
      const total = (usageRows || []).reduce((s: number, l: any) => s + (l.scan_count || 0), 0);
      if (total >= 3) {
        return new Response(JSON.stringify({ error: "Weekly scan limit reached", code: "LIMIT_REACHED" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_KEY");
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_KEY not configured");

    let systemPrompt = "";
    let userContent = "";

    if (action === "read_code") {
      // Validate repo matches saved app if app_id provided
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

      // Run pre-checks before sending to Claude
      const securityPreFound = runSecurityPreChecks(codeBundle || "", appSupabaseUrl, appSupabaseAnonKey);

      // Check RLS if Supabase connected
      let rlsFindings: any[] = [];
      if (appSupabaseUrl && appSupabaseAnonKey) {
        try {
          const res = await fetch(`${appSupabaseUrl}/rest/v1/`, {
            headers: { apikey: appSupabaseAnonKey, Authorization: `Bearer ${appSupabaseAnonKey}` }
          });
          if (res.ok) {
            const tables = await res.json();
            const tableList = typeof tables === 'object' ? Object.keys(tables) : [];
            // Note: We can detect tables but can't check RLS from anon key alone
            // We flag this for Claude to investigate in code
            if (tableList.length > 0) {
              rlsFindings.push({
                type: "tables_detected",
                tables: tableList,
                note: "Check if these tables have RLS enabled",
              });
            }
          }
        } catch { /* ignore fetch errors */ }
      }

      const preCheckContext = securityPreFound.length > 0 || rlsFindings.length > 0
        ? `\n\nIMPORTANT PRE-SCAN FINDINGS: We already detected these security issues before your analysis:\n${JSON.stringify([...securityPreFound, ...rlsFindings])}\nInclude these in your response and add any additional issues you find.`
        : "";

      systemPrompt = `You are the Rismon.ai agent. Read this code carefully and understand the app completely BEFORE asking the founder anything. Extract: what features exist, what user roles exist, whether payments exist, what routes exist, what tables are used, what is protected vs public, what coding patterns are used, any features that seem unintentional or extra that the founder may not have asked for. Form your own complete understanding of what was built. Then generate targeted questions to verify the founder's intent. Questions must be based ONLY on what you found in the code, specific to this app, plain English, maximum 8 questions, each showing what you found before asking.${preCheckContext} Return ONLY valid JSON: { app_understanding: { features_found: [], user_roles_found: [], has_payments_code: boolean, has_admin: boolean, has_messaging: boolean, database_tables: [], protected_routes: [], public_routes: [], unknown_features: [], code_style: string, platform_detected: string, business_type_guess: string }, questions: [{ id: string, question: string, context: string, answer_type: "yes_no" or "text" or "select", options: [] }] }`;
      userContent = `Code:\n${codeBundle}\n\nDatabase tables: ${tableNames || "unknown"}\nPlatform: ${platform || "unknown"}`;
    } else if (action === "analyze") {
      systemPrompt = `You are Rismon, an expert at analyzing apps built with AI coding platforms like Lovable, Bolt, Cursor, and Replit.

CRITICAL CONTEXT:
These apps have a specific architecture:
1. GitHub contains React/TypeScript frontend code only.
2. Database lives in Supabase PostgreSQL. Tables are NOT stored in GitHub. If you see supabase.from() calls in the code — the database EXISTS. NEVER say database is missing just because SQL files are not in GitHub.
3. Authentication is Supabase Auth. If you see supabase.auth calls — real authentication EXISTS. NEVER say auth is fake if supabase.auth is used.
4. Backend logic lives in Supabase Edge Functions. If you see supabase.functions.invoke() — a real backend EXISTS.
5. Payments are usually Stripe. If you see loadStripe() or stripe imports — Stripe EXISTS. Check if it's test mode or live mode.

YOUR ONLY JOB: Find gaps between what the founder described and what the code does. You are NOT a general security scanner. You are NOT a code quality reviewer. You are a business logic gap finder.

WHAT TO LOOK FOR:
1. PAYMENT GAPS - Does code enforce what founder described? Free tier limits: server-side or only hidden in React components? Paid features: is payment checked before granting access? Subscription: verified on every request or only at login?
2. DATA SEPARATION GAPS - Can User A see User B's data? Check Supabase query patterns. Look for .eq('user_id', user.id). Missing user filter = data leak.
3. ROLE AND PERMISSION GAPS - Admin routes: protected server-side? Role checks: backend or frontend only?
4. BUSINESS RULE GAPS - Usage limits enforced? Trial expiry implemented? Feature flags server-side?
5. FLOW GAPS - Can payment step be skipped? Can required steps be bypassed?

ACCURACY RULES:
- Only report something MISSING if you have strong evidence it does not exist anywhere in the codebase
- Supabase client usage proves database and auth exist
- Frontend-only checks are a gap — but the feature itself exists
- Do not penalize for keeping backend in Supabase

RESPONSE FORMAT: Return ONLY valid JSON. No other text.
{ "score": 0-100, "grade": "A|B|C|D|F", "summary": "2 sentences. What app does well and biggest gap.", "business_logic_gaps": [{ "severity": "critical|high|medium", "title": "Plain English. Max 8 words.", "you_described": "What founder said", "what_was_built": "What code actually does", "business_impact": "Real world consequence", "fix_prompt": "Exact prompt to paste into Lovable or Cursor" }], "security_findings": [{ "severity": "critical|high|medium|low", "title": "Plain English title", "description": "What the issue is", "business_impact": "Why it matters", "fix_prompt": "Exact fix prompt" }], "what_app_does_right": ["One sentence per positive finding"] }
Maximum 5 business logic gaps. Maximum 5 security findings. Always find at least 2 positives.`;
      userContent = `App understanding: ${JSON.stringify(code_understanding)}\n\nFounder described: ${founder_description}\n\nFounder answers: ${JSON.stringify(user_answers)}`;
    } else if (action === "generate_fixes") {
      systemPrompt = `You are the Rismon.ai agent. Generate specific fix prompts for this app. Each prompt must: match the app's exact code style and patterns, use their actual variable and table names where known, be specific to their platform, be written in plain English with clear step by step instructions, be ready to copy and paste with no modification needed. Return ONLY valid JSON: { fix_prompts: [{ fix_id: string, title: string, platform: "lovable" or "cursor" or "supabase" or "general", prompt: string, where_to_paste: string, expected_result: string }] }`;
      userContent = `Platform: ${platform || "unknown"}\nGaps: ${JSON.stringify(gaps)}\nSecurity issues: ${JSON.stringify(security_issues)}\nUnknown features: ${JSON.stringify(unknown_features)}\nApp understanding: ${JSON.stringify(code_understanding)}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (!response.ok) {
      console.error("Anthropic error:", response.status);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const claudeData = await response.json();
    const text = claudeData.content?.[0]?.text || "";

    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    try {
      const parsed = JSON.parse(jsonStr.trim());
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch {
      console.error("Failed to parse Claude response");
      return new Response(JSON.stringify({ error: "Failed to parse analysis" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error("analyze error:", e instanceof Error ? e.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Analysis failed. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
