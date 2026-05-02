import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// SECTION 1: Pre-scan deterministic security checks (regex)
// ============================================================
function runSecurityPreChecks(codeBundle: string) {
  const findings: any[] = [];
  const secretPatterns = [
    { pattern: /sk-[a-zA-Z0-9]{20,}/g, type: "OpenAI API key" },
    { pattern: /AIza[a-zA-Z0-9]{35}/g, type: "Google API key" },
    { pattern: /ghp_[a-zA-Z0-9]{30,}/g, type: "GitHub token" },
    { pattern: /rk_live[a-zA-Z0-9_]*/g, type: "Stripe secret key" },
    { pattern: /sk_live[a-zA-Z0-9_]*/g, type: "Stripe secret key" },
    { pattern: /r_[a-zA-Z0-9]{30,}/g, type: "Razorpay key" },
  ];
  for (const sp of secretPatterns) {
    if (sp.pattern.test(codeBundle)) {
      findings.push({ type: "exposed_secret", key_type: sp.type, severity: "critical", found: true });
    }
  }
  if (/eyJhbGciOiJIUzI1NiJ9/.test(codeBundle) && /service_role/.test(codeBundle)) {
    findings.push({ type: "exposed_secret", key_type: "Supabase service role key", severity: "critical", found: true });
  }
  return findings;
}

// ============================================================
// SECTION 1b: Pre-analysis — deterministic feature detection
// ============================================================
function runPreAnalysis(codeBundle: string) {
  const paymentKeywords = /stripe|lemonsqueezy|lemon\s*squeezy|paddle|razorpay|loadstripe|paymentintent|checkout\.session/i;
  const hasPayments = paymentKeywords.test(codeBundle);

  let paymentProvider: string | null = null;
  if (hasPayments) {
    if (/stripe|loadstripe/i.test(codeBundle)) paymentProvider = "Stripe";
    else if (/lemonsqueezy|lemon\s*squeezy/i.test(codeBundle)) paymentProvider = "Lemon Squeezy";
    else if (/paddle/i.test(codeBundle)) paymentProvider = "Paddle";
    else if (/razorpay/i.test(codeBundle)) paymentProvider = "Razorpay";
    else paymentProvider = "Other";
  }

  const hasUserAccounts = /supabase\.auth|signin|signup|signIn|signUp|user\.id|auth\.users/i.test(codeBundle);

  const hasAdminRoutes = /\/admin|isadmin|admin_role|role\s*===?\s*['"]admin['"]/i.test(codeBundle);

  const hasFreePaidTiers = /\bplan\b|\bsubscription\b|\bispro\b|\bisfree\b|\btier\b|\bpremium\b/i.test(codeBundle);

  let detectedAppType = "unknown";
  if (hasPayments && hasFreePaidTiers) detectedAppType = "SaaS";
  else if (hasPayments) detectedAppType = "E-commerce/Marketplace";
  else if (hasUserAccounts) detectedAppType = "User App";

  let detectedPlatform = "unknown";
  if (/from ['"]@supabase\/supabase-js['"]/i.test(codeBundle)) detectedPlatform = "Supabase";
  if (/from ['"]react['"]/i.test(codeBundle)) detectedPlatform = detectedPlatform === "Supabase" ? "React + Supabase" : "React";

  return {
    hasPayments,
    paymentProvider,
    hasUserAccounts,
    hasAdminRoutes,
    hasFreePaidTiers,
    detectedAppType,
    detectedPlatform,
  };
}

// ============================================================
// SECTION 1c: Deterministic security scanner — produces fully-formed
// "verified" findings with file_path + line_number + code_snippet
// directly from the code bundle. These are PROOF, not guesses,
// and they bypass any LLM whitelist or downgrade.
//
// We split the bundle by "=== filepath ===" file headers (set by the
// frontend in src/pages/Analyze.tsx around line 357), then scan each
// file line-by-line for the patterns below.
//
// Detectors (each maps to a critical/high security finding):
//   D1 — open admin route (file path or component contains /admin AND
//        no auth/redirect call AND no role/isAdmin check in the file)
//   D2 — unfiltered user-table query (.from('xyz').select(...) with no
//        .eq('user_id'|'owner_id'|'created_by'|'profile_id', ...))
//   D3 — hardcoded bypass flag (const isPro=true, isAdmin=true,
//        plan='pro' written as a literal in non-test code)
//   D4 — supabase service role key referenced in a frontend file
//        (any path NOT under supabase/functions/)
//   D5 — explicit author-marked vulnerability comments (INTENTIONAL
//        ISSUE, "no auth check", "data leak", "TODO: add auth")
// ============================================================
type DetectorFinding = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  what_we_found: string;
  what_this_means: string;
  how_to_fix: string;
  fix_prompt: string;
  technical_reference: string;
  google_query: string;
  confidence: "verified";
  confidence_reason: string;
  file_path: string;
  line_number: number;
  code_snippet: string;
  evidence: string;
  source: "deterministic";
};

function splitBundleByFile(bundle: string): Array<{ path: string; lines: string[] }> {
  if (!bundle) return [];
  const out: Array<{ path: string; lines: string[] }> = [];
  // Header format from frontend: `=== <path> ===\n<content>\n\n`
  const parts = bundle.split(/^===\s+(.+?)\s+===\s*$/m);
  // parts: [preamble, path1, content1, path2, content2, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const path = (parts[i] || "").trim();
    const content = parts[i + 1] || "";
    if (!path) continue;
    out.push({ path, lines: content.split(/\r?\n/) });
  }
  return out;
}

const USER_TABLE_HINT = /\b(notes?|orders?|messages?|posts?|comments?|files?|uploads?|invoices?|bookings?|appointments?|tasks?|projects?|sessions?|profiles?|users?|customers?|payments?|subscriptions?|chats?|conversations?|contacts?|leads?|tickets?|documents?|reports?|entries?|records?)\b/i;

function snippet(line: string, max = 200): string {
  return (line || "").trim().slice(0, max);
}

// ============================================================
// SECTION 1c-bis: Live Supabase backend probe
//
// When the founder has connected their app's Supabase project (we
// have supabase_url + supabase_anon_key on file), we hit their
// PostgREST endpoint with the anon key and try to read one row from
// every table the API exposes. If a row comes back without the user
// being signed in, that table is publicly readable — anyone on the
// internet can pull every row in it. This is the strongest signal
// we can produce: it's not inferred from code, the database itself
// just handed us the data.
//
// Safety:
//  - 10s total timeout, max 25 tables, max 6 in flight at once
//  - We only ask for 1 row (limit=1) so we never page through data
//  - We swallow all errors silently — failure to probe is NOT a
//    finding (could be a network blip or a private project)
// ============================================================
type BackendProbeResult = {
  tables: string[];                 // every table the REST API listed
  publiclyReadable: Array<{         // tables that returned rows w/o auth
    table: string;
    rowSample: number;              // how many rows we got back (1 = "yes any row exists")
  }>;
};

async function probeSupabaseBackend(
  url: string,
  anonKey: string,
): Promise<BackendProbeResult> {
  const result: BackendProbeResult = { tables: [], publiclyReadable: [] };
  if (!url || !anonKey) return result;

  // Step 1: list tables via the OpenAPI root
  let tableList: string[] = [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return result;
    const body = await res.json();
    // PostgREST returns an OpenAPI doc — paths look like { "/table_name": {...} }
    if (body && typeof body === "object") {
      if (body.paths && typeof body.paths === "object") {
        tableList = Object.keys(body.paths)
          .map((p: string) => p.replace(/^\//, ""))
          .filter((p: string) => p && !p.startsWith("rpc/") && !/[{}]/.test(p));
      } else if (body.definitions && typeof body.definitions === "object") {
        tableList = Object.keys(body.definitions);
      } else {
        tableList = Object.keys(body);
      }
    }
  } catch {
    return result;
  }

  // Filter out junk + cap to 25 tables to keep probe time bounded
  tableList = tableList
    .filter((t) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t))
    .slice(0, 25);
  result.tables = tableList;
  if (tableList.length === 0) return result;

  // Step 2: probe each table for an anonymous read
  const probeOne = async (table: string) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      // Prefer count exact + limit 0 first so we don't pull data —
      // but some PostgREST configs reject head requests, so fall
      // back to a real GET limit=1 if needed.
      const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: "application/json",
        },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return; // 401/403 = good, RLS blocked us
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        result.publiclyReadable.push({ table, rowSample: rows.length });
      }
    } catch {
      /* network error — ignore */
    }
  };

  // Run probes with a small concurrency limit
  const CONCURRENCY = 6;
  for (let i = 0; i < tableList.length; i += CONCURRENCY) {
    const batch = tableList.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(probeOne));
  }

  return result;
}

// Build deterministic "verified" findings from a backend probe.
// One critical finding per publicly-readable table.
function findingsFromBackendProbe(probe: BackendProbeResult): DetectorFinding[] {
  const findings: DetectorFinding[] = [];
  for (const leak of probe.publiclyReadable) {
    const table = leak.table;
    findings.push({
      id: `det-livedb-${findings.length + 1}`,
      severity: "critical",
      category: "rls",
      title: `Anyone on the internet can read your "${table}" table`,
      what_we_found: `We connected to your Supabase project with only the public key (the same key your website ships to every visitor) and asked for rows from "${table}". The database returned real data without asking who we are.`,
      what_this_means: `Anyone — not just your signed-in users, anyone with a browser — can pull every row out of "${table}" right now. If this table holds emails, names, messages, payment info, or anything private, treat it as already leaked.`,
      how_to_fix: `Turn on row-level rules for the "${table}" table in your database, then add a rule that only lets a logged-in user read their own rows.`,
      fix_prompt: `In the Supabase dashboard for this project, open the SQL editor and run:\n\nALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;\n\nThen add a SELECT policy that scopes rows to the owning user. The exact column depends on your schema, but typically:\n\nCREATE POLICY "Users read own ${table}" ON public.${table}\n  FOR SELECT TO authenticated\n  USING (auth.uid() = user_id);\n\nIf "${table}" is genuinely public (e.g. blog posts), instead add:\n\nCREATE POLICY "Public read ${table}" ON public.${table}\n  FOR SELECT TO anon, authenticated\n  USING (published = true);\n\nDo NOT leave the table without any policy — RLS without a policy denies all reads, which is the safe default. Verify by re-running the scan.`,
      technical_reference: "live-rls-leak",
      google_query: "supabase row level security enable policy",
      confidence: "verified",
      confidence_reason: `Verified by live probe: GET ${"<your-project>"}.supabase.co/rest/v1/${table}?limit=1 with the public anon key returned ${leak.rowSample} row(s). No code inference involved.`,
      file_path: `supabase://public.${table}`,
      line_number: 1,
      code_snippet: `GET /rest/v1/${table}?limit=1  →  200 OK, ${leak.rowSample} row(s) returned to anonymous caller`,
      evidence: `Anonymous SELECT on public.${table} returned data.`,
      source: "deterministic",
    });
  }
  return findings;
}

