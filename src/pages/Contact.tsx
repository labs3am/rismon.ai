import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Mail, Github, MessageSquare, Globe } from 'lucide-react';

export default function Contact() {
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
          Questions about a scan, partnership ideas, press, or product feedback — we read every email and reply within one business day.
        </p>

        <div className="grid sm:grid-cols-2 gap-4" style={{ marginTop: 40 }}>
          <a href="mailto:hello@rismon.ai" style={cardStyle} className="block hover:border-white/20 transition-colors">
            <Mail size={20} style={{ color: '#f97316' }} />
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginTop: 14 }}>Email us</div>
            <div style={{ color: '#a1a1aa', fontSize: 14, marginTop: 4 }}>hello@rismon.ai</div>
            <div style={{ color: '#52525b', fontSize: 12, marginTop: 10 }}>For support, billing, partnerships, and press.</div>
          </a>

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