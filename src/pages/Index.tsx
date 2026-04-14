import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Store, ShoppingBag, Briefcase, Heart, GraduationCap, CheckCircle, CreditCard, Users, Key, Search, GitBranch, AlertTriangle, Database, Lock, Shield, Globe, RefreshCw, MessageSquare, AlertCircle, Wrench, ShieldCheck, Eye, EyeOff, Code2, Timer, Zap, ScanSearch } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WaitlistModal from '@/components/WaitlistModal';
import ParticleBackground from '@/components/ParticleBackground';
import { supabase } from '@/integrations/supabase/client';
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
  { q: "I built an app with AI — how do I know it actually works?", a: "That's exactly what Rismon.ai is built for. Connect your GitHub repo, describe what your app should do in plain English, and we compare your intent with what was actually built. You get a clear report showing what works, what's missing, and what needs fixing." },
  { q: "Can users access paid features without paying?", a: "This is one of the most common issues we find. AI tools often forget to properly lock premium features. Rismon.ai detects these gaps and gives you ready-to-use prompts to fix them." },
  { q: "Is my users' data actually protected?", a: "We check if your database has proper access controls, if sensitive routes require authentication, and whether users can access each other's data. These are critical issues that AI tools often miss." },
  { q: "Do I need to know how to code?", a: "Not at all. Rismon.ai is designed for non-technical founders. Everything is explained in plain English — no jargon, no code. Just describe your app like you would to a friend." },
  { q: "What AI coding tools does this support?", a: "All major tools. Lovable, Bolt, Cursor, Replit, Windsurf, v0, GitHub Copilot, Claude Code, and more. If your code is on GitHub, we can analyze it." },
  { q: "How long does the analysis take?", a: "Around 60 seconds. Connect your repo, answer a few simple questions, and get a full report with an intent match score, security audit, and fix suggestions." },
  { q: "Is it free?", a: "Yes. The free plan includes one app, three scans per week, full reports, and fix prompts. No credit card required." },
  { q: "Is my source code safe?", a: "Yes. We use read-only GitHub access, so we cannot modify your code. Your code is analyzed in memory and immediately discarded. Nothing is stored." },
  { q: "Do you track my IP address?", a: "No. We do not log or store IP addresses. We only use aggregated, non-identifiable analytics." },
  { q: "Can I verify your privacy claims?", a: "Yes. Our entire codebase is open source on GitHub. You can review exactly how your data is handled." }
];

const personas = [
  { icon: Rocket, title: "Startup founders", q: "You built a paid app.\nAre your premium features actually locked for unpaid users?\nOr can anyone access them for free?" },
  { icon: Store, title: "Small business owners", q: "You built a booking system.\nCan your customers see each other's personal details?\nOr is their data protected?" },
  { icon: ShoppingBag, title: "Ecommerce builders", q: "You built an online store.\nCan your customers see other people's orders and payments?\nOr is each order private?" },
  { icon: Briefcase, title: "Freelancers and agencies", q: "You build apps for clients.\nCan you verify your work is correct before delivery?\nOr are you just guessing?" },
  { icon: Heart, title: "Healthcare professionals", q: "You built a patient system.\nWho can access your patients' private records?\nOnly doctors, or everyone?" },
  { icon: GraduationCap, title: "Educators and creators", q: "You built a course platform.\nCan students access paid content without paying?\nOr is it properly secured?" }
];

const steps = [
  { n: "01", title: "Create your account", text: "Sign up with your email.\nTakes about 30 seconds.\nNo credit card required." },
  { n: "02", title: "Connect your app", text: "Connect your GitHub repository.\nRead-only access.\nWe never store your code." },
  { n: "03", title: "We analyze your app", text: "Rismon.ai scans your entire codebase\nand understands what was actually built." },
  { n: "04", title: "Tell us your business", text: "Describe what your app is supposed to do.\nJust use plain English." },
  { n: "05", title: "Get your report", text: "Receive a clear report showing every gap,\nplus exact prompts to fix each issue." }
];

