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

    // Atomic "send-once" guard. claim_scan_ready_email() flips
    // scan_sessions.scan_ready_email_sent_at from NULL -> now() in a single
    // UPDATE and returns true only for the caller that won the race.
    // Every other tab / reload / overlapping poll tick gets `false` and
    // exits before any email is dispatched.
    const { data: claimed, error: claimErr } = await supabase
      .rpc("claim_scan_ready_email", { _report_id: report_id });
    if (claimErr) {
      console.error("claim_scan_ready_email failed:", claimErr.message);
      return new Response(JSON.stringify({ error: "Could not claim email send" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!claimed) {
      // Already sent for this report (or scan_session not in 'complete' yet).
      // Treat as a successful no-op so the client never retries.
      return new Response(JSON.stringify({ ok: true, skipped: "already_sent" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reportUrl = `https://rismon.ai/report/${report_id}`;
    const safeApp = String(app_name || "your app").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" } as any)[c]);

    // Score band: tonal accent strip based on the number.
    const numericScore = (typeof score === "number") ? score : (score ? Number(score) : null);
    const scoreLabel = numericScore === null
      ? ""
      : numericScore >= 85 ? "Strong" : numericScore >= 70 ? "Solid" : numericScore >= 50 ? "Needs work" : "Critical gaps";

    const scoreBlock = (numericScore !== null && !Number.isNaN(numericScore))
      ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:linear-gradient(180deg,${BRAND.cardInner} 0%,${BRAND.card} 100%);border:1px solid ${BRAND.borderSubtle};border-radius:14px;">
          <tr><td style="padding:26px 28px;">
            <p style="margin:0 0 10px;font-family:${BRAND.font};font-size:10px;font-weight:600;color:${BRAND.textMuted};letter-spacing:1.4px;text-transform:uppercase;">Intent match score</p>
            <table cellpadding="0" cellspacing="0"><tr>
              <td valign="bottom" style="font-family:${BRAND.font};font-size:56px;font-weight:700;color:${BRAND.accent};line-height:0.95;letter-spacing:-0.04em;">${numericScore}</td>
              <td valign="bottom" style="padding:0 0 8px 6px;font-family:${BRAND.font};font-size:18px;font-weight:500;color:${BRAND.textDim};line-height:1;">/100</td>
              <td valign="bottom" style="padding:0 0 10px 16px;font-family:${BRAND.font};font-size:12px;font-weight:600;color:${BRAND.text};letter-spacing:0.4px;text-transform:uppercase;">
                <span style="display:inline-block;padding:5px 10px;border:1px solid ${BRAND.borderSubtle};border-radius:999px;background:${BRAND.bg};">${scoreLabel}</span>
              </td>
            </tr></table>
          </td></tr>
        </table>`
      : "";

    const body = `
      <tr><td style="padding:44px 44px 8px;">
        <p style="margin:0 0 14px;font-family:${BRAND.font};font-size:11px;font-weight:600;color:${BRAND.accent};letter-spacing:1.6px;text-transform:uppercase;">Scan complete</p>
        <h1 style="margin:0 0 14px;font-family:${BRAND.font};font-size:30px;font-weight:700;color:${BRAND.text};line-height:1.18;letter-spacing:-0.02em;">
          Your report for <span style="color:${BRAND.accent};">${safeApp}</span> is ready.
        </h1>
        <p style="margin:0 0 30px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.textMuted};">
          Two models reviewed your code — independently — and we kept only the findings they agreed on. No noise, no false alarms, no jargon.
        </p>

        ${scoreBlock}

        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
          <tr>
            <td width="33%" valign="top" style="padding:14px 14px 14px 0;border-top:1px solid ${BRAND.border};">
              <p style="margin:0 0 6px;font-family:${BRAND.font};font-size:11px;font-weight:600;color:${BRAND.textDim};letter-spacing:1px;text-transform:uppercase;">Built</p>
              <p style="margin:0;font-family:${BRAND.font};font-size:14px;color:${BRAND.text};line-height:1.4;">What's actually in your code</p>
            </td>
            <td width="33%" valign="top" style="padding:14px;border-top:1px solid ${BRAND.border};">
              <p style="margin:0 0 6px;font-family:${BRAND.font};font-size:11px;font-weight:600;color:${BRAND.textDim};letter-spacing:1px;text-transform:uppercase;">Working</p>
              <p style="margin:0;font-family:${BRAND.font};font-size:14px;color:${BRAND.text};line-height:1.4;">Verified end-to-end</p>
            </td>
            <td width="34%" valign="top" style="padding:14px 0 14px 14px;border-top:1px solid ${BRAND.border};">
              <p style="margin:0 0 6px;font-family:${BRAND.font};font-size:11px;font-weight:600;color:${BRAND.textDim};letter-spacing:1px;text-transform:uppercase;">Gaps</p>
              <p style="margin:0;font-family:${BRAND.font};font-size:14px;color:${BRAND.text};line-height:1.4;">Fix before users find them</p>
            </td>
          </tr>
        </table>

        ${ctaButton("Open my report  →", reportUrl)}

        <p style="margin:28px 0 0;font-family:${BRAND.font};font-size:13px;line-height:1.7;color:${BRAND.textMuted};text-align:center;">
          Or paste this link into your browser:<br/>
          <a href="${reportUrl}" style="color:${BRAND.accent};text-decoration:none;word-break:break-all;">${reportUrl}</a>
        </p>
      </td></tr>

      <tr><td style="padding:32px 44px 36px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cardInner};border:1px solid ${BRAND.border};border-radius:12px;">
          <tr><td style="padding:18px 22px;">
            <p style="margin:0 0 4px;font-family:${BRAND.font};font-size:12px;font-weight:600;color:${BRAND.text};">A quiet note on accuracy.</p>
            <p style="margin:0;font-family:${BRAND.font};font-size:12px;line-height:1.65;color:${BRAND.textDim};">
              Rismon is an AI-assisted review (Claude + Gemini cross-check), not a certified audit. Verify the high-impact findings before shipping changes — and reply to this email if anything looks off. We read every message.
            </p>
          </td></tr>
        </table>
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
