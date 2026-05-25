// Announces the new Promise Audit feature to all users with an email.
// Admin-gated. Modes: "test" | "broadcast" (with optional dryRun).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, emailShell, ctaButton } from "../_shared/email-brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-broadcast-secret",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const ADMIN_EMAIL = "hello@rismon.ai";
const SUBJECT = "New in Rismon.ai: Promise Audit — does your landing page tell the truth?";
const AUDIT_URL = `${BRAND.url}/promise-audit`;

function buildHtml(userName?: string): string {
  const name = (userName || "").trim().split(/\s+/)[0] || "there";

  const featureRow = (num: string, title: string, desc: string, isLast: boolean) => `
    <tr><td style="padding:18px 0;${!isLast ? `border-bottom:1px solid ${BRAND.border};` : ""}">
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
    </td></tr>`;

  const body = `
    <tr><td style="padding:36px 40px;">
      <p style="margin:0 0 6px;font-family:${BRAND.font};font-size:11px;color:${BRAND.accent};letter-spacing:1px;text-transform:uppercase;font-weight:600;">New feature · Free, no signup</p>
      <h2 style="margin:0 0 18px;font-family:${BRAND.font};font-size:26px;font-weight:700;color:${BRAND.text};line-height:1.25;">
        Promise Audit: does your landing page tell the truth?
      </h2>
      <p style="margin:0 0 14px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.text};">Hi ${name},</p>
      <p style="margin:0 0 24px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.textMuted};">
        Every landing page makes claims — "AI-powered", "secure by default", "free forever". We just shipped a tool that reads your homepage like a visitor would, extracts every promise, and tells you which ones look clear, vague, or unverified.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background-color:${BRAND.cardInner};border:1px solid ${BRAND.border};border-radius:12px;padding:6px 22px;">
        ${featureRow("1", "Promise extraction", "We pull every concrete claim from your homepage — features, guarantees, social proof, pricing claims.", false)}
        ${featureRow("2", "Clarity score", "Each promise is rated clear, vague, or risky so you can see what a skeptical visitor would question.", false)}
        ${featureRow("3", "Reality check", "We cross-reference your claims against signals on the page itself — does the proof match the promise?", false)}
        ${featureRow("4", "Public & shareable", "No login needed. Paste any URL — yours or a competitor's — and get a report in under a minute.", true)}
      </table>

      <p style="margin:0 0 24px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.text};">
        Try it on your own site first. <span style="color:${BRAND.textMuted};">Most founders find at least one promise they can't actually back up.</span>
      </p>

      ${ctaButton("Audit my landing page →", AUDIT_URL)}
      <div style="height:24px;"></div>

      <div style="background-color:${BRAND.cardInner};border:1px solid ${BRAND.border};border-radius:10px;padding:18px 22px;">
        <p style="margin:0 0 4px;font-family:${BRAND.font};font-size:13px;font-weight:600;color:${BRAND.text};">💬 Found something surprising?</p>
        <p style="margin:0;font-family:${BRAND.font};font-size:13px;line-height:1.6;color:${BRAND.textMuted};">
          Hit reply and tell us. We read every message. <a href="mailto:${BRAND.replyTo}" style="color:${BRAND.accent};text-decoration:none;">${BRAND.replyTo}</a>
        </p>
      </div>

      <p style="margin:24px 0 0;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.textDim};">— The Rismon team</p>
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
    const { data: profiles, error: pErr } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .not("email", "is", null);
    if (pErr) return new Response(JSON.stringify({ error: "Query failed", detail: pErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const eligible = (profiles || []).filter((p: any) => p.email);

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
    console.error("send-promise-audit-announcement error", e?.message || e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});