import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import HowWeScoreSection from '@/components/HowWeScore';

export default function HowWeScorePage() {
  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <SEO
        title="How we score | Rismon"
        description="The exact math behind every Rismon score. Same input, same score, every time."
        canonical="https://rismon.ai/how-we-score"
      />
      <Navbar />
      <main>
        <HowWeScoreSection />

        <section style={{ background: '#000', borderTop: '1px solid #ffffff14', padding: '96px 24px' }}>
          <div className="max-w-[1100px] mx-auto" style={{ textAlign: 'center' }}>
            <h2 className="vercel-headline" style={{ marginBottom: 24 }}>
              See your real score
            </h2>
            <p style={{ fontSize: 16, color: '#888', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 32px' }}>
              Connect your repo and get a full Deep Scan in about 60 seconds.
            </p>
            <Link
              to="/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#ffffff',
                color: '#000000',
                padding: '14px 24px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 500,
                minHeight: 44,
              }}
            >
              Scan your app free →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
