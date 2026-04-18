import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Store, ShoppingBag, Briefcase, Heart, GraduationCap, CheckCircle, XCircle, CreditCard, Users, Key, Search, GitBranch, AlertTriangle, Database, Lock, Shield, Globe, RefreshCw, MessageSquare, AlertCircle, Wrench, ShieldCheck, Eye, EyeOff, Code2, Timer, Zap, ScanSearch } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WaitlistModal from '@/components/WaitlistModal';
import ParticleBackground from '@/components/ParticleBackground';
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
  { q: "What does Rismon.ai actually do?", a: "It reads your app and tells you in plain English what was built, what works, and what is broken. You also get copy-paste prompts to fix every issue." },
  { q: "Do I need to know how to code?", a: "No. Everything is in plain English. If you can read this sentence, you can use Rismon.ai." },
  { q: "How long does a scan take?", a: "About 60 seconds for a Quick Scan. A Deep Scan takes 2 to 4 minutes depending on your app size." },
  { q: "Which AI tools do you support?", a: "All of them. Lovable, Bolt, Cursor, Replit, Windsurf, v0, GitHub Copilot, Claude Code, and more. If your code is on GitHub, we can scan it." },
  { q: "What does the free plan include?", a: "One app, three scans per week, the full plain English report, and fix prompts. No credit card needed." },
  { q: "What is the difference between Free and Try Pro?", a: "Free does a Quick Scan of your frontend. Try Pro ($8.99 one time, launching soon) does a Deep Scan of your full app including backend and edge functions, with two AI models verifying every finding. Join the waitlist to get early access." },
  { q: "Will Rismon.ai change my code?", a: "No. We only have read access to your GitHub. We can never edit, delete, or push anything. You stay in full control." },
  { q: "Is my code stored anywhere?", a: "No. Your code is read in memory, scanned, and immediately discarded. Nothing is saved to our database. Only your report is kept in your account." },
  { q: "What if I do not understand my report?", a: "Every finding is written for non-technical founders, with a real-world example of what could go wrong and a ready-to-use fix prompt. If you are still stuck, email us." },
  { q: "Can I cancel anytime?", a: "Yes. Try Pro is a one-time payment, no subscription. Pro Monthly can be cancelled anytime from your settings." },
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

const freeFeatures = ['1 app', '3 scans per week', 'Plain English report', 'Business logic check', 'Security issue check', 'GitHub secret scan', 'Fix prompts for every issue', 'Works with all AI tools'];
const freeNotIncluded = ['Backend deep scan', 'Continuous monitoring'];
const tryProFeatures = ['Everything in Free', 'One Deep Scan (frontend + backend)', 'Two AI models verify findings', 'Investor-ready PDF report', 'Priority queue', 'Priority support'];
const tryProNotIncluded = ['Continuous monitoring', 'Unlimited apps and scans'];
const proFeatures = ['Everything in Try Pro', 'Unlimited apps', '25 deep scans per month', 'Scan on every new commit', 'CVE alerts', 'Email + WhatsApp alerts', 'Score history', 'Priority support'];

