// Admin-only proxy to public-promise-audit that injects the debug bypass
// token from server env. Lets admins test the audit pipeline without
// hitting the per-IP daily limit, and without ever exposing the debug
// token to the browser.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify caller is an admin using their JWT against is_blog_admin().
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);

  const { data: isAdmin, error: adminErr } = await userClient.rpc("is_blog_admin");
  if (adminErr || isAdmin !== true) return json({ error: "Admin only" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const url = typeof body?.url === "string" ? body.url : "";
  if (!url) return json({ error: "Provide a url" }, 400);

  const debugToken = Deno.env.get("RISMON_AUDIT_DEBUG_TOKEN");
  if (!debugToken) return json({ error: "RISMON_AUDIT_DEBUG_TOKEN not configured" }, 500);

  // Forward to public-promise-audit with the debug bypass header.
  const upstream = await fetch(`${supabaseUrl}/functions/v1/public-promise-audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rismon-debug": debugToken,
      // Anon key is required by the gateway for verify_jwt=false functions.
      "Authorization": `Bearer ${anonKey}`,
      "apikey": anonKey,
    },
    body: JSON.stringify({ url }),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});