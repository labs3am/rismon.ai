import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import WaitlistModal from '@/components/WaitlistModal';
import HowWeScore from '@/components/HowWeScore';
import SEO from '@/components/SEO';
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
  { q: "What does Rismon.ai actually do?", a: "It reads your app and tells you what was built, what works, and what is broken, written for founders, not engineers. You also get copy-paste prompts to fix every issue." },
  { q: "Do I need to know how to code?", a: "No. Findings are written for founders, with a real-world example and a ready-to-use fix. If you can read this sentence, you can use Rismon.ai." },
  { q: "How accurate is the report?", a: "Every finding includes the exact file, line number, and code snippet as proof. Claims we cannot verify directly are clearly marked Unverified, never guessed. Connecting Supabase is optional — when you do, we read your real database rules instead of guessing from frontend code." },
  { q: "How long does a scan take?", a: "About 60 seconds for a Quick Scan. A Deep Scan takes 2 to 4 minutes depending on your app size." },
  { q: "Which AI tools do you support?", a: "All of them. Lovable, Bolt, Cursor, Replit, Windsurf, v0, GitHub Copilot, Claude Code, and more. If your code is on GitHub, we can scan it." },
  { q: "What does the free plan include?", a: "One app, three scans per week, the full founder-friendly report, and fix prompts. No credit card needed." },
  { q: "What is the difference between Free and Try Pro?", a: "Free does a Quick Scan of your frontend. Try Pro ($8.99 one time, launching soon) does a Deep Scan of your full app including backend and edge functions, with two AI models verifying every finding." },
  { q: "Will Rismon.ai change my code?", a: "No. We only have read access to your GitHub. We can never edit, delete, or push anything." },
  { q: "Is my code stored anywhere?", a: "No. Your code is read in memory, scanned, and immediately discarded. Only your report is kept in your account." },
  { q: "What if I do not understand my report?", a: "Every finding is written for non-technical founders, with a real-world example and a ready-to-use fix prompt." },
  { q: "Can I cancel anytime?", a: "Yes. Try Pro is a one-time payment. Pro Monthly can be cancelled anytime from your settings." },
];

const personas = [
  { title: "Startup founders", q: "You built a paid app. Are your premium features actually locked for unpaid users, or can anyone access them for free?" },
  { title: "Small business owners", q: "You built a booking system. Can your customers see each other's personal details, or is their data protected?" },
  { title: "Ecommerce builders", q: "You built an online store. Can your customers see other people's orders and payments, or is each order private?" },
  { title: "Freelancers and agencies", q: "You build apps for clients. Can you verify your work is correct before delivery, or are you just guessing?" },
  { title: "Healthcare professionals", q: "You built a patient system. Who can access your patients' private records, only doctors, or everyone?" },
  { title: "Educators and creators", q: "You built a course platform. Can students access paid content without paying, or is it properly secured?" },
];

const steps = [
  { n: "01", title: "Create your account", text: "Sign up with your email. Takes about 30 seconds. No credit card required." },
  { n: "02", title: "Connect your app", text: "Connect your GitHub repository. Read-only access. We never store your code." },
  { n: "03", title: "We analyze your app", text: "Rismon scans your entire codebase and understands what was actually built." },
  { n: "04", title: "Tell us your business", text: "Describe what your app is supposed to do. In your own words, no jargon required." },
  { n: "05", title: "Get your report", text: "Receive a clear report showing every gap, plus exact prompts to fix each issue." },
];

const businessProblems = [
  { title: "Paid features that anyone can access", text: "Your payment exists. The check does not." },
  { title: "Admin pages open to every user", text: "Any user can reach your admin panel right now." },
  { title: "Wrong users doing wrong things", text: "Sellers accessing buyer data. Free users in paid sections." },
  { title: "Features you never asked for", text: "Your AI built extra things. Do you know what they are?" },
  { title: "Code that does not match your vision", text: "You described one thing. The AI built something slightly different." },
];

const securityProblems = [
  { title: "API keys exposed in your code", text: "Your OpenAI or Stripe key is visible to anyone who looks." },
  { title: "User data readable by anyone", text: "Your database has no protection. All records publicly accessible." },
  { title: "Private pages with no login check", text: "Pages that should need login are open to everyone." },
  { title: "Secrets hardcoded in code", text: "Passwords and keys written directly in your files." },
  { title: "API routes anyone can call", text: "Your backend has no protection from direct requests." },
];

