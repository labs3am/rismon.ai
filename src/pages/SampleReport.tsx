import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Check, Copy, ShieldAlert, FileText, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

/**
 * SampleReport mirrors the live Report page layout exactly so visitors
 * see what they'll actually get. Data below is hand-crafted to showcase:
 *  - The new Moderate scoring (87/100 — capped at 95 because no backend verified)
 *  - Proof-backed findings (file_path + line_number + code_snippet)
 *  - Verified vs Unverified confidence labels
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
  if (score >= 90) return '#22c55e';
  if (score >= 70) return '#f59e0b';
  if (score >= 50) return '#f97316';
  return '#ef4444';
}

const sample = {
  appName: 'Mealgo',
  platform: 'Lovable',
  score: 87,
  scoreLabel: 'Almost ready',
  scanType: 'quick',
  backendVerified: false, // → score capped at 95 by the new Moderate rules
  summary:
    'Mealgo cleanly delivers on its core promise: weekly meal planning with shopping-list generation. Authentication, recipe storage, and the Stripe checkout flow are all wired up correctly. The biggest concern is that the homepage advertises "AI-powered nutrition coaching" but no AI integration was found in the scanned code, and the Stripe webhook does not verify signatures.',
  verdict: 'Fix the webhook signature check before your first paying user signs up.',
  gaps: [
    {
      id: 'g-1',
      severity: 'high',
      confidence: 'verified',
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
      code_snippet: "const event = JSON.parse(await req.text()); // no signature check",
    },
    {
      id: 'g-2',
      severity: 'medium',
      confidence: 'unverified',
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
      severity: 'medium',
      confidence: 'unverified',
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
        'We searched the codebase for OpenAI, Anthropic, Gemini, and "coach" — no nutrition-coaching logic was found in the scanned files.',
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
      evidence:
        'src/pages/MealPlan.tsx and src/lib/shopping-list.ts implement this — confirmed.',
      severity: 'info',
    },
  ],
  what_works: [
    'Email + password authentication is wired correctly with Supabase auth and a working profiles table',
    'Stripe checkout session creation includes the correct success and cancel URLs',
    'Recipe storage uses a normalized schema (recipes, ingredients, recipe_ingredients) — clean and scalable',
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
    <div
      style={{
        fontSize: 11,
        color: '#555555',
        letterSpacing: '0.1em',
        marginBottom: 16,
        textTransform: 'uppercase',
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function IntentScoreCard({ score, label, capped }: { score: number; label: string; capped: boolean }) {
  const c = scoreColor(score);
  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: 16,
        padding: '40px 32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: '#555',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        Intent match
      </div>
      <div
        style={{
          fontSize: 88,
          fontWeight: 700,
          letterSpacing: '-0.04em',
          color: c,
          lineHeight: 0.95,
        }}
      >
        {score}
        <span style={{ fontSize: 28, color: '#444', fontWeight: 500, marginLeft: 4 }}>/100</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginTop: 16 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#666', marginTop: 6, lineHeight: 1.5 }}>
        Does your code do what you said your app does?
      </div>
      {capped && (
        <div
          style={{
            marginTop: 18,
            padding: '8px 14px',
            background: 'rgba(249,115,22,0.06)',
            border: '1px solid rgba(249,115,22,0.25)',
            borderRadius: 999,
            fontSize: 12,
            color: '#fb923c',
            display: 'inline-block',
          }}
        >
          Capped at 95 — connect your backend to unlock the full 100
        </div>
      )}
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
  const palette =
    tone === 'sharp'
      ? { border: '#ef4444', color: '#fca5a5', bg: 'rgba(239,68,68,0.06)' }
      : tone === 'soft'
        ? { border: '#f9731655', color: '#fb923c', bg: 'rgba(249,115,22,0.06)' }
        : { border: '#ffffff20', color: '#a1a1aa', bg: 'rgba(255,255,255,0.03)' };
  return (
    <span
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        borderRadius: 999,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ display: 'flex' }}>{icon}</span>
      <strong style={{ color: palette.color }}>{count}</strong>
      <span>{label}</span>
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

  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: 24,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#ffffff', marginBottom: 8, flex: 1 }}>
          {f.title}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: confColor,
              fontWeight: 600,
              border: `1px solid ${confColor}33`,
              padding: '2px 8px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
            }}
          >
            {confLabel}
          </span>
          <span
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {sev}
          </span>
        </div>
      </div>

      <div style={{ fontSize: 14, color: '#888888', lineHeight: 1.6, marginBottom: 12 }}>
        {f.what_we_found}
      </div>

      {/* Proof badge — file_path + line + snippet. Our visual signature. */}
      {f.file_path && (
        <div
          style={{
            background: '#000',
            border: '1px solid #1a1a1a',
            borderRadius: 6,
            padding: '10px 12px',
            marginBottom: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
            <span style={{ color: '#22c55e' }}>● Proof</span> · {f.file_path}
            {f.line_number ? `:${f.line_number}` : ''}
          </div>
          {f.code_snippet && (
            <div style={{ fontSize: 12, color: '#aaa', whiteSpace: 'pre-wrap' }}>{f.code_snippet}</div>
          )}
        </div>
      )}

      <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
        Impact
      </div>
      <div style={{ fontSize: 14, color: '#ffffff', lineHeight: 1.6, marginBottom: 16 }}>
        {f.what_this_means}
      </div>

      <div style={{ borderTop: '1px solid #1a1a1a', margin: '16px 0' }} />

      <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
        How to fix
      </div>
      <div style={{ fontSize: 14, color: '#888888', lineHeight: 1.6, marginBottom: 16 }}>
        {f.how_to_fix}
      </div>

      {f.fix_prompt && (
        <div style={{ position: 'relative' }}>
          <div
            style={{
              background: '#000000',
              border: '1px solid #222222',
              borderRadius: 6,
              padding: 16,
              paddingTop: 40,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 13,
              color: '#888888',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {f.fix_prompt}
          </div>
          <button
            onClick={onCopy}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'transparent',
              border: '1px solid #333333',
              color: '#888888',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {copied ? (
              <><Check size={11} /> Copied</>
            ) : (
              <><Copy size={11} /> Copy prompt</>
            )}
          </button>
        </div>
      )}

      {f.technical_reference && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: '#333', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
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
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderLeft: '3px solid #f59e0b',
        borderRadius: 8,
        padding: 22,
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, color: '#ffffff', marginBottom: 8 }}>{f.title}</div>
      <div style={{ fontSize: 14, color: '#888888', lineHeight: 1.6, marginBottom: 12 }}>{f.what_we_found}</div>
      <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
        Why it matters
      </div>
      <div style={{ fontSize: 14, color: '#ffffff', lineHeight: 1.6, marginBottom: 12 }}>{f.what_this_means}</div>
      <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
        What to do
      </div>
      <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>{f.how_to_fix}</div>
    </div>
  );
}

function PromiseRow({ p }: { p: any }) {
  const v = (p.verdict || 'not_found').toLowerCase();
  const palette =
    v === 'found'
      ? { color: '#ffffff', label: 'Found in code', bg: 'rgba(255,255,255,0.03)' }
      : v === 'partial'
        ? { color: '#f97316', label: 'Partial', bg: 'rgba(249,115,22,0.05)' }
        : { color: '#71717a', label: 'Not found in code', bg: 'rgba(113,113,122,0.04)' };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 16,
        padding: '16px 18px',
        background: palette.bg,
        border: '1px solid #1a1a1a',
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: '#fff', fontWeight: 500, marginBottom: 6, lineHeight: 1.4 }}>
          {p.claim}
        </div>
        {p.evidence && (
          <div style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>
            <span style={{ color: '#555' }}>From your {p.claim_source} · </span>
            {p.evidence}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: palette.color,
          border: `1px solid ${palette.color}40`,
          padding: '4px 10px',
          borderRadius: 999,
          height: 'fit-content',
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
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
    scoreLabel,
    scanType,
    backendVerified,
    summary,
    verdict,
    gaps,
    security_issues,
    legal_findings,
    landing_page_promises,
    what_works,
    homepage_signals,
  } = sample;

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <SEO
        title="Sample Report — See What Rismon Finds"
        description="Real example Rismon report: intent score, proof-backed findings, promises-vs-code checks, and copy-paste fix prompts for an AI-built meal-planning app."
        canonicalPath="/sample-report"
      />
      <Navbar />

      {/* Sample banner */}
      <div
        className="fixed top-16 left-0 right-0 z-[999]"
        style={{ background: 'rgba(249,115,22,0.06)', borderBottom: '1px solid rgba(249,115,22,0.25)', backdropFilter: 'blur(8px)' }}
      >
        <div className="max-w-[800px] mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Shield size={16} style={{ color: '#f97316' }} className="shrink-0" />
            <p className="text-sm truncate">
              <span style={{ color: '#fff', fontWeight: 500 }}>Sample report</span>{' '}
              <span style={{ color: '#888' }}>— this is what your report looks like after a scan</span>
            </p>
          </div>
          <Link
            to="/signup"
            className="shrink-0 hidden sm:inline-flex items-center gap-1"
            style={{
              background: '#fff',
              color: '#000',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Scan your app <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="report-container" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', paddingTop: 120 }}>
        {/* SECTION 1 — HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>
            App scanned: <span style={{ color: '#fff', fontWeight: 500 }}>{appName}</span>{' '}
            <span
              style={{
                marginLeft: 8,
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(99,102,241,0.1)',
                color: '#a5b4fc',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
              }}
            >
              {platform}
            </span>
          </div>
          <span
            style={{
              background: 'transparent',
              border: '1px solid #333',
              color: '#888',
              fontSize: 10,
              padding: '3px 10px',
              borderRadius: 4,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {scanType === 'quick' ? 'Quick Scan' : 'Deep Scan'}
          </span>
        </div>

        {/* SECTION 2 — INTENT HERO + WARNING CHIPS */}
        <div style={{ padding: '40px 0 12px' }}>
          <IntentScoreCard score={score} label={scoreLabel} capped={!backendVerified} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 20 }}>
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

        {/* SECTION 3 — SUMMARY */}
        <div
          style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: 8,
            padding: 24,
            marginTop: 32,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase', fontWeight: 600 }}>
            Overview
          </div>
          <div style={{ fontSize: 15, color: '#888888', lineHeight: 1.7 }}>{summary}</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 14, paddingTop: 14, borderTop: '1px solid #1a1a1a' }}>
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

        {/* SECTION 4 — VERDICT */}
        <div
          style={{
            padding: 24,
            borderTop: '1px solid #1a1a1a',
            borderBottom: '1px solid #1a1a1a',
            marginBottom: 32,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 600,
            color: '#ffffff',
            lineHeight: 1.5,
          }}
        >
          {verdict}
        </div>

        {/* SECTION 5 — INTENT GAPS */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>What you wanted vs what your code does</SectionLabel>
          {gaps.map((g) => <FindingCard key={g.id} f={g} />)}
        </div>

        {/* SECTION 6 — PROMISES VS CODE */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Promises on your homepage vs your code</SectionLabel>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginTop: -8, marginBottom: 16 }}>
            We read what your homepage and README claim, then checked your code for proof. Items marked
            "not found" may still exist — they were just not in the code we scanned.
          </p>
          {landing_page_promises.map((p) => <PromiseRow key={p.id} p={p} />)}
        </div>

        {/* SECTION 7 — SECURITY */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Security · these can hurt you in production</SectionLabel>
          {security_issues.map((s) => <FindingCard key={s.id} f={s} />)}
        </div>

        {/* SECTION 8 — LEGAL */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Legal &amp; trust · what to add before launch</SectionLabel>
          {legal_findings.map((f) => <LegalCard key={f.id} f={f} />)}
        </div>

        {/* SECTION 9 — WHAT WORKS */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>What your app does right</SectionLabel>
          <div>
            {what_works.map((w, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: '1px solid #0f0f0f',
                }}
              >
                <Check size={14} style={{ color: '#22c55e', flexShrink: 0, marginTop: 4 }} />
                <span style={{ fontSize: 14, color: '#888888', lineHeight: 1.5 }}>{w}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 10 — CTA */}
        <div
          style={{
            marginTop: 40,
            padding: 32,
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
            Ready to scan your own app?
          </div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>
            Free to start. No credit card. Your code is never stored.
          </div>
          <Link
            to="/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fff',
              color: '#000',
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
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
