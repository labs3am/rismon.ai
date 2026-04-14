import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [users, apps, analyses] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("apps").select("id", { count: "exact", head: true }),
    supabase.from("analyses").select("id", { count: "exact", head: true }),
  ]);

  return new Response(
    JSON.stringify({
      users: users.count || 0,
      apps: apps.count || 0,
      scans: analyses.count || 0,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } }
  );
});
