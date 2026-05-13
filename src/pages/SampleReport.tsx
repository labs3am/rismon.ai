import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Github, Lock, RefreshCw, Activity, Radio, Globe } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import ReportContent from '@/components/ReportContent';
import DashboardSidebar, { SectionKey } from '@/components/dashboard/DashboardSidebar';
import { IntentGaugeCard, PromiseCoverageCard, SeverityBarCard } from '@/components/dashboard/OverviewCards';

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


// Adapt to the shape ReportContent / dashboard cards expect
const sampleAnalysis = {
  intent_match_score: sample.score,
  summary: `${sample.summary} ${sample.verdict}`,
  scan_type: sample.scanType,
  gaps: sample.gaps,
  security_issues: sample.security_issues,
  legal_findings: sample.legal_findings,
  landing_page_promises: sample.landing_page_promises,
  what_works: sample.what_works,
  homepage_signals: sample.homepage_signals,
  fix_prompts: [],
};

const sampleApp = {
  id: 'sample',
  app_name: sample.appName,
  github_repo_name: 'noted-ai',
  github_owner: 'demo',
  platform: sample.platform,
  live_url: 'https://noted-ai.example.com',
  latest_score: sample.score,
  has_analyses: true,
  latest_analysis_id: 'sample',
};

const PANEL_BG = '#0a0a0a';
const PANEL_BORDER = '#1f1f1f';

// Sample is intentionally trimmed: show only 2 findings per section, blur the rest.
const VISIBLE = 2;
const trimmedAnalysis = {
  ...sampleAnalysis,
  gaps: sample.gaps.slice(0, VISIBLE),
  security_issues: sample.security_issues.slice(0, VISIBLE),
  landing_page_promises: sample.landing_page_promises.slice(0, VISIBLE),
};
const hiddenCounts = {
  gaps: Math.max(0, sample.gaps.length - VISIBLE),
  security: Math.max(0, sample.security_issues.length - VISIBLE),
  promises: Math.max(0, sample.landing_page_promises.length - VISIBLE),
};

function BlurredMore({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <div className="relative mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid ' + PANEL_BORDER }}>
      {/* Fake blurred rows behind */}
      <div aria-hidden className="space-y-3 p-5" style={{ filter: 'blur(6px)', background: PANEL_BG, opacity: 0.55, userSelect: 'none' }}>
        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
          <div key={i} style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: 16 }}>
            <div style={{ width: '60%', height: 12, background: '#2a2a2a', borderRadius: 4 }} />
            <div style={{ width: '90%', height: 10, background: '#1f1f1f', borderRadius: 4, marginTop: 10 }} />
            <div style={{ width: '75%', height: 10, background: '#1f1f1f', borderRadius: 4, marginTop: 6 }} />
          </div>
        ))}
      </div>
      {/* Lock CTA on top */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ background: 'linear-gradient(180deg, rgba(10,10,10,0.5), rgba(10,10,10,0.85))' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#0a0a0a', border: '1px solid #2a2a2a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <Lock size={16} />
        </div>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginTop: 12 }}>
          {count} more {label} hidden in this sample
        </div>
        <div style={{ color: '#888', fontSize: 12, marginTop: 4, maxWidth: 360 }}>
          Scan your own app to see the full report.
        </div>
        <Link
          to="/signup"
          className="inline-flex items-center gap-1.5 mt-4"
          style={{ background: '#fff', color: '#000', padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
        >
          <Github size={13} /> Scan your app
        </Link>
      </div>
    </div>
  );
}

