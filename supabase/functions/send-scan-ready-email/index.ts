import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { report_id, app_name, score } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: "report_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify the report belongs to this user
    const { data: analysis } = await supabase
      .from("analyses")
      .select("id, user_id")
      .eq("id", report_id)
      .single();
    if (!analysis || analysis.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Report not found" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reportUrl = `https://rismon.ai/report/${report_id}`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;background:#0a0a0a;padding:40px 20px;color:#f5f5f5">
        <div style="max-width:520px;margin:0 auto;background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:32px">
          <h1 style="font-size:22px;margin:0 0 16px;color:#fff">Your scan is ready</h1>
          <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px">
            We finished analyzing <strong style="color:#fff">${app_name || "your app"}</strong>.
            ${score !== undefined && score !== null ? `Your intent match score: <strong style="color:#f97316">${score}</strong>.` : ""}
          </p>
          <a href="${reportUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View your report</a>
          <p style="color:#71717a;font-size:12px;margin:24px 0 0">
            AI-assisted code review, not a guaranteed audit. Verify findings before deploying.
          </p>
        </div>
      </div>
    `;

    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Rismon.ai <onboarding@resend.dev>",
        to: [user.email],
        subject: `Your scan of ${app_name || "your app"} is ready`,
        html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend error:", res.status, txt);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-scan-ready-email error:", e instanceof Error ? e.message : "Unknown");
    return new Response(JSON.stringify({ error: "Email delivery failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
