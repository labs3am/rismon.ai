// First-scan reminder: signed up but never scanned (zero analyses).
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
const SUBJECT = "Your app is waiting to be scanned";

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
          <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Scan your app before your users find the gaps.</h1>
          <p style="margin:0 0 32px;font-size:15px;color:#888888;line-height:1.7;">You signed up but haven't run a scan yet. That's okay — it takes less than 90 seconds and you don't need to know how to code.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="padding:20px 0;border-top:1px solid #1a1a1a;">
              <p style="margin:0 0 6px;font-size:11px;color:#f97316;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Step 1</p>
              <p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Connect your GitHub repository</p>
            </td></tr>
            <tr><td style="padding:20px 0;border-top:1px solid #1a1a1a;">
              <p style="margin:0 0 6px;font-size:11px;color:#f97316;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Step 2</p>
              <p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Answer 3 plain English questions about what your app should do</p>
            </td></tr>
            <tr><td style="padding:20px 0;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;">
              <p style="margin:0 0 6px;font-size:11px;color:#f97316;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Step 3</p>
              <p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Get your full report in 90 seconds. Every finding includes the exact fix prompt to paste into Lovable or Cursor.</p>
            </td></tr>
          </table>

          <p style="margin:0 0 32px;font-size:14px;color:#888888;line-height:1.7;">Most AI-built apps have at least one gap the founder never knew about. Scan before your users find it.</p>

          <a href="https://rismon.ai/connect" style="display:inline-block;background-color:#ffffff;color:#000000;padding:14px 28px;border-radius:6px;font-size:15px;font-weight:500;text-decoration:none;">Scan my app now</a>
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

    // All profiles with email
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, email")
      .not("email", "is", null);
    if (profErr) {
      return new Response(JSON.stringify({ error: "Query failed", detail: profErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Users with at least one analysis — exclude
    const { data: scanned, error: scanErr } = await admin
      .from("analyses")
      .select("user_id")
      .not("user_id", "is", null);
    if (scanErr) {
      return new Response(JSON.stringify({ error: "Query failed", detail: scanErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const scannedIds = new Set((scanned || []).map((r: any) => r.user_id));

    const eligible = (profiles || []).filter((p: any) => p.email && !scannedIds.has(p.id));

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
    console.error("send-first-scan-reminder error", e?.message || e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});