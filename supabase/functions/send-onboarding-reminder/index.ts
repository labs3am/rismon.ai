import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function buildReminderEmailHtml(userName: string): string {
  const name = userName || "there";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
        
        <!-- Header -->
        <tr><td style="background-color:#0a0a0a;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#f97316;">Rismon.ai</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#a1a1aa;">Your AI app auditor</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#0a0a0a;">Hey ${name} 👋</h2>
          
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
            We noticed you signed up for Rismon.ai but haven't connected your app yet. You're just one step away from getting a full audit of what your AI actually built.
          </p>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
            Here's what Rismon does once you connect your app:
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="padding:10px 0;font-size:14px;color:#3f3f46;">✅ <strong>Reads your entire codebase</strong> — understands what was built</td></tr>
            <tr><td style="padding:10px 0;font-size:14px;color:#3f3f46;">✅ <strong>Asks you smart questions</strong> — in plain English, no tech jargon</td></tr>
            <tr><td style="padding:10px 0;font-size:14px;color:#3f3f46;">✅ <strong>Gives you an Intent Match Score</strong> — how close is the code to your vision</td></tr>
            <tr><td style="padding:10px 0;font-size:14px;color:#3f3f46;">✅ <strong>Finds security issues</strong> — before your users do</td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 28px;">
              <a href="https://rismonai.lovable.app/dashboard" style="display:inline-block;background-color:#f97316;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                Connect my app now →
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#3f3f46;">
            Having trouble? Just reply to this email — we're here to help.
          </p>

          <p style="margin:24px 0 0;font-size:15px;color:#3f3f46;">
            Best,<br/>
            <strong>The Rismon.ai Team</strong>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #e5e5e5;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">
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
