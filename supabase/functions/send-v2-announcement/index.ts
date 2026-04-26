// One-off broadcast: announce Rismon.ai v2 improvements to existing users.
//
// HOW TO TRIGGER (manual, one-time):
//
// Preview (no emails sent — returns recipient list + sample HTML):
//   curl -X POST \
//     "<SUPABASE_URL>/functions/v1/send-v2-announcement?preview=true" \
//     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
//
// Send to a single test address first (recommended):
//   curl -X POST "<SUPABASE_URL>/functions/v1/send-v2-announcement" \
//     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
//     -H "Content-Type: application/json" \
//     -d '{"only_emails":["you@example.com"]}'
//
// Send to everyone:
//   curl -X POST "<SUPABASE_URL>/functions/v1/send-v2-announcement" \
//     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
//
// This is intentionally NOT scheduled. Run it once when v2 ships.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, emailShell, ctaButton } from "../_shared/email-brand.ts";
import { requireBroadcastSecret } from "../_shared/broadcast-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-broadcast-secret",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const SUBJECT = "We just made Rismon.ai better";

function buildHtml(userName: string): string {
  const name = (userName || "").trim().split(/\s+/)[0] || "there";

  const changeRow = (num: string, title: string, desc: string, isLast: boolean) => `
    <tr>
      <td style="padding:18px 0;${!isLast ? `border-bottom:1px solid ${BRAND.border};` : ""}">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40" valign="top">
              <div style="width:30px;height:30px;border-radius:8px;background-color:${BRAND.accent};color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:30px;font-family:${BRAND.font};">${num}</div>
            </td>
            <td style="padding-left:14px;" valign="top">
              <p style="margin:0 0 4px;font-family:${BRAND.font};font-size:15px;font-weight:600;color:${BRAND.text};line-height:1.3;">${title}</p>
              <p style="margin:0;font-family:${BRAND.font};font-size:13px;line-height:1.6;color:${BRAND.textMuted};">${desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const body = `
    <tr><td style="padding:36px 40px;">

      <p style="margin:0 0 6px;font-family:${BRAND.font};font-size:11px;color:${BRAND.accent};letter-spacing:1px;text-transform:uppercase;font-weight:600;">Version 2 · Now live</p>
      <h2 style="margin:0 0 18px;font-family:${BRAND.font};font-size:26px;font-weight:700;color:${BRAND.text};line-height:1.25;">
        We just made Rismon.ai better.
      </h2>

      <p style="margin:0 0 14px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.text};">Hi ${name},</p>

      <p style="margin:0 0 24px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.textMuted};">
        We have been working on Rismon since you signed up and just shipped some meaningful improvements. Here is what changed:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background-color:${BRAND.cardInner};border:1px solid ${BRAND.border};border-radius:12px;padding:6px 22px;">
        ${changeRow("1", "Smarter questions", "We read your code first, then ask only questions that matter for your app. No generic questions that do not apply.", false)}
        ${changeRow("2", "Two AI models", "Claude and Gemini now both verify every finding. You only see what both agree on. Fewer false alarms.", false)}
        ${changeRow("3", "Better scoring", `Your score now reflects what we actually found. We published the exact math at <a href="${BRAND.url}" style="color:${BRAND.accent};text-decoration:none;">rismon.ai</a> so you can verify it yourself.`, false)}
        ${changeRow("4", "Supabase support", "Connect your Supabase project for verified findings instead of guesses. Optional, but much more accurate.", true)}
      </table>

      <p style="margin:0 0 24px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.text};">
        Your next scan will feel different. <span style="color:${BRAND.textMuted};">Faster to complete and more accurate.</span>
      </p>

      ${ctaButton("Scan your app now →", BRAND.dashboardUrl)}
      <div style="height:24px;"></div>

      <div style="background-color:${BRAND.cardInner};border:1px solid ${BRAND.border};border-radius:10px;padding:18px 22px;">
        <p style="margin:0 0 4px;font-family:${BRAND.font};font-size:13px;font-weight:600;color:${BRAND.text};">💬 Stuck or need help?</p>
        <p style="margin:0;font-family:${BRAND.font};font-size:13px;line-height:1.6;color:${BRAND.textMuted};">
          Just hit reply. We read every message — no bots, no tickets. <a href="mailto:${BRAND.replyTo}" style="color:${BRAND.accent};text-decoration:none;">${BRAND.replyTo}</a>
        </p>
      </div>

      <p style="margin:24px 0 0;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.textDim};">
        — The Rismon team
      </p>

    </td></tr>`;

  return emailShell(body);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const denied = requireBroadcastSecret(req);
  if (denied) return denied;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .not("email", "is", null);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw new Error("Failed to fetch profiles");
    }

    const allUsers = (profiles || []).filter((p) => p.email);

    // Optional filter: only_emails in body
    let onlyEmails: string[] | null = null;
    try {
      const body = await req.json();
      if (body?.only_emails && Array.isArray(body.only_emails)) {
        onlyEmails = body.only_emails.map((e: string) => e.toLowerCase());
      }
    } catch { /* no body or invalid JSON, fine */ }

    const finalList = onlyEmails
      ? allUsers.filter((u) => onlyEmails!.includes(String(u.email).toLowerCase()))
      : allUsers;

    const url = new URL(req.url);
    const isPreview = url.searchParams.get("preview") === "true";

    if (isPreview) {
      return new Response(
        JSON.stringify({
          preview: true,
          subject: SUBJECT,
          recipients: finalList.map((u) => ({ name: u.full_name, email: u.email })),
          total: finalList.length,
          sample_html: buildHtml(finalList[0]?.full_name || "Founder"),
        }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (finalList.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recipients matched", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const errors: string[] = [];

    for (const user of finalList) {
      // 600ms gap between sends to stay well under provider rate limits
      await new Promise((r) => setTimeout(r, 600));
      try {
        const res = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: BRAND.fromAddress,
            to: [user.email],
            subject: SUBJECT,
            html: buildHtml(user.full_name || ""),
            reply_to: BRAND.replyTo,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const errBody = await res.text();
          console.error(`Failed to send to ${user.email}: ${res.status} ${errBody}`);
          errors.push(`${user.email}: ${res.status}`);
        }
      } catch (e) {
        console.error(`Error sending to ${user.email}:`, e);
        errors.push(`${user.email}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return new Response(
      JSON.stringify({ sent, total: finalList.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("v2 announcement error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});