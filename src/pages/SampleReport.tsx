import { Link } from 'react-router-dom';
import { CheckCircle, Copy, Check, AlertTriangle, Shield, MinusCircle, ArrowRight, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { useState } from 'react';
import { toast } from 'sonner';

const sampleData = {
  appName: 'FitTrack Pro',
  platform: 'Lovable',
  score: 62,
  summary: 'FitTrack Pro has a solid front-end with clean workout logging and progress charts. However, several critical business logic gaps were found: premium workout plans are accessible without a paid subscription, user workout data lacks proper row-level security, and the payment webhook does not verify Stripe signatures. These issues mean paying customers get no advantage over free users, and sensitive health data could be exposed.',
  gaps: [
    {
      id: 'gap_1',
      title: 'Premium workouts accessible without subscription',
      severity: 'critical',
      you_said: 'Only paid users should access the 12-week transformation plans and personalized coaching features.',
      what_was_built: 'All workout plans are fetched without checking the user subscription status. Any logged-in user can access premium content by navigating directly to the URL.',
      business_impact: 'Paying customers have no reason to subscribe. You are giving away your core product for free. This directly kills your revenue model.',
    },
    {
      id: 'gap_2',
      title: 'No payment verification on webhooks',
      severity: 'high',
      you_said: 'Stripe handles payments and upgrades users to premium after successful payment.',
      what_was_built: 'The webhook endpoint receives Stripe events but does not verify the webhook signature. Anyone can send a fake payment event and get upgraded to premium for free.',
      business_impact: 'Attackers can grant themselves premium access without paying. This is a direct revenue loss and a serious security vulnerability.',
    },
    {
      id: 'gap_3',
      title: 'Workout history not filtered by user',
      severity: 'medium',
      you_said: 'Each user should only see their own workout history and progress.',
      what_was_built: 'The workout history query fetches all records from the workouts table. While the UI only displays the current user\'s data, the API returns everyone\'s workout data.',
      business_impact: 'Users\' personal health and fitness data could be accessed by other users. This is a privacy violation that could have legal consequences under GDPR or HIPAA.',
    },
  ],
  security_issues: [
    { id: 'sec_1', title: 'Row-level security not enabled on workouts table', severity: 'critical', explanation: 'The workouts table has no RLS policies. Any authenticated user can read, update, or delete any other user\'s workout data using the Supabase client directly.', business_impact: 'Complete data exposure. Any user can see everyone else\'s workouts, body measurements, and health notes.' },
    { id: 'sec_2', title: 'API key exposed in client-side code', severity: 'high', explanation: 'A third-party nutrition API key is hardcoded in the frontend source code instead of being stored as an environment variable.', business_impact: 'Anyone can extract this key from the browser and use your API quota. You could face unexpected charges or service disruption.' },
    { id: 'sec_3', title: 'Authentication on protected routes', status: 'passed', explanation: 'All dashboard and settings routes properly check for an authenticated session before rendering.' },
    { id: 'sec_4', title: 'Environment variables for Supabase keys', status: 'passed', explanation: 'Supabase URL and anon key are correctly stored as environment variables.' },
  ],
  unknown_features: [
    {
      id: 'uf_1',
      feature_name: 'Social workout sharing',
      description: 'A feature that allows users to share their workout summaries to a public feed. Other users can like and comment on shared workouts.',
      found_where: 'src/components/SocialFeed.tsx, src/pages/Community.tsx',
      risk_if_kept: 'Health data shared publicly could expose sensitive information. Users may not realize their workout details are visible to everyone.',
      risk_if_removed: 'If this was intentional, removing it would eliminate a community engagement feature that could drive retention.',
    },
  ],
  what_works: [
    'User registration and login flow works correctly with email verification',
    'Workout logging saves exercises, sets, reps, and weights accurately',
    'Progress charts display correct data over time with proper date filtering',
    'Profile settings update correctly including avatar upload',
    'Password reset flow works end to end',
    'Mobile responsive design adapts properly across all screen sizes',
  ],
  fix_prompts: [
    {
      title: 'Lock premium workouts behind subscription check',
      platform: 'Lovable',
      where_to_paste: 'Paste this into Lovable chat for your FitTrack Pro project',
      prompt: 'In my FitTrack Pro app, premium workout plans (12-week transformation and personalized coaching) are currently accessible to all users. I need you to:\n\n1. Add a subscription_status column to the profiles table if it doesn\'t exist (values: free, premium)\n2. Create an RLS policy on the workout_plans table that only allows users with subscription_status = \'premium\' to access rows where is_premium = true\n3. In the WorkoutPlan component, check the user\'s subscription status before rendering premium content\n4. Show an upgrade prompt with a link to the pricing page when free users try to access premium plans\n5. Make sure the Stripe webhook updates subscription_status to \'premium\' after successful payment',
      expected_result: 'Free users will see a paywall when trying to access premium workout plans. Only users who have paid through Stripe will be able to view premium content.',
      fix_id: 'fix_1',
    },
    {
      title: 'Add Stripe webhook signature verification',
      platform: 'Supabase',
      where_to_paste: 'Paste this into your Supabase Edge Function editor for the stripe-webhook function',
      prompt: 'My Stripe webhook edge function currently processes events without verifying the signature. Update the function to:\n\n1. Read the stripe-signature header from the incoming request\n2. Use the STRIPE_WEBHOOK_SECRET environment variable to verify the signature using Stripe\'s constructEvent method\n3. Return a 400 error if signature verification fails\n4. Only process checkout.session.completed and customer.subscription.updated events\n5. Log failed verification attempts for monitoring',
      expected_result: 'Only legitimate Stripe events will be processed. Fake webhook calls will be rejected with a 400 status code, preventing unauthorized premium upgrades.',
      fix_id: 'fix_2',
    },
    {
      title: 'Enable RLS on workouts table',
      platform: 'Supabase',
      where_to_paste: 'Run this in the Supabase SQL Editor for your project',
      prompt: 'My workouts table has no row-level security. I need you to:\n\n1. Enable RLS on the workouts table\n2. Create a policy that allows users to SELECT only their own rows (where user_id = auth.uid())\n3. Create a policy that allows users to INSERT only with their own user_id\n4. Create a policy that allows users to UPDATE only their own rows\n5. Create a policy that allows users to DELETE only their own rows\n6. Test that one user cannot access another user\'s workout data',
      expected_result: 'Each user can only see, create, edit, and delete their own workout records. Other users\' data is completely invisible at the database level.',
      fix_id: 'fix_3',
    },
  ],
};

export default function SampleReport() {
  const [copiedId, setCopiedId] = useState('');

  const copyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const { score, summary, gaps, security_issues, unknown_features, what_works, fix_prompts } = sampleData;
  const scoreColor = score <= 40 ? '#ef4444' : score <= 70 ? '#f59e0b' : '#22c55e';

  const platformColors: Record<string, { bg: string; text: string }> = {
    lovable: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8' },
    supabase: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
    general: { bg: 'rgba(113,113,122,0.1)', text: '#71717a' },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sample Report — See What Rismon Finds"
        description="An example Rismon.ai report: intent match score, plain-English gaps, security issues, and ready-to-paste fix prompts for an AI-built fitness app."
        canonicalPath="/sample-report"
      />
      <Navbar />

      {/* Sample banner */}
      <div className="fixed top-16 left-0 right-0 z-[999]" style={{ background: 'rgba(249,115,22,0.08)', borderBottom: '1px solid rgba(249,115,22,0.25)' }}>
        <div className="max-w-[800px] mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary shrink-0" />
            <p className="text-sm"><span className="text-foreground font-medium">Sample report</span> <span className="text-muted-foreground">— This is what your report looks like after analysis</span></p>
          </div>
          <Link to="/signup" className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0 hidden sm:inline-flex items-center gap-1">
            Analyze your app <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-5 pt-36 pb-16">
        {/* App info */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-muted-foreground text-sm">App analyzed:</span>
          <span className="text-foreground font-medium text-sm">{sampleData.appName}</span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{sampleData.platform}</span>
        </div>

        {/* SECTION 1: Score and summary */}
        <div className="text-center mt-8">
          <div className="w-[130px] h-[130px] rounded-full flex items-center justify-center mx-auto" style={{ border: `3px solid ${scoreColor}` }}>
            <span className="text-foreground text-4xl font-bold">{score}</span>
          </div>
          <p className="text-foreground text-lg font-medium mt-4">{score}% match with the founder's description</p>
          <div className="bg-card border border-border rounded-xl p-5 mt-4">
            <p className="text-muted-foreground text-[15px] leading-[1.6]">{summary}</p>
          </div>
        </div>

        {/* SECTION 2: Gaps */}
        <div className="mt-12">
          <h2 className="text-foreground text-[20px] font-semibold">Business logic gaps</h2>
          <div className="mt-4 space-y-4">
            {gaps.map((g) => {
              const bc = g.severity === 'critical' ? '#ef4444' : g.severity === 'high' ? '#f97316' : g.severity === 'medium' ? '#f59e0b' : '#6366f1';
              return (
                <div key={g.id} className="bg-card border border-border rounded-r-2xl p-6" style={{ borderLeft: `4px solid ${bc}` }}>
                  <div className="flex items-center justify-between">
                    <p className="text-foreground font-bold text-[17px]">{g.title}</p>
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: `${bc}20`, color: bc }}>{g.severity}</span>
                  </div>
                  <p className="text-muted-foreground text-[13px] font-semibold mt-3">You described:</p>
                  <p className="text-foreground text-[15px] mt-1">{g.you_said}</p>
                  <p className="text-muted-foreground text-[13px] font-semibold mt-3">What was built:</p>
                  <p className="text-foreground text-[15px] mt-1">{g.what_was_built}</p>
                  <div className="rounded-lg p-3 mt-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <p className="text-destructive text-xs font-semibold">Business impact:</p>
                    <p className="text-foreground text-sm mt-1">{g.business_impact}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Security findings */}
        <div className="mt-12">
          <h2 className="text-foreground text-[20px] font-semibold">Security findings</h2>
          <div className="mt-4 space-y-3">
            {security_issues.map((s) => {
              if (s.status === 'passed') {
                return (
                  <div key={s.id} className="bg-card border border-border rounded-r-2xl p-5" style={{ borderLeft: '4px solid #22c55e' }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-success shrink-0" />
                      <p className="text-success font-semibold text-[15px]">Passed: {s.title}</p>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1 ml-7">{s.explanation}</p>
                  </div>
                );
              }
              const bc = s.severity === 'critical' ? '#ef4444' : s.severity === 'high' ? '#f97316' : '#f59e0b';
              return (
                <div key={s.id} className="bg-card border border-border rounded-r-2xl p-6" style={{ borderLeft: `4px solid ${bc}` }}>
                  <div className="flex items-center justify-between">
                    <p className="text-foreground font-bold text-[17px]">{s.title}</p>
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: `${bc}20`, color: bc }}>{s.severity}</span>
                  </div>
                  <p className="text-muted-foreground text-[15px] mt-3">{s.explanation}</p>
                  {s.business_impact && (
                    <div className="rounded-lg p-3 mt-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <p className="text-destructive text-xs font-semibold">Business impact:</p>
                      <p className="text-foreground text-sm mt-1">{s.business_impact}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: Unknown features */}
        <div className="mt-12">
          <h2 className="text-foreground text-[20px] font-semibold">Features we found</h2>
          <div className="mt-4 space-y-4">
            {unknown_features.map((f) => (
              <div key={f.id} className="bg-card border border-border rounded-2xl p-6">
                <p className="text-foreground font-bold text-[17px]">{f.feature_name}</p>
                <p className="text-muted-foreground text-[15px] mt-2">{f.description}</p>
                <p className="text-muted-foreground text-[13px] italic mt-1">Found in: {f.found_where}</p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p className="text-warning text-xs font-semibold">If you keep it:</p>
                    <p className="text-muted-foreground text-sm mt-1">{f.risk_if_kept}</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p className="text-destructive text-xs font-semibold">If you remove it:</p>
                    <p className="text-muted-foreground text-sm mt-1">{f.risk_if_removed}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: What works */}
        <div className="mt-12">
          <h2 className="text-foreground text-[20px] font-semibold">What your app does right</h2>
          <div className="mt-4 space-y-2">
            {what_works.map((w, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.04)' }}>
                <CheckCircle size={16} className="text-success shrink-0" />
                <span className="text-muted-foreground text-[15px]">{w}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 6: Fix prompts (blurred teaser) */}
        <div className="mt-12">
          <h2 className="text-foreground text-[20px] font-semibold">Your fix prompts</h2>
          <p className="text-muted-foreground text-sm mt-1">Made for your app and your code. Copy each prompt and paste it into your platform.</p>

          {/* Show first prompt fully */}
          <div className="mt-6">
            <div className="bg-card border border-border rounded-2xl p-7">
              <div className="flex items-center justify-between">
                <p className="text-foreground font-bold text-[17px]">{fix_prompts[0].title}</p>
                <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: platformColors.lovable.bg, color: platformColors.lovable.text }}>{fix_prompts[0].platform}</span>
              </div>
              <p className="text-muted-foreground text-[13px] font-semibold mt-4">Where to paste this:</p>
              <p className="text-foreground text-sm mt-1">{fix_prompts[0].where_to_paste}</p>
              <div className="relative mt-4 bg-input-bg border border-border rounded-lg p-5">
                <pre className="text-[14px] text-foreground/90 font-mono whitespace-pre-wrap overflow-x-auto">{fix_prompts[0].prompt}</pre>
                <button onClick={() => copyPrompt(fix_prompts[0].fix_id, fix_prompts[0].prompt)}
                  className="absolute top-3 right-3 flex items-center gap-1 bg-muted border border-input px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {copiedId === fix_prompts[0].fix_id ? <><Check size={12} className="text-success" /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
              {fix_prompts[0].expected_result && (
                <div className="rounded-lg p-3 mt-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <p className="text-success text-xs font-semibold">After applying this fix:</p>
                  <p className="text-foreground text-sm mt-1">{fix_prompts[0].expected_result}</p>
                </div>
              )}
            </div>
          </div>

          {/* Blurred remaining prompts */}
          <div className="relative mt-5">
            <div className="space-y-5 filter blur-[6px] pointer-events-none select-none" aria-hidden="true">
              {fix_prompts.slice(1).map((fp, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-7">
                  <p className="text-foreground font-bold text-[17px]">{fp.title}</p>
                  <div className="mt-4 bg-input-bg border border-border rounded-lg p-5">
                    <pre className="text-[14px] text-foreground/90 font-mono whitespace-pre-wrap">{fp.prompt.slice(0, 200)}...</pre>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-[400px]">
                <Lock size={32} className="text-primary mx-auto" />
                <p className="text-foreground font-semibold text-lg mt-4">Get all fix prompts for your app</p>
                <p className="text-muted-foreground text-sm mt-2">Sign up free to analyze your own app and get personalized fix prompts for every issue found.</p>
                <Link to="/signup" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-semibold mt-5 hover:bg-primary/90 transition-colors">
                  Analyze your app free <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center bg-card border border-border rounded-2xl p-10">
          <h3 className="text-foreground text-2xl font-semibold">Want this for your app?</h3>
          <p className="text-muted-foreground text-[15px] mt-3 max-w-[460px] mx-auto">Connect your GitHub repo, describe what your app should do, and get a full report in 60 seconds. Free.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-lg text-sm font-semibold mt-6 hover:bg-primary/90 transition-colors">
            Get started free <ArrowRight size={14} />
          </Link>
          <p className="text-subtle text-xs mt-3">No credit card required</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
