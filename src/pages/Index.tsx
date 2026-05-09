import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ZoomIn, Lock, Eye, Github, Database, FileCode, ShieldCheck } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import WaitlistModal from '@/components/WaitlistModal';
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
import intentConfirmScreen from '@/assets/screenshots/intent-confirm.webp';
import intentConfirmScreenSm from '@/assets/screenshots/intent-confirm-800.webp';
import intentConfirmScreenFull from '@/assets/screenshots/intent-confirm.png';
import smartQuestionsScreen from '@/assets/screenshots/smart-questions.webp';
import smartQuestionsScreenSm from '@/assets/screenshots/smart-questions-800.webp';
import smartQuestionsScreenFull from '@/assets/screenshots/smart-questions.png';
import intentReportScreen from '@/assets/screenshots/intent-report.webp';
import intentReportScreenSm from '@/assets/screenshots/intent-report-800.webp';
import intentReportScreenFull from '@/assets/screenshots/intent-report.png';

const faqs = [
  {
    q: "What does Rismon do that a normal security scanner doesn't?",
    a: "Rismon verifies intent, not just code. It reads your landing page to learn what you promise, reads your code to see what you actually built, and tells you the gap — features you sell but haven't built, features you built but don't sell, and security holes a generic scanner would miss because they only matter in your specific product context.",
  },
  {
    q: "What's the intent-match score?",
    a: "A 0–100 score that grades how well your shipped code matches the product you advertise. We extract concrete promises from your landing page (e.g. \"sign in with Google\", \"export to PDF\", \"Stripe checkout\") and check whether each one actually exists in your codebase. The score drops for missing promises and for unannounced features that may confuse users or expose risk.",
  },
  {
    q: "How does the scan work, end to end?",
    a: "1) You paste your live URL and connect your GitHub repo. 2) We extract promises from your landing page. 3) Smart Questions: an AI asks you 3–5 things only you can answer (who pays, what's gated, what data is sensitive). 4) We scan your code, cross-reference everything, and produce a report with intent score, security findings, gaps, and copy-paste fix prompts. Most scans finish in under 2 minutes.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. Every finding is written in plain English with a real-world example, why it matters for your business, and a ready-to-paste fix prompt for Lovable, Cursor, Bolt or whatever AI tool you use. The Code Understanding card also gives you a one-paragraph summary of what your app actually is.",
  },
  {
    q: "How accurate are the findings? Can I push back?",
    a: "Every finding includes the exact file, line number and code snippet as proof. If you disagree, hit the Disagree pill on the finding and tell us why — your dispute goes to the Rismon team for review, and your feedback trains the next scan. You can also Agree on findings you've confirmed, so they're easy to track.",
  },
  {
    q: "What's checked beyond security?",
    a: "Intent gaps (promises vs. reality), legal basics (privacy policy, terms, cookie consent), database rules if you connect Supabase, auth and access control, secrets in code, and platform-specific footguns. You also get a plain-English summary of what your app does and what it depends on.",
  },
  {
    q: "Which AI builders and stacks do you support?",
    a: "Any code on GitHub. We're optimised for Lovable, Bolt, Cursor, Replit, Windsurf, v0, GitHub Copilot and Claude Code — fix prompts are tailored to each platform's syntax so you can paste them straight in.",
  },
  {
    q: "What does the free plan include?",
    a: "One app, three scans per week, full intent-match report, security findings, gaps, legal checks, fix prompts and the dispute system. No credit card.",
  },
  {
    q: "What do I get on Pro?",
    a: "Deeper scans of your full stack (backend, edge functions, database rules), unlimited fix prompts, ongoing monitoring of your repo so you're alerted when a new commit breaks something, and priority dispute review. See the Pricing page for the current rate.",
  },
  {
    q: "Will Rismon ever change my code?",
    a: "No. GitHub access is read-only. We can never edit, delete, push or open PRs. Fixes are delivered as prompts you paste yourself — you stay in control of every change.",
  },
  {
    q: "Is my code stored anywhere?",
    a: "No. Your code is read in memory, scanned, and discarded immediately after the report is generated. Only the report (findings, scores, summaries) is saved to your account. The Rismon team can see scan metadata for support but never your code or report contents.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Pro is a monthly subscription you can cancel from Settings at any time — you keep access until the end of the period. One-time scan packs never expire and don't auto-renew.",
  },
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
  { title: "Paid features that anyone can access", text: "Premium features that may not be enforced properly in the logic." },
  { title: "Admin pages open to every user", text: "Admin routes that may not require proper authentication." },
  { title: "Wrong users doing wrong things", text: "Sellers accessing buyer data. Free users in paid sections." },
  { title: "Features you never asked for", text: "Your AI built extra things. Do you know what they are?" },
  { title: "Code that does not match your vision", text: "You described one thing. The AI built something slightly different." },
];

