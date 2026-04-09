import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Store, ShoppingBag, Briefcase, Heart, GraduationCap, CheckCircle, CreditCard, Users, Key, Search, GitBranch, AlertTriangle, Database, Lock, Shield, Globe, RefreshCw, MessageSquare, AlertCircle, Wrench } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WaitlistModal from '@/components/WaitlistModal';

const personas = [
  { icon: Rocket, title: 'Startup founders', q: 'You built a paid app.\nAre your premium features\nactually locked for users\nwho have not paid?\nOr can anyone access them free?' },
  { icon: Store, title: 'Small business owners', q: "You built a booking system.\nCan your customers see each\nother's personal details?\nOr is their data protected?" },
  { icon: ShoppingBag, title: 'Ecommerce builders', q: "You built an online store.\nCan your customers see other\npeople's orders and payments?\nOr is each order private?" },
  { icon: Briefcase, title: 'Freelancers and agencies', q: 'You build apps for clients.\nCan you verify your work is\ncorrect before you deliver it?\nOr are you guessing?' },
  { icon: Heart, title: 'Healthcare professionals', q: "You built a patient system.\nWho can actually access your\npatients' private records?\nOnly doctors or everyone?" },
  { icon: GraduationCap, title: 'Educators and creators', q: 'You built a course platform.\nCan students access your paid\ncontent without actually paying?\nOr is it properly locked?' },
];

const steps = [
  { n: '01', title: 'Create your account', text: 'Sign up with your email.\nTakes 30 seconds.\nNo credit card needed.' },
  { n: '02', title: 'Connect your app', text: 'Connect your GitHub repo.\nRead only access.\nWe never store your code.' },
  { n: '03', title: 'We study your app', text: 'Rismon.ai reads your entire\ncodebase and understands what\nwas actually built.' },
  { n: '04', title: 'Tell us your business', text: 'Describe what your app\nis supposed to do.\nPlain English only.' },
  { n: '05', title: 'Get your report', text: 'Plain English report showing\nevery gap plus exact prompts\nto fix each issue.' },
];

const bizChecks = [
  { icon: CheckCircle, title: 'What your app does', text: 'We explain your entire app\nin plain English before anything else.' },
  { icon: CreditCard, title: 'Payment gates', text: 'Are paid features actually\nblocked for users who have not paid?' },
  { icon: Users, title: 'User roles', text: 'Can right users do right things?\nAre wrong users blocked?' },
  { icon: Key, title: 'Admin access', text: 'Is your admin panel protected\nfrom regular users?' },
  { icon: Search, title: 'Unknown features', text: 'Did AI build things you\nnever asked for?' },
  { icon: GitBranch, title: 'Intent vs reality', text: 'Does your code match what\nyou described when building?' },
];

const secChecks = [
  { icon: AlertTriangle, title: 'API key exposure', text: 'Are your secret keys exposed\nin code or GitHub history?' },
  { icon: Database, title: 'Database exposure', text: 'Is your user data protected\nor publicly readable by anyone?' },
  { icon: Lock, title: 'Authentication gaps', text: 'Are all your routes and pages\nproperly protected?' },
  { icon: Shield, title: 'Environment variables', text: 'Are secrets hardcoded in code\nor accidentally committed?' },
  { icon: Globe, title: 'API protection', text: 'Are your backend routes\nprotected from direct access?' },
  { icon: RefreshCw, title: 'Dependency risks', text: 'Are your packages outdated\nor have known vulnerabilities?' },
];

const freeFeatures = ['1 app included', '3 scans per week', 'Full plain English report', 'Business logic verification', 'Security issue detection', 'GitHub secret scan', 'Fix prompts for every issue', 'Works with all AI platforms'];
const proFeatures = ['Unlimited apps', 'Unlimited scans', 'Daily automatic scan', 'New commit scan', 'CVE vulnerability alerts', 'WhatsApp and email alerts', 'Score history and trends', 'Investor ready PDF report', 'Business type deep scan', 'Automatic security updates', 'Priority support'];

