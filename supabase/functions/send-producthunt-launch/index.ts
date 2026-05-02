// One-off broadcast: announce Rismon.ai Product Hunt launch.
//
// Admin-gated. Three modes (matches send-scan-nudge contract so the
// AdminBroadcast UI can drive it via supabase.functions.invoke):
//   { mode: "test" }                  -> sends only to ADMIN_EMAIL
//   { mode: "broadcast", dryRun: true } -> returns eligibleCount + sample
//   { mode: "broadcast" }             -> sends to all profiles

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, emailShell } from "../_shared/email-brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-broadcast-secret",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const SUBJECT = "We're live on Product Hunt 🚀";
const ADMIN_EMAIL = "hello@rismon.ai";

const PRODUCT_HUNT_URL =
  "https://www.producthunt.com/products/rismon?utm_source=email&utm_medium=launch&utm_campaign=ph-launch";
const GITHUB_URL = "https://github.com/labs3am/rismon.ai";

function buildHtml(userName: string): string {
  const name = (userName || "").trim().split(/\s+/)[0] || "founder";

  // Two equal CTAs side by side (table-based for email client support).
  const dualCta = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
      <tr>
        <td align="center" style="padding:0 6px 12px;" width="50%">
          <a href="${PRODUCT_HUNT_URL}" style="display:inline-block;width:100%;max-width:240px;background-color:${BRAND.accent};color:#ffffff;font-family:${BRAND.font};font-size:15px;font-weight:600;text-decoration:none;padding:14px 18px;border-radius:10px;text-align:center;box-sizing:border-box;">
            Upvote on Product Hunt →
          </a>
        </td>
        <td align="center" style="padding:0 6px 12px;" width="50%">
          <a href="${GITHUB_URL}" style="display:inline-block;width:100%;max-width:240px;background-color:transparent;color:${BRAND.text};font-family:${BRAND.font};font-size:15px;font-weight:600;text-decoration:none;padding:13px 18px;border-radius:10px;text-align:center;border:1px solid ${BRAND.borderSubtle};box-sizing:border-box;">
            ⭐ Star on GitHub →
          </a>
        </td>
      </tr>
    </table>`;

  const body = `
    <tr><td style="padding:36px 40px;">

      <p style="margin:0 0 6px;font-family:${BRAND.font};font-size:11px;color:${BRAND.accent};letter-spacing:1px;text-transform:uppercase;font-weight:600;">Launch day · Live now</p>
      <h2 style="margin:0 0 18px;font-family:${BRAND.font};font-size:26px;font-weight:700;color:${BRAND.text};line-height:1.25;">
        We're live on Product Hunt 🚀
      </h2>

      <p style="margin:0 0 14px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.text};">Hey ${name},</p>

      <p style="margin:0 0 18px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.textMuted};">
        Today is a big day for us. <span style="color:${BRAND.text};">Rismon.ai is officially live on Product Hunt.</span>
      </p>

      <p style="margin:0 0 24px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.textMuted};">
        If Rismon has been useful to you, your support today would mean the world. Two quick ways you can help:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.cardInner};border:1px solid ${BRAND.border};border-radius:12px;padding:18px 22px;">
        <tr><td>
          <p style="margin:0 0 10px;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.text};">
            <span style="color:${BRAND.accent};font-weight:600;">1.</span> Upvote us on Product Hunt — it takes 5 seconds and helps other founders find us.
          </p>
          <p style="margin:0;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.text};">
            <span style="color:${BRAND.accent};font-weight:600;">2.</span> Star us on GitHub — Rismon is open source and every star helps.
          </p>
        </td></tr>
      </table>

      ${dualCta}

      <div style="height:18px;"></div>

      <p style="margin:0 0 22px;font-family:${BRAND.font};font-size:15px;line-height:1.7;color:${BRAND.textMuted};">
        And if you have a minute, <span style="color:${BRAND.text};">share it with a founder friend who's building with AI</span> — that's the single biggest thing that helps us today.
      </p>

      <div style="background-color:${BRAND.cardInner};border:1px solid ${BRAND.border};border-radius:10px;padding:18px 22px;">
        <p style="margin:0 0 4px;font-family:${BRAND.font};font-size:13px;font-weight:600;color:${BRAND.text};">💬 Got feedback?</p>
        <p style="margin:0;font-family:${BRAND.font};font-size:13px;line-height:1.6;color:${BRAND.textMuted};">
          Hit reply — we read every message. <a href="mailto:${BRAND.replyTo}" style="color:${BRAND.accent};text-decoration:none;">${BRAND.replyTo}</a>
        </p>
      </div>

      <p style="margin:24px 0 0;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.textDim};">
        Thank you for being here on day one.<br/>
        — The Rismon team
      </p>

    </td></tr>`;

  return emailShell(body);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ---------- Auth: admin only ----------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminEmails = new Set(["risvan@labs3am.com", "hello@rismon.ai"]);
    if (!user.email || !adminEmails.has(user.email)) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    // Parse body
    const { mode, dryRun } = await req.json().catch(() => ({ mode: "test" }));

    async function sendOne(
      toEmail: string,
      firstName: string | null
    ): Promise<{ ok: boolean; err?: string }> {
      const html = buildHtml(firstName || "");
      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: BRAND.fromAddress,
          to: [toEmail],
          subject: SUBJECT,
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

    // ---------- TEST MODE ----------
    if (mode === "test") {
      const result = await sendOne(ADMIN_EMAIL, "Risvan");
      if (!result.ok) {
        return new Response(
          JSON.stringify({ error: "Send failed", detail: result.err }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      return new Response(
        JSON.stringify({ ok: true, sentTo: ADMIN_EMAIL }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode !== "broadcast") {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- BROADCAST MODE ----------
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .not("email", "is", null);

    if (profErr) {
      return new Response(
        JSON.stringify({ error: "Query failed", detail: profErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const eligible = (profiles || []).filter((p) => p.email);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          eligibleCount: eligible.length,
          sample: eligible.slice(0, 5).map((e) => e.email),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const u of eligible) {
      await new Promise((r) => setTimeout(r, 250)); // ~4/sec
      const r = await sendOne(u.email!, (u.full_name || "").split(" ")[0] || null);
      if (r.ok) sent++;
      else {
        failed++;
        if (errors.length < 10) errors.push(`${u.email}: ${r.err}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        eligibleCount: eligible.length,
        sent,
        failed,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("producthunt launch error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});