export default function Index() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

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
          <span className="block mb-4" style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#f97316' }}>
            Intent Verification for AI-Built Apps
          </span>
          <h1 className="text-[40px] md:text-[64px] font-bold text-foreground leading-[1.1]">Do you know what your<br />AI actually built?</h1>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] mt-4 text-primary">Made for non-technical founders</p>
          <p className="text-muted-foreground text-lg leading-[1.7] max-w-[560px] mx-auto mt-5">
            Rismon.ai reads your app and tells you exactly what was built, what works, and what could go wrong. Plain English. No code knowledge needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link to="/signup" className="btn-hero-primary">Get started free</Link>
            <Link to="/sample-report" className="btn-hero-secondary">See a sample report</Link>
          </div>
          <p style={{ fontSize: '13px', color: '#444444', marginTop: '12px' }}>Free forever. No credit card required.</p>
        </div>
      </section>

      <hr className="section-divider" />

      {/* PLATFORM MARQUEE */}
      <section className="pb-28 px-6">
        <p className="text-center mb-5" style={{ fontSize: '12px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Works with every AI coding platform</p>
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

      <hr className="section-divider" />

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
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center">
            <p className="text-primary text-xs font-semibold tracking-[0.1em] uppercase">PRICING</p>
            <h2 className="text-foreground text-[28px] md:text-4xl font-semibold mt-3">Simple and honest pricing</h2>
            <p className="text-muted-foreground text-[15px] mt-3 max-w-[560px] mx-auto">Free forever. Try Pro on one app for $8.99. Go full Pro when you ship serious products.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 items-stretch">
            {/* FREE */}
            <div className="glass-card p-7 flex flex-col">
              <p className="text-foreground text-[26px] font-bold">Free</p>
              <p className="text-muted-foreground mt-1">$0 <span className="text-sm">/ forever</span></p>
              <div className="mt-5">
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.50)', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '4px 10px', display: 'inline-block' }}>QUICK SCAN</span>
                <p className="text-muted-foreground text-[13px] mt-2 leading-relaxed">Everything a solo founder needs to verify their first AI-built app.</p>
              </div>
              <p className="text-foreground text-sm font-semibold mt-6">What you get:</p>
              <div className="mt-4 space-y-2.5">
                {freeFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2"><CheckCircle size={15} className="text-success shrink-0" /><span className="text-muted-foreground text-sm">{f}</span></div>
                ))}
              </div>
              <p className="text-subtle text-xs font-semibold uppercase tracking-wider mt-6">Not included</p>
              <div className="mt-3 space-y-2 flex-1">
                {freeNotIncluded.map((f, i) => (
                  <div key={i} className="flex items-center gap-2"><XCircle size={14} className="shrink-0" style={{ color: '#52525b' }} /><span className="text-sm" style={{ color: '#71717a' }}>{f}</span></div>
                ))}
              </div>
              <Link to="/signup" className="btn-cyber-secondary block w-full mt-6 text-center">Get started free</Link>
            </div>

            {/* TRY PRO — ONE TIME */}
            <div className="glass-card p-7 flex flex-col" style={{ borderColor: 'rgba(249,115,22,0.5)' }}>
              <span className="inline-block text-[11px] px-3 py-1 rounded-full mb-4 self-start" style={{ background: 'rgba(249,115,22,0.1)', color: '#fb923c' }}>MOST POPULAR</span>
              <p className="text-foreground text-[26px] font-bold">Try Pro</p>
              <p className="text-foreground text-2xl font-semibold mt-1">$8.99 <span className="text-muted-foreground text-sm font-normal">/ one-time</span></p>
              <p className="text-subtle text-xs mt-1">Launching soon. Join the waitlist to be first.</p>
              <div className="mt-5">
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#f97316', background: 'transparent', border: '1px solid rgba(249,115,22,0.30)', borderRadius: '4px', padding: '4px 10px', display: 'inline-block' }}>DEEP SCAN · 1 APP</span>
                <p className="text-muted-foreground text-[13px] mt-2 leading-relaxed">One full Deep Scan on a single app. The same analysis Pro users get. Use it before launch or an investor demo.</p>
              </div>
              <p className="text-foreground text-sm font-semibold mt-6">You unlock:</p>
              <div className="mt-4 space-y-2.5">
                {tryProFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2"><CheckCircle size={15} className="text-primary shrink-0" /><span className="text-muted-foreground text-sm">{f}</span></div>
                ))}
              </div>
              <p className="text-subtle text-xs font-semibold uppercase tracking-wider mt-6">Not included</p>
              <div className="mt-3 space-y-2 flex-1">
                {tryProNotIncluded.map((f, i) => (
                  <div key={i} className="flex items-center gap-2"><XCircle size={14} className="shrink-0" style={{ color: '#52525b' }} /><span className="text-sm" style={{ color: '#71717a' }}>{f}</span></div>
                ))}
              </div>
              <button onClick={() => setWaitlistOpen(true)} className="btn-cyber-primary block w-full mt-6">Join Try Pro waitlist</button>
            </div>

            {/* PRO MONTHLY */}
            <div className="glass-card p-7 flex flex-col">
              <p className="text-foreground text-[26px] font-bold">Pro</p>
              <p className="text-foreground text-2xl font-semibold mt-1">$19.90 <span className="text-muted-foreground text-sm font-normal">/ month</span></p>
              <p className="text-subtle text-xs mt-1">Cancel anytime. Coming soon.</p>
              <div className="mt-5">
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#f97316', background: 'transparent', border: '1px solid rgba(249,115,22,0.30)', borderRadius: '4px', padding: '4px 10px', display: 'inline-block' }}>CONTINUOUS MONITORING</span>
                <p className="text-muted-foreground text-[13px] mt-2 leading-relaxed">For founders shipping serious products. Unlimited apps and a fresh scan every time you push code.</p>
              </div>
              <p className="text-foreground text-sm font-semibold mt-6">Everything in Try Pro plus:</p>
              <div className="mt-4 space-y-2.5 flex-1">
                {proFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2"><CheckCircle size={15} className="text-primary shrink-0" /><span className="text-muted-foreground text-sm">{f}</span></div>
                ))}
              </div>
              <button onClick={() => setWaitlistOpen(true)} className="btn-cyber-secondary block w-full mt-6">Join Pro waitlist</button>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-[13px] italic" style={{ color: '#71717a' }}>Quick Scan finds the obvious gaps. Deep Scan finds everything.</p>
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
