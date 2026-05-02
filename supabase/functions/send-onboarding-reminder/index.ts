// HOW TO TRIGGER THIS FUNCTION
// This function is NOT called from the frontend. It must be triggered manually
// or via an automated job. It emails users who signed up but never ran a scan.
//
// Option A — pg_cron (recommended):
//   Install pg_cron in your Supabase project (Database → Extensions → pg_cron),
//   then run in the SQL editor:
//     SELECT cron.schedule(
//       'daily-onboarding-reminder',
//       '0 11 * * *',  -- every day at 11:00 UTC
//       $$
//         SELECT net.http_post(
//           url := '<YOUR_SUPABASE_URL>/functions/v1/send-onboarding-reminder',
//           headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//         );
//       $$
//     );
//
// Option B — Supabase Webhook:
//   Dashboard → Database → Webhooks → Create webhook
//   Table: profiles, Event: INSERT (fires when a new user signs up)
//   HTTP URL: <YOUR_SUPABASE_URL>/functions/v1/send-onboarding-reminder
//   Add a delay via pg_cron instead if you want to wait 24h before sending.
//
// Manual trigger (preview mode):
//   curl -X POST <URL>/functions/v1/send-onboarding-reminder?preview=true \
//     -H "Authorization: Bearer <ANON_KEY>"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, emailHeader, emailFooter, ctaButton } from "../_shared/email-brand.ts";
import { requireBroadcastSecret } from "../_shared/broadcast-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-broadcast-secret",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function buildAnalysisReminderHtml(userName: string): string {
  const name = userName || "Founder";

  const issueRow = (emoji: string, title: string, desc: string) => `
    <tr>
      <td style="padding:18px 0;border-bottom:1px solid #1a1a1a;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="44" valign="top" style="font-size:22px;line-height:1;">${emoji}</td>
            <td style="padding-left:10px;" valign="top">
              <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#f5f5f5;">${title}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#a1a1aa;">${desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const stepRow = (num: string, title: string, desc: string, isLast: boolean) => `
    <tr>
      <td style="padding:14px 0;${!isLast ? "border-bottom:1px solid #1a1a1a;" : ""}">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40" valign="top">
              <div style="width:32px;height:32px;border-radius:8px;background-color:#f97316;color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:32px;">${num}</div>
            </td>
            <td style="padding-left:12px;" valign="top">
              <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#f5f5f5;">${title}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#a1a1aa;">${desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

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

          <h2 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#f5f5f5;line-height:1.3;">
            Your app is waiting<br/>to be analyzed.
          </h2>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#d4d4d8;">
            You signed up for Rismon.ai but have not run your first analysis yet.
          </p>

          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#d4d4d8;">
            We analyzed hundreds of AI-built apps. Here is what we find most often:
          </p>

          <!-- Issues -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            ${issueRow("💸", "Paid features with no payment gate.", "Free users access everything. Founder has no idea.")}
            ${issueRow("🔓", "User data publicly readable.", "No database protection. Anyone can read your users' info.")}
            ${issueRow("🚪", "Admin pages open to everyone.", "Any user can reach your admin panel right now.")}
            ${issueRow("🤖", "Features nobody asked for.", "The AI built extra things. Most founders never knew.")}
          </table>

          <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#d4d4d8;">
            Your app might have none of these. Or it might have all of them. The only way to know is to check.
          </p>

          <!-- Steps Card -->
          <div style="background-color:#111111;border:1px solid #1a1a1a;border-radius:12px;padding:24px 28px;margin:0 0 28px;">
            <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#f5f5f5;">How to run your first analysis</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${stepRow("1", "Go to your dashboard", "Click Connect an app", false)}
              ${stepRow("2", "Enter your app name", "Choose Lovable, Bolt, Cursor or whichever platform you used", false)}
              ${stepRow("3", "Connect your GitHub", "Read only. We cannot edit or delete anything. Code is discarded after scan.", false)}
              ${stepRow("4", "Get your founder-friendly report", "Takes about 60 seconds. No code knowledge needed.", true)}
            </table>
          </div>

          ${ctaButton("Analyze my app now →", BRAND.dashboardUrl)}
          <div style="height:20px;"></div>

          <!-- Support box -->
          <div style="background-color:#111111;border-radius:10px;padding:20px 24px;border:1px solid #1a1a1a;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#f5f5f5;">💬 Hit any issues? Just reply.</p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#a1a1aa;">
              We read every message personally. If something is broken or confusing, tell us and we will fix it right away. No bots. No support tickets. Just us.
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

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users found", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = profiles.map((p) => p.id);
    const { data: analyses } = await supabase
      .from("analyses")
      .select("user_id")
      .in("user_id", userIds);

    const usersWithAnalyses = new Set((analyses || []).map((a) => a.user_id));

    const usersToRemind = profiles.filter(
      (p) => !usersWithAnalyses.has(p.id) && p.email
    );

    if (usersToRemind.length === 0) {
      return new Response(JSON.stringify({ message: "All users have run analyses", sent: 0 }), {
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
    } catch { /* no body or invalid JSON, that's fine */ }

    // Filter further if only_emails is specified
    const finalList = onlyEmails
      ? usersToRemind.filter((u) => onlyEmails!.includes(u.email))
      : usersToRemind;

    const url = new URL(req.url);
    const isPreview = url.searchParams.get("preview") === "true";

    if (isPreview) {
      return new Response(
        JSON.stringify({
          preview: true,
          users_to_remind: usersToRemind.map((u) => ({
            name: u.full_name,
            email: u.email,
          })),
          total: usersToRemind.length,
          sample_html: buildAnalysisReminderHtml(usersToRemind[0]?.full_name || "Founder"),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const errors: string[] = [];

    for (const user of finalList) {
      // Rate limit: wait 600ms between sends
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
            subject: "Your app is waiting to be analyzed",
            html: buildAnalysisReminderHtml(user.full_name || ""),
            reply_to: "hello@rismon.ai",
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
      JSON.stringify({ sent, total: usersToRemind.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Reminder error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
