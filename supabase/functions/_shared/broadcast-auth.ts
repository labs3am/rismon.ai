// Shared auth guard for internal "broadcast" / admin edge functions that
// must never be callable by anonymous users on the public internet.
//
// Caller must supply the BROADCAST_FUNCTION_SECRET via either:
//   - HTTP header  `x-broadcast-secret: <secret>`
//   - Bearer token `Authorization: Bearer <secret>`
//
// The secret is configured as a Supabase Edge Function secret.
// Use a long, random value (>=32 chars). Never commit it.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-broadcast-secret",
};

// Constant-time string compare to avoid timing attacks.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Returns null if request is authorized, otherwise a Response to return
 * immediately (401/500). Caller should: `const denied = requireBroadcastSecret(req); if (denied) return denied;`
 */
export function requireBroadcastSecret(req: Request): Response | null {
  const expected = Deno.env.get("BROADCAST_FUNCTION_SECRET");
  if (!expected || expected.length < 16) {
    console.error("BROADCAST_FUNCTION_SECRET not configured or too short");
    return new Response(
      JSON.stringify({ error: "Server misconfigured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const headerSecret = req.headers.get("x-broadcast-secret") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (
    (headerSecret && safeEqual(headerSecret, expected)) ||
    (bearer && safeEqual(bearer, expected))
  ) {
    return null;
  }

  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

export const broadcastCorsHeaders = corsHeaders;

/**
 * Minimal HTML escape for user-controlled values rendered into email/HTML bodies.
 */
export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}