// Plain-text personal outreach from the founder to users who signed up but
// never ran a scan. Admin-gated. Test/broadcast modes mirror send-scan-nudge.
// Deduped via scan_reminders with a unique reminder_type.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = "hello@rismon.ai";
const FROM_ADDRESS = "Risvan <hello@rismon.ai>";
const REPLY_TO = "hello@rismon.ai";
const SUBJECT = "Quick note from the Rismon founder";
const REMINDER_TYPE = "personal_outreach_v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function renderText(): string {
  return `Hey,

I'm Risvan, founder of Rismon.ai.

We just hit 26 users in our first month which honestly means a lot for a solo founder building this alone.

I noticed you signed up but haven't run a scan yet. I'm not here to push you — I genuinely want to understand what stopped you.

Was GitHub access confusing or felt unsafe?
Are you still building your app and not ready yet?
Did something feel unclear?
Or did you just forget?

Whatever the reason, one honest reply from you helps me more than anything right now.

If you're not interested just reply "no" and I won't message again. No hard feelings at all.

Thanks for signing up either way.

Risvan
Founder, Rismon.ai
hello@rismon.ai
rismon.ai

---
Reply NO to stop receiving emails from Rismon.
`;
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

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminEmails = new Set(["risvan@labs3am.com", "hello@rismon.ai"]);
    if (!user.email || !adminEmails.has(user.email)) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { mode, dryRun } = await req.json().catch(() => ({ mode: "test" }));

    const admin = createClient(supabaseUrl, serviceKey);
    const text = renderText();

    async function sendOne(toEmail: string): Promise<{ ok: boolean; err?: string }> {
      const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [toEmail],
          subject: SUBJECT,
          text,
          reply_to: REPLY_TO,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, err: `${res.status} ${t.slice(0, 200)}` };
      }
      return { ok: true };
    }

    if (mode === "test") {
      const result = await sendOne(ADMIN_EMAIL);
      if (!result.ok) {
        return new Response(JSON.stringify({ error: "Send failed", detail: result.err }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, sentTo: ADMIN_EMAIL }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode !== "broadcast") {
      return new Response(JSON.stringify({ error: "Invalid mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, email")
      .not("email", "is", null);

    if (profErr) {
      return new Response(JSON.stringify({ error: "Query failed", detail: profErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const eligible: Array<{ id: string; email: string }> = [];
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

      eligible.push({ id: p.id, email: p.email });
    }

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dryRun: true, eligibleCount: eligible.length, sample: eligible.slice(0, 5).map((e) => e.email) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const u of eligible) {
      const r = await sendOne(u.email);
      if (r.ok) {
        sent++;
        await admin.from("scan_reminders").insert({
          user_id: u.id,
          reminder_type: REMINDER_TYPE,
          week_start: new Date().toISOString().slice(0, 10),
        });
      } else {
        failed++;
        if (errors.length < 5) errors.push(`${u.email}: ${r.err}`);
      }
      await new Promise((res) => setTimeout(res, 250));
    }

    return new Response(JSON.stringify({ ok: true, eligibleCount: eligible.length, sent, failed, errors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-personal-outreach error", e?.message || e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});