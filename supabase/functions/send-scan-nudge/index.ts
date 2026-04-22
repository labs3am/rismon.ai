// Founder-note re-engagement nudge for inactive users (14+ days since signup, no scan).
// Admin-gated. Two modes:
//   - "test": sends ONLY to ADMIN_EMAIL so the admin can preview the live email
//   - "broadcast": sends to every eligible inactive user, throttled, deduped via scan_reminders
//
// Uses Resend directly (same pattern as send-scan-ready-email's connector gateway).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, emailShell, ctaButton } from "../_shared/email-brand.ts";

const ADMIN_EMAIL = "hello@rismon.ai";
const REMINDER_TYPE = "founder_nudge_v1"; // bump if you ever want to re-send to same users

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string) {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" } as any)[c]);
}

function renderEmail(firstName: string | null) {
  const greeting = firstName ? `Hey ${escapeHtml(firstName.split(" ")[0])},` : "Hey,";
  const dashboardUrl = "https://rismon.ai/dashboard";
  const body = `
    <tr><td style="padding:48px 44px 8px;">
      <p style="margin:0 0 18px;font-family:${BRAND.font};font-size:11px;font-weight:600;color:${BRAND.accent};letter-spacing:1.6px;text-transform:uppercase;">A note from the founder</p>

      <p style="margin:0 0 22px;font-family:${BRAND.font};font-size:17px;line-height:1.65;color:${BRAND.text};">${greeting}</p>

      <p style="margin:0 0 22px;font-family:${BRAND.font};font-size:16px;line-height:1.75;color:${BRAND.text};">
        Risvan here, founder of Rismon. I noticed you signed up but haven't run a scan yet — and I get it, "another tool" is the last thing anyone needs.
      </p>

      <p style="margin:0 0 22px;font-family:${BRAND.font};font-size:16px;line-height:1.75;color:${BRAND.textMuted};">
        So I'll keep this short. If you've shipped something with Lovable, Bolt, Cursor or Claude — Rismon takes ~2 minutes to tell you three things your AI builder won't:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr><td style="padding:14px 0;border-top:1px solid ${BRAND.border};font-family:${BRAND.font};font-size:15px;color:${BRAND.text};line-height:1.5;">
          <span style="color:${BRAND.accent};font-weight:600;">1.</span> &nbsp; What's <em>actually</em> in your code (not what the prompt asked for).
        </td></tr>
        <tr><td style="padding:14px 0;border-top:1px solid ${BRAND.border};font-family:${BRAND.font};font-size:15px;color:${BRAND.text};line-height:1.5;">
          <span style="color:${BRAND.accent};font-weight:600;">2.</span> &nbsp; What works end-to-end vs. what's a half-wired stub.
        </td></tr>
        <tr><td style="padding:14px 0;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};font-family:${BRAND.font};font-size:15px;color:${BRAND.text};line-height:1.5;">
          <span style="color:${BRAND.accent};font-weight:600;">3.</span> &nbsp; The gaps you'd rather find before your users do.
        </td></tr>
      </table>

      <p style="margin:0 0 30px;font-family:${BRAND.font};font-size:16px;line-height:1.75;color:${BRAND.textMuted};">
        Two AI models cross-check each other, so we only show you findings they both agreed on. No noise, no false alarms. Free, no card.
      </p>

      ${ctaButton("Run my first scan  →", dashboardUrl)}

      <p style="margin:34px 0 6px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.text};">
        If something's blocking you — tech, trust, or just curiosity — hit reply. Goes straight to my inbox.
      </p>
      <p style="margin:0;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.textMuted};">
        — Risvan<br/>
        <span style="color:${BRAND.textDim};font-size:13px;">Founder, Rismon.ai</span>
      </p>
    </td></tr>

    <tr><td style="padding:24px 44px 36px;">
      <p style="margin:0;font-family:${BRAND.font};font-size:11px;line-height:1.6;color:${BRAND.textFaint};">
        You're getting this once because you signed up at rismon.ai and we'd love your feedback. Reply with "stop" and I'll personally make sure you don't hear from me again.
      </p>
    </td></tr>`;
  return emailShell(body);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check using caller's JWT
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Admin gate (mirrors is_blog_admin())
    const adminEmails = new Set(["risvan@labs3am.com", "hello@rismon.ai"]);
    if (!user.email || !adminEmails.has(user.email)) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { mode, dryRun, inactiveDays: rawInactiveDays } = await req.json().catch(() => ({ mode: "test" }));

    // Validate inactiveDays: integer 1..730. Default 14.
    let inactiveDays = 14;
    if (rawInactiveDays !== undefined && rawInactiveDays !== null) {
      const n = Number(rawInactiveDays);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 730) {
        return new Response(JSON.stringify({ error: "inactiveDays must be an integer between 1 and 730" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      inactiveDays = n;
    }

    // Service-role client for cross-user reads/writes
    const admin = createClient(supabaseUrl, serviceKey);

    async function sendOne(toEmail: string, firstName: string | null): Promise<{ ok: boolean; err?: string }> {
      const html = renderEmail(firstName);
      const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: BRAND.fromAddress,
          to: [toEmail],
          subject: "A quick note before you decide Rismon isn't for you",
          html,
          reply_to: BRAND.replyTo,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, err: `${res.status} ${t.slice(0, 200)}` };
      }
      return { ok: true };
    }

    // ---------- TEST MODE: send only to admin ----------
    if (mode === "test") {
      const result = await sendOne(ADMIN_EMAIL, "Risvan");
      if (!result.ok) {
        return new Response(JSON.stringify({ error: "Send failed", detail: result.err }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, sentTo: ADMIN_EMAIL }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- BROADCAST MODE: inactive 14+ days, never scanned ----------
    if (mode !== "broadcast") {
      return new Response(JSON.stringify({ error: "Invalid mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find candidates: profile created `inactiveDays`+ days ago, with no analyses, with email
    const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, email, full_name, created_at")
      .lt("created_at", cutoff)
      .not("email", "is", null);

    if (profErr) {
      return new Response(JSON.stringify({ error: "Query failed", detail: profErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Filter: no analyses + not already sent this nudge
    const eligible: Array<{ id: string; email: string; full_name: string | null }> = [];
    for (const p of (profiles ?? [])) {
      if (!p.email) continue;
      const { count: scanCount } = await admin
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", p.id);
      if ((scanCount ?? 0) > 0) continue;

      const { count: alreadySent } = await admin
        .from("scan_reminders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", p.id)
        .eq("reminder_type", REMINDER_TYPE);
      if ((alreadySent ?? 0) > 0) continue;

      eligible.push({ id: p.id, email: p.email, full_name: p.full_name });
    }

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dryRun: true, inactiveDays, eligibleCount: eligible.length, sample: eligible.slice(0, 5).map((e) => e.email) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const u of eligible) {
      const r = await sendOne(u.email, u.full_name);
      if (r.ok) {
        sent++;
        // Mark as sent so we never double-send
        await admin.from("scan_reminders").insert({
          user_id: u.id,
          reminder_type: REMINDER_TYPE,
          week_start: new Date().toISOString().slice(0, 10),
        });
      } else {
        failed++;
        if (errors.length < 5) errors.push(`${u.email}: ${r.err}`);
      }
      // Throttle: ~4/sec to stay well under Resend limits
      await new Promise((res) => setTimeout(res, 250));
    }

    return new Response(JSON.stringify({ ok: true, inactiveDays, eligibleCount: eligible.length, sent, failed, errors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-scan-nudge error", e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});