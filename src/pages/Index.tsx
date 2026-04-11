import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Store, ShoppingBag, Briefcase, Heart, GraduationCap, CheckCircle, CreditCard, Users, Key, Search, GitBranch, AlertTriangle, Database, Lock, Shield, Globe, RefreshCw, MessageSquare, AlertCircle, Wrench } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WaitlistModal from '@/components/WaitlistModal';
import lovableLogo from '@/assets/logos/lovable.png';
import boltLogo from '@/assets/logos/bolt.png';
import cursorLogo from '@/assets/logos/cursor.png';
import emergentLogo from '@/assets/logos/emergent.png';
import replitLogo from '@/assets/logos/replit.png';
import v0Logo from '@/assets/logos/v0.png';
import windsurfLogo from '@/assets/logos/windsurf.png';
import copilotLogo from '@/assets/logos/copilot.png';
import claudeLogo from '@/assets/logos/claude.png';
import geminiLogo from '@/assets/logos/gemini.png';

const faqs = [
  { q: 'Do you store my code?', a: 'No. We read your code during the analysis and discard it immediately after. We never store your source code on our servers.' },
  { q: 'Is my code safe?', a: 'Yes. We use read-only access to your GitHub repository. We cannot modify, delete, or push anything to your code. Your code never leaves the analysis pipeline.' },
  { q: 'Do I need to know how to code?', a: 'Not at all. Rismon.ai was built specifically for non-technical founders. Everything is explained in plain English. No jargon, no code snippets, no confusion.' },
  { q: 'How long does an analysis take?', a: 'About 60 seconds. We read your codebase, ask you a few plain English questions about your app, and deliver your full report with a match score.' },
  { q: 'What AI platforms do you support?', a: 'We support every AI coding platform including Lovable, Bolt, Cursor, Replit, Windsurf, v0, GitHub Copilot, Claude Code, and more. If it produces code on GitHub, we can analyze it.' },
  { q: 'What is the intent match score?', a: 'It is a percentage showing how closely what was actually built matches what you described. A score of 100% means your app does exactly what you intended. Lower scores highlight gaps and missing features.' },
  { q: 'Can I use Rismon.ai for free?', a: 'Yes. The free plan includes 1 app, 3 scans per week, full reports, and fix prompts. No credit card required.' },
  { q: 'What kind of issues do you find?', a: 'We find business logic gaps (paid features not locked, wrong user permissions), security issues (exposed API keys, missing auth checks, unprotected database), and unexpected features the AI built without you asking.' },
];

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

