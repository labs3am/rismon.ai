import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function buildReminderEmailHtml(userName: string): string {
  const name = userName || "Founder";

  const step = (num: string, title: string, desc: string) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #1a1a1a;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="48" valign="top">
              <div style="width:40px;height:40px;border-radius:10px;background-color:#1a1a1a;color:#f97316;font-size:14px;font-weight:700;text-align:center;line-height:40px;">${num}</div>
            </td>
            <td style="padding-left:14px;" valign="top">
              <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#f5f5f5;">${title}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#a1a1aa;">${desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#000000;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;border-radius:12px;overflow:hidden;border:1px solid #1a1a1a;">

        <!-- Header -->
        <tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid #1a1a1a;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#f97316;">Rismon.ai</h1>
          <p style="margin:6px 0 0;font-size:12px;color:#a1a1aa;letter-spacing:0.5px;">Your AI App Auditor</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 20px;font-size:18px;font-weight:600;color:#f5f5f5;">Dear ${name} 👋</p>

          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#d4d4d8;">
            We noticed you haven't completed the setup process yet — and you're so close!
          </p>

          <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#d4d4d8;">
            It's really easy. Here are the <strong style="color:#f97316;">five steps</strong> to know your app completely:
          </p>

          <!-- Steps -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            ${step("01", "Create your account", "Sign up with your email. Takes 30 seconds. No credit card needed.")}
            ${step("02", "Connect your app", "Connect your GitHub repo. Read-only access. We never store your code.")}
            ${step("03", "We study your app", "Rismon.ai reads your entire codebase and understands what was actually built.")}
            ${step("04", "Tell us your business", "Describe what your app is supposed to do. Plain English only.")}
            ${step("05", "Get your report", "Plain English report showing every gap plus exact prompts to fix each issue.")}
          </table>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#d4d4d8;">
            You've already completed step 1 — now just connect your app and let Rismon do the rest.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:4px 0 32px;">
              <a href="https://rismonai.lovable.app/dashboard" style="display:inline-block;background-color:#f97316;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                Connect my app →
              </a>
            </td></tr>
          </table>

          <div style="background-color:#111111;border-radius:10px;padding:20px 24px;border:1px solid #1a1a1a;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#a1a1aa;">
              💬 Facing any issues or have questions? Just <strong style="color:#f5f5f5;">hit reply</strong> — we're here to help you every step of the way.
            </p>
          </div>

          <p style="margin:28px 0 0;font-size:14px;color:#a1a1aa;">
            Best,<br/>
            <strong style="color:#f5f5f5;">The Rismon.ai Team</strong>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;text-align:center;border-top:1px solid #1a1a1a;">
          <p style="margin:0;font-size:11px;color:#52525b;">
            You're receiving this because you signed up on Rismon.ai.<br/>
            © 2026 Rismon.ai — Built for non-technical founders.
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

    // Find users who signed up 24-48 hours ago
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Get users from profiles who signed up in the 24-48h window
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .gte("created_at", fortyEightHoursAgo.toISOString())
      .lte("created_at", twentyFourHoursAgo.toISOString());

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw new Error("Failed to fetch profiles");
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users to remind", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get users who HAVE connected an app
    const userIds = profiles.map((p) => p.id);
    const { data: apps } = await supabase
      .from("apps")
      .select("user_id")
      .in("user_id", userIds);

    const usersWithApps = new Set((apps || []).map((a) => a.user_id));

    // Filter to users WITHOUT apps
    const usersToRemind = profiles.filter(
      (p) => !usersWithApps.has(p.id) && p.email
    );

    if (usersToRemind.length === 0) {
      return new Response(JSON.stringify({ message: "All users have connected apps", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check preview mode
    const url = new URL(req.url);
    const isPreview = url.searchParams.get("preview") === "true";

    if (isPreview) {
      // Return preview data without sending
      return new Response(
        JSON.stringify({
          preview: true,
          users_to_remind: usersToRemind.map((u) => ({
            name: u.full_name,
            email: u.email,
          })),
          total: usersToRemind.length,
          sample_html: buildReminderEmailHtml(usersToRemind[0]?.full_name || "Founder"),
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
            subject: "You're one step away from auditing your app 🔍",
            html: buildReminderEmailHtml(user.full_name || ""),
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
