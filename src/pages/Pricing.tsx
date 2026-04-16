import { Link } from 'react-router-dom';
import { Check, X, Zap, Shield, Mail, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WaitlistModal from '@/components/WaitlistModal';

export default function Pricing() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const freeFeatures = [
    { label: '3 scans per week', included: true },
    { label: '1 connected app', included: true },
    { label: 'Frontend code analysis', included: true },
    { label: 'Up to 2MB code per repo', included: true },
    { label: 'Edge function (backend) scan', included: false },
    { label: 'Cross-model verification', included: false },
    { label: 'Email when scan is ready', included: false },
    { label: 'Re-scan same repo anytime', included: false },
  ];

  const proFeatures = [
    { label: '100 scans per month', included: true },
    { label: 'Unlimited connected apps', included: true },
    { label: 'Frontend + edge function scan', included: true },
    { label: 'Up to 10MB code per repo', included: true },
    { label: 'Cross-model verification (Claude + Gemini)', included: true },
    { label: 'Email delivery of every report', included: true },
    { label: 'Re-scan same repo anytime', included: true },
    { label: 'Priority queue', included: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      <div className="max-w-[1100px] mx-auto px-6 md:px-10 pt-32 pb-16">
        <div className="text-center max-w-[640px] mx-auto">
          <h1 className="text-foreground text-[40px] md:text-[48px] font-bold leading-tight">Simple, honest pricing</h1>
          <p className="text-muted-foreground text-[17px] mt-4 leading-relaxed">
            Free forever for solo founders. Upgrade when you need deeper scans or want backend code reviewed too.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {/* Free */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="flex items-center gap-2">
              <Zap size={20} style={{ color: '#71717a' }} />
              <h2 className="text-foreground text-[22px] font-semibold">Free</h2>
            </div>
            <p className="text-muted-foreground text-sm mt-2">For trying Rismon.ai on your first app.</p>
            <div className="mt-6">
              <span className="text-foreground text-[40px] font-bold">$0</span>
              <span className="text-muted-foreground text-sm ml-2">forever</span>
            </div>
            <Link to="/signup" className="block w-full bg-secondary text-foreground border border-border py-3 rounded-lg text-sm font-medium mt-6 text-center hover:border-hover-border transition-colors">
              Start free
            </Link>
            <div className="mt-8 space-y-3">
              {freeFeatures.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  {f.included
                    ? <Check size={16} className="text-success shrink-0 mt-0.5" />
                    : <X size={16} className="shrink-0 mt-0.5" style={{ color: '#52525b' }} />
                  }
                  <span className={`text-[14px] ${f.included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div className="bg-card rounded-2xl p-8 relative" style={{ border: '1px solid rgba(249,115,22,0.4)', boxShadow: '0 0 40px rgba(249,115,22,0.08)' }}>
            <div className="absolute -top-3 left-8">
              <span className="bg-primary text-primary-foreground text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide">Coming soon</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-primary" />
              <h2 className="text-foreground text-[22px] font-semibold">Pro</h2>
            </div>
            <p className="text-muted-foreground text-sm mt-2">For teams shipping serious products with AI tools.</p>
            <div className="mt-6">
              <span className="text-foreground text-[40px] font-bold">$19</span>
              <span className="text-muted-foreground text-sm ml-2">/month</span>
            </div>
            <button onClick={() => setWaitlistOpen(true)} className="block w-full bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium mt-6 hover:bg-primary/90 transition-colors">
              Join Pro waitlist
            </button>
            <div className="mt-8 space-y-3">
              {proFeatures.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check size={16} className="text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground text-[14px]">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Why Pro is worth it */}
        <div className="mt-16">
          <h2 className="text-foreground text-[24px] font-semibold text-center">What you get with Pro</h2>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {[
              { icon: Shield, title: 'Deeper analysis', body: 'We scan your Supabase Edge Functions too — where most real business logic lives. Free plan only sees the frontend.' },
              { icon: RefreshCw, title: 'Verified findings', body: 'Two AI models (Claude + Gemini) must agree before a gap is reported. Cuts hallucinated issues by ~70%.' },
              { icon: Mail, title: 'Email delivery', body: 'Close the tab. Go grab coffee. We email you when your scan is ready, with a direct link to the report.' },
            ].map((f, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6">
                <f.icon size={20} className="text-primary" />
                <h3 className="text-foreground font-semibold mt-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-[720px] mx-auto">
          <h2 className="text-foreground text-[24px] font-semibold text-center">Common questions</h2>
          <div className="mt-8 space-y-4">
            {[
              { q: 'Why do you cap repo size?', a: 'AI analysis costs scale with code size. Free is capped at 2MB to keep the service sustainable. Pro raises this to 10MB which covers nearly any single-app codebase.' },
              { q: 'Can I switch between Free and Pro?', a: 'Yes. Pro will be a monthly subscription you can cancel anytime. While Pro is "coming soon" we are gathering signups to launch the right way.' },
              { q: 'Why block duplicate scans on Free?', a: 'Re-scanning the same repo within 24 hours rarely finds new issues — and it costs us money. Pro removes this restriction so you can iterate freely.' },
              { q: 'Is my code stored?', a: 'No. Code is fetched, sent to AI for analysis, and discarded. Only findings are saved to your account. We are open source — verify it yourself.' },
            ].map((f, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <p className="text-foreground font-semibold text-[15px]">{f.q}</p>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