const trustItems = [
  { title: "Your code is never stored", text: "Read in memory, sent to AI for analysis, then immediately discarded. Zero code in our database." },
  { title: "Read-only GitHub access", text: "We cannot modify, delete, or push anything to your repository. Read-only. Always." },
  { title: "No IP logging", text: "We do not log or store IP addresses. Our analytics are aggregated country-level only." },
  { title: "Fully open source", text: "Every line of Rismon is on GitHub. Verify our claims yourself. Nothing is hidden." },
  { title: "Session-only tokens", text: "Your GitHub token expires when you close the tab. We never store tokens." },
  { title: "No third-party data sharing", text: "Your analysis results stay in your account. We do not sell or share your data." },
];

const platforms = [
  { name: "Lovable", logo: lovableLogo },
  { name: "Bolt", logo: boltLogo },
  { name: "Cursor", logo: cursorLogo },
  { name: "Emergent", logo: emergentLogo },
  { name: "Replit", logo: replitLogo },
  { name: "v0", logo: v0Logo },
  { name: "Windsurf", logo: windsurfLogo },
  { name: "Copilot", logo: copilotLogo },
  { name: "Claude", logo: claudeLogo },
  { name: "Gemini", logo: geminiLogo },
];

const freeFeatures = ['1 app', '3 scans per week', 'Founder-friendly report', 'Business logic check', 'Security issue check', 'GitHub secret scan', 'Fix prompts for every issue', 'Works with all AI tools'];
const tryProFeatures = ['Everything in Free', 'One Deep Scan (frontend + backend)', 'Two AI models verify findings', 'Investor-ready PDF report', 'Priority queue', 'Priority support'];
const proFeatures = ['Everything in Try Pro', 'Unlimited apps', '25 deep scans per month', 'Scan on every new commit', 'CVE alerts', 'Email + WhatsApp alerts', 'Score history', 'Priority support'];

const SECTION = 'py-[120px] px-6';
const CONTAINER = 'max-w-[1100px] mx-auto';
const LABEL = 'vercel-label';
const HEADLINE = 'vercel-headline';