const marquePlatforms = [
  { name: "Lovable", logo: lovableLogo },
  { name: "Bolt", logo: boltLogo },
  { name: "Cursor", logo: cursorLogo },
  { name: "Emergent", logo: emergentLogo },
  { name: "Replit", logo: replitLogo },
  { name: "v0 by Vercel", logo: v0Logo },
  { name: "Windsurf", logo: windsurfLogo },
  { name: "GitHub Copilot", logo: copilotLogo },
  { name: "Claude Code", logo: claudeLogo },
  { name: "Google Gemini", logo: geminiLogo },
  { name: "Devin", logo: null },
  { name: "Codeium", logo: null },
];

const freeFeatures = ['1 app included', '3 scans per week', 'Full plain English report', 'Business logic verification', 'Security issue detection', 'GitHub secret scan', 'Fix prompts for every issue', 'Works with all AI platforms'];
const proFeatures = ['Deep Scan', 'Unlimited apps', 'Unlimited scans', 'Daily automatic scan', 'New commit scan', 'CVE vulnerability alerts', 'WhatsApp and email alerts', 'Score history and trends', 'Investor ready PDF report', 'Business type deep scan', 'Automatic security updates', 'Priority support'];

export default function Index() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [stats, setStats] = useState<{ users: number; apps: number; scans: number } | null>(null);

  useEffect(() => {
    supabase.functions.invoke('public-stats').then(({ data }) => {
      if (data) setStats(data);
    });
  }, []);

  const doubled = [...marquePlatforms, ...marquePlatforms];

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <div className="relative z-10">
      <Navbar />
      <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      {/* HERO */}
      <section className="pt-40 pb-16 px-6 text-center relative">
        <div className="max-w-[800px] mx-auto relative">
          <h1 className="text-[40px] md:text-[64px] font-bold text-foreground leading-[1.1]">Do you know what your<br />AI actually built?</h1>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] mt-4 text-primary">Made for non-technical founders</p>
          <p className="text-muted-foreground text-lg leading-[1.7] max-w-[560px] mx-auto mt-5">
            Rismon.ai reads your app and tells you exactly what was built, what works, and what could go wrong. Plain English. No code knowledge needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link to="/signup" className="btn-cyber-primary btn-cyber-primary-pulse">Get started free</Link>
            <Link to="/sample-report" className="btn-cyber-secondary">See a sample report</Link>
          </div>
          <p className="text-subtle text-[13px] mt-5">Free to start. No credit card needed.</p>

          {/* Live stats */}
          {stats && (stats.users > 0 || stats.apps > 0 || stats.scans > 0) && (
            <div className="flex items-center justify-center gap-8 mt-10">
              {stats.users > 0 && (
                <div className="text-center">
                  <p className="text-foreground text-xl font-bold">{stats.users}</p>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-[0.1em] mt-0.5">Founders</p>
                </div>
              )}
              {stats.apps > 0 && (
                <div className="text-center">
                  <p className="text-foreground text-xl font-bold">{stats.apps}</p>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-[0.1em] mt-0.5">Apps connected</p>
                </div>
              )}
              {stats.scans > 0 && (
                <div className="text-center">
                  <p className="text-foreground text-xl font-bold">{stats.scans}</p>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-[0.1em] mt-0.5">Scans run</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* PLATFORM MARQUEE */}
      <section className="pb-28 px-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-center mb-5" style={{ color: '#3f3f46' }}>Works with every AI coding platform</p>
        <div className="marquee-mask max-w-[900px] mx-auto">
          <div className="marquee-track">
            {doubled.map((p, i) => (
              <div key={i} className="inline-flex items-center gap-2 rounded-full px-4 py-2 shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(249,115,22,0.20)' }}>
                {p.logo ? (
                  <img src={p.logo} alt={p.name} className="w-5 h-5 rounded object-contain" loading="lazy" width={20} height={20} />
                ) : (
                  <div className="w-5 h-5 rounded" style={{ background: 'rgba(249,115,22,0.2)' }} />
                )}
                <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOT SURE */}
      <section className="cyber-section px-6 pb-28 pt-28">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center">
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold">Not sure? Ask yourself:</h2>
            <p className="text-muted-foreground text-lg max-w-[560px] mx-auto mt-4 leading-[1.7]">
              If you built with AI, do you actually know what it built? Not what you asked for. What was actually built.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
            {personas.map((p, i) => (
              <div key={i} className="glass-card p-7">
                <p.icon size={24} className="text-primary" />
                <p className="text-foreground text-[17px] font-semibold mt-4">{p.title}</p>
                <p className="text-muted-foreground text-[15px] mt-2 whitespace-pre-line">{p.q}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-muted-foreground">If any of these made you pause,</p>
            <p className="text-foreground text-xl font-semibold mt-2">Rismon.ai was built for you.</p>
            <Link to="/signup" className="btn-cyber-primary mt-6 inline-block">Check your app free</Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="cyber-section py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center">
            <p className="text-primary text-xs font-semibold tracking-[0.1em] uppercase">HOW IT WORKS</p>
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3">Five steps to know your app completely</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-14">
            {steps.map((s, i) => (
              <div key={i} className="glass-card p-5">
                <p className="text-4xl font-bold" style={{ color: 'rgba(249,115,22,0.3)' }}>{s.n}</p>
                <p className="text-foreground text-[17px] font-semibold mt-3">{s.title}</p>
                <p className="text-muted-foreground text-sm mt-2 whitespace-pre-line">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE FIND */}
      <section id="what-we-check" className="cyber-section py-[100px] px-6 md:px-10">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#f97316' }}>WHAT WE FIND</p>
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3 max-w-[600px] mx-auto">Most AI-built apps have at least one of these problems</h2>
            <p className="text-[16px] mt-3" style={{ color: '#71717a' }}>We check for all of them. You might be surprised what we find.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-[60px]">
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
                  <div key={i} className="glass-card p-4" style={{ borderLeft: '3px solid #f59e0b', borderRadius: '0 12px 12px 0' }}>
                    <div className="flex items-center gap-2">
                      <c.icon size={16} style={{ color: '#f59e0b' }} />
                      <p className="text-foreground text-[15px] font-semibold">{c.title}</p>
                    </div>
                    <p className="text-[13px] mt-1" style={{ color: '#71717a' }}>{c.text}</p>
                  </div>
                ))}
              </div>
            </div>

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
                  <div key={i} className="glass-card p-4" style={{ borderLeft: '3px solid #ef4444', borderRadius: '0 12px 12px 0' }}>
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
            <Link to="/signup" className="btn-cyber-primary mt-6 inline-block">Check my app now</Link>
          </div>
        </div>
      </section>

      {/* PLAIN ENGLISH */}
      <section className="cyber-section py-24 px-6">
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
              <div key={i} className="glass-card p-6 text-center">
                <item.icon size={32} className="text-primary mx-auto" />
                <p className="text-foreground font-semibold mt-4">{item.title}</p>
                <p className="text-muted-foreground text-sm mt-2">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY & PRIVACY */}
      <section id="security-privacy" className="cyber-section py-24 px-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">SECURITY & PRIVACY</p>
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3">Your code is yours. We just read it once.</h2>
            <p className="text-muted-foreground text-lg max-w-[560px] mx-auto mt-4 leading-[1.7]">
              We built Rismon.ai with privacy as the foundation. Here is exactly how your data is handled.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14">
            {[
              { icon: EyeOff, title: 'Your code is never stored', text: 'Read in memory, sent to AI for analysis, then immediately discarded. Zero code in our database.' },
              { icon: Eye, title: 'Read-only GitHub access', text: 'We cannot modify, delete, or push anything to your repository. Read-only. Always.' },
              { icon: ShieldCheck, title: 'No IP logging', text: 'We do not log or store IP addresses. Our analytics are aggregated country-level only.' },
              { icon: Code2, title: 'Fully open source', text: 'Every line of Rismon.ai is on GitHub. Verify our claims yourself. Nothing is hidden.' },
              { icon: Timer, title: 'Session-only tokens', text: 'Your GitHub token expires when you close the tab. We never store tokens in our database.' },
              { icon: Lock, title: 'No third-party data sharing', text: 'Your analysis results stay in your account. We do not sell or share your data with anyone.' },
            ].map((item, i) => (
              <div key={i} className="glass-card p-5">
                <item.icon size={22} className="text-primary" />
                <p className="text-foreground text-[15px] font-semibold mt-3">{item.title}</p>
                <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: '#71717a' }}>{item.text}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="https://github.com/labs3am/rismon.ai" target="_blank" rel="noopener noreferrer" className="text-primary text-sm font-medium hover:underline">
              View our source code on GitHub →
            </a>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="cyber-section py-28 px-6">
        <div className="max-w-[960px] mx-auto">
          <div className="text-center">
            <p className="text-primary text-xs font-semibold tracking-[0.1em] uppercase">PRICING</p>
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3">Simple and honest pricing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="glass-card p-8">
              <p className="text-foreground text-[28px] font-bold">Free</p>
              <p className="text-muted-foreground mt-1">$0 / forever</p>
              <div className="mt-6">
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.50)', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '4px 10px', display: 'inline-block' }}>QUICK SCAN</span>
                <p className="text-muted-foreground text-[13px] mt-2 leading-relaxed">Analyzes your most critical files and catches the issues that matter most.</p>
              </div>
              <p className="text-foreground text-sm font-semibold mt-6">What you get:</p>
              <div className="mt-4 space-y-2.5">
                {freeFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2"><CheckCircle size={15} className="text-success shrink-0" /><span className="text-muted-foreground text-sm">{f}</span></div>
                ))}
              </div>
              <div className="border-t border-border my-6" />
              <p className="text-muted-foreground text-sm">Perfect for founders verifying their first AI-built app</p>
              <Link to="/signup" className="btn-cyber-primary block w-full mt-6">Get started free</Link>
            </div>

            {/* Centered tagline between cards - visible on mobile between, on desktop as absolute overlay */}
            <div className="md:hidden text-center py-2">
              <p className="text-[13px] italic" style={{ color: '#71717a' }}>Quick Scan finds the obvious gaps. Deep Scan finds everything else.</p>
            </div>

            <div className="glass-card p-8" style={{ borderColor: 'rgba(249,115,22,0.5)' }}>
              <span className="inline-block text-[11px] px-3 py-1 rounded-full mb-4" style={{ background: 'rgba(249,115,22,0.1)', color: '#fb923c' }}>FOUNDING MEMBER. FIRST 50 ONLY</span>
              <p className="text-foreground text-[28px] font-bold">Pro</p>
              <p className="text-foreground text-2xl font-semibold mt-1">$12/month</p>
              <p className="text-muted-foreground text-sm mt-1">or $10/month billed quarterly</p>
              <p className="text-subtle text-xs mt-1">Regular price $18 after first 50</p>
              <div className="mt-6">
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#f97316', background: 'transparent', border: '1px solid rgba(249,115,22,0.30)', borderRadius: '4px', padding: '4px 10px', display: 'inline-block' }}>DEEP SCAN</span>
                <p className="text-muted-foreground text-[13px] mt-2 leading-relaxed">Full codebase. Every file. Every route. Every business logic gap. Nothing missed.</p>
              </div>
              <p className="text-foreground text-sm font-semibold mt-6">Everything in free plus:</p>
              <div className="mt-4 space-y-2.5">
                {proFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2"><CheckCircle size={15} className="text-primary shrink-0" /><span className="text-muted-foreground text-sm">{f}</span></div>
                ))}
              </div>
              <div className="border-t border-border my-6" />
              <p className="text-muted-foreground text-sm">Perfect for founders with real users who can't afford to miss anything</p>
              <button onClick={() => setWaitlistOpen(true)} className="btn-cyber-primary btn-cyber-primary-pulse block w-full mt-6">Join founding member waitlist</button>
            </div>
          </div>
          {/* Centered tagline - desktop only */}
          <div className="hidden md:block text-center mt-6">
            <p className="text-[13px] italic" style={{ color: '#71717a' }}>Quick Scan finds the obvious gaps. Deep Scan finds everything else.</p>
          </div>
        </div>
      </section>

      {/* WHY WE BUILT THIS */}
      <section className="cyber-section py-28 px-6">
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-primary text-xs font-semibold tracking-[0.1em] uppercase">WHY WE BUILT THIS</p>
          <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3">Every founder deserves to understand what they built</h2>
          <p className="text-muted-foreground text-base leading-[1.8] mt-6 text-left">
            AI tools have made building software accessible to everyone. Anyone can now describe an idea and have a working app in hours. But most of these founders have never seen the code their AI wrote. They do not know what it does. They do not know if it is safe. Rismon.ai exists to change that. We read your app. We explain it to you. We tell you what is wrong. We give you the fix. In plain English. Every time.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="cyber-section py-28 px-6">
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
            <Link to="/signup" className="btn-cyber-primary mt-6 inline-block">Get started free</Link>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  );
}
