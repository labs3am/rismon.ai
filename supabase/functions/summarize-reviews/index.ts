import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = ['risvan@labs3am.com', 'hello@rismon.ai'];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: reviews, error } = await service
      .from("report_reviews")
      .select("verdict, comment, finding_name, finding_severity, finding_category, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;
    if (!reviews || reviews.length === 0) {
      return new Response(JSON.stringify({ digest: "No reviews yet — wait for users to rate findings." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const counts = { accurate: 0, wrong: 0, unclear: 0 };
    for (const r of reviews) counts[r.verdict as keyof typeof counts]++;

    const wrongList = reviews.filter(r => r.verdict === 'wrong').slice(0, 80);
    const unclearList = reviews.filter(r => r.verdict === 'unclear').slice(0, 40);

    const lines: string[] = [];
    lines.push(`STATS: ${reviews.length} total reviews — accurate: ${counts.accurate}, wrong: ${counts.wrong}, unclear: ${counts.unclear}`);
    lines.push("\nWRONG FINDINGS (false positives reported by users):");
    for (const r of wrongList) {
      lines.push(`- [${r.finding_severity}] ${r.finding_name}${r.comment ? ` — "${r.comment}"` : ''}`);
    }
    lines.push("\nUNCLEAR FINDINGS:");
    for (const r of unclearList) {
      lines.push(`- ${r.finding_name}${r.comment ? ` — "${r.comment}"` : ''}`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are an analyst reviewing user feedback on an AI-powered code-scanning product called Rismon. Users mark each finding as accurate, wrong, or unclear. Produce a concise markdown digest for the product team. Sections: ## Top false positives (most-repeated wrong findings, ranked), ## Confusing findings (patterns of unclear feedback), ## Recommended scanner improvements (concrete prompt or rule changes). Be direct, no fluff. Quote real user comments where useful. If counts are tiny, say so honestly."
          },
          { role: "user", content: lines.join("\n") },
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited — please retry shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const digest = aiJson.choices?.[0]?.message?.content || "No digest produced.";

    return new Response(JSON.stringify({ digest, stats: counts, total: reviews.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-reviews error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
