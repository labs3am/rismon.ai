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
  if (score >= 40) return 'Needs work';
  return 'Critical issues';
}

const sample = {
  appName: 'Mealgo',
  platform: 'Lovable',
  scanType: 'quick',
  // Quick scan ceiling = 90. One high-severity verified finding (-5) and
  // one medium verified (-2) and a few unverified at half-weight bring this
  // to 81.
  score: 81,
  summary:
    'Mealgo cleanly delivers on its core promise: weekly meal planning with shopping-list generation. Authentication, recipe storage, and the Stripe checkout flow are wired up correctly. The biggest concern is that the Stripe webhook does not verify signatures, and the homepage advertises AI-powered nutrition coaching but no AI integration was found in the scanned code.',
  verdict: 'Fix the webhook signature check before your first paying user signs up.',
  gaps: [
    {
      id: 'g-1',
      severity: 'high',
      confidence: 'verified',
      category: 'payments',
      title: 'Stripe webhook accepts unsigned events',
      what_we_found:
        'The /stripe-webhook edge function reads the request body and updates user plans without calling stripe.webhooks.constructEvent.',
      what_this_means:
        'Anyone who knows your webhook URL can send a fake "payment succeeded" event and upgrade themselves to Pro for free. This is a direct revenue leak.',
      how_to_fix:
        'Read the stripe-signature header, verify it with your STRIPE_WEBHOOK_SECRET, and reject the request with 400 if verification fails.',
      fix_prompt:
        'In my Mealgo app, the supabase/functions/stripe-webhook/index.ts edge function processes Stripe events without verifying signatures. Update it to:\n\n1. Read the "stripe-signature" header from the incoming request\n2. Use the STRIPE_WEBHOOK_SECRET env var to verify the signature with stripe.webhooks.constructEventAsync\n3. Return a 400 response if verification fails\n4. Only then process checkout.session.completed and customer.subscription.updated events\n5. Add a console.error log for failed verifications so I can monitor abuse',
      technical_reference: 'stripe-webhook-signature-verification',
      file_path: 'supabase/functions/stripe-webhook/index.ts',
      line_number: 42,
      code_snippet: 'const event = JSON.parse(await req.text()); // no signature check',
    },
    {
      id: 'g-2',
      severity: 'medium',
      confidence: 'verified',
      category: 'payments',
      title: 'Plan downgrade not handled on subscription cancel',
      what_we_found:
        'The webhook handles checkout.session.completed but no handler exists for customer.subscription.deleted in the scanned code.',
      what_this_means:
        'When a Pro user cancels in Stripe, their plan stays Pro forever. They keep premium features without paying.',
      how_to_fix:
        'Add a customer.subscription.deleted branch in the webhook that sets the user plan back to "free" and clears pro_until.',
      fix_prompt:
        'In supabase/functions/stripe-webhook/index.ts, add a handler for the customer.subscription.deleted event:\n\n1. Look up the user by stripe_customer_id from the event\n2. Update their profiles row: plan = "free", pro_until = null\n3. Log the downgrade with the user_id and event_id\n4. Test with the Stripe CLI: stripe trigger customer.subscription.deleted',
      technical_reference: 'stripe-subscription-deleted-handler',
      file_path: 'supabase/functions/stripe-webhook/index.ts',
      line_number: 78,
      code_snippet: "if (event.type === 'checkout.session.completed') { /* upgrade */ }",
    },
  ],
  security_issues: [
    {
      id: 's-1',
      severity: 'high',
      confidence: 'unverified',
      category: 'secrets',
      title: 'OpenAI API key referenced in client code',
      what_we_found:
        'src/lib/ai.ts reads VITE_OPENAI_API_KEY. Anything prefixed VITE_ is bundled into the browser and visible in DevTools.',
      what_this_means:
        'Anyone visiting your live site can extract this key from the JavaScript bundle and run their own OpenAI requests on your bill. Costs can run into thousands of dollars in hours.',
      how_to_fix:
        'Move the OpenAI call into a Supabase edge function. Store the key as OPENAI_API_KEY (no VITE_ prefix). Call the edge function from the client instead.',
      fix_prompt:
        'My Mealgo app has the OpenAI API key exposed in client code via VITE_OPENAI_API_KEY in src/lib/ai.ts. Fix this by:\n\n1. Create a new edge function at supabase/functions/ai-suggest/index.ts that takes a "prompt" in the body and calls OpenAI server-side\n2. Use Deno.env.get("OPENAI_API_KEY") on the server (no VITE_ prefix)\n3. In src/lib/ai.ts, replace the direct OpenAI call with supabase.functions.invoke("ai-suggest", { body: { prompt } })\n4. Delete VITE_OPENAI_API_KEY from .env\n5. Add OPENAI_API_KEY as a secret to your Supabase project',
      technical_reference: 'client-side-api-key-exposure',
      file_path: 'src/lib/ai.ts',
      line_number: 8,
      code_snippet: 'const apiKey = import.meta.env.VITE_OPENAI_API_KEY;',
    },
    {
      // Database-pattern finding. Confidence is forced to "unverified" because
      // we did not have a live Supabase connection during this scan. The card
      // shows the "Connect Supabase to verify" note.
      id: 's-2',
      severity: 'high',
      confidence: 'unverified',
      category: 'database',
      requires_supabase_verification: true,
      verification_note:
        'Connect your Supabase project to verify this finding accurately. Without Supabase access this is based on code patterns only.',
      title: 'Recipes table may be missing row-level security',
      what_we_found:
        'src/lib/recipes.ts queries the public.recipes table with the anon key but no .eq("user_id", user.id) filter. We did not detect an RLS policy in the scanned migrations.',
      what_this_means:
        'If RLS is not enabled on this table, any signed-in user could read or modify every other user\'s recipes. We could not verify this directly without a live Supabase connection.',
      how_to_fix:
        'Enable RLS on public.recipes, then add owner-scoped SELECT, INSERT, UPDATE and DELETE policies that compare auth.uid() to the user_id column.',
      fix_prompt:
        'In my Supabase project, enable row-level security on the public.recipes table and add owner-scoped policies:\n\n1. ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;\n2. CREATE POLICY "owner reads" ON public.recipes FOR SELECT USING (auth.uid() = user_id);\n3. CREATE POLICY "owner writes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);\n4. CREATE POLICY "owner updates" ON public.recipes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);\n5. CREATE POLICY "owner deletes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);\n6. Test with two different accounts: account A should never see account B\'s rows.',
      technical_reference: 'supabase-rls-owner-policy',
      file_path: 'src/lib/recipes.ts',
      line_number: 14,
      code_snippet: "supabase.from('recipes').select('*')",
    },
  ],
  legal_findings: [
    {
      id: 'l-1',
      title: 'No privacy policy found on your live site',
      what_we_found:
        'We checked mealgo.app/privacy and the footer of your homepage. No privacy policy page was returned.',
      what_this_means:
        'Most app stores, payment providers, and ad platforms expect a privacy policy. Stripe, in particular, may flag your account if users complain.',
      how_to_fix:
        'Add a /privacy route with a real privacy policy. Even a short one (what data you collect, why, who you share it with) is enough to start.',
      severity: 'low',
    },
  ],
  landing_page_promises: [
    {
      id: 'p-1',
      claim: 'AI-powered nutrition coaching',
      claim_source: 'homepage',
      verdict: 'not_found',
      evidence:
        'We searched the codebase for OpenAI, Anthropic, Gemini, and "coach". No nutrition-coaching logic was found in the scanned files.',
      severity: 'medium',
    },
    {
      id: 'p-2',
      claim: 'Sync with Apple Health and Fitbit',
      claim_source: 'homepage',
      verdict: 'not_found',
      evidence: 'No HealthKit or Fitbit OAuth code was found. No requests to api.fitbit.com.',
      severity: 'medium',
    },
    {
      id: 'p-3',
      claim: 'Weekly meal plans with shopping lists',
      claim_source: 'homepage',
      verdict: 'found',
      evidence: 'src/pages/MealPlan.tsx and src/lib/shopping-list.ts implement this, confirmed.',
      severity: 'info',
    },
  ],
  what_works: [
    'Email and password authentication is wired correctly with Supabase auth and a working profiles table',
    'Stripe checkout session creation includes the correct success and cancel URLs',
    'Recipe storage uses a normalized schema (recipes, ingredients, recipe_ingredients), clean and scalable',
    'Mobile responsive layout adapts cleanly down to 360px width',
  ],
  homepage_signals: {
    has_live_url: true,
    privacy_page_found: false,
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
      <div className="text-sm text-foreground leading-relaxed mb-4">{f.what_this_means}</div>

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
        title="Sample Report | Rismon.ai — See exactly what Rismon finds"
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
