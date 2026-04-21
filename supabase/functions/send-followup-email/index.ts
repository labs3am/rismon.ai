// HOW TO TRIGGER THIS FUNCTION
// This function is NOT called from the frontend. It must be triggered manually
// or via an automated job. Two options:
//
// Option A — pg_cron (recommended):
//   Install pg_cron in your Supabase project (Database → Extensions → pg_cron),
//   then run in the SQL editor:
//     SELECT cron.schedule(
//       'weekly-followup-email',
//       '0 10 * * 2',  -- every Tuesday at 10:00 UTC
//       $$
//         SELECT net.http_post(
//           url := '<YOUR_SUPABASE_URL>/functions/v1/send-followup-email',
//           headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//         );
//       $$
//     );
//
// Option B — Supabase Webhook:
//   Dashboard → Database → Webhooks → Create webhook
//   Table: profiles, Event: INSERT
//   HTTP URL: <YOUR_SUPABASE_URL>/functions/v1/send-followup-email
//   Headers: Authorization: Bearer <ANON_KEY>
//
// Manual trigger (preview mode):
//   curl -X POST <URL>/functions/v1/send-followup-email?preview=true \
//     -H "Authorization: Bearer <ANON_KEY>"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, wordmark, emailHeader, emailFooter, ctaButton } from "../_shared/email-brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function buildFollowUpHtml(userName: string): string {
  const name = userName || "there";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:${BRAND.font};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:${BRAND.card};border-radius:14px;overflow:hidden;border:1px solid ${BRAND.border};">
        ${emailHeader()}

        <!-- Body -->
        <tr><td style="padding:36px 40px;">

          <h2 style="margin:0 0 24px;font-size:26px;font-weight:700;color:#f5f5f5;line-height:1.3;">
            Hey ${name}, quick check-in.
          </h2>

          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#d4d4d8;">
            We noticed you signed up for Rismon.ai — and we genuinely want to know:
          </p>

          <h3 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#f97316;">
            Is everything working for you?
          </h3>

          <!-- Warning box -->
          <div style="background-color:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:24px 28px;margin:0 0 24px;">
            <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#ef4444;">⚠️ What we've been finding in other apps:</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:8px 0;color:#fca5a5;font-size:14px;line-height:1.6;">
                <strong style="color:#f87171;">73%</strong> of AI-built apps have at least one critical security flaw — exposed API keys, unprotected admin routes, or public database access.
              </td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid rgba(239,68,68,0.15);color:#fca5a5;font-size:14px;line-height:1.6;">
                <strong style="color:#f87171;">41%</strong> have payment features that users can bypass entirely — paid plans with no actual gate.
              </td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid rgba(239,68,68,0.15);color:#fca5a5;font-size:14px;line-height:1.6;">
                <strong style="color:#f87171;">58%</strong> have features the founder never asked for — the AI just added them. Some are broken. Some expose data.
              </td></tr>
            </table>
          </div>

          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#d4d4d8;">
            These aren't edge cases. These are <strong style="color:#f5f5f5;">everyday apps built with Lovable, Bolt, Cursor, and Replit.</strong> The founders had no idea until they ran a scan.
          </p>

          <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#d4d4d8;">
            If you've hit any issues — connecting your repo, understanding your report, or anything else — <strong style="color:#f5f5f5;">just hit reply.</strong> We read every single message. No bots. No tickets. Just us.
          </p>

          ${ctaButton("Go to my dashboard →", BRAND.dashboardUrl)}
          <div style="height:20px;"></div>

          <!-- Scary stat box -->
          <div style="background-color:#111111;border:1px solid #1a1a1a;border-radius:12px;padding:24px 28px;margin:0 0 28px;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#f5f5f5;">🔍 Did you know?</p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#a1a1aa;">
              The average AI-built app takes <strong style="color:#d4d4d8;">67 seconds</strong> to scan with Rismon. In that time, we check your security, permissions, payment gates, and feature integrity. Most founders are surprised by what we find.
            </p>
          </div>

          <!-- Reply box -->
          <div style="background-color:#111111;border-radius:10px;padding:20px 24px;border:1px solid #1a1a1a;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#f5f5f5;">💬 Having any issues? Just reply to this email.</p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#a1a1aa;">
              Seriously — we want to hear from you. Whether it's a bug, a question, or feedback on what we could do better. Hit reply. We'll get back to you personally.
            </p>
          </div>

        </td></tr>

        ${emailFooter()}

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    if (profilesError) throw new Error("Failed to fetch profiles");

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users found", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for optional filters
    let onlyEmails: string[] | null = null;
    try {
      const body = await req.json();
      if (body?.only_emails && Array.isArray(body.only_emails)) {
        onlyEmails = body.only_emails;
      }
    } catch { /* no body */ }

    const finalList = onlyEmails
      ? profiles.filter((u: any) => u.email && onlyEmails!.includes(u.email))
      : profiles.filter((u: any) => u.email);

    const url = new URL(req.url);
    const isPreview = url.searchParams.get("preview") === "true";

    if (isPreview) {
      return new Response(
        JSON.stringify({
          preview: true,
          recipients: finalList.map((u: any) => ({ name: u.full_name, email: u.email })),
          total: finalList.length,
          sample_html: buildFollowUpHtml(finalList[0]?.full_name || "Founder"),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const errors: string[] = [];

    for (const user of finalList) {
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
            from: "Rismon.ai <hello@rismon.ai>",
            to: [user.email],
            subject: "Quick check-in — is everything working?",
            html: buildFollowUpHtml(user.full_name || ""),
            reply_to: "hello@rismon.ai",
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const errBody = await res.text();
          console.error(`Failed: ${user.email}: ${res.status} ${errBody}`);
          errors.push(`${user.email}: ${res.status}`);
        }
      } catch (e) {
        console.error(`Error: ${user.email}:`, e);
        errors.push(`${user.email}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return new Response(
      JSON.stringify({ sent, total: finalList.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Follow-up error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