function SampleLockedSection({ title, icon, description }: { title: string; icon: React.ReactNode; description: string }) {
  return (
    <div className="rounded-xl p-8 sm:p-12 text-center" style={{ background: PANEL_BG, border: '1px dashed #2a2a2a' }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto', background: '#0a0a0a', border: '1px solid #2a2a2a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        {icon}
      </div>
      <div className="mt-5 inline-flex items-center gap-1.5"
        style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#0a0a0a', color: '#888', border: '1px solid #2a2a2a', letterSpacing: '0.08em' }}>
        <Lock size={10} /> LOCKED
      </div>
      <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 600, marginTop: 14, letterSpacing: '-0.02em' }}>{title}</h3>
      <p style={{ color: '#888', fontSize: 14, marginTop: 8, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

export default function SampleReport() {
  const [section, setSection] = useState<SectionKey>('overview');
  const [plainMode, setPlainMode] = useState(true);

  const promises = trimmedAnalysis.landing_page_promises;
  const secIssues = trimmedAnalysis.security_issues;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sample Report — see what Rismon delivers"
        description="A live walkthrough of an actual Rismon report: intent match, homepage promises vs code, security issues, and copy-paste fixes."
      />
      <Navbar />

      <div className="flex flex-col md:flex-row pt-16">
        <DashboardSidebar
          active={section}
          onSelect={(k) => setSection(k)}
          hasApp={true}
          isPro={false}
        />

        <main className="flex-1 min-w-0">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10">
            {/* Header — mirrors the real dashboard exactly */}
            <div className="flex flex-wrap items-center gap-3 justify-between mb-6">
              <div className="flex items-center gap-3 min-w-0 flex-wrap">
                <div className="inline-flex items-center gap-2" style={{ background: PANEL_BG, border: '1px solid #222', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, fontWeight: 500 }}>
                  <Github size={13} />
                  {sampleApp.github_owner}/{sampleApp.github_repo_name}
                </div>
                <span style={{ color: '#666', fontSize: 12 }}>· Last scan 2h ago</span>
                <div className="inline-flex items-center gap-1.5" style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 999, padding: '5px 10px', color: '#cbd5e1', fontSize: 12 }}>
                  <Globe size={11} style={{ color: '#888' }} />
                  <span>Verifying against: noted-ai.example.com</span>
                </div>
                <span style={{ background: '#1a1308', border: '1px solid #3a2a14', color: '#f97316', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
                  SAMPLE
                </span>
              </div>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5"
                style={{ background: '#fff', color: '#000', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                <RefreshCw size={13} /> Scan your app
              </Link>
            </div>

            {section === 'overview' && (
              <div className="space-y-6">
                <div className="rounded-xl p-5 sm:p-6" style={{ background: '#000', border: '1px solid ' + PANEL_BORDER }}>
                  <div className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-3" style={{ color: '#9ca3af' }}>Summary</div>
                  <div className="text-[15px] leading-[1.75]" style={{ color: '#ffffff' }}>{trimmedAnalysis.summary}</div>
                </div>

                <IntentGaugeCard score={trimmedAnalysis.intent_match_score} />

                <PromiseCoverageCard
                  liveUrl={sampleApp.live_url}
                  promises={promises}
                  onView={() => setSection('seo')}
                />

                <SeverityBarCard securityIssues={secIssues} onViewAll={() => setSection('security')} />

                <div className="rounded-xl p-5 sm:p-6" style={{ background: PANEL_BG, border: '1px solid ' + PANEL_BORDER }}>
                  <ReportContent
                    analysis={trimmedAnalysis}
                    app={sampleApp}
                    plainMode={plainMode}
                    onTogglePlainMode={setPlainMode}
                    isPro={false}
                    section="overview"
                    onNavigateSection={(s) => setSection(s as SectionKey)}
                  />
                </div>
              </div>
            )}

            {(section === 'intent' || section === 'security' || section === 'seo' || section === 'legal') && (
              <div>
                <div className="rounded-xl p-5 sm:p-6" style={{ background: PANEL_BG, border: '1px solid ' + PANEL_BORDER }}>
                  <ReportContent
                    analysis={trimmedAnalysis}
                    app={sampleApp}
                    plainMode={plainMode}
                    onTogglePlainMode={setPlainMode}
                    isPro={false}
                    section={section as any}
                  />
                </div>
                {section === 'intent' && <BlurredMore count={hiddenCounts.gaps} label="intent gaps" />}
                {section === 'security' && <BlurredMore count={hiddenCounts.security} label="security issues" />}
                {section === 'seo' && <BlurredMore count={hiddenCounts.promises} label="homepage promises" />}
              </div>
            )}

            {section === 'performance' && (
              <SampleLockedSection
                title="Performance monitoring"
                icon={<Activity size={26} />}
                description="Lighthouse-grade metrics for your live site — Core Web Vitals, render-blocking resources, image weight, and weekly trend lines. Locked in this sample."
              />
            )}
            {section === 'monitoring' && (
              <SampleLockedSection
                title="Continuous monitoring"
                icon={<Radio size={26} />}
                description="Auto re-scan every time you push to GitHub. Get an instant alert if a new security issue, broken promise, or legal gap shows up. Locked in this sample."
              />
            )}

            <div className="mt-10 rounded-xl p-6 sm:p-8 text-center" style={{ background: '#0a0a0a', border: '1px solid ' + PANEL_BORDER }}>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>This is a sample. Run your own scan.</h2>
              <p style={{ color: '#888', fontSize: 14, marginTop: 8, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                You'll get the same dashboard — with your code, your homepage, and your findings.
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 mt-5"
                style={{ background: '#fff', color: '#000', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                <Github size={13} /> Scan your app <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
