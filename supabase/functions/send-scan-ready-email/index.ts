import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, emailShell, ctaButton } from "../_shared/email-brand.ts";

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
    const safeApp = String(app_name || "your app").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" } as any)[c]);
    const scoreRow = (score !== undefined && score !== null)
      ? `<div style="margin:0 0 24px;padding:18px 22px;background:${BRAND.cardInner};border:1px solid ${BRAND.border};border-radius:10px;">
           <p style="margin:0 0 4px;font-family:${BRAND.font};font-size:12px;color:${BRAND.textMuted};letter-spacing:0.5px;text-transform:uppercase;">Intent match score</p>
           <p style="margin:0;font-family:${BRAND.font};font-size:36px;font-weight:700;color:${BRAND.accent};line-height:1;">${score}<span style="font-size:18px;color:${BRAND.textMuted};">/100</span></p>
         </div>`
      : "";
    const body = `
      <tr><td style="padding:36px 40px;">
        <h2 style="margin:0 0 18px;font-family:${BRAND.font};font-size:24px;font-weight:700;color:${BRAND.text};line-height:1.3;">Your scan is ready.</h2>
        <p style="margin:0 0 22px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.textMuted};">
          We finished analyzing <strong style="color:${BRAND.text};">${safeApp}</strong>. Your founder-friendly report is waiting — open it to see what was built, what works, and the gaps to close before users find them.
        </p>
        ${scoreRow}
        ${ctaButton("View my report →", reportUrl)}
        <p style="margin:22px 0 0;font-family:${BRAND.font};font-size:12px;line-height:1.6;color:${BRAND.textDim};">
          AI-assisted review (Claude + Gemini cross-check), not a guaranteed audit. Verify findings before deploying.
        </p>
      </td></tr>`;
    const html = emailShell(body);

    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: BRAND.fromAddress,
        to: [user.email],
        subject: `Your scan of ${app_name || "your app"} is ready`,
        html,
        reply_to: BRAND.replyTo,
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
