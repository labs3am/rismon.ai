// Sends a "you haven't run your scan yet" nudge to users who signed up
// in the last 24h and never ran a scan. Admin-gated.
// Modes: "test" (sends to admin) | "broadcast" (with optional dryRun).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, emailShell, ctaButton } from "../_shared/email-brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-broadcast-secret",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const ADMIN_EMAIL = "hello@rismon.ai";
const SUBJECT = "You signed up — but you haven't run your first scan yet";

function buildHtml(userName?: string): string {
  const name = (userName || "").trim().split(/\s+/)[0] || "there";
  const body = `
    <tr><td style="padding:36px 40px;">
      <p style="margin:0 0 6px;font-family:${BRAND.font};font-size:11px;color:${BRAND.accent};letter-spacing:1px;text-transform:uppercase;font-weight:600;">Welcome to Rismon.ai</p>
      <h2 style="margin:0 0 18px;font-family:${BRAND.font};font-size:26px;font-weight:700;color:${BRAND.text};line-height:1.25;">
        Hi ${name}, your first scan is one click away.
      </h2>
      <p style="margin:0 0 18px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.textMuted};">
        Thanks for signing up yesterday. You haven't run a scan yet — and most of the surprises we find in AI-built apps only show up once we actually look at the code.
      </p>
      <p style="margin:0 0 14px;font-family:${BRAND.font};font-size:13px;color:${BRAND.accent};letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">What you'll see in your first report</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background-color:${BRAND.cardInner};border:1px solid ${BRAND.border};border-radius:12px;padding:6px 22px;">
        <tr><td style="padding:14px 0;border-bottom:1px solid ${BRAND.border};font-family:${BRAND.font};font-size:14px;color:${BRAND.textMuted};line-height:1.6;">Paywalls that may accidentally give everyone Pro for free</td></tr>
        <tr><td style="padding:14px 0;border-bottom:1px solid ${BRAND.border};font-family:${BRAND.font};font-size:14px;color:${BRAND.textMuted};line-height:1.6;">Admin pages any visitor may be able to open</td></tr>
        <tr><td style="padding:14px 0;border-bottom:1px solid ${BRAND.border};font-family:${BRAND.font};font-size:14px;color:${BRAND.textMuted};line-height:1.6;">Features your landing page promises but the code may not deliver</td></tr>
        <tr><td style="padding:14px 0;font-family:${BRAND.font};font-size:14px;color:${BRAND.textMuted};line-height:1.6;">User data that may be visible to other users</td></tr>
      </table>
      ${ctaButton("Run my first scan →", BRAND.dashboardUrl)}
      <p style="margin:14px 0 0;font-family:${BRAND.font};font-size:12px;color:${BRAND.textDim};">Free. No credit card. ~90 seconds.</p>
      <p style="margin:28px 0 0;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.textDim};">— The Rismon team</p>
    </td></tr>`;
  return emailShell(body);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    const admins = new Set(["risvan@labs3am.com", "hello@rismon.ai"]);
    if (!user?.email || !admins.has(user.email)) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { mode, dryRun } = await req.json().catch(() => ({ mode: "test" }));

    async function sendOne(to: string, name?: string) {
      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({ from: BRAND.fromAddress, to: [to], subject: SUBJECT, html: buildHtml(name), reply_to: BRAND.replyTo }),
      });
      if (!res.ok) return { ok: false, err: `${res.status} ${(await res.text()).slice(0, 200)}` };
      return { ok: true };
    }

    if (mode === "test") {
      const r = await sendOne(ADMIN_EMAIL, "Founder");
      if (!r.ok) return new Response(JSON.stringify({ error: "Send failed", detail: r.err }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true, sentTo: ADMIN_EMAIL }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode !== "broadcast") {
      return new Response(JSON.stringify({ error: "Invalid mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recent, error: rErr } = await admin
      .from("profiles")
      .select("id, email, full_name, created_at")
      .gte("created_at", since)
      .not("email", "is", null);
    if (rErr) return new Response(JSON.stringify({ error: "Query failed", detail: rErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: scanned, error: sErr } = await admin
      .from("analyses")
      .select("user_id")
      .not("user_id", "is", null);
    if (sErr) return new Response(JSON.stringify({ error: "Query failed", detail: sErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const scannedIds = new Set((scanned || []).map((r: any) => r.user_id));

    const eligible = (recent || []).filter((u: any) => u.email && !scannedIds.has(u.id));

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dryRun: true, eligibleCount: eligible.length, sample: eligible.slice(0, 5).map((e: any) => e.email) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0, failed = 0;
    const errors: string[] = [];
    for (const u of eligible) {
      await new Promise((r) => setTimeout(r, 300));
      const r = await sendOne(u.email!, u.full_name || "");
      if (r.ok) sent++; else { failed++; if (errors.length < 10) errors.push(`${u.email}: ${r.err}`); }
    }
    return new Response(JSON.stringify({ ok: true, eligibleCount: eligible.length, sent, failed, errors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-new-signup-nudge error", e?.message || e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});