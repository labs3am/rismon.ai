import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Mail, Github, MessageSquare, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Enter a valid email').max(320),
  subject: z.string().trim().max(300).optional(),
  message: z.string().trim().min(1, 'Message is required').max(5000),
});

// Block prompt-injection attempts and suspicious payloads in free-text fields.
// Returns a user-friendly reason if the input looks malicious, else null.
const SUSPICIOUS_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)\b/i, reason: 'Prompt-injection language is not allowed.' },
  { re: /\b(system|developer|assistant)\s*:\s*you\s+are\b/i, reason: 'Prompt-injection language is not allowed.' },
  { re: /\b(jailbreak|DAN mode|do anything now|act as (an? )?(unrestricted|uncensored))\b/i, reason: 'Jailbreak phrasing is not allowed.' },
  { re: /\b(disregard|override|bypass)\s+(your|the)\s+(instructions|guidelines|policies|rules|system prompt)\b/i, reason: 'Prompt-injection language is not allowed.' },
  { re: /\b(reveal|print|show|leak|expose)\s+(your|the)\s+(system\s*prompt|instructions|source\s*code|api[\s-]?key|secret|env|environment)\b/i, reason: 'Requests to reveal internals are not allowed.' },
  { re: /<\s*script[\s>]/i, reason: 'Script tags are not allowed.' },
  { re: /\bjavascript\s*:/i, reason: 'javascript: links are not allowed.' },
  { re: /\bdata:\s*text\/html/i, reason: 'Inline HTML data URLs are not allowed.' },
  { re: /\.(exe|bat|cmd|sh|ps1|msi|apk|dmg|jar|scr|vbs)\b/i, reason: 'Executable file references are not allowed. Describe the issue in text instead.' },
  { re: /\b(?:https?:\/\/|www\.)?(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gid|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at)\/\S+/i, reason: 'Shortened URLs are not allowed — please paste the full link.' },
];

function detectSuspicious(text: string): string | null {
  for (const { re, reason } of SUSPICIOUS_PATTERNS) {
    if (re.test(text)) return reason;
  }
  // Cap on number of links pasted in a single message
  const urls = text.match(/https?:\/\/\S+/gi) ?? [];
  if (urls.length > 3) return 'Too many links in one message — please share at most 3.';
  return null;
}

