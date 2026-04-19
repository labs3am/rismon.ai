import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      analysis_id,
      finding_id,
      finding_name,
      finding_category,
      reason,
    } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Please provide a reason (at least 5 characters)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanReason = reason.trim().slice(0, 2000);

    // Insert dispute
    const { data: dispute, error: insertError } = await supabase
      .from("finding_disputes")
      .insert({
        user_id: user.id,
        analysis_id: analysis_id || null,
        finding_id: finding_id || null,
        finding_name: finding_name || null,
        finding_category: finding_category || null,
        reason: cleanReason,
        user_email: user.email || null,
        status: "open",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert dispute error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save dispute" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Email admin via Resend (best-effort, non-fatal)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
    if (RESEND_API_KEY && ADMIN_EMAIL) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Rismon Disputes <onboarding@resend.dev>",
            to: [ADMIN_EMAIL],
            subject: `🚩 Finding disputed: ${finding_name || "Unnamed"}`,
            html: `
              <h2>A user disputed a scanner finding</h2>
              <p><strong>User:</strong> ${user.email || user.id}</p>
              <p><strong>Analysis ID:</strong> ${analysis_id || "n/a"}</p>
              <p><strong>Finding:</strong> ${finding_name || "n/a"}</p>
              <p><strong>Category:</strong> ${finding_category || "n/a"}</p>
              <p><strong>Reason:</strong></p>
              <blockquote style="border-left:3px solid #f97316;padding-left:12px;color:#555">
                ${cleanReason.replace(/</g, "&lt;").replace(/\n/g, "<br>")}
              </blockquote>
              <p style="color:#888;font-size:12px">Dispute ID: ${dispute.id}</p>
            `,
          }),
        });
      } catch (e) {
        console.error("Admin email failed (non-fatal):", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, dispute_id: dispute.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("submit-finding-dispute error:", e);
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
