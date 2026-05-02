import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Check, Copy, ShieldAlert, FileText, AlertCircle, ArrowRight, Database } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

/**
 * SampleReport mirrors the live Report page exactly so visitors see what they
 * will actually receive. Hand-crafted data showcases:
 *  - The new scoring (verified findings count fully, unverified count half-weight)
 *  - Hard caps for critical findings; QUICK SCAN max 90, DEEP SCAN max 100
 *  - Verified vs Unverified confidence labels, with the explicit
 *    "Connect Supabase to verify" note on DB-pattern findings
 *  - Proof badges (file_path + line_number + code_snippet)
 *  - Promises-vs-code mismatches
 *  - Soft-tone legal findings
 *  - Copy-paste fix prompts
 */

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
  info: '#71717a',
};

function scoreColor(score: number) {
  if (score >= 89) return '#22c55e';
  if (score >= 75) return '#84cc16';
  if (score >= 65) return '#f59e0b';
  return '#f97316';
}

function scoreLabelFor(score: number) {
  if (score >= 93) return 'Excellent';
  if (score >= 85) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Getting there';
  if (score >= 40) return 'Significant work needed';
  return 'Critical issues';
}

const sample = {
  appName: 'noted-ai.lovable',
  platform: 'Lovable',
  scanType: 'quick',
  score: 45,
  summary:
    'Your app has good user management and note-taking features with proper authentication flow.',
  verdict:
    'However, critical security flaws make it unsafe to launch — anyone can access your admin panel without permission and potentially see all user data.',
  gaps: [
    {
      id: 'g-1',
      severity: 'high',
      confidence: 'verified',
      category: 'payments',
      title: 'No payment system for pro plans',
      what_we_found:
        'Your homepage advertises a Pro plan with AI summaries and team features, but no Stripe (or any payment) integration was found in the codebase. There is no checkout route, no webhook handler, and no plan upgrade logic.',
      what_this_means:
        'You have zero revenue because users cannot pay you even if they want to upgrade to pro features.',
      how_to_fix:
        'Wire up Stripe Checkout with a server-verified webhook that updates the user\'s plan after successful payment.',
      fix_prompt:
        'In my noted-ai.lovable app I advertise a Pro plan but have no payment system. Add Stripe:\n\n1. Create a Stripe product + price in test mode and store the price id\n2. Add a supabase edge function "create-checkout" that takes the user id, creates a Stripe checkout session, and returns the URL\n3. Add a supabase edge function "stripe-webhook" that verifies the signature with STRIPE_WEBHOOK_SECRET and handles checkout.session.completed and customer.subscription.deleted\n4. On checkout.session.completed, update profiles.plan = "pro" for that user\n5. On customer.subscription.deleted, set profiles.plan = "free"\n6. Add an "Upgrade to Pro" button on the dashboard that calls create-checkout and redirects to the Stripe URL',
      technical_reference: 'missing-stripe-integration',
      file_path: 'src/pages/Pricing.tsx',
      line_number: 12,
      code_snippet: '// "Upgrade to Pro" button — no onClick handler, no Stripe',
    },
    {
      id: 'g-2',
      severity: 'high',
      confidence: 'verified',
      category: 'features',
      title: 'Real-time collaboration is advertised but not built',
      what_we_found:
        'Your homepage shows "Collaborate with your team in real time" but no realtime channel, presence, or shared-document logic exists in the scanned code. Notes are single-user only.',
      what_this_means:
        'Visitors who sign up expecting team collaboration will churn the moment they realise the feature does not exist. This is a trust problem, not just a feature gap.',
      how_to_fix:
        'Either remove the claim from your homepage, or implement Supabase Realtime channels on the notes table with shared access controlled by a workspace_members table.',
      fix_prompt:
        'My noted-ai.lovable homepage promises real-time team collaboration on notes, but the code does not implement it. Add it:\n\n1. Create a workspaces table and a workspace_members table (user_id, workspace_id, role)\n2. Add workspace_id to the notes table and update RLS so members of the workspace can read/write\n3. In the note editor, subscribe to a Supabase Realtime channel scoped to that note id\n4. Broadcast cursor position + content patches on edit\n5. Show other members\' avatars and live cursors in the editor',
      technical_reference: 'missing-feature-realtime-collab',
      file_path: 'src/pages/Notes.tsx',
      line_number: 1,
      code_snippet: '// no realtime subscription, no shared workspace logic',
    },
  ],
  security_issues: [
    {
      id: 's-1',
      severity: 'critical',
      confidence: 'verified',
      category: 'access-control',
      title: 'Admin panel reachable by any signed-in user',
      what_we_found:
        'The /admin route in src/App.tsx is wrapped in <ProtectedRoute> (any logged-in user) instead of an admin-only guard. There is no server-side role check on the admin actions.',
      what_this_means:
        'Anyone who creates a free account can open /admin, list every user, and trigger admin actions. This is the single biggest risk in your app right now.',
      how_to_fix:
        'Add a user_roles table with an enum (admin, user), a SECURITY DEFINER has_role() function, and an <AdminRoute> guard that checks it. Also enforce the role check inside every admin edge function.',
      fix_prompt:
        'In my noted-ai.lovable app, the /admin route is open to any logged-in user. Lock it down:\n\n1. Create a public.app_role enum (admin, user) and a public.user_roles table (user_id, role)\n2. Enable RLS on user_roles and add a SECURITY DEFINER function public.has_role(_user_id uuid, _role app_role)\n3. Create an <AdminRoute> component that calls has_role(auth.uid(), \'admin\') and redirects to / if false\n4. Wrap every /admin/* route with <AdminRoute>\n5. In every admin edge function, re-check has_role server-side before doing anything',
      technical_reference: 'broken-access-control-admin',
      file_path: 'src/App.tsx',
      line_number: 87,
      code_snippet: '<Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />',
    },
    {
      id: 's-2',
      severity: 'critical',
      confidence: 'unverified',
      category: 'database',
      requires_supabase_verification: true,
      verification_note:
        'Connect your Supabase project to verify this finding accurately. Without Supabase access this is based on code patterns only.',
      title: 'Notes table likely missing row-level security',
      what_we_found:
        'src/lib/notes.ts queries public.notes with the anon key and no .eq("user_id", user.id) filter. We did not detect an RLS policy in the scanned migrations.',
      what_this_means:
        'If RLS is off, any signed-in user can read, edit, or delete every other user\'s notes. We could not confirm directly without a live Supabase connection.',
      how_to_fix:
        'Enable RLS on public.notes and add owner-scoped SELECT, INSERT, UPDATE, DELETE policies that compare auth.uid() to user_id.',
      fix_prompt:
        'In my Supabase project, enable RLS on public.notes and add owner-scoped policies:\n\n1. ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;\n2. CREATE POLICY "owner reads" ON public.notes FOR SELECT USING (auth.uid() = user_id);\n3. CREATE POLICY "owner writes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);\n4. CREATE POLICY "owner updates" ON public.notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);\n5. CREATE POLICY "owner deletes" ON public.notes FOR DELETE USING (auth.uid() = user_id);\n6. Verify with two accounts: account A must never see account B\'s notes.',
      technical_reference: 'supabase-rls-owner-policy',
      file_path: 'src/lib/notes.ts',
      line_number: 14,
      code_snippet: "supabase.from('notes').select('*')",
    },
    {
      id: 's-3',
      severity: 'high',
      confidence: 'unverified',
      category: 'secrets',
      title: 'OpenAI API key referenced in client code',
      what_we_found:
        'src/lib/ai.ts reads VITE_OPENAI_API_KEY. Anything prefixed VITE_ is bundled into the browser and visible in DevTools.',
      what_this_means:
        'Anyone visiting your live site can extract this key from the JS bundle and run OpenAI requests on your bill. Costs can hit thousands of dollars within hours.',
      how_to_fix:
        'Move the OpenAI call into a Supabase edge function. Store the key as OPENAI_API_KEY (no VITE_ prefix). Call the edge function from the client.',
      fix_prompt:
        'My noted-ai.lovable app exposes the OpenAI API key in client code via VITE_OPENAI_API_KEY in src/lib/ai.ts. Fix it:\n\n1. Create supabase/functions/ai-summarize/index.ts that takes a note id, fetches the note server-side, and calls OpenAI\n2. Use Deno.env.get("OPENAI_API_KEY") on the server (no VITE_ prefix)\n3. In src/lib/ai.ts, replace the direct OpenAI call with supabase.functions.invoke("ai-summarize", { body: { noteId } })\n4. Delete VITE_OPENAI_API_KEY from .env\n5. Add OPENAI_API_KEY as a secret to your Supabase project',
      technical_reference: 'client-side-api-key-exposure',
      file_path: 'src/lib/ai.ts',
      line_number: 8,
      code_snippet: 'const apiKey = import.meta.env.VITE_OPENAI_API_KEY;',
    },
    {
      id: 's-4',
      severity: 'high',
      confidence: 'verified',
      category: 'access-control',
      title: 'Auth checks only happen on the client',
      what_we_found:
        '/dashboard, /notes and /settings rely on a useEffect redirect in React. There is no server-side guard, and the protected components mount before the check resolves.',
      what_this_means:
        'A user can briefly see other users\' data flash on screen, and a tech-savvy visitor can disable JS or hit the API directly to bypass the check entirely.',
      how_to_fix:
        'Move auth gating to RLS at the database layer and use Supabase auth getUser() server-side in every edge function. Keep the client redirect only for UX.',
      fix_prompt:
        'In my noted-ai.lovable app, /dashboard /notes and /settings only check auth client-side. Harden them:\n\n1. Confirm RLS is enabled on every table that holds user data and policies use auth.uid()\n2. In every edge function, call supabaseClient.auth.getUser() and return 401 if no user\n3. In ProtectedRoute, render a loading state until the session is hydrated, then redirect — never render the child first\n4. Add an integration test that hits /dashboard with no session and asserts a redirect',
      technical_reference: 'client-side-only-auth',
      file_path: 'src/components/ProtectedRoute.tsx',
      line_number: 22,
      code_snippet: 'useEffect(() => { if (!user) navigate("/login"); }, [user]);',
    },
    {
      id: 's-5',
      severity: 'medium',
      confidence: 'verified',
      category: 'auth',
      title: 'Password reset emails are not rate-limited',
      what_we_found:
        'The forgot-password form calls supabase.auth.resetPasswordForEmail directly with no debounce, captcha or rate limit.',
      what_this_means:
        'An attacker can spam thousands of reset emails to any address, getting your domain flagged as spam and burning your email quota.',
      how_to_fix:
        'Add a captcha (Cloudflare Turnstile) on the form and an edge function that rate-limits per IP and per email.',
      fix_prompt:
        'In my noted-ai.lovable app, the forgot-password flow has no rate limiting. Fix it:\n\n1. Add Cloudflare Turnstile on the forgot-password form\n2. Create a supabase edge function "request-password-reset" that verifies the Turnstile token, checks an in-memory rate limit (max 3 per email per hour, max 10 per IP per hour) and only then calls supabase.auth.admin.generateLink\n3. Replace the direct client call with this edge function',
      technical_reference: 'auth-no-rate-limit',
      file_path: 'src/components/ForgotPasswordModal.tsx',
      line_number: 31,
      code_snippet: 'await supabase.auth.resetPasswordForEmail(email);',
    },
    {
      id: 's-6',
      severity: 'medium',
      confidence: 'verified',
      category: 'data-exposure',
      title: 'User profiles table is publicly readable',
      what_we_found:
        'public.profiles has a SELECT policy of USING (true). Anyone with the anon key can list every user\'s email and full name.',
      what_this_means:
        'Your entire user list (emails included) can be scraped by anyone, exposing your customers to phishing and competitors.',
      how_to_fix:
        'Restrict the SELECT policy to the row owner, or to authenticated users limited to non-PII columns.',
      fix_prompt:
        'In my Supabase project, public.profiles is readable by everyone. Lock it down:\n\n1. DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;\n2. CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);\n3. If you need to show display names elsewhere, create a SECURITY DEFINER function get_public_display_name(user_id) that returns only display_name and avatar_url',
      technical_reference: 'pii-public-select-policy',
      file_path: 'supabase/migrations/0001_init.sql',
      line_number: 42,
      code_snippet: 'CREATE POLICY "Public profiles are viewable" ON public.profiles FOR SELECT USING (true);',
    },
    {
      id: 's-7',
      severity: 'medium',
      confidence: 'unverified',
      category: 'database',
      requires_supabase_verification: true,
      title: 'No usage cap on AI summaries — token cost can spiral',
      what_we_found:
        'The ai-summarize call has no per-user counter and no monthly cap. A free user can request unlimited summaries.',
      what_this_means:
        'A single user could rack up hundreds of dollars of OpenAI usage in a day. There is nothing currently stopping abuse.',
      how_to_fix:
        'Add an ai_usage table that increments on every call, and reject the call past a free-tier monthly limit.',
      fix_prompt:
        'In my noted-ai.lovable app, AI summaries have no usage cap. Add one:\n\n1. Create an ai_usage table (user_id, month, count) with a unique index on (user_id, month)\n2. In the ai-summarize edge function, upsert the row and increment count atomically\n3. If plan = free and count > 20 for the current month, return 429 with a clear message\n4. Show remaining quota on the dashboard',
      technical_reference: 'no-ai-usage-cap',
      file_path: 'supabase/functions/ai-summarize/index.ts',
      line_number: 1,
      code_snippet: '// no usage check, no rate limit, no plan gate',
    },
    {
      id: 's-8',
      severity: 'low',
      confidence: 'verified',
      category: 'logging',
      title: 'Sensitive data logged to the browser console',
      what_we_found:
        'src/contexts/AuthContext.tsx contains console.log("session", session) which prints the full session including the access token on every render.',
      what_this_means:
        'Anyone with screen-share access (support call, demo, screen recording) can read a working access token directly from the console.',
      how_to_fix:
        'Remove the console.log, or guard it behind an explicit DEBUG flag that is off in production.',
      fix_prompt:
        'In src/contexts/AuthContext.tsx, remove the console.log("session", session) line. Also add an ESLint rule "no-console": ["warn", { allow: ["warn", "error"] }] so this does not happen again.',
      technical_reference: 'token-leak-console',
      file_path: 'src/contexts/AuthContext.tsx',
      line_number: 54,
      code_snippet: 'console.log("session", session);',
    },
  ],
  legal_findings: [],
  landing_page_promises: [
    {
      id: 'p-1',
      claim: 'AI-powered note summaries',
      claim_source: 'homepage',
      verdict: 'partial',
      evidence:
        'src/lib/ai.ts calls OpenAI directly from the client, but the API key is exposed and there is no usage cap. The feature exists but is not production-safe.',
      severity: 'medium',
    },
    {
      id: 'p-2',
      claim: 'Real-time team collaboration',
      claim_source: 'homepage',
      verdict: 'not_found',
      evidence: 'No realtime channel, presence, or shared workspace logic was found in the scanned code.',
      severity: 'medium',
    },
    {
      id: 'p-3',
      claim: 'Pro plan with advanced features',
      claim_source: 'homepage',
      verdict: 'not_found',
      evidence: 'Pricing page lists a Pro plan, but no Stripe integration, checkout route, or plan upgrade logic exists.',
      severity: 'high',
    },
    {
      id: 'p-4',
      claim: 'Sign up, log in and log out',
      claim_source: 'homepage',
      verdict: 'found',
      evidence: 'Supabase auth is wired up with email/password and Google OAuth, working end to end.',
      severity: 'info',
    },
  ],
  what_works: [
    'Email/password and Google OAuth are wired up correctly with Supabase auth and a profiles table',
    'Note creation, editing and deletion work with optimistic UI updates',
    'The app has a clean schema with notes, profiles and user_roles tables',
    'Mobile responsive layout adapts cleanly down to 360px width',
  ],
  homepage_signals: {
    has_live_url: true,
    privacy_page_found: true,
    terms_page_found: true,
    readme_found: true,
  },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-4">
      {children}
    </div>
  );
}