const securityProblems = [
  { title: "API keys exposed in your code", text: "Your OpenAI or Stripe key is visible to anyone who looks." },
  { title: "User data readable by anyone", text: "Database tables that may be accessible without proper rules." },
  { title: "Private pages with no login check", text: "Pages that should need login are open to everyone." },
  { title: "Secrets hardcoded in code", text: "Passwords and keys written directly in your files." },
  { title: "API routes anyone can call", text: "Your backend has no protection from direct requests." },
];

const screenshots = [
  { src: intentConfirmScreen, srcSm: intentConfirmScreenSm, full: intentConfirmScreenFull, alt: "What we read in your code", caption: "See exactly what your AI built — in plain English" },
  { src: smartQuestionsScreen, srcSm: smartQuestionsScreenSm, full: smartQuestionsScreenFull, alt: "Smart questions about your app", caption: "Answer 3 quick questions only you can answer" },
  { src: intentReportScreen, srcSm: intentReportScreenSm, full: intentReportScreenFull, alt: "Your Intent Match report", caption: "Get an Intent Match score with copy-paste fix prompts" },
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

const SECTION = 'py-16 sm:py-20 md:py-[100px] lg:py-[120px] px-5 sm:px-6';
const CONTAINER = 'max-w-[1100px] mx-auto';
const LABEL = 'vercel-label';
const HEADLINE = 'vercel-headline';

export default function Index() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [zoomedImg, setZoomedImg] = useState<{ full: string; placeholder: string } | null>(null);

  const securityItems = [
    { icon: Lock, title: 'Your code is never stored', text: 'Read in memory, sent to AI for analysis, then immediately discarded. Zero code in our database.' },
    { icon: Github, title: 'Read-only GitHub access', text: 'We cannot modify, delete, or push anything to your repository. Read-only. Always.' },
    { icon: Eye, title: 'No IP logging', text: 'We do not log or store IP addresses. Our analytics are aggregated country-level only.' },
    { icon: FileCode, title: 'Fully open source', text: 'Every line of Rismon is on GitHub. Verify our claims yourself. Nothing is hidden.' },
    { icon: ShieldCheck, title: 'Session-only tokens', text: 'Your GitHub token expires when you close the tab. We never store tokens.' },
    { icon: Database, title: 'No third-party data sharing', text: 'Your analysis results stay in your account. We do not sell or share your data.' },
  ];

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
      <section className="text-center px-5 sm:px-6 pt-12 pb-16 sm:pt-16 sm:pb-20 md:pt-20 md:pb-[120px]" style={{ background: '#000000' }}>
        <div className="max-w-[800px] mx-auto">
          <span className="vercel-pill">Built for non-technical founders who build with no-code tools</span>
          <h1 className="vercel-hero-h1">Did your AI build<br />what you meant?</h1>
          <p className="vercel-hero-sub text-center rounded-sm">
            Most founders only discover broken logic, business gaps, or security holes after a real user hits them. Scan with Rismon.ai before shipping to real users.
          </p>
          <div className="vercel-hero-cta-group flex flex-col sm:flex-row gap-3 justify-center" style={{ marginTop: '8px' }}>
            <Link to="/sample-report" className="vercel-btn-primary">See a real report →</Link>
            <Link to="/signup" className="vercel-btn-secondary">Get started free</Link>
          </div>
          <p style={{ fontSize: '13px', color: '#555555', marginTop: '16px' }}>Free. No credit card. No code knowledge needed.</p>
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

      {/* WHAT WE FIND */}
      <section className={SECTION} style={{ background: '#000000', borderTop: '1px solid #ffffff14' }}>
        <div className={CONTAINER}>
          <p className={LABEL}>WHAT WE FIND</p>
          <h2 className={HEADLINE}>Most AI-built apps have at least one of these problems</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-12">
            <div>
              <p style={{ fontSize: 12, color: '#555555', letterSpacing: '0.08em', marginBottom: 20 }}>BUSINESS PROBLEMS</p>
              <div className="flex flex-col gap-3">
                {businessProblems.map((p, i) => (
                  <div key={i} className="vercel-card">
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>{p.title}</p>
                    <p style={{ fontSize: '14px', color: '#888888', lineHeight: 1.6 }}>{p.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, color: '#555555', letterSpacing: '0.08em', marginBottom: 20 }}>SECURITY PROBLEMS</p>
              <div className="flex flex-col gap-3">
                {securityProblems.map((p, i) => (
                  <div key={i} className="vercel-card">
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>{p.title}</p>
                    <p style={{ fontSize: '14px', color: '#888888', lineHeight: 1.6 }}>{p.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCREENSHOTS */}
      <section id="how-it-works" className={SECTION} style={{ background: '#0a0a0a', borderTop: '1px solid #ffffff14' }}>
        <div className={CONTAINER}>
          <p className={LABEL}>PREVIEW</p>
          <h2 className={HEADLINE}>What you will see</h2>
          <p style={{ fontSize: 16, color: '#888888', textAlign: 'center', lineHeight: 1.7, maxWidth: 640, margin: '16px auto 0' }}>
            Three steps. Under 2 minutes. Click any screenshot to zoom in.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {screenshots.map((s, i) => (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setZoomedImg({ full: s.src, placeholder: s.srcSm })}
                  onMouseEnter={() => { const i = new Image(); i.src = s.src; }}
                  aria-label={`Zoom ${s.alt}`}
                  className="group relative block w-full"
                  style={{
                    background: '#000',
                    border: '1px solid #141414',
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px -20px rgba(0,0,0,0.6)',
                    aspectRatio: '4 / 3',
                    cursor: 'zoom-in',
                    padding: 0,
                  }}
                >
                  <picture>
                    <source media="(max-width: 768px)" srcSet={s.srcSm} type="image/webp" />
                    <source srcSet={s.src} type="image/webp" />
                    <img
                      src={s.src}
                      alt={s.alt}
                      loading="lazy"
                      decoding="async"
                      width={1200}
                      height={900}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                    />
                  </picture>
                  <span
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 8px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fff' }}
                  >
                    <ZoomIn size={12} /> Zoom
                  </span>
                </button>
                <p style={{ fontSize: 13, color: '#888888', textAlign: 'center', marginTop: 14, lineHeight: 1.5, letterSpacing: '0.02em' }}>
                  <span style={{ color: '#555' }}>0{i + 1} — </span>{s.caption}
                </p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 14, color: '#888888', textAlign: 'center', marginTop: 40, lineHeight: 1.6 }}>
            <Link to="/sample-report" style={{ color: '#ffffff', textDecoration: 'underline' }}>
              See the full sample report →
            </Link>
          </p>
        </div>
      </section>

      {/* PERSONAS */}
      <section className={SECTION} style={{ background: '#000000', borderTop: '1px solid #ffffff14' }}>
        <div className={CONTAINER}>
          <p className={LABEL}>WHO IT'S FOR</p>
          <h2 className={HEADLINE}>Built for founders who build with AI</h2>
          <p style={{ fontSize: 16, color: '#888888', textAlign: 'center', lineHeight: 1.7, maxWidth: 640, margin: '16px auto 0' }}>
            If you ship products built with AI tools, one of these is probably you.
          </p>
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

      {/* SECURITY AND PRIVACY */}
      <section className={SECTION} style={{ background: '#0a0a0a', borderTop: '1px solid #ffffff14' }}>
        <div className={CONTAINER}>
          <p className={LABEL}>SECURITY AND PRIVACY</p>
          <h2 className={HEADLINE}>Your code is yours.<br />We just read it once.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {securityItems.map((s, i) => (
              <div key={i} className="vercel-card">
                <s.icon size={18} style={{ color: '#f97316', marginBottom: 12 }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '10px' }}>{s.title}</p>
                <p style={{ fontSize: '14px', color: '#888888', lineHeight: 1.6 }}>{s.text}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link to="/security" className="vercel-btn-secondary">Learn more about our security →</Link>
            <Link to="/open-source" className="vercel-btn-secondary" style={{ border: 'none', background: 'transparent' }}>We're open source →</Link>
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

      {/* HOW WE SCORE LINK */}
      <section style={{ background: '#000000', padding: '24px 20px', borderTop: '1px solid #ffffff14' }}>
        <p style={{ fontSize: 13, color: '#555555', textAlign: 'center', lineHeight: 1.6 }}>
          Want to understand how we score?{' '}
          <Link to="/how-we-score" style={{ color: '#888888', textDecoration: 'underline' }}>
            Read our scoring methodology →
          </Link>
        </p>
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

      <Dialog open={!!zoomedImg} onOpenChange={(o) => !o && setZoomedImg(null)}>
        <DialogContent
          className="border-0 p-0 bg-transparent shadow-none max-w-[98vw] sm:max-w-[92vw] md:max-w-[85vw] w-auto"
          style={{ background: 'transparent' }}
        >
          {zoomedImg && (
            <div
              style={{
                background: '#000',
                borderRadius: 12,
                overflow: 'auto',
                maxHeight: '90vh',
                border: '1px solid #1a1a1a',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-x pan-y pinch-zoom',
              }}
            >
              <img
                src={zoomedImg.full}
                alt="Zoomed screenshot"
                decoding="async"
                style={{
                  display: 'block',
                  // On mobile: render at intrinsic size so users can pan/scroll to "zoom in".
                  // On desktop: fit to dialog width.
                  width: 'max(100%, 1400px)',
                  height: 'auto',
                  maxWidth: 'none',
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