export default function Index() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: '#000000', color: '#ffffff' }}>
      <SEO
        title="Rismon.ai — Intent Verification for AI-Built Apps"
        description="Scan your AI-built app before you ship. Rismon finds gaps between what you meant to build and what was actually built. Free for non-technical founders."
        canonicalPath="/"
      />
      <AnnouncementBar />
      <Navbar />
      <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      {/* HERO */}
      <section className="text-center" style={{ padding: '80px 24px 120px', background: '#000000' }}>
        <div className="max-w-[800px] mx-auto">
          <span className="vercel-pill">Intent Verification for AI-Built Apps</span>
          <h1 className="vercel-hero-h1">Do you know what your<br />AI actually built?</h1>
          <p className="vercel-hero-sub">
            Most AI-built apps ship with gaps the founder never knew about.
            <br />
            Rismon.ai finds them before your users do.
          </p>
          <p style={{ fontSize: '13px', color: '#555555', marginBottom: '32px' }}>Made for <span style={{ background: '#f97316', color: '#000000', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>non-technical founders</span></p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center" style={{ marginTop: '8px' }}>
            <Link to="/signup" className="vercel-btn-primary">Get started free</Link>
            <Link to="/sample-report" className="vercel-btn-secondary">See a sample report</Link>
          </div>
          <p style={{ fontSize: '13px', color: '#555555', marginTop: '16px' }}>Free forever. No credit card required.</p>
        </div>
      </section>

      {/* PLATFORM MARQUEE */}
      <section style={{ background: '#000000', borderTop: '1px solid #ffffff14', borderBottom: '1px solid #ffffff14', padding: '32px 0' }}>
        <p style={{ fontSize: '12px', color: '#555555', textAlign: 'center', letterSpacing: '0.05em', marginBottom: '20px' }}>
          Works with every AI coding platform
        </p>
        <div className="marquee-mask max-w-[1000px] mx-auto">
          <div className="marquee-track">
            {[...platforms, ...platforms].map((p, i) => (
              <div key={i} className="inline-flex items-center gap-2 px-4 py-2 shrink-0 vercel-platform">
                {p.logo && <img src={p.logo} alt={p.name} className="w-5 h-5 object-contain" loading="lazy" width={20} height={20} />}
                <span style={{ fontSize: '13px', color: '#888888' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PERSONAS */}
      <section className={SECTION} style={{ background: '#000000' }}>
        <div className={CONTAINER}>
          <p className={LABEL}>WHO IT'S FOR</p>
          <h2 className={HEADLINE}>Built for founders who build with AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {personas.map((p, i) => (
              <div key={i} className="vercel-card">
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>{p.title}</p>
                <p style={{ fontSize: '14px', color: '#888888', lineHeight: 1.6 }}>{p.q}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className={SECTION} style={{ background: '#000000', borderTop: '1px solid #ffffff14' }}>
        <div className={CONTAINER}>
          <p className={LABEL}>HOW IT WORKS</p>
          <h2 className={HEADLINE}>Five steps to know your app completely</h2>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden">
            {steps.map((s, i) => (
              <div
                key={i}
                className="relative group p-8 bg-[#000000] hover:bg-[#0a0a0a] transition-colors duration-300"
                style={{ minHeight: '220px' }}
              >
                {/* Step number — large, ghosted background */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '20px',
                    fontSize: '64px',
                    fontWeight: 700,
                    lineHeight: 1,
                    color: '#ffffff',
                    opacity: 0.04,
                    letterSpacing: '-0.04em',
                    pointerEvents: 'none',
                  }}
                >
                  {s.n}
                </span>

                {/* Top accent badge */}
                <div className="flex items-center gap-2 mb-6">
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      background: '#f97316',
                      borderRadius: '50%',
                      boxShadow: '0 0 12px #f97316',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#f97316',
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                    }}
                  >
                    STEP {s.n}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: '#ffffff',
                    marginBottom: '10px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {s.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#888888', lineHeight: 1.65 }}>
                  {s.text}
                </p>

                {/* Bottom hover bar */}
                <span
                  aria-hidden="true"
                  className="absolute left-0 bottom-0 h-[2px] bg-[#f97316] transition-all duration-500 ease-out w-0 group-hover:w-full"
                />
              </div>
            ))}

            {/* Filler tile to balance the 5-step grid on lg (3 cols) */}
            <div className="hidden lg:flex p-8 bg-[#000000] items-center justify-center">
              <div className="text-center">
                <p style={{ fontSize: '11px', color: '#f97316', fontWeight: 600, letterSpacing: '0.14em', marginBottom: '12px' }}>
                  READY?
                </p>
                <Link
                  to="/signup"
                  className="vercel-btn-primary inline-block"
                  style={{ fontSize: '13px' }}
                >
                  Start free scan
                </Link>
                <p style={{ fontSize: '12px', color: '#555555', marginTop: '12px' }}>
                  Takes about 60 seconds
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW WE SCORE, animated diagram */}
      <HowWeScore />

      {/* WHAT WE FIND */}
      <section id="what-we-check" className={SECTION} style={{ background: '#0a0a0a', borderTop: '1px solid #ffffff14' }}>
        <div className={CONTAINER}>
          <p className={LABEL}>WHAT WE FIND</p>
          <h2 className={HEADLINE}>Most AI-built apps have at least one of these problems</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#f97316', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>BUSINESS PROBLEMS</p>
              {businessProblems.map((f, i) => (
                <div key={i} className="vercel-find-item">
                  <p style={{ color: '#ffffff', fontWeight: 500, marginBottom: '4px', fontSize: '15px' }}>{f.title}</p>
                  <p style={{ color: '#555555', fontSize: '13px', lineHeight: 1.5 }}>{f.text}</p>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#f97316', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>SECURITY PROBLEMS</p>
              {securityProblems.map((f, i) => (
                <div key={i} className="vercel-find-item">
                  <p style={{ color: '#ffffff', fontWeight: 500, marginBottom: '4px', fontSize: '15px' }}>{f.title}</p>
                  <p style={{ color: '#555555', fontSize: '13px', lineHeight: 1.5 }}>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center" style={{ marginTop: '48px' }}>
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>Rismon.ai checks all of these. In 60 seconds.</p>
            <p style={{ fontSize: '14px', color: '#555555' }}>For free. No card needed.</p>
          </div>
        </div>
      </section>


      {/* SECURITY */}
      <section id="security-privacy" className={SECTION} style={{ background: '#000000', borderTop: '1px solid #ffffff14' }}>
        <div className={CONTAINER}>
          <p className={LABEL}>SECURITY AND PRIVACY</p>
          <h2 className={HEADLINE}>Your code is yours. We just read it once.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {trustItems.map((item, i) => (
              <div key={i} className="vercel-card">
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>{item.title}</p>
                <p style={{ fontSize: '14px', color: '#888888', lineHeight: 1.6 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className={SECTION} style={{ background: '#0a0a0a', borderTop: '1px solid #ffffff14' }}>
        <div className={CONTAINER}>
          <p className={LABEL}>PRICING</p>
          <h2 className={HEADLINE}>Simple and honest pricing</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 items-stretch">
            {/* FREE */}
            <div className="vercel-pricing-card">
              <p className="vercel-plan-name">FREE</p>
              <p className="vercel-price">$0<span style={{ fontSize: '16px', color: '#888888', fontWeight: 400 }}> / forever</span></p>
              <p style={{ fontSize: '14px', color: '#888888', marginTop: '12px', lineHeight: 1.6 }}>
                Everything a solo founder needs to verify their first AI-built app.
              </p>
              <div className="mt-6 flex-1">
                {freeFeatures.map((f, i) => (
                  <div key={i} className="vercel-feature">
                    <Check size={16} style={{ color: '#f97316', flexShrink: 0 }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/signup" className="vercel-btn-secondary block w-full text-center mt-6">Get started free</Link>
            </div>

            {/* TRY PRO */}
            <div className="vercel-pricing-card vercel-pricing-card--popular">
              <p className="vercel-plan-name">TRY PRO</p>
              <p className="vercel-price">$14.99<span style={{ fontSize: '16px', color: '#888888', fontWeight: 400 }}> / one-time</span></p>
              <p style={{ fontSize: '14px', color: '#888888', marginTop: '12px', lineHeight: 1.6 }}>
                One full Deep Scan on a single app. Use it before launch or an investor demo.
              </p>
              <div className="mt-6 flex-1">
                {tryProFeatures.map((f, i) => (
                  <div key={i} className="vercel-feature">
                    <Check size={16} style={{ color: '#f97316', flexShrink: 0 }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setWaitlistOpen(true)} className="vercel-btn-primary block w-full mt-6">Join Try Pro waitlist</button>
            </div>

            {/* PRO */}
            <div className="vercel-pricing-card">
              <p className="vercel-plan-name">PRO</p>
              <p className="vercel-price">$49<span style={{ fontSize: '16px', color: '#888888', fontWeight: 400 }}> / month</span></p>
              <p style={{ fontSize: '14px', color: '#888888', marginTop: '12px', lineHeight: 1.6 }}>
                For founders shipping serious products. Unlimited apps and continuous monitoring.
              </p>
              <div className="mt-6 flex-1">
                {proFeatures.map((f, i) => (
                  <div key={i} className="vercel-feature">
                    <Check size={16} style={{ color: '#f97316', flexShrink: 0 }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setWaitlistOpen(true)} className="vercel-btn-secondary block w-full mt-6">Join Pro waitlist</button>
            </div>
          </div>
        </div>
      </section>

      {/* WHY WE BUILT THIS */}
      <section className={SECTION} style={{ background: '#000000', borderTop: '1px solid #ffffff14' }}>
        <div className="max-w-[800px] mx-auto text-center">
          <p className={LABEL}>WHY WE BUILT THIS</p>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '32px', lineHeight: 1.2 }}>
            Every founder deserves to understand what they built.
          </h2>
          <div className="max-w-[640px] mx-auto" style={{ fontSize: '16px', color: '#888888', lineHeight: 1.8 }}>
            <p className="mb-4">AI tools have made building software accessible to everyone. Anyone can describe an idea and have a working app in hours.</p>
            <p className="mb-4">But most founders have never seen the code their AI wrote. They do not know what it does. They do not know if it is safe.</p>
            <p>Rismon exists to change that. We read your app. We explain it to you. We tell you what is wrong, with proof. We give you the fix. Every time.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={SECTION} style={{ background: '#0a0a0a', borderTop: '1px solid #ffffff14' }}>
        <div className="max-w-[800px] mx-auto">
          <p className={LABEL}>FAQ</p>
          <h2 className={HEADLINE}>Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-12">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="vercel-faq border-0">
                <AccordionTrigger style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff', padding: '20px 0' }} className="hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent style={{ fontSize: '14px', color: '#888888', lineHeight: 1.6, paddingTop: '12px', paddingBottom: '20px' }}>
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <Footer />
    </div>
  );
}