function runDeterministicSecurityScan(
  codeBundle: string,
  edgeFunctionBundle: string,
): DetectorFinding[] {
  const findings: DetectorFinding[] = [];
  const seen = new Set<string>(); // dedupe by file:line:detector
  const push = (f: DetectorFinding) => {
    const key = `${f.file_path}:${f.line_number}:${f.category}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push(f);
  };

  const frontendFiles = splitBundleByFile(codeBundle);
  const edgeFiles = splitBundleByFile(edgeFunctionBundle);

  // ---------- D1: Open admin route ----------
  for (const file of frontendFiles) {
    const isAdminFile = /\/admin|admin\.|adminpanel|admin-page|admindashboard/i.test(file.path);
    if (!isAdminFile) continue;
    const fullText = file.lines.join("\n");
    const hasAuthCheck = /useauth\b|getuser\b|auth\.uid|isadmin|is_admin|user\?\.role|role\s*===?\s*['"]admin['"]|navigate\(['"]\/login|redirect\(['"]\/login|<protectedroute|requireauth/i.test(fullText);
    if (hasAuthCheck) continue;
    // Find the first meaningful line — component declaration or first JSX return
    let lineNo = 1;
    let lineText = "";
    for (let i = 0; i < file.lines.length; i++) {
      const L = file.lines[i];
      if (/export\s+(default\s+)?(function|const)\s+\w+|function\s+\w+\s*\(/i.test(L)) {
        lineNo = i + 1;
        lineText = L;
        break;
      }
    }
    if (!lineText) { lineText = file.lines[0] || ""; lineNo = 1; }
    push({
      id: `det-admin-${findings.length + 1}`,
      severity: "critical",
      category: "admin_access",
      title: "Anyone can open your admin page",
      what_we_found: `The admin page at ${file.path} renders without checking who is logged in or whether they are an admin.`,
      what_this_means: "Anyone who guesses or shares the URL can see your admin dashboard, including all users, all data, and any actions you can take as the owner.",
      how_to_fix: "Wrap this page in a login + admin role check. Redirect non-admins to the home page before any data loads.",
      fix_prompt: `Protect the admin page in ${file.path}. At the top of the component, get the current user from Supabase auth. If there is no user, redirect to /login. Then check the user's role from the profiles or user_roles table. If the role is not "admin", redirect to / immediately. Do not render any admin content until both checks pass.`,
      technical_reference: "missing-admin-route-guard",
      google_query: "react protect admin route supabase auth",
      confidence: "verified",
      confidence_reason: "Detected directly from the file: admin path with no auth check, redirect, or role guard anywhere in the component.",
      file_path: file.path,
      line_number: lineNo,
      code_snippet: snippet(lineText),
      evidence: "Admin route component contains no useAuth/getUser/role check.",
      source: "deterministic",
    });
  }

  // ---------- D2: Unfiltered user-table query ----------
  // Match .from('xyz').select(...) chains and check for a .eq('user_id'|...)
  // anywhere in the same statement (we look at a small window of lines).
  for (const file of frontendFiles) {
    if (/\.test\.|\.spec\.|__tests__|node_modules|integrations\/supabase\/types/.test(file.path)) continue;
    for (let i = 0; i < file.lines.length; i++) {
      const L = file.lines[i];
      const m = L.match(/\.from\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]\s*\)/);
      if (!m) continue;
      const table = m[1];
      // Look forward up to 10 lines for .select() and .eq(user_id|owner_id|...)
      const windowText = file.lines.slice(i, i + 10).join("\n");
      if (!/\.select\s*\(/.test(windowText)) continue;
      // Skip auth.users — that's Supabase auth itself
      if (/^auth\b|^_auth/i.test(table)) continue;
      // Skip clearly-public tables
      if (/^(blog_posts|posts|public_|categories|tags|countries|currencies|products?_public)$/i.test(table)) continue;
      // Allow if there's a user-scoped filter anywhere in the chain
      const hasUserFilter = /\.eq\(\s*['"`](user_id|owner_id|created_by|profile_id|author_id|customer_id|account_id)['"`]/i.test(windowText);
      // Allow if there's an explicit single-row .eq('id', someUuidVar) — this is a "fetch by id" pattern (still risky but lower confidence; skip for now)
      const isSingleRowById = /\.eq\(\s*['"`]id['"`]\s*,/.test(windowText) && /\.single\s*\(\s*\)|\.maybesingle\s*\(\s*\)/i.test(windowText);
      if (hasUserFilter || isSingleRowById) continue;
      // Only flag tables that *look* user-owned by name
      if (!USER_TABLE_HINT.test(table)) continue;
      push({
        id: `det-leak-${findings.length + 1}`,
        severity: "critical",
        category: "rls",
        title: `Anyone can read all rows in your "${table}" data`,
        what_we_found: `${file.path} reads from the "${table}" table without filtering by the current user. The query returns every row in that table to whoever loads this page.`,
        what_this_means: `Every signed-in user (and possibly anonymous visitors) sees every other user's "${table}" entries — including private content they were never meant to see.`,
        how_to_fix: `Add a user filter to this query and turn on row-level rules in your database so the table can only return rows owned by the requester.`,
        fix_prompt: `Fix the data leak in ${file.path} on line ${i + 1}. The query .from('${table}').select(...) returns every row to every user. 1) Add .eq('user_id', user.id) (or whichever column owns the row) to scope the query. 2) In Supabase, enable Row Level Security on the "${table}" table. 3) Add a SELECT policy: USING (auth.uid() = user_id). 4) Add INSERT/UPDATE/DELETE policies with WITH CHECK (auth.uid() = user_id).`,
        technical_reference: "missing-user-filter-rls",
        google_query: "supabase row level security user_id filter",
        confidence: "verified",
        confidence_reason: `Direct read from the file: .from('${table}').select(...) with no .eq('user_id'|'owner_id'|...) within the next 10 lines.`,
        file_path: file.path,
        line_number: i + 1,
        code_snippet: snippet(L),
        evidence: `Unfiltered .from('${table}').select(...) call.`,
        source: "deterministic",
      });
      // Cap at 3 leak findings per file to avoid noise
      if (findings.filter((f) => f.category === "rls" && f.file_path === file.path).length >= 3) break;
    }
  }

  // ---------- D3: Hardcoded bypass flag ----------
  for (const file of frontendFiles) {
    if (/\.test\.|\.spec\.|__tests__/.test(file.path)) continue;
    for (let i = 0; i < file.lines.length; i++) {
      const L = file.lines[i];
      // const isPro = true | const isAdmin = true | let plan = 'pro' | const userPlan = 'pro'
      const m = L.match(/(?:const|let|var)\s+(is(?:Pro|Admin|Premium|Paid|Owner|Authorized)|userPlan|plan|tier|role)\s*[:=]\s*(true|['"`](?:pro|admin|premium|owner|paid)['"`])/);
      if (!m) continue;
      // Skip if the line clearly comes from a destructure or a function parameter default
      if (/\bfunction\b|\=>\s*\{|\,\s*$/.test(L) && !/^\s*(const|let|var)/.test(L)) continue;
      const flagName = m[1];
      const flagValue = m[2];
      push({
        id: `det-bypass-${findings.length + 1}`,
        severity: "critical",
        category: "payment_validation",
        title: "Premium check is permanently turned on",
        what_we_found: `${file.path} sets ${flagName} to ${flagValue} as a fixed value. Whatever code uses this flag treats every visitor as a paying or privileged user.`,
        what_this_means: "Free users get every paid feature for free, and any 'admin only' code guarded by this flag is open to everyone. You lose revenue and lose control of admin actions.",
        how_to_fix: `Replace the hardcoded value with a real check against the user's plan in your database (the profiles table) or your subscription provider.`,
        fix_prompt: `Remove the hardcoded ${flagName} = ${flagValue} from ${file.path} on line ${i + 1}. Replace it with: 1) Read the current user from Supabase auth. 2) Query the profiles table for plan: const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single(). 3) Set ${flagName} = profile?.plan === 'pro'. 4) Default to false on error so paid features are NEVER given away by mistake.`,
        technical_reference: "hardcoded-permission-flag",
        google_query: "react supabase paywall enforce subscription",
        confidence: "verified",
        confidence_reason: `Direct read from the file: literal "${flagName} = ${flagValue}" assignment.`,
        file_path: file.path,
        line_number: i + 1,
        code_snippet: snippet(L),
        evidence: `Hardcoded ${flagName} = ${flagValue}.`,
        source: "deterministic",
      });
    }
  }

  // ---------- D4: Service role key referenced in frontend ----------
  // FIX (false-positive guard): only fire when service_role appears in
  // a real key/env/import context — not in user-facing warnings, JSX
  // strings, validation regexes, or detector source code that just
  // names the pattern. Apps like Connect.tsx legitimately mention
  // "service_role" inside a UI string telling the user NOT to paste
  // it; that is the opposite of a vulnerability.
  for (const file of frontendFiles) {
    // Frontend = anything NOT in supabase/functions/
    if (/^supabase\/functions\//.test(file.path)) continue;
    for (let i = 0; i < file.lines.length; i++) {
      const L = file.lines[i];
      if (!/service[_-]?role/i.test(L)) continue;

      // Skip pure comments — explanatory only.
      if (/^\s*(\/\/|\*|#)/.test(L)) continue;

      // Skip lines that look like UI text / validation guards rather
      // than real key usage. These are the actual false-positive
      // patterns we hit on Connect.tsx and similar:
      //   - .includes('service_role')      → user-input rejection guard
      //   - "...service_role..."            → JSX or toast message
      //   - /service_role/                  → regex used to redact
      //   - service_role[^\s"']*            → redaction pattern
      const lower = L.toLowerCase();
      const isGuard = /\.(includes|indexof|match|test|search|replace|replaceall)\s*\(\s*['"`\/][^'"`)]*service[_-]?role/i.test(L);
      const isRegexLiteral = /\/[^\/\n]*service[_-]?role[^\/\n]*\//i.test(L);
      const isMarketingString = /service[_-]?role/i.test(L) && /(not\s+service[_-]?role|reject\s+service[_-]?role|never\s+paste|do\s+not\s+(use|paste)|warning|anon\s*·?\s*public)/i.test(lower);
      if (isGuard || isRegexLiteral || isMarketingString) continue;

      // Require a real key/env/import context. Without one, a bare
      // mention of the words "service role" is not evidence.
      const isAssignmentLike =
        /(=|:)\s*['"`]ey[A-Za-z0-9_\-]{20,}/i.test(L) ||                 // hardcoded JWT
        /(process\.env|import\.meta\.env|Deno\.env\.get|getenv)\s*[\.\(\[]\s*['"`]?[A-Z0-9_]*service[_-]?role/i.test(L) || // env lookup
        /(createClient|createServerClient)\s*\([^)]*service[_-]?role/i.test(L) || // direct client init
        /(import|require)\s*[^;]*service[_-]?role/i.test(L) ||           // import
        /SUPABASE_SERVICE_ROLE_KEY/.test(L);                              // canonical name on a real code line
      if (!isAssignmentLike) continue;

      push({
        id: `det-srk-${findings.length + 1}`,
        severity: "critical",
        category: "secret_exposure",
        title: "Database master key is in your frontend code",
        what_we_found: `${file.path} references the Supabase service role key. The frontend bundle is downloaded by every visitor's browser, so anyone who opens dev tools can read this key.`,
        what_this_means: "The service role key bypasses every database rule. Whoever copies it can read, change, or delete every row in your database — users, payments, everything.",
        how_to_fix: "Move every call that uses the service role key into a Supabase Edge Function. The frontend should only ever use the public anon key.",
        fix_prompt: `Remove the service role key from ${file.path} on line ${i + 1}. Move the operation that needed it into a new Supabase Edge Function under supabase/functions/. The edge function reads SUPABASE_SERVICE_ROLE_KEY from Deno.env. The frontend calls the edge function with supabase.functions.invoke(). Then rotate the service role key in your Supabase dashboard immediately because the old one has already been exposed.`,
        technical_reference: "service-role-in-frontend",
        google_query: "supabase service role key exposed frontend",
        confidence: "verified",
        confidence_reason: "Direct read from a non-edge-function file: the literal phrase 'service_role' is present.",
        file_path: file.path,
        line_number: i + 1,
        code_snippet: snippet(L),
        evidence: "service_role reference in frontend bundle.",
        source: "deterministic",
      });
    }
  }

  // ---------- D5: Author-marked vulnerability comments ----------
  // FIX (false-positive guard): the previous version flagged any
  // comment that contained the LITERAL strings "no auth check",
  // "data leak", etc. — including this analyzer's own documentation
  // and regex labels. We now:
  //   (1) Skip the analyzer's own file entirely — it talks about these
  //       patterns by name on every other line.
  //   (2) Require the comment to express AUTHOR INTENT (TODO/FIXME/
  //       HACK/INTENTIONAL/known-bad) — not a neutral mention of the
  //       phrase. Documentation, schema files, prompt strings, and
  //       regex-pattern arrays do not count.
  //   (3) Require a non-comment code line within 5 lines after the
  //       comment. A comment alone with no real code under it cannot
  //       be a live vulnerability.
  const authorMarkedPatterns = [
    { rx: /intentional\s+(issue|vulnerab|bug)/i, label: "intentional issue" },
    { rx: /\b(todo|fixme|hack|xxx)\b[^\n]{0,40}\b(add\s+auth|missing\s+auth|no\s+auth\s+check|auth\s+bypass)\b/i, label: "no auth check" },
    { rx: /\b(todo|fixme|hack|xxx)\b[^\n]{0,40}\b(unfiltered\s+query|missing\s+user\s+filter|data\s+leak)\b/i, label: "data leak" },
    { rx: /\b(insecure on purpose|skip auth|bypass auth|disable rls|rls off|leaving open)\b/i, label: "auth bypass" },
  ];

  // Files we never self-scan with this detector — they document
  // these phrases legitimately.
  const isSelfDocFile = (p: string) =>
    /supabase\/functions\/analyze\//i.test(p) ||
    /\.md$/i.test(p) ||
    /\/(prompts?|fixtures?|__samples__|examples?|docs?)\//i.test(p) ||
    /\.test\.|\.spec\.|__tests__/.test(p);

  for (const file of [...frontendFiles, ...edgeFiles]) {
    if (isSelfDocFile(file.path)) continue;
    for (let i = 0; i < file.lines.length; i++) {
      const L = file.lines[i];
      // Only consider real comment lines (not strings, not JSX text).
      const isCommentLine = /^\s*(\/\/|\/\*|\*\s|\*\/|#\s)/.test(L);
      if (!isCommentLine) continue;

      // Skip lines that are obviously cataloguing patterns rather
      // than warning about real code: "label:", "rx:", "pattern:",
      // "matches", "detect", "regex".
      if (/\b(label|pattern|patterns|rx|regex|matches?|detect(s|or)?|example)\s*[:=]/i.test(L)) continue;

      // Require a real non-comment code line within the next 5 lines.
      let hasNearbyCode = false;
      for (let k = i + 1; k <= Math.min(i + 5, file.lines.length - 1); k++) {
        const NL = file.lines[k];
        if (!NL || NL.trim() === "") continue;
        if (/^\s*(\/\/|\/\*|\*\s|\*\/|#\s)/.test(NL)) continue;
        hasNearbyCode = true;
        break;
      }
      if (!hasNearbyCode) continue;

      for (const p of authorMarkedPatterns) {
        if (!p.rx.test(L)) continue;
        push({
          id: `det-marker-${findings.length + 1}`,
          severity: "critical",
          category: "business_logic",
          title: "Code comment marks this as a known vulnerability",
          what_we_found: `${file.path} line ${i + 1} contains a comment marking this area as "${p.label}". The code below the comment was left in this state on purpose — but it is shipping to real users.`,
          what_this_means: "Whatever the comment warned about is happening in production right now. Real users are exposed to a problem the author already knew about and meant to fix.",
          how_to_fix: "Read the comment. Implement the fix it asks for, or remove the comment and the unsafe code together.",
          fix_prompt: `Open ${file.path} at line ${i + 1}. The comment marks a known "${p.label}". Implement the fix the comment describes (usually adding an auth check, a user_id filter, or removing a hardcoded bypass), then remove the warning comment.`,
          technical_reference: "author-marked-vulnerability",
          google_query: "react app intentional vulnerability fix",
          confidence: "verified",
          confidence_reason: "Direct read from the file: the author wrote a TODO/FIXME/INTENTIONAL comment flagging the code below it as unsafe, and there is real code on the lines after the comment.",
          file_path: file.path,
          line_number: i + 1,
          code_snippet: snippet(L),
          evidence: `Comment matched pattern: ${p.label}.`,
          source: "deterministic",
        });
        break; // one finding per line
      }
    }
  }

  return findings;
}

// ============================================================
// SECTION 1c-ter: Deterministic LEGAL scanner
//
// We do not produce legal advice. We check whether the founder's
// codebase contains the *artifacts* every consumer-facing app needs:
//
//   L1  Privacy Policy page or route
//   L2  Terms of Service page or route
//   L3  Cookie / GDPR consent UI (only flagged when EU users likely)
//   L4  Account / data deletion path (route, button, or RPC)
//
// Confidence rules:
//   - "verified"   : we definitely scanned the router/App entry AND
//                    the artifact is missing from every scanned file.
//   - "unverified" : router not in scanned slice — we cannot rule out
//                    that the page exists in code we did not read.
//
// Findings are SOFT (severity "medium"). This is a checklist nudge,
// not a security alert.
// ============================================================
function runDeterministicLegalScan(
  codeBundle: string,
  edgeFunctionBundle: string,
): DetectorFinding[] {
  const findings: DetectorFinding[] = [];
  const frontendFiles = splitBundleByFile(codeBundle);
  const edgeFiles = splitBundleByFile(edgeFunctionBundle);
  const allText = (codeBundle || "") + "\n" + (edgeFunctionBundle || "");
  const allTextLower = allText.toLowerCase();

  // Did we scan the app's router? If not, absence is inconclusive.
  const routerFile = frontendFiles.find((f) =>
    /(^|\/)App\.(t|j)sx?$/.test(f.path) ||
    /(^|\/)router\.(t|j)sx?$/i.test(f.path) ||
    /(^|\/)routes?\.(t|j)sx?$/i.test(f.path) ||
    /(^|\/)main\.(t|j)sx?$/.test(f.path),
  );
  const routerText = routerFile ? routerFile.lines.join("\n") : "";
  const baseConfidence: "verified" | "unverified" = routerFile ? "verified" : "unverified";
  const baseReason = routerFile
    ? `Scanned ${routerFile.path} and the rest of your code — no matching page or component was found.`
    : "We could not find your router file in the scanned slice, so this is based on the partial code we read.";
  const verifyNote = routerFile
    ? undefined
    : "We only scanned a portion of your code. If you already added this page, ignore — otherwise, the recommendation still applies.";

  // Helper: does any scanned file mention the artifact in code or routes?
  const hasRoute = (rx: RegExp) =>
    rx.test(routerText) || frontendFiles.some((f) => rx.test(f.path) || rx.test(f.lines.join("\n")));

  // ---------- L1: Privacy Policy ----------
  const hasPrivacy =
    hasRoute(/\/privacy(-policy)?\b/i) ||
    frontendFiles.some((f) => /privacy/i.test(f.path)) ||
    /privacy[-_ ]?policy|privacypolicy/i.test(allText);
  if (!hasPrivacy) {
    findings.push({
      id: `det-legal-privacy-${findings.length + 1}`,
      severity: "medium",
      category: "legal_privacy_policy",
      title: "No privacy policy page in your app",
      what_we_found:
        "We could not find a /privacy route, a Privacy.tsx page, or any link to a privacy policy in the scanned code.",
      what_this_means:
        "Most app stores, payment providers, OAuth providers (Google, GitHub, Apple), and ad networks require a public privacy policy. Without one you can be removed from these platforms and you are exposed to GDPR/CCPA fines.",
      how_to_fix:
        "Add a public /privacy page that describes what data you collect, why, who you share it with, how long you keep it, and how users can delete it. Link to it from your footer and from your signup form.",
      fix_prompt:
        "Create a new route /privacy with a Privacy.tsx page that explains: (1) what data you collect (email, name, app code, payment info), (2) why you collect it, (3) third parties you share it with (Supabase, Stripe, OpenAI/Anthropic if used, analytics), (4) data retention period, (5) the user's rights to access/correct/delete their data, (6) a contact email. Add a link to /privacy in the Footer component and on the signup page near the submit button.",
      technical_reference: "missing-privacy-policy",
      google_query: "react privacy policy page template saas",
      confidence: baseConfidence,
      confidence_reason: baseReason,
      ...(verifyNote ? { verification_note: verifyNote } : {}),
      file_path: routerFile?.path || "router not scanned",
      line_number: 1,
      code_snippet: "",
      evidence: "No /privacy route or Privacy page found in scanned files.",
      source: "deterministic",
    });
  }

  // ---------- L2: Terms of Service ----------
  const hasTerms =
    hasRoute(/\/(terms|tos|terms-of-service)\b/i) ||
    frontendFiles.some((f) => /(^|\/)Terms\.|(^|\/)Tos\./i.test(f.path)) ||
    /terms[-_ ]?of[-_ ]?(service|use)|terms\.tsx|tos\.tsx/i.test(allText);
  if (!hasTerms) {
    findings.push({
      id: `det-legal-terms-${findings.length + 1}`,
      severity: "medium",
      category: "legal_terms",
      title: "No terms of service page in your app",
      what_we_found:
        "We could not find a /terms or /tos route, a Terms.tsx page, or any link to terms of service in the scanned code.",
      what_this_means:
        "Without terms you have no contract with your users. You cannot enforce acceptable use, suspend abusive accounts cleanly, limit your liability, or set the rules for refunds and account closure. Stripe, Apple, and Google all require this for paid apps.",
      how_to_fix:
        "Add a /terms page covering acceptable use, account termination, your liability limits, refunds, and the governing law. Link it from your footer and require checkbox consent on signup.",
      fix_prompt:
        "Create a /terms route with a Terms.tsx page that covers: (1) eligibility, (2) acceptable use and prohibited behavior, (3) your right to suspend or terminate accounts, (4) limitation of liability, (5) refund policy, (6) governing law and dispute resolution. Add the link to /terms in Footer.tsx and add a required checkbox on the signup form: 'I agree to the Terms and Privacy Policy' with links to both.",
      technical_reference: "missing-terms-of-service",
      google_query: "react terms of service template saas",
      confidence: baseConfidence,
      confidence_reason: baseReason,
      ...(verifyNote ? { verification_note: verifyNote } : {}),
      file_path: routerFile?.path || "router not scanned",
      line_number: 1,
      code_snippet: "",
      evidence: "No /terms route or Terms page found in scanned files.",
      source: "deterministic",
    });
  }

  // ---------- L3: Cookie / GDPR consent ----------
  // Only relevant if the app likely serves EU traffic OR uses tracking
  // cookies / analytics / advertising pixels. We conservatively trigger
  // when ANY tracking/marketing dependency is detected.
  const usesTracking =
    /google-analytics|gtag\(|googletagmanager|posthog|mixpanel|amplitude|segment\.com|hotjar|clarity\.ms|facebook\.net\/[^\/]+\/fbevents|fbq\(|tiktok.*pixel|linkedin.*insight/i.test(
      allText,
    );
  const hasConsentUi =
    /cookie[-_ ]?consent|cookie[-_ ]?banner|cookieconsent|cookiebot|onetrust|usercentrics|klaro|gdpr[-_ ]?consent|consent[-_ ]?manager/i.test(
      allText,
    );
  if (usesTracking && !hasConsentUi) {
    findings.push({
      id: `det-legal-consent-${findings.length + 1}`,
      severity: "medium",
      category: "legal_cookie_consent",
      title: "Tracking is loaded with no cookie consent",
      what_we_found:
        "Your code loads at least one tracking or analytics script (Google Analytics / GTM / Meta Pixel / PostHog / Mixpanel / similar) but we did not find a cookie consent banner or consent manager.",
      what_this_means:
        "Under GDPR (EU/UK) and similar laws, you must collect explicit consent BEFORE non-essential trackers fire. Loading them on page load with no opt-in is a direct violation and can trigger fines from data protection authorities.",
      how_to_fix:
        "Add a cookie consent banner that loads BEFORE any tracker. Only fire analytics, ads, and marketing scripts after the user accepts. Provide a way to change the choice later.",
      fix_prompt:
        "Add a cookie consent banner. Step 1: install a small consent component (or a library like react-cookie-consent / klaro). Step 2: store the user's choice in localStorage as a JSON blob: { necessary: true, analytics: bool, marketing: bool }. Step 3: gate every non-essential tracker (Google Analytics, Meta Pixel, PostHog, Mixpanel, etc.) behind a check on that flag — do not initialize them on page load. Step 4: add a 'Cookie settings' link in the Footer that re-opens the banner so users can change their choice.",
      technical_reference: "missing-cookie-consent",
      google_query: "react cookie consent banner gdpr",
      confidence: "verified",
      confidence_reason:
        "Direct read from the file: a tracking script reference is present and no consent banner / consent manager string was found in the scanned files.",
      file_path: routerFile?.path || "scanned files",
      line_number: 1,
      code_snippet: "",
      evidence: "Tracking script present, no consent UI detected.",
      source: "deterministic",
    });
  }

  // ---------- L4: Account / data deletion path ----------
  // We look for: a delete-account route, a button labeled "delete
  // account", a delete_my_account RPC, or an edge function that
  // removes the user.
  const hasDeleteRoute = hasRoute(/\/(delete-account|account\/delete|settings\/delete)/i);
  const hasDeleteButton =
    /(delete|close|remove)\s+(my\s+)?(account|profile|data)/i.test(allText) ||
    /deleteAccount|deleteMyAccount|deleteProfile/i.test(allText);
  const hasDeleteRpc =
    /delete_my_account|admin_delete_user/.test(allTextLower) ||
    edgeFiles.some((f) => /delete[-_]?(account|user)/i.test(f.path));
  const hasDeletion = hasDeleteRoute || hasDeleteButton || hasDeleteRpc;

  if (!hasDeletion) {
    findings.push({
      id: `det-legal-deletion-${findings.length + 1}`,
      severity: "medium",
      category: "legal_data_deletion",
      title: "No way for users to delete their account or data",
      what_we_found:
        "We did not find a Delete Account button, a /delete-account route, a delete_my_account database function, or an edge function that removes a user's data.",
      what_this_means:
        "GDPR Article 17 (right to erasure), CCPA (California), and most modern privacy laws require you to give users a self-serve way to delete their account and personal data. Without it, every deletion request becomes manual support work and you are technically non-compliant.",
      how_to_fix:
        "Add a 'Delete account' option in the user's settings page that calls a server-side function. The function should remove the user from auth.users and clean up related rows the user owns.",
      fix_prompt:
        "Add account deletion. Step 1: in your Supabase database, create a SECURITY DEFINER function delete_my_account() that deletes the caller's rows from your custom tables (analyses, apps, etc.) and then deletes their row from auth.users. Step 2: in Settings.tsx, add a 'Danger zone' section with a 'Delete my account' button that opens a confirmation modal asking the user to type their email to confirm. Step 3: on confirm, call supabase.rpc('delete_my_account') and then sign the user out and redirect to /. Step 4: link to this option from your privacy policy.",
      technical_reference: "missing-data-deletion",
      google_query: "supabase delete account user gdpr right to erasure",
      confidence: baseConfidence,
      confidence_reason: baseReason,
      ...(verifyNote ? { verification_note: verifyNote } : {}),
      file_path: "scanned files",
      line_number: 1,
      code_snippet: "",
      evidence: "No deletion route, button, RPC, or edge function found.",
      source: "deterministic",
    });
  }

  return findings;
}

// ============================================================
// SECTION 1d: Smart-question evidence harvester
// When the read_code stage generates a question whose `context` field
// cites a specific file + line + a damning phrase (e.g. "INTENTIONAL
// ISSUE", "no auth check", "isPro = true"), we promote that into a
// verified security finding even if the LLM forgets to do so later.
// ============================================================
function harvestFindingsFromQuestions(questions: any[]): DetectorFinding[] {
  if (!Array.isArray(questions) || questions.length === 0) return [];
  const findings: DetectorFinding[] = [];
  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const ctx: string = (q?.context || "") + " " + (q?.question || "");
    if (!ctx) continue;
    // Extract file + line from "File: path, Line N:"
    const fileMatch = ctx.match(/File:\s*([^\s,]+)\s*,?\s*Line\s+(\d+)/i);
    if (!fileMatch) continue;
    const file_path = fileMatch[1];
    const line_number = parseInt(fileMatch[2], 10) || 1;
    const lower = ctx.toLowerCase();

    let severity: DetectorFinding["severity"] = "high";
    let category = "business_logic";
    let title = "";
    let what_we_found = "";
    let what_this_means = "";
    let fix_prompt = "";
    let evidence = "";

    if (/no auth check|no redirect|open admin|unprotected admin/.test(lower) && /\/admin/.test(lower)) {
      severity = "critical"; category = "admin_access";
      title = "Anyone can open your admin page";
      what_we_found = `${file_path} line ${line_number} is an admin route with no login or role check.`;
      what_this_means = "Any visitor who knows the URL reaches the admin dashboard.";
      fix_prompt = `Add a login + admin role check at the top of ${file_path}. If there is no user or the user is not an admin, redirect to / before rendering anything.`;
      evidence = "Open admin route flagged in code understanding.";
    } else if (/data leak|leaks user data|unfiltered query|fetches all|select\(\s*['"]\*['"]\s*\).*without/.test(lower)) {
      severity = "critical"; category = "rls";
      title = "Anyone can read everyone else's data";
      what_we_found = `${file_path} line ${line_number} runs a database query with no user filter. It returns every row to every visitor.`;
      what_this_means = "Every user sees every other user's records on this page.";
      fix_prompt = `Open ${file_path} line ${line_number}. Add .eq('user_id', user.id) to the query, then enable row-level rules on the table in Supabase with policy USING (auth.uid() = user_id).`;
      evidence = "Unfiltered query flagged in code understanding.";
    } else if (/ispro\s*=\s*true|isadmin\s*=\s*true|hardcoded.*plan|plan.*hardcoded/.test(lower)) {
      severity = "critical"; category = "payment_validation";
      title = "Premium check is permanently turned on";
      what_we_found = `${file_path} line ${line_number} hardcodes a permission flag to true. Every user gets premium access.`;
      what_this_means = "Paid features are free for everyone. You lose revenue.";
      fix_prompt = `Replace the hardcoded flag in ${file_path} line ${line_number} with a real check: read the current user, query profiles.plan, set the flag based on that value.`;
      evidence = "Hardcoded permission flag flagged in code understanding.";
    } else if (/service[_-]?role.*key|bypasses rls/.test(lower)) {
      severity = "critical"; category = "secret_exposure";
      title = "Database master key is in your frontend code";
      what_we_found = `${file_path} line ${line_number} uses the service role key. This key bypasses every database rule.`;
      what_this_means = "Anyone who opens your site in dev tools can read or delete all data.";
      fix_prompt = `Move the operation in ${file_path} line ${line_number} into a Supabase Edge Function. The frontend must only use the anon key. Then rotate the service role key.`;
      evidence = "Service role key reference flagged in code understanding.";
    } else {
      continue;
    }

    findings.push({
      id: `det-q-${qi + 1}`,
      severity,
      category,
      title,
      what_we_found,
      what_this_means,
      how_to_fix: fix_prompt,
      fix_prompt,
      technical_reference: category,
      google_query: `${category} supabase fix`,
      confidence: "verified",
      confidence_reason: "Promoted from the code-reading stage which cited the exact file and line.",
      file_path,
      line_number,
      code_snippet: snippet(q?.context || ""),
      evidence,
      source: "deterministic",
    });
  }
  return findings;
}

// Merge deterministic findings with LLM findings, dedupe, cap at 8.
function mergeSecurityFindings(deterministic: DetectorFinding[], llm: any[]): any[] {
  const out: any[] = [];
  const seen = new Set<string>();
  // Deterministic first — they win on ties.
  for (const f of deterministic) {
    const key = `${f.file_path}:${f.category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  for (const f of (llm || [])) {
    const fp = f?.file_path || "";
    const cat = (f?.category || "").toLowerCase();
    const key = `${fp}:${cat}`;
    if (fp && cat && seen.has(key)) continue;
    if (fp && cat) seen.add(key);
    out.push(f);
  }
  return out.slice(0, 8);
}

// ============================================================
// SECTION 2: AI calls
// Claude Sonnet 4 = primary for all analysis (read_code + analyze)
// Gemini 2.5 Flash = verification pass (Pro only) + fallback on Claude 429/529
// ============================================================
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Strict house style for all Gemini calls — short, plain, no fluff
const HOUSE_STYLE = `Strict response rules:
- Plain English. No markdown unless explicitly requested.
- No phrases like "It's important to note", "Additionally", "In conclusion", "Furthermore".
- No preamble. No closing summary. Get to the point.
- Titles maximum 8 words.
- Match a non-technical founder's vocabulary, not engineering jargon.
- Return ONLY valid JSON when asked. No surrounding text. No code fences.`;

async function callGeminiRaw(systemPrompt: string, userContent: string, model: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${systemPrompt}\n\n${HOUSE_STYLE}` },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const status = res.status;
    const body = await res.text().catch(() => "");
    console.error(`Gemini error [${status}] model=${model}:`, body.slice(0, 500));
    const err: any = new Error(status === 429 ? "RATE_LIMITED" : status === 402 ? "CREDITS_EXHAUSTED" : "AI_ERROR");
    err.status = status;
    throw err;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Gemini with auto-retry on 429 + cross-fallback to Claude as last resort.
async function callGemini(systemPrompt: string, userContent: string, model = "google/gemini-2.5-flash") {
  const delays = [1500, 4000, 8000]; // 3 retries with backoff
  let lastErr: any;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await callGeminiRaw(systemPrompt, userContent, model);
    } catch (e: any) {
      lastErr = e;
      // Only retry on 429; bail immediately on 402/other
      if (e?.status !== 429 || attempt === delays.length) break;
      console.warn(`Gemini 429, retrying in ${delays[attempt]}ms (attempt ${attempt + 1}/${delays.length})`);
      await new Promise(r => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}

async function callClaude(systemPrompt: string, userContent: string) {
  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_KEY");
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_KEY not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const status = res.status;
    const errBody = await res.text().catch(() => "");
    console.error(`Claude error [${status}]:`, errBody.slice(0, 300));
    // Tag retryable errors so the wrapper can fall back
    if (status === 429 || status === 529 || status >= 500) {
      const e: any = new Error("CLAUDE_RETRYABLE");
      e.status = status;
      throw e;
    }
    throw new Error("AI_ERROR");
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// Claude is the primary analysis engine for all read_code and analyze calls.
// On 429 / 529 / 5xx, fall back to Gemini 2.5 Flash using the EXACT same
// system prompt — Claude's prompt already enforces the report style and
// JSON shape, so the output stays consistent.
async function callClaudeWithFallback(systemPrompt: string, userContent: string) {
  try {
    return await callClaude(systemPrompt, userContent);
  } catch (e: any) {
    if (e?.message === "CLAUDE_RETRYABLE") {
      console.warn(`Claude unavailable (${e.status}). Falling back to Gemini 2.5 Flash with Claude's prompt.`);
      // Reuse Claude's system prompt verbatim so the report style matches.
      // Do NOT append HOUSE_STYLE here — Claude's prompt already defines the voice.
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
      const res = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
      });
      if (!res.ok) {
        const status = res.status;
        const body = await res.text().catch(() => "");
        console.error(`Gemini fallback error [${status}]:`, body.slice(0, 300));
        if (status === 429) throw new Error("RATE_LIMITED");
        if (status === 402) throw new Error("CREDITS_EXHAUSTED");
        throw new Error("AI_ERROR");
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    }
    throw e;
  }
}

function parseJSON(text: string): any {
  let jsonStr = text.trim();
  const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();
  // Find first { and last } to be safe
  const first = jsonStr.indexOf("{");
  const last = jsonStr.lastIndexOf("}");
  if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);
  return JSON.parse(jsonStr);
}

// ============================================================
// SECTION 2b: Server-side score calculation
// All scoring happens here, not in the AI prompt.
// Verified findings (confirmed by Gemini pass) cost double the unverified rate.
// ============================================================
function calculateScore(
  gaps: any[],
  securityIssues: any[],
  falsePromises: any[],
  verificationApplied: boolean,
  scanType: string
): { score: number; grade: string; launch_status: string } {
  const DEDUCTIONS: Record<string, { verified: number; unverified: number }> = {
    critical: { verified: 10,   unverified: 5 },
    high:     { verified: 5,    unverified: 2.5 },
    medium:   { verified: 2,    unverified: 1 },
    low:      { verified: 0.5,  unverified: 0.25 },
  };

  const allFindings = [
    ...gaps.map((f: any) => ({ ...f, _pool: "gap" })),
    ...securityIssues.map((f: any) => ({ ...f, _pool: "sec" })),
    ...falsePromises.map((f: any) => ({ ...f, _pool: "fp" })),
  ];

  let score = 100;
  let criticalCount = 0;

  for (const f of allFindings) {
    const sev = (f.severity || "low").toLowerCase();
    const table = DEDUCTIONS[sev] || DEDUCTIONS.low;
    // Gaps tagged verified=true by the Gemini pass; security and promise findings are always unverified
    const isVerified = verificationApplied && f._pool === "gap" && f.verified === true;
    score -= isVerified ? table.verified : table.unverified;
    if (sev === "critical") criticalCount++;
  }

  // Hard caps
  if (criticalCount >= 3)      score = Math.min(score, 45);
  else if (criticalCount >= 2) score = Math.min(score, 60);
  else if (criticalCount >= 1) score = Math.min(score, 75);

  // Quick scan ceiling (deep scan can reach 100)
  score = Math.min(score, scanType === "deep" ? 100 : 90);

  // Floor — 40 minimum always; 0 only for failed/empty scans (handled by caller)
  score = Math.max(score, 40);

  score = Math.round(score * 10) / 10;

  const grade =
    score >= 93 ? "A" :
    score >= 85 ? "B" :
    score >= 70 ? "C" :
    score >= 55 ? "D" : "F";

  const launch_status =
    score >= 85 ? "ready" :
    score >= 70 ? "almost" :
    score >= 55 ? "needs_work" :
    score >= 40 ? "not_ready" : "critical";

  return { score, grade, launch_status };
}

// ============================================================
// SECTION 3: Plan + abuse limits (server-enforced)
// ============================================================
const PLAN_LIMITS = {
  free: {
    weeklyScans: 3,
    monthlyScans: Infinity,
    maxRepoBytes: 2 * 1024 * 1024, // 2MB
    duplicateBlockHours: 24,
    edgeFunctionScan: false,
    verificationPass: false,
    emailDelivery: false,
  },
  try_pro: {
    weeklyScans: Infinity,
    monthlyScans: 100,
    maxRepoBytes: 10 * 1024 * 1024, // 10MB
    duplicateBlockHours: 0,
    edgeFunctionScan: true,
    verificationPass: true,
    emailDelivery: true,
  },
  pro: {
    weeklyScans: Infinity,
    monthlyScans: 100,
    maxRepoBytes: 10 * 1024 * 1024, // 10MB
    duplicateBlockHours: 0,
    edgeFunctionScan: true,
    verificationPass: true,
    emailDelivery: true,
  },
};

async function checkAbuseLimits(serviceClient: any, userId: string, plan: "free" | "try_pro" | "pro", repoName: string, repoSizeBytes: number, currentScanSessionId?: string | null) {
  const limits = PLAN_LIMITS[plan];

  // 1. Repo size cap
  if (repoSizeBytes > limits.maxRepoBytes) {
    return { ok: false, code: "REPO_TOO_LARGE", message: `Repository code exceeds ${plan === "free" ? "2MB" : "10MB"} limit. ${plan === "free" ? "Upgrade to Pro for 10MB scans." : "Contact support for larger repos."}` };
  }

  // 2. Concurrent scan lock
  let activeQuery = serviceClient
    .from("scan_sessions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["pending", "analyzing"]);

  if (currentScanSessionId) {
    activeQuery = activeQuery.neq("id", currentScanSessionId);
  }

  const { data: active } = await activeQuery.limit(1);
  if (active && active.length > 0) {
    return { ok: false, code: "SCAN_IN_PROGRESS", message: "You already have a scan running. Please wait for it to finish." };
  }

  // 3. Duplicate scan block (free only)
  if (limits.duplicateBlockHours > 0 && repoName) {
    const cutoff = new Date(Date.now() - limits.duplicateBlockHours * 60 * 60 * 1000).toISOString();
    const { data: recent } = await serviceClient
      .from("scan_sessions")
      .select("id, report_id")
      .eq("user_id", userId)
      .eq("repo_name", repoName)
      .eq("status", "complete")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1);
    if (recent && recent.length > 0) {
      return { ok: false, code: "DUPLICATE_SCAN", message: "You already scanned this repo in the last 24 hours. Upgrade to Pro for unlimited re-scans.", existingReportId: recent[0].report_id };
    }
  }

  // 4. Weekly scan limit (free)
  if (limits.weeklyScans !== Infinity) {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split("T")[0];
    const { data: usage } = await serviceClient
      .from("scan_usage")
      .select("scan_count")
      .eq("user_id", userId)
      .eq("week_start", mondayStr);
    const total = (usage || []).reduce((s: number, l: any) => s + (l.scan_count || 0), 0);
    if (total >= limits.weeklyScans) {
      return { ok: false, code: "WEEKLY_LIMIT", message: "You've used your 3 free scans this week. Try Pro for $8.99 to run a Deep Scan now, or wait until Monday." };
    }
  }

  // 5. Monthly scan limit (pro)
  if (limits.monthlyScans !== Infinity) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStr = monthStart.toISOString().split("T")[0];
    const { data: monthly } = await serviceClient
      .from("scan_usage_monthly")
      .select("scan_count")
      .eq("user_id", userId)
      .eq("month_start", monthStr)
      .maybeSingle();
    if ((monthly?.scan_count || 0) >= limits.monthlyScans) {
      return { ok: false, code: "MONTHLY_LIMIT", message: "You've reached your 100-scan monthly limit. Resets on the 1st." };
    }
  }

  return { ok: true };
}

// ============================================================
// SECTION 4: Chunking — split large code bundles
// ============================================================
function chunkCodeBundle(codeBundle: string, maxChunkSize = 60000): string[] {
  if (codeBundle.length <= maxChunkSize) return [codeBundle];
  // Split on file boundaries (=== filepath ===)
  const fileBlocks = codeBundle.split(/(?=^=== )/m);
  const chunks: string[] = [];
  let current = "";
  for (const block of fileBlocks) {
    if ((current + block).length > maxChunkSize && current) {
      chunks.push(current);
      current = block;
    } else {
      current += block;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// ============================================================
// SECTION 5: Main handler
// ============================================================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const {
      action,
      codeBundle,
      edgeFunctionBundle,
      tableNames,
      platform,
      code_understanding,
      founder_description,
      user_answers,
      gaps,
      security_issues,
      unknown_features,
      // NOTE: supabase_url / supabase_anon_key are intentionally NOT read from
      // the request body. They are sensitive credentials and must never be sent
      // from the browser. We look them up server-side from the apps table below.
      app_id,
      github_owner,
      github_repo_name,
      concern,
      project_type,
      monetization,
      scan_type,
      scan_session_id,
      smart_questions,
    } = body;
    const scanType: "quick" | "deep" = scan_type === "deep" ? "deep" : "quick";

    // Get user plan and deep_scan_credits from profiles
    const { data: profileRow } = await serviceClient
      .from("profiles")
      .select("plan, pro_credits, pro_until, email")
      .eq("id", user.id)
      .single();
    const rawPlan = profileRow?.plan || "free";
    let userPlan: "free" | "try_pro" | "pro" =
      rawPlan === "pro" ? "pro" : rawPlan === "try_pro" ? "try_pro" : "free";
    const deepScanCredits: number = profileRow?.pro_credits ?? 0;

    // Internal unlimited-access allowlist (founder/staff testing)
    const UNLIMITED_EMAILS = new Set(["risvan@labs3am.com", "hello@rismon.ai"]);
    const isUnlimited = !!(profileRow?.email && UNLIMITED_EMAILS.has(profileRow.email.toLowerCase()));
    if (isUnlimited) userPlan = "pro";
    const limits = PLAN_LIMITS[userPlan];

    // ============================================================
    // ACTION: read_code (stage 1 — extract facts via Gemini)
    // ============================================================
    if (action === "read_code") {
      // Validate repo matches saved app
      if (app_id && github_owner && github_repo_name) {
        const { data: appRecord, error: appErr } = await supabase
          .from("apps")
          .select("github_owner, github_repo_name")
          .eq("id", app_id)
          .eq("user_id", user.id)
          .single();
        if (appErr || !appRecord) {
          return new Response(JSON.stringify({ error: "unauthorized", message: "App not found or not owned by you" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (appRecord.github_owner !== github_owner || appRecord.github_repo_name !== github_repo_name) {
          return new Response(JSON.stringify({ error: "unauthorized", message: "Repository does not match the connected app" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      const repoName = `${github_owner}/${github_repo_name}`;
      const totalBundle = (codeBundle || "") + (edgeFunctionBundle || "");
      const repoSizeBytes = new TextEncoder().encode(totalBundle).length;

      // Server-side lookup of the app's Supabase credentials. RLS restricts the
      // apps table to the authenticated owner, so this can only return rows the
      // current user owns.
      let appSupabaseUrl: string | null = null;
      let appSupabaseAnonKey: string | null = null;
      if (app_id) {
        // Credentials are stored encrypted on public.apps. Decrypt server-side
        // via the service-role-only RPC. Ownership is enforced by re-checking
        // user_id against the row before calling the decrypt function.
        const { data: ownerCheck } = await serviceClient
          .from("apps")
          .select("user_id")
          .eq("id", app_id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (ownerCheck) {
          const { data: appCreds } = await serviceClient
            .rpc("get_app_supabase_credentials", { _app_id: app_id })
            .maybeSingle();
          appSupabaseUrl = (appCreds as any)?.supabase_url ?? null;
          appSupabaseAnonKey = (appCreds as any)?.supabase_anon_key ?? null;
        }
      }

      // Enforce all abuse limits BEFORE any AI call (skipped for unlimited allowlist)
      if (!isUnlimited) {
        const limitCheck = await checkAbuseLimits(serviceClient, user.id, userPlan, repoName, repoSizeBytes, scan_session_id);
        if (!limitCheck.ok) {
          // Return 200 so supabase.functions.invoke surfaces the body to the client
          // (non-2xx responses get swallowed into a generic FunctionsHttpError).
          return new Response(JSON.stringify({ error: limitCheck.message, code: limitCheck.code, existingReportId: limitCheck.existingReportId }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Pre-scan deterministic checks
      const securityPreFound = runSecurityPreChecks(totalBundle);
      const preAnalysis = runPreAnalysis(totalBundle);

      // Probe Supabase backend live: list tables AND test each one for
      // anonymous reads. Publicly-readable tables become hard-evidence
      // findings the AI cannot downgrade.
      const rlsFindings: any[] = [];
      let derivedTableNames = "";
      if (appSupabaseUrl && appSupabaseAnonKey) {
        const probe = await probeSupabaseBackend(appSupabaseUrl, appSupabaseAnonKey);
        if (probe.tables.length > 0) {
          derivedTableNames = probe.tables.join(", ");
          rlsFindings.push({
            type: "tables_detected",
            tables: probe.tables,
            note: "Tables enumerated live from the founder's Supabase project.",
          });
        }
        if (probe.publiclyReadable.length > 0) {
          rlsFindings.push({
            type: "live_rls_leak",
            severity: "critical",
            tables: probe.publiclyReadable.map((p) => p.table),
            note:
              "These tables returned rows to an anonymous caller using only the public anon key. Treat as a verified data leak.",
          });
        }
      }
      // Prefer the server-derived list; fall back to anything the client sent.
      const effectiveTableNames = derivedTableNames || tableNames || "";

      const preCheckContext = (securityPreFound.length > 0 || rlsFindings.length > 0)
        ? `\n\nPre-scan findings already detected: ${JSON.stringify([...securityPreFound, ...rlsFindings])}\nInclude these in your response and add anything else you find.`
        : "";

      // Stage 1: extract facts via Claude Sonnet (primary) — falls back to Gemini 2.5 Flash on 429/529
      const includeEdge = userPlan === "pro" && edgeFunctionBundle;
      const systemPrompt = `You are a code reader. Extract facts from this codebase. Look at: features, user roles, payment code, routes (protected vs public), database tables used, coding patterns, anything that looks unintentional. ${includeEdge ? "Backend logic is included in supabase/functions/* — judge auth, payment, and data-access enforcement based on this code, not just the frontend." : "Note: only frontend code was scanned. Flag features whose backend enforcement cannot be verified."} Then generate up to 8 plain-English questions for the founder, each citing what you found.${preCheckContext}

Return ONLY this JSON:
{
  "app_understanding": {
    "features_found": [],
    "user_roles_found": [],
    "has_payments_code": boolean,
    "has_admin": boolean,
    "has_messaging": boolean,
    "database_tables": [],
    "protected_routes": [],
    "public_routes": [],
    "edge_functions_found": [],
    "unknown_features": [],
    "code_style": "",
    "platform_detected": "",
    "business_type_guess": ""
  },
  "questions": [{ "id": "", "question": "", "context": "", "answer_type": "yes_no|text|select", "options": [] }]
}`;

      // Chunk if needed
      const chunks = chunkCodeBundle(totalBundle);
      let mergedFacts: any = null;

      if (chunks.length === 1) {
        const userContent = `Code:\n${chunks[0]}\n\nDatabase tables: ${effectiveTableNames || "unknown"}\nPlatform: ${platform || "unknown"}\nUser plan: ${userPlan}`;
        const text = await callClaudeWithFallback(systemPrompt, userContent);
        mergedFacts = parseJSON(text);
      } else {
        // Per-chunk extraction then merge
        const partials: any[] = [];
        for (let i = 0; i < chunks.length; i++) {
          const userContent = `Code chunk ${i + 1} of ${chunks.length}:\n${chunks[i]}\n\nDatabase tables: ${effectiveTableNames || "unknown"}\nPlatform: ${platform || "unknown"}`;
          const text = await callClaudeWithFallback(systemPrompt, userContent);
          try { partials.push(parseJSON(text)); } catch { /* skip bad chunk */ }
        }
        // Merge into one
        const merged: Record<string, any> = {
          features_found: [] as any[], user_roles_found: [] as any[], has_payments_code: false, has_admin: false, has_messaging: false,
          database_tables: [] as any[], protected_routes: [] as any[], public_routes: [] as any[], edge_functions_found: [] as any[], unknown_features: [] as any[],
          code_style: "", platform_detected: "", business_type_guess: "",
        };
        const allQuestions: any[] = [];
        for (const p of partials) {
          const u = p.app_understanding || {};
          (["features_found", "user_roles_found", "database_tables", "protected_routes", "public_routes", "edge_functions_found", "unknown_features"] as const).forEach(k => {
            if (Array.isArray(u[k])) merged[k] = Array.from(new Set([...merged[k], ...u[k]]));
          });
          merged.has_payments_code = merged.has_payments_code || !!u.has_payments_code;
          merged.has_admin = merged.has_admin || !!u.has_admin;
          merged.has_messaging = merged.has_messaging || !!u.has_messaging;
          if (u.code_style && !merged.code_style) merged.code_style = u.code_style;
          if (u.platform_detected && !merged.platform_detected) merged.platform_detected = u.platform_detected;
          if (u.business_type_guess && !merged.business_type_guess) merged.business_type_guess = u.business_type_guess;
          if (Array.isArray(p.questions)) allQuestions.push(...p.questions);
        }
        // Dedupe questions by question text, keep first 8
        const seen = new Set<string>();
        const uniqueQs = allQuestions.filter(q => { if (seen.has(q.question)) return false; seen.add(q.question); return true; }).slice(0, 8);
        mergedFacts = { app_understanding: merged, questions: uniqueQs };
      }

      return new Response(JSON.stringify({ ...mergedFacts, pre_analysis: preAnalysis }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============================================================
    // ACTION: analyze (stage 2 — Claude deep, then Gemini verifies)
    // ============================================================
    // ============================================================
    // ACTION: analyze_async (tab-safe background analysis)
    //
    // Returns 202 immediately, then runs the existing "analyze" pipeline
    // in the background using EdgeRuntime.waitUntil. The browser stops
    // awaiting the slow Gemini/Claude work — it only polls the
    // scan_sessions + analyses tables for status updates. This survives
    // tab switches, network drops, and browser fetch throttling.
    //
    // Required body fields (same as "analyze" plus):
    //   scan_session_id  – row in scan_sessions to flip to complete/failed
    //   analysis_id      – row in analyses to write final results into
    // ============================================================
    if (action === "analyze_async") {
      const scanSessionId: string | null = body.scan_session_id ?? null;
      const analysisId: string | null = body.analysis_id ?? null;
      if (!scanSessionId || !analysisId) {
        return new Response(
          JSON.stringify({ error: "scan_session_id and analysis_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Cheap synchronous pre-checks. We mirror the gate-keeping that the
      // sync "analyze" action does so the user gets immediate feedback
      // for limit/credit errors instead of polling and timing out.
      if (userPlan === "try_pro" && deepScanCredits <= 0) {
        return new Response(
          JSON.stringify({ error: "No deep scan credits remaining", code: "no_credits" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (userPlan === "free") {
        const now = new Date();
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        const mondayStr = monday.toISOString().split("T")[0];
        const { data: weekUsage } = await serviceClient
          .from("scan_usage")
          .select("scan_count")
          .eq("user_id", user.id)
          .eq("week_start", mondayStr);
        const weekTotal = (weekUsage || []).reduce((s: number, l: any) => s + (l.scan_count || 0), 0);
        if (weekTotal >= PLAN_LIMITS.free.weeklyScans) {
          return new Response(
            JSON.stringify({ error: "You've used your 3 free scans this week. Try Pro for $8.99 to run a Deep Scan now, or wait until Monday.", code: "WEEKLY_LIMIT" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // Mark the scan as analyzing right away so the dashboard / poller
      // sees it as in-progress even before the background task spins up.
      await serviceClient.from("scan_sessions").update({ status: "analyzing" }).eq("id", scanSessionId);
      await serviceClient.from("analyses").update({ status: "analyzing" }).eq("id", analysisId);

      // Build a request that re-invokes this same function with the
      // synchronous "analyze" action. We forward the user's JWT so all
      // RLS-scoped reads (apps, profiles) keep working as the right user.
      const fnUrl = `${supabaseUrl}/functions/v1/analyze`;
      const forwardedAuth = authHeader;
      const innerBody = { ...body, action: "analyze" };

      const backgroundJob = (async () => {
        try {
          const res = await fetch(fnUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": forwardedAuth,
              "apikey": supabaseAnonKey,
            },
            body: JSON.stringify(innerBody),
          });
          const text = await res.text();
          let data: any = null;
          try { data = JSON.parse(text); } catch { /* non-JSON */ }

          if (!res.ok || !data || data.error) {
            const errMsg = data?.error || `Background analyze failed (${res.status})`;
            await serviceClient.from("scan_sessions").update({
              status: "failed",
            }).eq("id", scanSessionId);
            await serviceClient.from("analyses").update({
              status: "failed",
              summary: errMsg.slice(0, 500),
            }).eq("id", analysisId);
            return;
          }

          // Persist the result into the analyses row (mirrors what the
          // client used to do after awaiting the response).
          const durationSeconds = (() => {
            // Best-effort: scan_sessions.created_at gives us a reliable wall-clock start.
            return null; // client will compute and update on transition; safe to leave null here.
          })();

          await serviceClient.from("analyses").update({
            user_answers: body.user_answers ?? null,
            gaps: data.gaps ?? [],
            unknown_features: data.unknown_features ?? [],
            security_issues: data.security_issues ?? [],
            what_works: data.what_works ?? [],
            intent_match_score: typeof data.intent_match_score === "number" ? data.intent_match_score : null,
            summary: data.summary ?? null,
            legal_findings: data.legal_findings ?? [],
            landing_page_promises: data.landing_page_promises ?? [],
            homepage_signals: data.homepage_signals ?? null,
            security_score: typeof data.security_score === "number" ? data.security_score : null,
            scan_type: body.scan_type === "deep" ? "deep" : "quick",
            scan_duration_seconds: durationSeconds,
            status: "review_pending",
          }).eq("id", analysisId);

          await serviceClient.from("scan_sessions").update({
            status: "complete",
            report_id: analysisId,
          }).eq("id", scanSessionId);
        } catch (err) {
          const msg = (err as any)?.message || "Unknown error in background analyze";
          try {
            await serviceClient.from("scan_sessions").update({ status: "failed" }).eq("id", scanSessionId);
            await serviceClient.from("analyses").update({
              status: "failed",
              summary: msg.slice(0, 500),
            }).eq("id", analysisId);
          } catch { /* swallow */ }
        }
      })();

      // Keep the function alive until the background task finishes,
      // even though we already returned the response.
      // @ts-ignore — EdgeRuntime is a Deno Deploy global, not in the Deno types.
      if (typeof EdgeRuntime !== "undefined" && typeof (EdgeRuntime as any).waitUntil === "function") {
        // @ts-ignore
        (EdgeRuntime as any).waitUntil(backgroundJob);
      } else {
        // Local dev fallback: just let it run unawaited.
        backgroundJob.catch(() => {});
      }

      return new Response(
        JSON.stringify({
          background: true,
          scan_session_id: scanSessionId,
          analysis_id: analysisId,
          message: "Analysis started in background. Poll scan_sessions for status.",
        }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "analyze") {
      // Note: this remains the synchronous path so older clients keep working.
      // New clients should call action: "analyze_async" (defined just above
      // the main handler return) which returns 202 immediately and runs this
      // same pipeline in the background via EdgeRuntime.waitUntil.
      // Check deep_scan_credits for try_pro before calling Claude
      if (userPlan === "try_pro" && deepScanCredits <= 0) {
        return new Response(
          JSON.stringify({ error: "No deep scan credits remaining", code: "no_credits" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Server-side lookup of the app's Supabase credentials. RLS restricts the
      // apps table to the authenticated owner, so this can only return rows the
      // current user owns. We need these to know whether DB-related findings
      // could be verified live (vs inferred from code patterns only).
      let appSupabaseUrl: string | null = null;
      let appSupabaseAnonKey: string | null = null;
      if (app_id) {
        // Credentials are encrypted at rest. Confirm ownership, then decrypt
        // server-side via the service-role-only RPC.
        const { data: ownerCheck } = await serviceClient
          .from("apps")
          .select("user_id")
          .eq("id", app_id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (ownerCheck) {
          const { data: appCreds } = await serviceClient
            .rpc("get_app_supabase_credentials", { _app_id: app_id })
            .maybeSingle();
          appSupabaseUrl = (appCreds as any)?.supabase_url ?? null;
          appSupabaseAnonKey = (appCreds as any)?.supabase_anon_key ?? null;
        }
      }

      // Server-side weekly scan limit — runs in Deno (server clock), user's local
      // clock cannot affect this. Belt-and-suspenders alongside the read_code check.
      if (userPlan === "free") {
        const now = new Date();
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        const mondayStr = monday.toISOString().split("T")[0];
        const { data: weekUsage } = await serviceClient
          .from("scan_usage")
          .select("scan_count")
          .eq("user_id", user.id)
          .eq("week_start", mondayStr);
        const weekTotal = (weekUsage || []).reduce((s: number, l: any) => s + (l.scan_count || 0), 0);
        if (weekTotal >= PLAN_LIMITS.free.weeklyScans) {
          return new Response(
            JSON.stringify({ error: "You've used your 3 free scans this week. Try Pro for $8.99 to run a Deep Scan now, or wait until Monday.", code: "WEEKLY_LIMIT" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const scanTypeHint = scan_type === "deep"
        ? "This is a Deep Scan covering the complete codebase."
        : "This is a Quick Scan covering the most critical files only.";

      const claudeSystemPrompt = `You are Rismon, an expert at analyzing apps built with AI coding platforms like Lovable, Bolt, Cursor, and Replit.

${scanTypeHint}

CRITICAL CONTEXT:
These apps have a specific architecture:

1. GitHub contains React/TypeScript frontend code only.

2. Database lives in Supabase. Tables are NOT stored in GitHub. If you see supabase.from() calls the database EXISTS. NEVER say database is missing just because SQL files are not in GitHub.

3. Authentication is Supabase Auth. If you see supabase.auth calls real authentication EXISTS. NEVER say auth is fake if supabase.auth is used.

4. Backend logic lives in Supabase Edge Functions. If you see supabase.functions.invoke() a real backend EXISTS.

5. Payments are detected from imports. If Stripe/Razorpay/Paddle detected payment system EXISTS.

YOUR ONLY JOB:
Find gaps between what the founder meant to build and what was built. Find security issues that could hurt their business or users.

CRITICAL LANGUAGE RULES:
You are writing for someone who has never written a single line of code.

FORBIDDEN WORDS - NEVER USE THESE:
RLS, Row Level Security, JWT, CORS, CSP, XSS, CSRF, SQL injection, API endpoint, REST, GraphQL, Authentication, Authorization, Sanitization, Validation, Frontend, Backend, Server-side, Environment variable, Supabase, PostgreSQL, any database terms, any programming language names, any technical acronyms at all.

REQUIRED LANGUAGE:
Use everyday English only. Use "your app" not "the codebase". Use "your users data" not "database records". Use "anyone can access" not "unauthorized access". Use "your secret key" not "API key". Use "payment check" not "subscription validation". Always explain real world impact. Always use dollar amounts when relevant. Always use "you" and "your" to personalize.

TEST EVERY SENTENCE:
Would a restaurant owner understand this? If no — rewrite it completely.

WHAT TO LOOK FOR:

1. PAYMENT AND ACCESS GAPS
Check if payment logic is enforced:
- Free tier limits enforced server-side?
- Paid features checked before access?
- Subscription verified on every request?
- Trial expiry actually stops access?

2. DATA SEPARATION GAPS
Can users see each other's data?
- Missing user filter in queries?
- Shared data that should be private?
- Admin data visible to regular users?

3. ROLE AND PERMISSION GAPS
- Admin routes protected properly?
- Role checks in backend not just UI?
- Elevated permissions restricted?

4. BUSINESS RULE GAPS
- Usage limits actually enforced?
- Referral or discount rules limited?
- Cancellation logic correct?

5. SECURITY ISSUES
Run ALL five checks below on every scan. These checks are MANDATORY and independent of what the founder described. If a pattern exists in the code, flag it. No benefit of the doubt. No assumptions of safety.

CHECK A — EXPOSED SECRET KEYS:
Scan every frontend file for these exact patterns:
  - sk- (OpenAI key pattern)
  - const.*key.*= (any hardcoded key assignment)
  - VITE_ prefix variables assigned key values
  - apiKey = "..." (any hardcoded value in quotes)
  - Authorization.*Bearer.*" (hardcoded Bearer tokens)
If ANY of these patterns exist in a frontend file: CRITICAL severity. Always flag. Never skip.

CHECK B — DATA LEAK (missing user filter):
Look for Supabase queries like .from('tableName').select('*') that do NOT have .eq('user_id', ...) or any equivalent user-scoping filter.
If a user-owned table is queried without a user filter: CRITICAL severity. "All your users can see each other's data."

CHECK C — UNPROTECTED ADMIN PAGES:
Look for page components where:
  - The component name or route path contains "admin"
  - AND the component does NOT redirect unauthenticated users
  - AND there is no auth check before rendering
If found: CRITICAL severity. "Anyone who guesses the URL can access your admin panel."

CHECK D — HARDCODED BYPASS VALUES:
Look for patterns like:
  - const isPro = true
  - const isAdmin = true
  - Any boolean flag hardcoded to true inside auth or payment logic
If found: CRITICAL severity. "Your payment or permission check is permanently bypassed."

CHECK E — MISSING DATABASE PROTECTION:
If Supabase tables appear in the code (via .from() calls) but NO migration files contain any policy definitions (CREATE POLICY, ENABLE ROW LEVEL SECURITY, ALTER TABLE ... ENABLE ROW LEVEL SECURITY):
HIGH severity. "Your database tables may be completely open — anyone could read or delete all your users' data directly."

6. FALSE PROMISE DETECTION
These checks are MANDATORY on every scan. Search the homepage (index.html, landing page components, marketing copy in any component) for these exact claims. Then verify the claim against the actual code. If the code does not back up the claim, flag it as a false promise. No benefit of the doubt — if the code evidence is absent, flag it.

PROMISE A — "encrypted" or "end-to-end encrypted":
Search the codebase for encryption libraries (e.g. crypto, tweetnacl, libsodium, sjcl, CryptoJS, SubtleCrypto, webcrypto, forge).
If the homepage claims encryption but NO encryption library is imported or used anywhere: flag as false promise. Medium severity. "Your homepage promises encryption your app does not actually do."

PROMISE B — "real-time" or "live updates":
Search for WebSocket usage (new WebSocket, socket.io, ws://, wss://) OR Supabase realtime subscriptions (.channel(), .on('postgres_changes', ...), supabase.channel).
If the homepage claims real-time but NONE of these patterns exist: flag as false promise. Medium severity. "Your homepage says updates are live but the app actually requires a page refresh."

PROMISE C — "AI-powered" or "powered by AI":
Search backend/edge functions for AI API calls (openai, anthropic, @anthropic-ai, gemini, googleapis/ai, cohere, replicate).
  - If AI calls exist ONLY in frontend files with a hardcoded or VITE_-prefixed key: flag as BOTH a false promise AND a security issue (Critical). "Your AI key is exposed to anyone who opens your app."
  - If NO AI API calls exist anywhere: flag as false promise. Medium severity. "Your homepage claims AI features but no AI service is connected."

PROMISE D — "sync with [ServiceName]" or "integrates with [ServiceName]":
For each named third-party service in the homepage copy (e.g. Slack, Notion, Google Sheets, Zapier, HubSpot, Salesforce), search the codebase for that service's API domain or SDK import.
If the named integration is not found in the code: flag as false promise. Medium severity. "Your homepage advertises a [ServiceName] integration that does not exist in the code."

PROMISE E — "team collaboration", "invite your team", or "invite members":
Search for team/organisation logic: org_id, team_id, organization, invite, member_role, workspace.
If the homepage mentions team features but NO such logic exists in the code: flag as false promise. Medium severity. "Your homepage promises team features but there is no team logic in the app."

FOR EVERY FINDING USE THIS EXACT FORMAT:
Plain English title (max 8 words)
Plain English explanation (2-3 sentences)
Real world business impact (1-2 sentences)
Technical reference (5 words max)
Google search term to learn more
Exact fix prompt for Lovable or Cursor

SCORING:
Return "score": 0 — the server calculates the final score after verification.
Your only job is to find real issues and label each one accurately as
critical / high / medium / low. The score follows from those labels.

BANDS (for reference only — server assigns the final value):
93-100: Excellent / Perfect
85-92: Strong
70-84: Good
55-69: Getting there
40-54: Needs work
0-39: Critical issues

RESPOND IN THIS EXACT JSON FORMAT:
{
  "score": number,
  "grade": "A|B|C|D|F",
  "launch_status": "ready|almost|needs_work|not_ready|critical",
  "summary": "2 sentences. What app does well and biggest concern. Plain English.",
  "business_logic_gaps": [
    {
      "severity": "critical|high|medium|low",
      "title": "Plain English max 8 words",
      "explanation": "Plain English 2-3 sentences",
      "business_impact": "Real world consequence",
      "technical_reference": "5 words max technical term",
      "google_query": "exact search term",
      "fix_prompt": "Exact prompt to paste into Lovable or Cursor"
    }
  ],
  "security_findings": [
    {
      "severity": "critical|high|medium|low",
      "title": "Plain English max 8 words",
      "explanation": "Plain English 2-3 sentences",
      "business_impact": "Real world consequence",
      "technical_reference": "5 words max technical term",
      "google_query": "exact search term",
      "fix_prompt": "Exact prompt to paste into Lovable or Cursor"
    }
  ],
  "false_promises": [
    {
      "severity": "critical|medium",
      "claim": "Exact wording found on the homepage",
      "title": "Plain English max 8 words",
      "explanation": "Plain English 2-3 sentences",
      "business_impact": "Real world consequence",
      "technical_reference": "5 words max technical term",
      "google_query": "exact search term",
      "fix_prompt": "Exact prompt to paste into Lovable or Cursor"
    }
  ],
  "what_app_does_right": [
    "One sentence per positive finding"
  ],
  "next_step": "Single most important action to take first"
}

Maximum 5 business logic gaps. Maximum 5 security findings. Maximum 5 false promises. Always find at least 2 positives. Always include next_step. RESPOND WITH JSON ONLY. No other text.`;

      const claudeUserContent = `Scan type: ${scanType} (${scanType === "deep" ? "all repository files were fetched" : "only ~20 prioritized files were fetched — base findings on what is visible and avoid claiming a feature is missing if it could simply live in an unscanned file"})

App understanding: ${JSON.stringify(code_understanding)}

Founder described: ${founder_description}

FOUNDER'S CORE PROMISE:
${concern || "(none specified)"}
Verify this works correctly in the code. This is the most important finding in the report — if it does not work, raise it as the top business_logic_gap with severity "high".

Project type: ${project_type || "unknown"}
Monetization: ${monetization || "unknown"}

Founder answers to smart questions: ${JSON.stringify(user_answers)}`;

      const claudeText = await callClaudeWithFallback(claudeSystemPrompt, claudeUserContent);
      let claudeResult: any;
      try {
        claudeResult = parseJSON(claudeText);
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse analysis" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ----------------------------------------------------------
      // Normalize new Rismon prompt shape -> legacy shape expected
      // by the rest of the app (DB columns, Analyze.tsx, Report.tsx)
      // New keys: score, score_label, verdict, business_logic_gaps,
      //          security_findings, what_works, summary
      // Legacy keys: intent_match_score, gaps, security_issues,
      //              unknown_features, what_works, summary
      // ----------------------------------------------------------
      const mapFinding = (f: any, idx: number, prefix: string) => {
        const id = f?.id || `${prefix}-${idx + 1}`;
        const severity = (f?.severity || "medium").toLowerCase();
        const title = f?.title || "Issue";
        const what_we_found = f?.what_we_found || f?.you_said || "";
        const what_this_means = f?.what_this_means || f?.business_impact || "";
        const how_to_fix = f?.how_to_fix || "";
        return {
          id,
          severity,
          title,
          // legacy gap fields used by Report.tsx
          you_said: what_we_found,
          what_was_built: what_we_found,
          business_impact: what_this_means,
          // legacy security fields used by Report.tsx
          explanation: what_we_found || what_this_means,
          status: "failed",
          // keep new fields for fix-prompt generation downstream
          what_we_found,
          what_this_means,
          how_to_fix,
          fix_prompt: f?.fix_prompt || "",
          technical_reference: f?.technical_reference || "",
          google_query: f?.google_query || "",
        };
      };

      if (claudeResult && (claudeResult.business_logic_gaps || claudeResult.security_findings || typeof claudeResult.score === "number")) {
        const gapsArr = Array.isArray(claudeResult.business_logic_gaps) ? claudeResult.business_logic_gaps : [];
        const secArr = Array.isArray(claudeResult.security_findings) ? claudeResult.security_findings : [];
        const promisesArr = Array.isArray(claudeResult.false_promises) ? claudeResult.false_promises : [];
        const works = Array.isArray(claudeResult.what_works) ? claudeResult.what_works : [];

        const score = typeof claudeResult.score === "number" ? claudeResult.score : null;
        const summary = [claudeResult.summary, claudeResult.verdict].filter(Boolean).join(" ");

        claudeResult = {
          ...claudeResult,
          intent_match_score: score,
          gaps: gapsArr.map((g: any, i: number) => mapFinding(g, i, "g")),
          security_issues: secArr.map((s: any, i: number) => mapFinding(s, i, "s")),
          false_promises: promisesArr.map((p: any, i: number) => mapFinding(p, i, "p")),
          what_works: works,
          unknown_features: Array.isArray(claudeResult.unknown_features) ? claudeResult.unknown_features : [],
          summary: summary || claudeResult.summary || "",
        };
      }

      // Stage 4: Verification pass (Pro only) — Gemini Pro re-checks each gap against the facts
      if (limits.verificationPass && Array.isArray(claudeResult.gaps) && claudeResult.gaps.length > 0) {
        try {
          const verifySystem = `You verify whether each claimed gap is actually supported by the evidence. For each gap, decide: is the claim "what was built" actually true given the code understanding? Mark each gap "confirmed" or "rejected" with one short reason.

Return ONLY:
{ "verified": [{ "id": "g1", "verdict": "confirmed|rejected", "reason": "one short sentence" }] }`;
          const verifyUser = `Code understanding: ${JSON.stringify(code_understanding)}

Founder description: ${founder_description}

Claimed gaps to verify: ${JSON.stringify(claudeResult.gaps)}`;
          const verifyText = await callGemini(verifySystem, verifyUser, "google/gemini-2.5-flash");
          const verified = parseJSON(verifyText);
          if (Array.isArray(verified?.verified)) {
            const rejectedIds  = new Set(verified.verified.filter((v: any) => v.verdict === "rejected").map((v: any) => v.id));
            const confirmedIds = new Set(verified.verified.filter((v: any) => v.verdict === "confirmed").map((v: any) => v.id));
            claudeResult.gaps = claudeResult.gaps
              .filter((g: any) => !rejectedIds.has(g.id))
              .map((g: any) => ({ ...g, verified: confirmedIds.has(g.id) }));
            claudeResult.verification_applied = true;
            claudeResult.verification_dropped = rejectedIds.size;
          }
        } catch (e) {
          console.error("Verification pass failed (non-fatal):", e);
        }
      }

      // ----------------------------------------------------------
      // DETERMINISTIC SECURITY OVERLAY (added 2026-04)
      //
      // The LLM keeps under-reporting obvious vulnerabilities (open
      // admin routes, .select() with no user filter, hardcoded
      // isPro=true, service role key in frontend). We scan the code
      // bundle ourselves and inject any such finding as a "verified"
      // critical with file_path + line_number + code_snippet — proof
      // that bypasses every downstream filter.
      //
      // We also harvest evidence from the read_code stage's smart
      // questions: those frequently quote the exact unsafe line.
      // ----------------------------------------------------------
      const detFromCode = runDeterministicSecurityScan(
        codeBundle || "",
        edgeFunctionBundle || "",
      );
      const detFromQuestions = harvestFindingsFromQuestions(smart_questions || []);

      // Live backend probe — re-run here so the deterministic overlay
      // gets the freshest result. This is the highest-value evidence:
      // a real HTTP call against the founder's DB came back with data.
      let detFromBackend: DetectorFinding[] = [];
      if (appSupabaseUrl && appSupabaseAnonKey) {
        try {
          const probe = await probeSupabaseBackend(appSupabaseUrl, appSupabaseAnonKey);
          detFromBackend = findingsFromBackendProbe(probe);
        } catch (e) {
          console.error("Live backend probe failed (non-fatal):", e);
        }
      }

      const allDeterministic = [...detFromBackend, ...detFromCode, ...detFromQuestions];

      // Map each deterministic finding into the legacy shape the UI uses,
      // then merge with what Claude returned (deterministic wins on dedupe).
      const mappedDet = allDeterministic.map((f, i) => mapFinding(f, i, "d"));
      // mapFinding strips some of our extra fields; re-attach what the UI
      // and scorer need (severity is already preserved, but confidence and
      // source need to be re-applied since mapFinding doesn't know them).
      for (let i = 0; i < mappedDet.length; i++) {
        const original = allDeterministic[i];
        Object.assign(mappedDet[i], {
          confidence: original.confidence,
          confidence_reason: original.confidence_reason,
          file_path: original.file_path,
          line_number: original.line_number,
          code_snippet: original.code_snippet,
          evidence: original.evidence,
          category: original.category,
          source: original.source,
          severity: original.severity,
        });
      }

      claudeResult.security_issues = mergeSecurityFindings(
        mappedDet as any,
        Array.isArray(claudeResult.security_issues) ? claudeResult.security_issues : [],
      );

      // ----------------------------------------------------------
      // LEGAL OVERLAY — privacy/terms/consent/deletion checks.
      // These are NOT security issues; they live in their own
      // legal_findings array that the Report renders as a soft
      // "legal gap" section.
      // ----------------------------------------------------------
      try {
        const detLegal = runDeterministicLegalScan(
          codeBundle || "",
          edgeFunctionBundle || "",
        );
        const mappedLegal = detLegal.map((f, i) => {
          const m = mapFinding(f, i, "l");
          return Object.assign(m, {
            confidence: f.confidence,
            confidence_reason: f.confidence_reason,
            verification_note: (f as any).verification_note,
            file_path: f.file_path,
            line_number: f.line_number,
            code_snippet: f.code_snippet,
            evidence: f.evidence,
            category: f.category,
            source: f.source,
            severity: f.severity,
          });
        });
        // Merge with anything Claude returned (deterministic wins on dedupe by category).
        const claudeLegal = Array.isArray(claudeResult.legal_findings) ? claudeResult.legal_findings : [];
        const seenCats = new Set(mappedLegal.map((f: any) => f.category));
        const extraLegal = claudeLegal.filter((f: any) => !seenCats.has(f?.category));
        claudeResult.legal_findings = [...mappedLegal, ...extraLegal];
      } catch (e) {
        console.error("Legal scanner failed (non-fatal):", e);
        if (!Array.isArray(claudeResult.legal_findings)) claudeResult.legal_findings = [];
      }

      // ----------------------------------------------------------
      // DB-VERIFICATION OVERLAY (added 2026-04)
      //
      // Findings about database security (RLS, user data isolation,
      // unfiltered queries, missing user filters, admin role checks
      // against profiles, etc.) are inferred from CODE PATTERNS unless
      // the founder connected their Supabase project so we can probe
      // it directly. When Supabase is NOT connected:
      //   - confidence  → "unverified"
      //   - severity    → capped at "high"  (no critical from inference)
      //   - verification_note → explanation shown under the finding
      // When Supabase IS connected, these findings stay as-is (the
      // deterministic scanner cited the file/line and we cross-checked
      // tables via the live REST probe above).
      // ----------------------------------------------------------
      const supabaseConnected = !!(appSupabaseUrl && appSupabaseAnonKey);
      const DB_CATEGORIES = new Set([
        "rls",
        "user_data_isolation",
        "data_isolation",
        "database_security",
        "missing_user_filter",
        "admin_access",
        "data_leak",
      ]);
      const isDbRelated = (f: any) => {
        const cat = (f?.category || "").toString().toLowerCase();
        if (DB_CATEGORIES.has(cat)) return true;
        const hay = `${f?.title || ""} ${f?.what_we_found || ""} ${f?.technical_reference || ""}`.toLowerCase();
        return /\brls\b|row[- ]level\s+security|user[_ ]?id filter|unfiltered.*(query|select|read)|user data isolation|other users? (can )?(see|read|access)|cross[- ]user|tenant isolation/.test(hay);
      };
      if (!supabaseConnected && Array.isArray(claudeResult.security_issues)) {
        for (const f of claudeResult.security_issues) {
          if (!f || !isDbRelated(f)) continue;
          // Skip deterministic findings — they have file/line proof and don't need DB access.
          if (f.source === "deterministic") continue;
          // Cap severity at "high" — never "critical" without DB proof.
          const sev = (f.severity || "medium").toLowerCase();
          if (sev === "critical") f.severity = "high";
          // Force confidence to unverified.
          f.confidence = "unverified";
          f.confidence_reason =
            "Detected from code patterns only — your Supabase project is not connected, so we could not verify the live database rules.";
          f.verification_note =
            "Connect your Supabase project to verify this finding accurately. Without Supabase access this is based on code patterns only.";
          f.requires_supabase_verification = true;
        }
      }

      // Override score with server-calculated value (new scoring system)
      const resolvedScanType = scan_type || (userPlan === "free" ? "quick" : "deep");
      const { score: finalScore, grade: finalGrade, launch_status: finalStatus } = calculateScore(
        claudeResult.gaps || [],
        claudeResult.security_issues || [],
        claudeResult.false_promises || [],
        !!claudeResult.verification_applied,
        resolvedScanType
      );
      claudeResult.score = finalScore;
      claudeResult.intent_match_score = finalScore;
      claudeResult.grade = finalGrade;
      claudeResult.launch_status = finalStatus;

      claudeResult.plan_at_scan = userPlan;
      claudeResult.scan_type = resolvedScanType;
      claudeResult.edge_functions_scanned = limits.edgeFunctionScan;

      // Deduct one deep_scan_credit for try_pro after successful scan
      if (userPlan === "try_pro") {
        await serviceClient
          .from("profiles")
          .update({ pro_credits: Math.max(0, deepScanCredits - 1) })
          .eq("id", user.id)
          .eq("plan", "try_pro");
      }

      return new Response(JSON.stringify(claudeResult), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============================================================
    // ACTION: generate_fixes (stage 5 — Gemini Flash, cheap & templated)
    // ============================================================
    if (action === "generate_fixes") {
      const systemPrompt = `Generate copy-paste fix prompts for the founder's app. Each prompt must:
- Match the app's exact code style and table names where known
- Be specific to their platform (${platform || "Lovable"})
- Be plain English with step-by-step instructions
- Be ready to paste with no modification

Return ONLY:
{ "fix_prompts": [{ "fix_id": "", "title": "", "platform": "lovable|cursor|supabase|general", "prompt": "", "where_to_paste": "", "expected_result": "" }] }`;

      const userContent = `Platform: ${platform || "unknown"}
Gaps: ${JSON.stringify(gaps)}
Security issues: ${JSON.stringify(security_issues)}
Unknown features: ${JSON.stringify(unknown_features)}
App understanding: ${JSON.stringify(code_understanding)}`;

      const text = await callGemini(systemPrompt, userContent);
      try {
        const parsed = parseJSON(text);
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse fix prompts" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ============================================================
    // ACTION: increment_usage (called after successful scan completion)
    // ============================================================
    if (action === "increment_usage") {
      const now = new Date();
      // Weekly counter (free)
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const mondayStr = monday.toISOString().split("T")[0];
      const { data: existingWeek } = await serviceClient
        .from("scan_usage")
        .select("id, scan_count")
        .eq("user_id", user.id)
        .eq("week_start", mondayStr)
        .maybeSingle();
      if (existingWeek) {
        await serviceClient.from("scan_usage").update({ scan_count: (existingWeek.scan_count || 0) + 1 }).eq("id", existingWeek.id);
      } else {
        await serviceClient.from("scan_usage").insert({ user_id: user.id, week_start: mondayStr, scan_count: 1 });
      }
      // Monthly counter (pro and try_pro)
      if (userPlan === "pro" || userPlan === "try_pro") {
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const monthStr = monthStart.toISOString().split("T")[0];
        const { data: existingMonth } = await serviceClient
          .from("scan_usage_monthly")
          .select("id, scan_count")
          .eq("user_id", user.id)
          .eq("month_start", monthStr)
          .maybeSingle();
        if (existingMonth) {
          await serviceClient.from("scan_usage_monthly").update({ scan_count: (existingMonth.scan_count || 0) + 1 }).eq("id", existingMonth.id);
        } else {
          await serviceClient.from("scan_usage_monthly").insert({ user_id: user.id, month_start: monthStr, scan_count: 1 });
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("analyze error:", msg);
    if (msg === "RATE_LIMITED") {
      return new Response(JSON.stringify({ error: "AI rate limit hit. Please try again in a minute.", code: "RATE_LIMITED" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (msg === "CREDITS_EXHAUSTED") {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Contact support.", code: "CREDITS_EXHAUSTED" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Analysis failed. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