export default function Index() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      {/* HERO */}
      <section className="pt-40 pb-28 px-6 text-center">
        <div className="max-w-[800px] mx-auto">
          <h1 className="text-[40px] md:text-[64px] font-bold text-foreground leading-[1.1]">Do you actually know<br />what it built for you?</h1>
          <p className="text-muted-foreground text-lg leading-[1.7] max-w-[560px] mx-auto mt-6">
            You had an idea. You described it to an AI. The AI built something. But do you know exactly what it built? Rismon.ai reads your entire app and tells you what was built, what works, and what needs fixing. In plain English. Always.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link to="/signup" className="bg-primary text-primary-foreground px-8 py-3.5 rounded-lg text-base font-medium hover:bg-primary/90 transition-colors">Get started free</Link>
            <a href="#how-it-works" className="border border-hover-border text-foreground px-8 py-3.5 rounded-lg text-base font-medium hover:border-muted-foreground/30 transition-colors">See how it works</a>
          </div>
          <p className="text-subtle text-[13px] mt-5">Free to start. No credit card needed.</p>
        </div>

        {/* Platforms */}
        <div className="mt-16">
          <p className="text-dimmed text-xs uppercase tracking-[0.1em]">Works with apps built on</p>
          <p className="text-subtle text-sm mt-4">Lovable · Bolt · Cursor · Emergent · Replit · v0 · Windsurf · and more</p>
        </div>
      </section>

      {/* NOT SURE */}
      <section className="px-6 pb-28">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center">
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold">Not sure? Ask yourself:</h2>
            <p className="text-muted-foreground text-lg max-w-[560px] mx-auto mt-4 leading-[1.7]">
              If you built with AI — do you actually know what it built? Not what you asked for. What was actually built.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
            {personas.map((p, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 hover:border-hover-border transition-colors">
                <p.icon size={24} className="text-primary" />
                <p className="text-foreground text-[17px] font-semibold mt-4">{p.title}</p>
                <p className="text-muted-foreground text-[15px] mt-2 whitespace-pre-line">{p.q}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-muted-foreground">If any of these made you pause —</p>
            <p className="text-foreground text-xl font-semibold mt-2">Rismon.ai was built for you.</p>
            <Link to="/signup" className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg text-sm font-medium mt-6 hover:bg-primary/90 transition-colors">Check your app free</Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-input-bg py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center">
            <p className="text-primary text-xs font-semibold tracking-[0.1em] uppercase">HOW IT WORKS</p>
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3">Five steps to know your app completely</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-14">
            {steps.map((s, i) => (
              <div key={i}>
                <p className="text-4xl font-bold" style={{ color: 'rgba(99,102,241,0.3)' }}>{s.n}</p>
                <p className="text-foreground text-[17px] font-semibold mt-3">{s.title}</p>
                <p className="text-muted-foreground text-sm mt-2 whitespace-pre-line">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE CHECK */}
      <section className="py-28 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center">
            <p className="text-primary text-xs font-semibold tracking-[0.1em] uppercase">WHAT WE ANALYZE</p>
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3">Everything Rismon.ai checks</h2>
          </div>

          <p className="text-primary text-[11px] font-semibold tracking-[0.1em] uppercase mt-12">BUSINESS VERIFICATION</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {bizChecks.map((c, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 hover:border-hover-border transition-colors">
                <c.icon size={20} className="text-primary" />
                <p className="text-foreground text-[15px] font-semibold mt-3">{c.title}</p>
                <p className="text-muted-foreground text-sm mt-2 whitespace-pre-line">{c.text}</p>
              </div>
            ))}
          </div>

          <p className="text-destructive text-[11px] font-semibold tracking-[0.1em] uppercase mt-12">SECURITY VERIFICATION</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {secChecks.map((c, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 hover:border-hover-border transition-colors">
                <c.icon size={20} className="text-destructive" />
                <p className="text-foreground text-[15px] font-semibold mt-3">{c.title}</p>
                <p className="text-muted-foreground text-sm mt-2 whitespace-pre-line">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLAIN ENGLISH */}
      <section className="bg-input-bg py-24 px-6">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="text-foreground text-[28px] md:text-4xl font-semibold">Everything in plain English</h2>
          <p className="text-muted-foreground text-lg max-w-[480px] mx-auto mt-4 leading-[1.7]">
            No code. No jargon. No confusion. We explain your app like you are smart but not a developer. Because you are.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
            {[
              { icon: MessageSquare, title: 'We explain what was built', text: 'In plain language even your non-technical co-founder understands.' },
              { icon: AlertCircle, title: 'We show what is wrong', text: 'Every gap explained with real examples of what could happen.' },
              { icon: Wrench, title: 'We tell you how to fix it', text: 'Copy paste prompts for Lovable, Cursor, or Supabase.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <item.icon size={32} className="text-primary mx-auto" />
                <p className="text-foreground font-semibold mt-4">{item.title}</p>
                <p className="text-muted-foreground text-sm mt-2">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-28 px-6">
        <div className="max-w-[960px] mx-auto">
          <div className="text-center">
            <p className="text-primary text-xs font-semibold tracking-[0.1em] uppercase">PRICING</p>
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3">Simple and honest pricing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            {/* Free */}
            <div className="bg-card border border-border rounded-2xl p-8">
              <p className="text-foreground text-[28px] font-bold">Free</p>
              <p className="text-muted-foreground mt-1">₹0 / forever</p>
              <p className="text-foreground text-sm font-semibold mt-6">What you get:</p>
              <div className="mt-4 space-y-2.5">
                {freeFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2"><CheckCircle size={15} className="text-success shrink-0" /><span className="text-muted-foreground text-sm">{f}</span></div>
                ))}
              </div>
              <div className="border-t border-border my-6" />
              <p className="text-muted-foreground text-[13px] font-semibold">Perfect for:</p>
              <p className="text-muted-foreground text-sm mt-1">Founders understanding their first AI-built app</p>
              <Link to="/signup" className="block w-full text-center bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium mt-6 hover:bg-primary/90 transition-colors">Get started free</Link>
            </div>

            {/* Pro */}
            <div className="bg-card border border-primary rounded-2xl p-8" style={{ boxShadow: '0 0 40px rgba(99,102,241,0.12)' }}>
              <span className="inline-block text-[11px] px-3 py-1 rounded-full mb-4" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>FOUNDING MEMBER — FIRST 50 ONLY</span>
              <p className="text-foreground text-[28px] font-bold">Pro</p>
              <p className="text-foreground text-2xl font-semibold mt-1">₹999/month</p>
              <p className="text-muted-foreground text-sm mt-1">or ₹799/month billed quarterly</p>
              <p className="text-subtle text-xs mt-1">Regular price ₹1,499 after first 50</p>
              <p className="text-foreground text-sm font-semibold mt-6">Everything in free plus:</p>
              <div className="mt-4 space-y-2.5">
                {proFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2"><CheckCircle size={15} className="text-primary shrink-0" /><span className="text-muted-foreground text-sm">{f}</span></div>
                ))}
              </div>
              <div className="border-t border-border my-6" />
              <p className="text-muted-foreground text-[13px] font-semibold">Perfect for:</p>
              <p className="text-muted-foreground text-sm mt-1">Founders with real users who need continuous protection</p>
              <button onClick={() => setWaitlistOpen(true)} className="block w-full text-center bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium mt-6 hover:bg-primary/90 transition-colors">Join founding member waitlist</button>
            </div>
          </div>
        </div>
      </section>

      {/* WHY WE BUILT THIS */}
      <section className="py-28 px-6">
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-primary text-xs font-semibold tracking-[0.1em] uppercase">WHY WE BUILT THIS</p>
          <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3">Every founder deserves to understand what they built</h2>
          <div className="text-muted-foreground text-base leading-[1.9] mt-6 text-left md:text-center whitespace-pre-line">
{`AI tools have made building software accessible to everyone.

Anyone can now describe an idea and have a working app in hours.

But most of these founders have never seen the code their AI wrote. They do not know what it does. They do not know if it is safe.

Rismon.ai exists to change that.

We read your app. We explain it to you. We tell you what is wrong. We give you the fix.

In plain English. Every time.`}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