const platforms = [
  { name: 'Lovable', logo: lovableLogo },
  { name: 'Bolt', logo: boltLogo },
  { name: 'Cursor', logo: cursorLogo },
  { name: 'Emergent', logo: emergentLogo },
  { name: 'Replit', logo: replitLogo },
  { name: 'v0', logo: v0Logo },
  { name: 'Windsurf', logo: windsurfLogo },
  { name: 'Copilot', logo: copilotLogo },
  { name: 'Claude Code', logo: claudeLogo },
  { name: 'Gemini', logo: geminiLogo },
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
          <h1 className="text-[40px] md:text-[64px] font-bold text-foreground leading-[1.1]">Do you know what your<br />AI actually built?</h1>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] mt-4 text-primary">Made for non-technical founders</p>
          <p className="text-muted-foreground text-lg leading-[1.7] max-w-[560px] mx-auto mt-5">
            Rismon.ai reads your app and tells you exactly what was built, what works, and what could go wrong. Plain English. No code knowledge needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link to="/signup" className="bg-primary text-primary-foreground px-8 py-3.5 rounded-lg text-base font-medium hover:bg-primary/90 transition-colors">Get started free</Link>
            <a href="#how-it-works" className="border border-hover-border text-foreground px-8 py-3.5 rounded-lg text-base font-medium hover:border-muted-foreground/30 transition-colors">See how it works</a>
          </div>
          <p className="text-subtle text-[13px] mt-5">Free to start. No credit card needed.</p>
        </div>

        {/* Platform pills */}
        <div className="mt-12 max-w-[800px] mx-auto">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#3f3f46' }}>Works with every AI coding platform</p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-5">
            {platforms.map((p, i) => (
              <div key={i} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 transition-colors" style={{ background: '#111111', border: '1px solid #1e1e1e' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2e2e2e'; e.currentTarget.style.background = '#161616'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.background = '#111111'; }}>
                <img src={p.logo} alt={p.name} className="w-5 h-5 rounded object-contain" loading="lazy" width={20} height={20} />
                <span className="text-[13px] font-medium text-white">{p.name}</span>
              </div>
            ))}
            <div className="inline-flex items-center rounded-lg px-4 py-2 italic text-[13px]" style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#52525b' }}>
              + more platforms
            </div>
          </div>
        </div>
      </section>

      {/* NOT SURE */}
      <section className="px-6 pb-28">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center">
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold">Not sure? Ask yourself:</h2>
            <p className="text-muted-foreground text-lg max-w-[560px] mx-auto mt-4 leading-[1.7]">
              If you built with AI, do you actually know what it built? Not what you asked for. What was actually built.
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
            <p className="text-muted-foreground">If any of these made you pause,</p>
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
                <p className="text-4xl font-bold" style={{ color: 'rgba(249,115,22,0.3)' }}>{s.n}</p>
                <p className="text-foreground text-[17px] font-semibold mt-3">{s.title}</p>
                <p className="text-muted-foreground text-sm mt-2 whitespace-pre-line">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE FIND */}
      <section id="what-we-check" className="py-[100px] px-6 md:px-10" style={{ background: '#0a0a0a' }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#f97316' }}>WHAT WE FIND</p>
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3 max-w-[600px] mx-auto">Most AI-built apps have at least one of these problems</h2>
            <p className="text-[16px] mt-3" style={{ color: '#71717a' }}>We check for all of them. You might be surprised what we find.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-[60px]">
            {/* Business problems */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#f59e0b' }}>BUSINESS PROBLEMS</p>
              <div className="space-y-3">
                {[
                  { icon: CreditCard, title: 'Paid features that anyone can access', text: 'Your payment exists. The check does not.' },
                  { icon: Shield, title: 'Admin pages open to every user', text: 'Any user can reach your admin panel right now.' },
                  { icon: Users, title: 'Wrong users doing wrong things', text: 'Sellers accessing buyer data. Free users in paid sections.' },
                  { icon: Search, title: 'Features you never asked for', text: 'Your AI built extra things. Do you know what they are?' },
                  { icon: GitBranch, title: 'Code that does not match your vision', text: 'You described one thing. The AI built something slightly different.' },
                ].map((c, i) => (
                  <div key={i} className="p-4 rounded-r-xl" style={{ background: '#111111', borderLeft: '3px solid #f59e0b', border: '1px solid #1e1e1e', borderLeftWidth: '3px', borderLeftColor: '#f59e0b' }}>
                    <div className="flex items-center gap-2">
                      <c.icon size={16} style={{ color: '#f59e0b' }} />
                      <p className="text-foreground text-[15px] font-semibold">{c.title}</p>
                    </div>
                    <p className="text-[13px] mt-1" style={{ color: '#71717a' }}>{c.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Security problems */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#ef4444' }}>SECURITY PROBLEMS</p>
              <div className="space-y-3">
                {[
                  { icon: Key, title: 'API keys exposed in your code', text: 'Your OpenAI or Stripe key is visible to anyone who looks.' },
                  { icon: Database, title: 'User data readable by anyone', text: 'Your database has no protection. All records publicly accessible.' },
                  { icon: Lock, title: 'Private pages with no login check', text: 'Pages that should need login are open to everyone.' },
                  { icon: AlertTriangle, title: 'Secrets hardcoded in code', text: 'Passwords and keys written directly in your files.' },
                  { icon: Globe, title: 'API routes anyone can call', text: 'Your backend has no protection from direct requests.' },
                ].map((c, i) => (
                  <div key={i} className="p-4 rounded-r-xl" style={{ background: '#111111', borderLeft: '3px solid #ef4444', border: '1px solid #1e1e1e', borderLeftWidth: '3px', borderLeftColor: '#ef4444' }}>
                    <div className="flex items-center gap-2">
                      <c.icon size={16} style={{ color: '#ef4444' }} />
                      <p className="text-foreground text-[15px] font-semibold">{c.title}</p>
                    </div>
                    <p className="text-[13px] mt-1" style={{ color: '#71717a' }}>{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-foreground text-[20px] font-semibold">Rismon.ai checks all of these. In 60 seconds.</p>
            <p className="text-[15px] mt-2" style={{ color: '#71717a' }}>For free. No card needed.</p>
            <Link to="/signup" className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg text-sm font-medium mt-6 hover:bg-primary/90 transition-colors">Check my app now</Link>
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
      <section id="pricing" className="py-28 px-6">
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
            <div className="bg-card border border-primary rounded-2xl p-8" style={{ boxShadow: '0 0 40px rgba(249,115,22,0.12)' }}>
              <span className="inline-block text-[11px] px-3 py-1 rounded-full mb-4" style={{ background: 'rgba(249,115,22,0.1)', color: '#fb923c' }}>FOUNDING MEMBER. FIRST 50 ONLY</span>
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


      {/* FAQ */}
      <section id="faq" className="py-28 px-6">
        <div className="max-w-[720px] mx-auto">
          <div className="text-center">
            <p className="text-primary text-xs font-semibold tracking-[0.1em] uppercase">FAQ</p>
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="mt-12">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border">
                <AccordionTrigger className="text-foreground text-[16px] font-medium hover:no-underline hover:text-primary py-5">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-[15px] leading-[1.7]">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-center mt-10">
            <Link to="/signup" className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Get started free</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
