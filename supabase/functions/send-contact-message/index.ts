import { BRAND } from "../_shared/email-brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const ADMIN_INBOX = "hello@rismon.ai";

function esc(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));
}

// Mirror of the client-side filter — blocks prompt-injection attempts and
// suspicious payloads server-side so the form can't be bypassed by a custom client.
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)\b/i,
  /\b(system|developer|assistant)\s*:\s*you\s+are\b/i,
  /\b(jailbreak|DAN mode|do anything now|act as (an? )?(unrestricted|uncensored))\b/i,
  /\b(disregard|override|bypass)\s+(your|the)\s+(instructions|guidelines|policies|rules|system prompt)\b/i,
  /\b(reveal|print|show|leak|expose)\s+(your|the)\s+(system\s*prompt|instructions|source\s*code|api[\s-]?key|secret|env|environment)\b/i,
  /<\s*script[\s>]/i,
  /\bjavascript\s*:/i,
  /\bdata:\s*text\/html/i,
  /\.(exe|bat|cmd|sh|ps1|msi|apk|dmg|jar|scr|vbs)\b/i,
  /\b(?:https?:\/\/|www\.)?(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gid|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at)\/\S+/i,
];

function isSuspicious(text: string): boolean {
  if (SUSPICIOUS_PATTERNS.some((re) => re.test(text))) return true;
  const urls = text.match(/https?:\/\/\S+/gi) ?? [];
  return urls.length > 3;
}

function buildHtml(d: { name: string; email: string; subject?: string | null; message: string; userAgent?: string | null }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:${BRAND.bg};font-family:${BRAND.font};color:${BRAND.text};">
  <div style="max-width:600px;margin:0 auto;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">
    <div style="padding:20px 28px;border-bottom:1px solid ${BRAND.border};">
      <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:${BRAND.accent};font-weight:600;">New contact form submission</div>
      <div style="margin-top:6px;font-size:18px;font-weight:700;color:#fff;">${esc(d.subject || "(no subject)")}</div>
    </div>
    <div style="padding:24px 28px;">
      <table style="width:100%;font-size:13px;color:${BRAND.textMuted};margin-bottom:18px;">
        <tr><td style="padding:4px 0;width:80px;color:${BRAND.textDim};">From</td><td style="color:#fff;">${esc(d.name)} &lt;${esc(d.email)}&gt;</td></tr>
        <tr><td style="padding:4px 0;color:${BRAND.textDim};">Reply to</td><td><a href="mailto:${esc(d.email)}" style="color:${BRAND.accent};text-decoration:none;">${esc(d.email)}</a></td></tr>
      </table>
      <div style="background:${BRAND.cardInner};border:1px solid ${BRAND.borderSubtle};border-radius:10px;padding:18px 20px;font-size:14px;line-height:1.7;color:#e5e5e5;white-space:pre-wrap;">${esc(d.message)}</div>
      ${d.userAgent ? `<div style="margin-top:16px;font-size:11px;color:${BRAND.textFaint};">UA: ${esc(d.userAgent)}</div>` : ""}
    </div>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const subject = body.subject ? String(body.subject).trim().slice(0, 300) : null;
    const message = String(body.message ?? "").trim();
    const userAgent = body.userAgent ? String(body.userAgent).slice(0, 500) : null;

    if (!name || name.length > 200) return new Response(JSON.stringify({ error: "invalid_name" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 320) return new Response(JSON.stringify({ error: "invalid_email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!message || message.length > 5000) return new Response(JSON.stringify({ error: "invalid_message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (isSuspicious(`${name}\n${subject ?? ""}\n${message}`)) {
      console.warn("send-contact-message: blocked suspicious submission", { name, email });
      return new Response(JSON.stringify({ error: "blocked_suspicious_content" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "email_not_configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const html = buildHtml({ name, email, subject, message, userAgent });
    const text = `New contact form submission\n\nFrom: ${name} <${email}>\nSubject: ${subject || "(no subject)"}\n\n${message}`;

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: BRAND.fromAddress,
        to: [ADMIN_INBOX],
        reply_to: email,
        subject: `[Contact] ${subject || `Message from ${name}`}`,
        html,
        text,
        tags: [{ name: "type", value: "contact_form" }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Resend send failed", resp.status, errText);
      return new Response(JSON.stringify({ error: "send_failed", status: resp.status }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-contact-message error", err);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});