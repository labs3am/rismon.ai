// Sends admin notification emails for key user events.
// Triggered server-side from Postgres triggers via pg_net.
//
// SECURITY: Requires BROADCAST_FUNCTION_SECRET. Public callers without
// the secret receive 401. The Postgres trigger that calls this function
// must include the header `x-broadcast-secret: <secret>` (configured in
// public.admin_notify_settings or via the trigger's headers).

import { requireBroadcastSecret, escapeHtml } from "../_shared/broadcast-auth.ts";

const ADMIN_EMAIL = "hello@rismon.ai";
const FROM_EMAIL = "Rismon Admin <notify@rismon.ai>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-broadcast-secret",
};

interface Payload {
  event: "new_signup" | "first_scan";
  data: Record<string, unknown>;
}

function renderEmail(event: string, data: Record<string, unknown>): { subject: string; html: string } {
  if (event === "new_signup") {
    const email = escapeHtml(data.email ?? "(unknown)");
    const userId = escapeHtml(data.user_id ?? "");
    const createdAt = escapeHtml(data.created_at ?? new Date().toISOString());
    return {
      subject: `🎉 New Rismon signup: ${String(data.email ?? "(unknown)")}`,
      html: `
        <div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0a0a0a">
          <h2 style="margin:0 0 8px;font-size:20px">New user signed up</h2>
          <p style="color:#666;margin:0 0 24px">A new account was just created on Rismon.</p>
          <table style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #eee;border-radius:8px">
            <tr><td style="padding:12px 16px;color:#666;width:120px">Email</td><td style="padding:12px 16px;font-weight:500">${email}</td></tr>
            <tr><td style="padding:12px 16px;color:#666;border-top:1px solid #eee">User ID</td><td style="padding:12px 16px;font-family:monospace;font-size:12px;border-top:1px solid #eee">${userId}</td></tr>
            <tr><td style="padding:12px 16px;color:#666;border-top:1px solid #eee">Signed up</td><td style="padding:12px 16px;border-top:1px solid #eee">${createdAt}</td></tr>
          </table>
          <p style="margin:24px 0 0"><a href="https://rismon.ai/admin" style="color:#3B82F6;text-decoration:none">Open admin dashboard →</a></p>
        </div>`,
    };
  }
  if (event === "first_scan") {
    const email = escapeHtml(data.email ?? "(unknown)");
    const scanType = escapeHtml(data.scan_type ?? "scan");
    return {
      subject: `🚀 ${String(data.email ?? "(unknown)")} ran their first scan`,
      html: `
        <div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0a0a0a">
          <h2 style="margin:0 0 8px;font-size:20px">First scan completed!</h2>
          <p style="color:#666;margin:0 0 24px">${email} just finished their first ${scanType} scan — they're activated.</p>
          <p style="margin:24px 0 0"><a href="https://rismon.ai/admin" style="color:#3B82F6;text-decoration:none">Open admin dashboard →</a></p>
        </div>`,
    };
  }
  return {
    subject: `Rismon admin event: ${String(event)}`,
    html: `<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Reject anonymous callers — only the Postgres trigger (which includes
  // the shared secret header) may invoke this function.
  const denied = requireBroadcastSecret(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as Payload;
    if (!body?.event) {
      return new Response(JSON.stringify({ error: "missing event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = renderEmail(body.event, body.data ?? {});

    // Send directly via Resend API (no gateway).
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Resend error", result);
      return new Response(JSON.stringify({ error: "send failed", detail: result }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-notify error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