function IntentScoreCard({
  score,
  label,
  scanType,
}: {
  score: number;
  label: string;
  scanType: string;
}) {
  const c = scoreColor(score);
  const ceiling = scanType === 'deep' ? 100 : 90;
  return (
    <div className="bg-card border border-border rounded-2xl px-8 py-10 text-center">
      <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-4">
        Intent match
      </div>
      <div
        className="font-bold leading-[0.95] tracking-[-0.04em]"
        style={{ fontSize: 88, color: c }}
      >
        {score}
        <span className="text-[28px] font-medium ml-1" style={{ color: '#444' }}>
          /100
        </span>
      </div>
      <div className="text-base font-medium text-foreground mt-4">{label}</div>
      <div className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
        Does your code do what you said your app does?
      </div>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3.5 py-1.5 text-xs text-muted-foreground">
        <span
          aria-hidden
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: 'hsl(var(--muted-foreground))',
          }}
        />
        <span>
          Quick scan ceiling{' '}
          <span className="text-foreground tabular-nums">{ceiling}/100</span>
          <span className="mx-1.5 text-border">·</span>
          Run a deep scan to unlock the full 100.
        </span>
      </div>
    </div>
  );
}

function WarningChip({
  icon,
  count,
  label,
  tone,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  tone: 'sharp' | 'soft' | 'clear';
}) {
  const dotColor =
    tone === 'sharp' ? '#ef4444' : tone === 'soft' ? '#f59e0b' : '#22c55e';
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground">
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: dotColor,
          boxShadow: `0 0 0 3px ${dotColor}1f`,
        }}
      />
      <span className="flex text-muted-foreground">{icon}</span>
      <span className="tabular-nums text-foreground">{count}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function FindingCard({ f }: { f: any }) {
  const [copied, setCopied] = useState(false);
  const sev = (f.severity || 'medium').toLowerCase();
  const color = SEVERITY_COLORS[sev] || SEVERITY_COLORS.medium;
  const confidence = (f.confidence || 'verified').toLowerCase();
  const confColor = confidence === 'verified' ? '#22c55e' : '#71717a';
  const confLabel = confidence === 'verified' ? 'Verified' : 'Unverified';

  const onCopy = () => {
    if (!f.fix_prompt) return;
    navigator.clipboard.writeText(f.fix_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const norm = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const isImpactDup =
    f.what_we_found &&
    f.what_this_means &&
    (norm(f.what_we_found) === norm(f.what_this_means) ||
      norm(f.what_we_found).includes(norm(f.what_this_means)) ||
      norm(f.what_this_means).includes(norm(f.what_we_found)));
  const showWhatWeFound = !isImpactDup && !!f.what_we_found;
  const impactText = f.what_this_means || (isImpactDup ? f.what_we_found : '');

  return (
    <div
      className="bg-card border border-border rounded-lg p-6 mb-3"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="text-base font-semibold text-foreground mb-2 flex-1">{f.title}</div>
        <div className="flex gap-2 items-center">
          <span
            className="text-[10px] uppercase tracking-[0.08em] font-semibold whitespace-nowrap rounded-full px-2 py-[2px]"
            style={{ color: confColor, border: `1px solid ${confColor}33` }}
          >
            {confLabel}
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.08em] font-semibold whitespace-nowrap"
            style={{ color }}
          >
            {sev}
          </span>
        </div>
      </div>

      {showWhatWeFound && (
        <div className="text-sm text-muted-foreground leading-relaxed mb-3">{f.what_we_found}</div>
      )}

      {/* Proof: file_path + line + snippet */}
      {f.file_path && (
        <div
          className="rounded-md px-3 py-2.5 mb-3.5 font-mono"
          style={{ background: '#000', border: '1px solid #1a1a1a' }}
        >
          <div className="text-[11px] mb-1.5" style={{ color: '#666' }}>
            <span style={{ color: '#22c55e' }}>● Proof</span> · {f.file_path}
            {f.line_number ? `:${f.line_number}` : ''}
          </div>
          {f.code_snippet && (
            <div className="text-[12px] whitespace-pre-wrap" style={{ color: '#aaa' }}>
              {f.code_snippet}
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-1">
        Impact
      </div>
      <div className="text-sm text-foreground leading-relaxed mb-4">{impactText}</div>

      {/* Verification note for unverified DB findings */}
      {(f.requires_supabase_verification || (confidence === 'unverified' && f.verification_note)) && (
        <div
          className="rounded-md px-3.5 py-2.5 mb-4 flex items-start gap-2.5"
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          <Database size={14} style={{ color: '#f59e0b', marginTop: 2, flexShrink: 0 }} />
          <div className="text-[13px] leading-relaxed" style={{ color: '#cbb37a' }}>
            {f.verification_note ||
              'Connect your Supabase project to verify this finding accurately. Without Supabase access this is based on code patterns only.'}{' '}
            <Link to="/connect" className="underline" style={{ color: '#f59e0b' }}>
              Connect Supabase
            </Link>
          </div>
        </div>
      )}

      <div className="border-t border-border my-4" />

      <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-2">
        How to fix
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed mb-4">{f.how_to_fix}</div>

      {f.fix_prompt && (
        <div className="relative">
          <div
            className="rounded-md text-[13px] leading-relaxed whitespace-pre-wrap break-words font-mono"
            style={{
              background: '#000000',
              border: '1px solid #222222',
              color: '#888888',
              padding: 16,
              paddingTop: 40,
            }}
          >
            {f.fix_prompt}
          </div>
          <button
            onClick={onCopy}
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded text-[11px] px-2.5 py-1"
            style={{
              background: 'transparent',
              border: '1px solid #333333',
              color: '#888888',
            }}
          >
            {copied ? (
              <>
                <Check size={11} /> Copied
              </>
            ) : (
              <>
                <Copy size={11} /> Copy prompt
              </>
            )}
          </button>
        </div>
      )}

      {f.technical_reference && (
        <div className="mt-3">
          <div className="text-[11px] font-mono" style={{ color: '#333' }}>
            {f.technical_reference}
          </div>
        </div>
      )}
    </div>
  );
}

function LegalCard({ f }: { f: any }) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-5 mb-3"
      style={{ borderLeft: '3px solid #f59e0b' }}
    >
      <div className="text-base font-semibold text-foreground mb-2">{f.title}</div>
      <div className="text-sm text-muted-foreground leading-relaxed mb-3">{f.what_we_found}</div>
      <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-1">
        Why it matters
      </div>
      <div className="text-sm text-foreground leading-relaxed mb-3">{f.what_this_means}</div>
      <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-1">
        What to do
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{f.how_to_fix}</div>
    </div>
  );
}

function PromiseRow({ p }: { p: any }) {
  const v = (p.verdict || 'not_found').toLowerCase();
  const palette =
    v === 'found'
      ? { color: '#22c55e', label: 'Found in code', bg: 'rgba(34,197,94,0.05)' }
      : v === 'partial'
        ? { color: '#f59e0b', label: 'Partial', bg: 'rgba(245,158,11,0.05)' }
        : { color: '#71717a', label: 'Not found in code', bg: 'rgba(113,113,122,0.05)' };
  return (
    <div
      className="grid gap-4 px-4 py-4 rounded-lg mb-2.5 border border-border"
      style={{ gridTemplateColumns: '1fr auto', background: palette.bg }}
    >
      <div>
        <div className="text-sm text-foreground font-medium mb-1.5 leading-snug">{p.claim}</div>
        {p.evidence && (
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span style={{ color: '#555' }}>From your {p.claim_source} · </span>
            {p.evidence}
          </div>
        )}
      </div>
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.04em] rounded-full px-2.5 py-1 h-fit whitespace-nowrap"
        style={{ color: palette.color, border: `1px solid ${palette.color}40` }}
      >
        {palette.label}
      </span>
    </div>
  );
}

export default function SampleReport() {
  const {
    appName,
    platform,
    score,
    scanType,
    summary,
    verdict,
    gaps,
    security_issues,
    legal_findings,
    landing_page_promises,
    what_works,
    homepage_signals,
  } = sample;

  const scoreLabel = scoreLabelFor(score);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sample Report — Rismon.ai"
        description="Real example Rismon report: intent score, proof-backed findings, promises-vs-code checks, and copy-paste fix prompts for an AI-built meal-planning app."
        canonicalPath="/sample-report"
      />
      <Navbar />

      {/* Sample banner — clean, no shield/emoji icon */}
      <div
        className="fixed top-16 left-0 right-0 z-[999]"
        style={{
          background: 'rgba(249,115,22,0.06)',
          borderBottom: '1px solid rgba(249,115,22,0.25)',
        }}
      >
        <div className="max-w-[800px] mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-sm truncate min-w-0">
            <span className="text-foreground font-medium">Sample report.</span>{' '}
            <span className="text-muted-foreground">
              This is what your report looks like after a scan.
            </span>
          </p>
          <Link
            to="/signup"
            className="shrink-0 hidden sm:inline-flex items-center gap-1 bg-primary text-primary-foreground rounded-md text-xs font-semibold px-3.5 py-1.5 hover:bg-primary/90 transition-colors"
          >
            Scan your app <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div
        className="report-container mx-auto px-6 pt-[120px] pb-12"
        style={{ maxWidth: 800 }}
      >
        {/* SECTION 1, HEADER */}
        <div className="flex justify-between items-center">
          <div className="text-[13px] text-muted-foreground">
            App scanned: <span className="text-foreground font-medium">{appName}</span>
            <span
              className="ml-2 inline-block text-[10px] uppercase tracking-[0.08em] font-semibold rounded-full px-2 py-[2px]"
              style={{
                background: 'rgba(249,115,22,0.1)',
                color: '#fdba74',
              }}
            >
              {platform}
            </span>
          </div>
          <span
            className="text-[10px] uppercase tracking-[0.08em] font-semibold rounded px-2.5 py-[3px] text-muted-foreground"
            style={{ border: '1px solid #333' }}
          >
            {scanType === 'quick' ? 'Quick Scan' : 'Deep Scan'}
          </span>
        </div>

        {/* SECTION 2, INTENT HERO + WARNING CHIPS */}
        <div className="pt-10 pb-3">
          <IntentScoreCard score={score} label={scoreLabel} scanType={scanType} />
          <div className="flex flex-wrap gap-2.5 justify-center mt-5">
            <WarningChip
              icon={<ShieldAlert size={14} />}
              count={security_issues.length}
              label={security_issues.length === 1 ? 'security issue' : 'security issues'}
              tone={security_issues.length === 0 ? 'clear' : 'sharp'}
            />
            <WarningChip
              icon={<FileText size={14} />}
              count={legal_findings.length}
              label={legal_findings.length === 1 ? 'legal gap' : 'legal gaps'}
              tone={legal_findings.length === 0 ? 'clear' : 'soft'}
            />
            <WarningChip
              icon={<AlertCircle size={14} />}
              count={landing_page_promises.filter((p) => p.verdict !== 'found').length}
              label="unverified promises"
              tone="soft"
            />
          </div>
        </div>

        {/* SECTION 3, SUMMARY */}
        <div className="bg-card border border-border rounded-lg p-6 mt-8 mb-6">
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-3">
            Overview
          </div>
          <div className="text-[15px] text-muted-foreground leading-[1.7]">{summary}</div>
          <div
            className="text-xs text-muted-foreground mt-3.5 pt-3.5"
            style={{ borderTop: '1px solid hsl(var(--border))' }}
          >
            We also read your{' '}
            {[
              homepage_signals.readme_found && 'README',
              homepage_signals.has_live_url && 'homepage',
              homepage_signals.privacy_page_found && 'privacy page',
              homepage_signals.terms_page_found && 'terms page',
            ]
              .filter(Boolean)
              .join(', ')}
            .
          </div>
        </div>

        {/* SECTION 4, VERDICT */}
        <div
          className="text-center text-lg font-semibold text-foreground leading-snug py-6 mb-8"
          style={{
            borderTop: '1px solid hsl(var(--border))',
            borderBottom: '1px solid hsl(var(--border))',
          }}
        >
          {verdict}
        </div>

        {/* SECTION 5, INTENT GAPS */}
        <div className="mb-8">
          <SectionLabel>What you wanted vs what your code does</SectionLabel>
          {gaps.map((g) => (
            <FindingCard key={g.id} f={g} />
          ))}
        </div>

        {/* SECTION 6, PROMISES VS CODE */}
        <div className="mb-8">
          <SectionLabel>Promises on your homepage vs your code</SectionLabel>
          <p className="text-[13px] text-muted-foreground leading-relaxed -mt-2 mb-4">
            We read what your homepage and README claim, then checked your code for proof. Items
            marked &quot;not found&quot; may still exist, they were just not in the code we
            scanned.
          </p>
          {landing_page_promises.map((p) => (
            <PromiseRow key={p.id} p={p} />
          ))}
        </div>

        {/* SECTION 7, SECURITY */}
        <div className="mb-8">
          <SectionLabel>Security · these can hurt you in production</SectionLabel>
          {security_issues.map((s) => (
            <FindingCard key={s.id} f={s} />
          ))}
        </div>

        {/* SECTION 8, LEGAL */}
        <div className="mb-8">
          <SectionLabel>Legal &amp; trust · what to add before launch</SectionLabel>
          {legal_findings.map((f) => (
            <LegalCard key={f.id} f={f} />
          ))}
        </div>

        {/* SECTION 9, WHAT WORKS */}
        <div className="mb-8">
          <SectionLabel>What your app does right</SectionLabel>
          <div>
            {what_works.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-3"
                style={{ borderBottom: '1px solid hsl(var(--border))' }}
              >
                <Check size={14} className="shrink-0 mt-1" style={{ color: '#22c55e' }} />
                <span className="text-sm text-muted-foreground leading-relaxed">{w}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 10, CTA */}
        <div className="bg-card border border-border rounded-xl p-8 text-center mt-10">
          <div className="text-xl font-semibold text-foreground mb-2">
            Ready to scan your own app?
          </div>
          <div className="text-sm text-muted-foreground mb-5">
            Free to start. No credit card. Your code is never stored.
          </div>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold px-6 py-3 hover:bg-primary/90 transition-colors"
          >
            Scan my app <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <Footer />

      <style>{`
        @media (max-width: 640px) {
          .report-container { padding: 24px 16px !important; padding-top: 110px !important; }
        }
      `}</style>
    </div>
  );
}
