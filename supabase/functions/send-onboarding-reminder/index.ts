import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function buildAnalysisReminderHtml(userName: string): string {
  const name = userName || "Founder";

  const issueRow = (emoji: string, title: string, desc: string) => `
    <tr>
      <td style="padding:18px 0;border-bottom:1px solid #1e1e1e;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="44" valign="top" style="font-size:22px;line-height:1;">${emoji}</td>
            <td style="padding-left:10px;" valign="top">
              <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#f5f5f5;">${title}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">${desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const stepRow = (num: string, title: string, desc: string) => `
    <tr>
      <td style="padding:14px 0;${num !== "4" ? "border-bottom:1px solid #1e1e1e;" : ""}">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40" valign="top">
              <div style="width:32px;height:32px;border-radius:8px;background-color:#6366f1;color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:32px;">${num}</div>
            </td>
            <td style="padding-left:12px;" valign="top">
              <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#f5f5f5;">${title}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">${desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#080808;font-family:-apple-system,Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#080808;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:14px;overflow:hidden;border:1px solid #1e1e1e;">

        <!-- Header -->
        <tr><td style="padding:28px 40px;text-align:center;border-bottom:1px solid #1e1e1e;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#6366f1;">Rismon.ai</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">

          <h2 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#f5f5f5;line-height:1.3;">
            Your app is waiting<br/>to be analyzed.
          </h2>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#71717a;">
            You signed up for Rismon.ai but have not run your first analysis yet.
          </p>

          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#71717a;">
            We analyzed hundreds of AI-built apps. Here is what we find most often:
          </p>

          <!-- Issues -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            ${issueRow("💸", "Paid features with no payment gate.", "Free users access everything. Founder has no idea.")}
            ${issueRow("🔓", "User data publicly readable.", "No database protection. Anyone can read your users' info.")}
            ${issueRow("🚪", "Admin pages open to everyone.", "Any user can reach your admin panel right now.")}
            ${issueRow("🤖", "Features nobody asked for.", "The AI built extra things. Most founders never knew.")}
          </table>

          <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#71717a;">
            Your app might have none of these. Or it might have all of them. The only way to know is to check.
          </p>

          <!-- Steps Card -->
          <div style="background-color:#0a0a0a;border:1px solid #1e1e1e;border-radius:12px;padding:24px 28px;margin:0 0 28px;">
            <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#f5f5f5;">How to run your first analysis</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${stepRow("1", "Go to your dashboard", "Click Connect an app")}
              ${stepRow("2", "Enter your app name", "Choose Lovable, Bolt, Cursor or whichever platform you used")}
              ${stepRow("3", "Connect your GitHub", "Read only. We cannot edit or delete anything. Code is discarded after scan.")}
              ${stepRow("4", "Get your plain English report", "Takes about 60 seconds. No code knowledge needed.")}
            </table>
          </div>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:4px 0 28px;">
              <a href="https://rismonai.lovable.app/dashboard" style="display:inline-block;background-color:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                Analyze my app now
              </a>
            </td></tr>
          </table>

          <!-- Support box -->
          <div style="background-color:#0a0a0a;border-radius:10px;padding:20px 24px;border:1px solid #1e1e1e;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#f5f5f5;">Hit any issues? Just reply.</p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
              We read every message personally. If something is broken or confusing, tell us and we will fix it right away. No bots. No support tickets. Just us.
            </p>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;text-align:center;border-top:1px solid #1e1e1e;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#f5f5f5;">Rismon.ai</p>
          <p style="margin:0 0 8px;font-size:12px;color:#52525b;">
            <a href="https://rismonai.lovable.app/privacy" style="color:#52525b;text-decoration:underline;">Privacy</a>
            &nbsp;·&nbsp;
            <a href="https://rismonai.lovable.app/terms" style="color:#52525b;text-decoration:underline;">Terms</a>
            &nbsp;·&nbsp;
            <a href="https://github.com/labs3am/rismon.ai" style="color:#52525b;text-decoration:underline;">Source code</a>
          </p>
          <p style="margin:0;font-size:11px;color:#3f3f46;">
            Proudly built in India. From the house of Labs3am.
          </p>
        </td></tr>

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

    // Get ALL profiles with emails
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

    // Get users who HAVE run at least one analysis
    const userIds = profiles.map((p) => p.id);
    const { data: analyses } = await supabase
      .from("analyses")
      .select("user_id")
      .in("user_id", userIds);

    const usersWithAnalyses = new Set((analyses || []).map((a) => a.user_id));

    // Filter to users WITHOUT any analyses
    const usersToRemind = profiles.filter(
      (p) => !usersWithAnalyses.has(p.id) && p.email
    );

    if (usersToRemind.length === 0) {
      return new Response(JSON.stringify({ message: "All users have run analyses", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check preview mode
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

    // Send emails via Resend through connector gateway
    let sent = 0;
    const errors: string[] = [];

    for (const user of usersToRemind) {
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
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
