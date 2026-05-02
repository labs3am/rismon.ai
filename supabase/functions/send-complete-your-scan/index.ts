// Complete-your-scan: connected an app but never ran a scan.
// Admin-gated. Modes: "test" | "broadcast" (with optional dryRun).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-broadcast-secret",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "Rismon <hello@rismon.ai>";
const REPLY_TO = "hello@rismon.ai";
const ADMIN_EMAIL = "hello@rismon.ai";
const SUBJECT = "You are one step away from your first report";

function buildHtml(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#000000;">
        <tr><td style="padding:40px 40px 0;">
          <span style="font-weight:700;font-size:20px;color:#ffffff;">Rismon<span style="color:#f97316;">.</span>ai</span>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Your app is connected.<br/>Your report is not done yet.</h1>
          <p style="margin:0 0 32px;font-size:15px;color:#888888;line-height:1.7;">You connected your GitHub repository but haven't run your first scan yet. Most founders who skip this step discover gaps the hard way — from real users.</p>

          <p style="margin:0 0 16px;font-size:11px;color:#f97316;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">What we find most often</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="padding:16px 0;border-top:1px solid #1a1a1a;">
              <p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Paywalls that give everyone Pro for free</p>
            </td></tr>
            <tr><td style="padding:16px 0;border-top:1px solid #1a1a1a;">
              <p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Admin pages any visitor can open</p>
            </td></tr>
            <tr><td style="padding:16px 0;border-top:1px solid #1a1a1a;">
              <p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Features on your homepage that don't exist in your code</p>
            </td></tr>
            <tr><td style="padding:16px 0;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;">
              <p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">User data visible to other users</p>
            </td></tr>
          </table>

          <a href="https://rismon.ai/dashboard" style="display:inline-block;background-color:#ffffff;color:#000000;padding:14px 28px;border-radius:6px;font-size:15px;font-weight:500;text-decoration:none;">Run my first scan</a>
          <p style="margin:12px 0 0;font-size:13px;color:#444444;">Free. No credit card. 90 seconds.</p>
        </td></tr>
        <tr><td style="border-top:1px solid #111111;padding:32px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#444444;">Rismon.ai — Intent verification for AI-built apps.</p>
          <p style="margin:0;font-size:12px;color:#444444;">
            <a href="https://rismon.ai/unsubscribe" style="color:#444444;text-decoration:underline;">Unsubscribe</a>
            &nbsp;|&nbsp;
            <a href="mailto:hello@rismon.ai" style="color:#444444;text-decoration:underline;">hello@rismon.ai</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const adminEmails = new Set(["risvan@labs3am.com", "hello@rismon.ai"]);
    if (!user.email || !adminEmails.has(user.email)) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { mode, dryRun } = await req.json().catch(() => ({ mode: "test" }));

    async function sendOne(to: string): Promise<{ ok: boolean; err?: string }> {
      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({ from: FROM, to: [to], subject: SUBJECT, html: buildHtml(), reply_to: REPLY_TO }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, err: `${res.status} ${t.slice(0, 200)}` };
      }
      return { ok: true };
    }

    if (mode === "test") {
      const r = await sendOne(ADMIN_EMAIL);
      if (!r.ok) return new Response(JSON.stringify({ error: "Send failed", detail: r.err }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true, sentTo: ADMIN_EMAIL }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode !== "broadcast") {
      return new Response(JSON.stringify({ error: "Invalid mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Users with at least one connected app
    const { data: appsRows, error: appsErr } = await admin
      .from("apps")
      .select("user_id")
      .not("user_id", "is", null);
    if (appsErr) {
      return new Response(JSON.stringify({ error: "Query failed", detail: appsErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const connectedIds = new Set((appsRows || []).map((r: any) => r.user_id));

    // Exclude users who have ever run a scan
    const { data: scanned, error: scanErr } = await admin
      .from("analyses")
      .select("user_id")
      .not("user_id", "is", null);
    if (scanErr) {
      return new Response(JSON.stringify({ error: "Query failed", detail: scanErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const scannedIds = new Set((scanned || []).map((r: any) => r.user_id));

    const targetIds = Array.from(connectedIds).filter((id) => !scannedIds.has(id));
    if (targetIds.length === 0) {
      if (dryRun) {
        return new Response(JSON.stringify({ ok: true, dryRun: true, eligibleCount: 0, sample: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, eligibleCount: 0, sent: 0, failed: 0, errors: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", targetIds)
      .not("email", "is", null);
    if (profErr) {
      return new Response(JSON.stringify({ error: "Query failed", detail: profErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const eligible = (profiles || []).filter((p: any) => p.email);

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dryRun: true, eligibleCount: eligible.length, sample: eligible.slice(0, 5).map((e: any) => e.email) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0, failed = 0;
    const errors: string[] = [];
    for (const u of eligible) {
      await new Promise((r) => setTimeout(r, 250));
      const r = await sendOne(u.email!);
      if (r.ok) sent++;
      else { failed++; if (errors.length < 10) errors.push(`${u.email}: ${r.err}`); }
    }

    return new Response(JSON.stringify({ ok: true, eligibleCount: eligible.length, sent, failed, errors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-complete-your-scan error", e?.message || e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});