const COOLDOWN_MS = 30_000;
const COOLDOWN_KEY = 'rismon:contact:lastSent';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: 'Please check the form', description: parsed.error.issues[0]?.message ?? 'Invalid input', variant: 'destructive' });
      return;
    }
    // Block prompt-injection / suspicious payloads in user-controlled free text
    const combined = `${parsed.data.name}\n${parsed.data.subject ?? ''}\n${parsed.data.message}`;
    const suspicious = detectSuspicious(combined);
    if (suspicious) {
      toast({ title: "We can't send that message", description: suspicious, variant: 'destructive' });
      return;
    }
    // Simple client-side cooldown to discourage spammy double-submits
    try {
      const last = Number(localStorage.getItem(COOLDOWN_KEY) ?? '0');
      const wait = COOLDOWN_MS - (Date.now() - last);
      if (wait > 0) {
        toast({ title: 'Please slow down', description: `You can send another message in ${Math.ceil(wait / 1000)}s.`, variant: 'destructive' });
        return;
      }
    } catch { /* localStorage unavailable — ignore */ }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject || null,
        message: parsed.data.message,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      });
      if (error) throw error;
      try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch { /* ignore */ }
      try {
        await supabase.functions.invoke('send-contact-message', {
          body: {
            name: parsed.data.name,
            email: parsed.data.email,
            subject: parsed.data.subject || null,
            message: parsed.data.message,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
          },
        });
      } catch (e) {
        console.warn('send-contact-message failed (message is still saved):', e);
      }
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      toast({ title: "Couldn't send message", description: err?.message ?? 'Please try again in a moment.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: '#0a0a0a',
    border: '1px solid #1a1a1a',
    borderRadius: 16,
    padding: 24,
  };
  const labelStyle: React.CSSProperties = {
    color: '#71717a',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#000',
    border: '1px solid #1f1f1f',
    borderRadius: 8,
    padding: '11px 13px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s ease',
  };
  const fieldLabel: React.CSSProperties = { color: '#a1a1aa', fontSize: 12, fontWeight: 500, marginBottom: 6, display: 'block' };

  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <SEO
        title="Contact Rismon.ai | Talk to the team"
        description="Get in touch with Rismon.ai. Email hello@rismon.ai for support, partnerships, or feedback. We reply within one business day, worldwide."
        canonicalPath="/contact"
      />
      <Navbar />

      <section className="max-w-[760px] mx-auto px-6" style={{ paddingTop: 120, paddingBottom: 80 }}>
        <div style={labelStyle}>Contact</div>
        <h1 className="text-foreground" style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 12, lineHeight: 1.1 }}>
          Talk to the team behind Rismon.ai
        </h1>
        <p style={{ color: '#a1a1aa', fontSize: 17, lineHeight: 1.7, marginTop: 16, maxWidth: 560 }}>
          Questions about a scan, partnership ideas, press, or product feedback — drop us a note below and we'll reply within one business day. Prefer email? Write to <a href="mailto:hello@rismon.ai" style={{ color: '#f97316', textDecoration: 'none' }}>hello@rismon.ai</a>.
        </p>

        {/* Contact form */}
        <form onSubmit={onSubmit} style={{ ...cardStyle, marginTop: 40 }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircle2 size={36} style={{ color: '#22c55e', margin: '0 auto 12px' }} />
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Message sent</div>
              <p style={{ color: '#a1a1aa', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                Thanks for reaching out — we'll get back to you within one business day at the email you provided. You can also reach us anytime at <a href="mailto:hello@rismon.ai" style={{ color: '#f97316', textDecoration: 'none' }}>hello@rismon.ai</a>.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                style={{ marginTop: 18, background: 'transparent', color: '#f97316', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <>
              <div style={labelStyle}>Send us a message</div>
              <div className="grid sm:grid-cols-2 gap-3" style={{ marginTop: 16 }}>
                <div>
                  <label style={fieldLabel} htmlFor="cf-name">Your name</label>
                  <input id="cf-name" type="text" required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Jane Doe" />
                </div>
                <div>
                  <label style={fieldLabel} htmlFor="cf-email">Email</label>
                  <input id="cf-email" type="email" required maxLength={320} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="you@company.com" />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={fieldLabel} htmlFor="cf-subject">Subject <span style={{ color: '#52525b' }}>(optional)</span></label>
                <input id="cf-subject" type="text" maxLength={300} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={inputStyle} placeholder="What's this about?" />
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={fieldLabel} htmlFor="cf-message">Message</label>
                <textarea id="cf-message" required maxLength={5000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={6} style={{ ...inputStyle, resize: 'vertical', minHeight: 120, fontFamily: 'inherit' }} placeholder="Tell us what's on your mind…" />
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: 16,
                  width: '100%',
                  background: submitting ? '#a1a1aa' : '#fff',
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 18px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.15s ease',
                }}
              >
                {submitting ? (<><Loader2 size={16} className="animate-spin" /> Sending…</>) : 'Send message'}
              </button>
              <p style={{ color: '#52525b', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                We use your email only to reply. No marketing, ever.
              </p>
            </>
          )}
        </form>

        <div className="grid sm:grid-cols-2 gap-4" style={{ marginTop: 40 }}>
          <div style={cardStyle}>
            <Mail size={20} style={{ color: '#f97316' }} />
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginTop: 14 }}>Prefer email?</div>
            <div style={{ color: '#a1a1aa', fontSize: 14, marginTop: 4 }}>
              <a href="mailto:hello@rismon.ai" style={{ color: '#f97316', textDecoration: 'none' }}>hello@rismon.ai</a>
            </div>
            <div style={{ color: '#52525b', fontSize: 12, marginTop: 10 }}>Write to us directly — for support, billing, partnerships, and press.</div>
          </div>

          <a href="https://github.com/labs3am/rismon.ai/issues" target="_blank" rel="noopener noreferrer" style={cardStyle} className="block hover:border-white/20 transition-colors">
            <Github size={20} style={{ color: '#f97316' }} />
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginTop: 14 }}>Open source</div>
            <div style={{ color: '#a1a1aa', fontSize: 14, marginTop: 4 }}>github.com/labs3am/rismon.ai</div>
            <div style={{ color: '#52525b', fontSize: 12, marginTop: 10 }}>File bugs, request features, or read the code.</div>
          </a>

          <a href="https://x.com/rismonai" target="_blank" rel="noopener noreferrer" style={cardStyle} className="block hover:border-white/20 transition-colors">
            <MessageSquare size={20} style={{ color: '#f97316' }} />
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginTop: 14 }}>Follow on X</div>
            <div style={{ color: '#a1a1aa', fontSize: 14, marginTop: 4 }}>@rismonai</div>
            <div style={{ color: '#52525b', fontSize: 12, marginTop: 10 }}>Product updates and behind-the-scenes notes.</div>
          </a>

          <div style={cardStyle}>
            <Globe size={20} style={{ color: '#f97316' }} />
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginTop: 14 }}>Where we work</div>
            <div style={{ color: '#a1a1aa', fontSize: 14, marginTop: 4 }}>Remote — serving founders worldwide</div>
            <div style={{ color: '#52525b', fontSize: 12, marginTop: 10 }}>Built by Labs3am. Async-first, always online.</div>
          </div>
        </div>

        <div style={{ ...cardStyle, marginTop: 32 }}>
          <div style={labelStyle}>Response time</div>
          <p style={{ color: '#e4e4e7', fontSize: 15, marginTop: 10, lineHeight: 1.7 }}>
            We aim to reply within <span style={{ color: '#fff', fontWeight: 600 }}>one business day</span>. For urgent security findings on a live production app, mention &quot;urgent&quot; in your subject line and we will prioritize it.
          </p>
        </div>
      </section>

      <Footer />

      {/* ContactPage + Organization with worldwide GEO for AI/GEO search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: 'Contact Rismon.ai',
            url: 'https://rismon.ai/contact',
            description: 'Contact the Rismon.ai team for support, partnerships, or feedback.',
            mainEntity: {
              '@type': 'Organization',
              name: 'Rismon.ai',
              url: 'https://rismon.ai',
              email: 'hello@rismon.ai',
              parentOrganization: { '@type': 'Organization', name: 'Labs3am', url: 'https://labs3am.com' },
              areaServed: { '@type': 'Place', name: 'Worldwide' },
              contactPoint: [
                {
                  '@type': 'ContactPoint',
                  contactType: 'customer support',
                  email: 'hello@rismon.ai',
                  availableLanguage: ['English'],
                  areaServed: 'Worldwide',
                },
                {
                  '@type': 'ContactPoint',
                  contactType: 'sales',
                  email: 'hello@rismon.ai',
                  availableLanguage: ['English'],
                  areaServed: 'Worldwide',
                },
              ],
              sameAs: ['https://github.com/labs3am/rismon.ai', 'https://x.com/rismonai'],
            },
          }),
        }}
      />
    </div>
  );
}