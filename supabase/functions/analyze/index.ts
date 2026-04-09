import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, codeBundle, tableNames, platform, code_understanding, founder_description, user_answers, gaps, security_issues, unknown_features } = await req.json();
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_KEY");
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_KEY not configured");

    let systemPrompt = "";
    let userContent = "";

    if (action === "read_code") {
      systemPrompt = `You are the Rismon.ai agent. Read this code carefully and understand the app completely BEFORE asking the founder anything. Extract: what features exist, what user roles exist, whether payments exist, what routes exist, what tables are used, what is protected vs public, what coding patterns are used, any features that seem unintentional or extra that the founder may not have asked for. Form your own complete understanding of what was built. Then generate targeted questions to verify the founder's intent. Questions must be based ONLY on what you found in the code, specific to this app, plain English, maximum 8 questions, each showing what you found before asking. Return ONLY valid JSON: { app_understanding: { features_found: [], user_roles_found: [], has_payments_code: boolean, has_admin: boolean, has_messaging: boolean, database_tables: [], protected_routes: [], public_routes: [], unknown_features: [], code_style: string, platform_detected: string, business_type_guess: string }, questions: [{ id: string, question: string, context: string, answer_type: "yes_no" or "text" or "select", options: [] }] }`;
      userContent = `Code:\n${codeBundle}\n\nDatabase tables: ${tableNames || "unknown"}\nPlatform: ${platform || "unknown"}`;
    } else if (action === "analyze") {
      systemPrompt = `You are the Rismon.ai agent. You have already studied this app's code and formed your own understanding. Now compare that understanding with what the founder told you their app should do. Find ALL gaps between their intent and what was actually built. Think like a smart business advisor who can read code. Never use technical jargon. Plain English always. Maximum 5 gaps — only report what you are certain about. Also find security issues and unknown features. Return ONLY valid JSON: { intent_match_score: 0-100, summary: "string 2-3 sentences plain English", gaps: [{ id: string, severity: "critical" or "high" or "medium" or "low", title: "max 8 words plain English", you_said: "what founder described", what_was_built: "what code does", business_impact: "real consequence plain English" }], unknown_features: [{ id: string, feature_name: string, description: "what it does plain English", found_where: "file or table name", risk_if_kept: string, risk_if_removed: string }], security_issues: [{ id: string, severity: string, title: string, explanation: "plain English", business_impact: string }], what_works: ["string"] }`;
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
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const claudeData = await response.json();
    const text = claudeData.content?.[0]?.text || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    try {
      const parsed = JSON.parse(jsonStr.trim());
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch {
      console.error("Failed to parse Claude response:", text.slice(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse analysis" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error("analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
