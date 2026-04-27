// One-off broadcast: announce Rismon.ai Product Hunt launch.
//
// HOW TO TRIGGER (manual, one-time):
//
// Preview (no emails sent — returns recipient list + sample HTML):
//   curl -X POST \
//     "<SUPABASE_URL>/functions/v1/send-producthunt-launch?preview=true" \
//     -H "x-broadcast-secret: <BROADCAST_FUNCTION_SECRET>"
//
// Send to a single test address first (recommended):
//   curl -X POST "<SUPABASE_URL>/functions/v1/send-producthunt-launch" \
//     -H "x-broadcast-secret: <BROADCAST_FUNCTION_SECRET>" \
//     -H "Content-Type: application/json" \
//     -d '{"only_emails":["you@example.com"]}'
//
// Send to everyone:
//   curl -X POST "<SUPABASE_URL>/functions/v1/send-producthunt-launch" \
//     -H "x-broadcast-secret: <BROADCAST_FUNCTION_SECRET>"
//
// This is intentionally NOT scheduled. Run it once for the launch.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, emailShell } from "../_shared/email-brand.ts";
import { requireBroadcastSecret } from "../_shared/broadcast-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-broadcast-secret",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const SUBJECT = "We're live on Product Hunt 🚀";

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

    const allUsers = (profiles || []).filter((p) => p.email);

    // Optional filter: only_emails in body
    let onlyEmails: string[] | null = null;
    try {
      const body = await req.json();
      if (body?.only_emails && Array.isArray(body.only_emails)) {
        onlyEmails = body.only_emails.map((e: string) => e.toLowerCase());
      }
    } catch {
      /* no body or invalid JSON, fine */
    }

    const finalList = onlyEmails
      ? allUsers.filter((u) =>
          onlyEmails!.includes(String(u.email).toLowerCase())
        )
      : allUsers;

    const url = new URL(req.url);
    const isPreview = url.searchParams.get("preview") === "true";

    if (isPreview) {
      return new Response(
        JSON.stringify(
          {
            preview: true,
            subject: SUBJECT,
            recipients: finalList.map((u) => ({
              name: u.full_name,
              email: u.email,
            })),
            total: finalList.length,
            sample_html: buildHtml(finalList[0]?.full_name || "Founder"),
          },
          null,
          2
        ),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (finalList.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recipients matched", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const errors: string[] = [];

    for (const user of finalList) {
      // 600ms gap between sends to stay well under provider rate limits
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
            from: BRAND.fromAddress,
            to: [user.email],
            subject: SUBJECT,
            html: buildHtml(user.full_name || ""),
            reply_to: BRAND.replyTo,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const errBody = await res.text();
          console.error(
            `Failed to send to ${user.email}: ${res.status} ${errBody}`
          );
          errors.push(`${user.email}: ${res.status}`);
        }
      } catch (e) {
        console.error(`Error sending to ${user.email}:`, e);
        errors.push(
          `${user.email}: ${e instanceof Error ? e.message : "unknown"}`
        );
      }
    }

    return new Response(
      JSON.stringify({ sent, total: finalList.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("producthunt launch error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});