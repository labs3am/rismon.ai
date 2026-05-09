import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Github, Mail } from 'lucide-react';
import Logo from './Logo';

const XLogo = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const linkCls =
  'text-[14px] text-[#a3a3a3] hover:text-white transition-colors duration-150 w-fit';
const headingCls =
  'text-[11px] font-semibold tracking-[0.1em] uppercase text-[#e5e5e5] mb-5';

export default function Footer() {
  const location = useLocation();
  const navigate = useNavigate();

  const goToSection = (id: string) => {
    if (location.pathname !== '/') {
      navigate('/#' + id);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer style={{ background: '#000000' }}>
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-10 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-5">
            <Logo />
            <p
              className="mt-4"
              style={{
                fontSize: 14,
                color: '#a3a3a3',
                lineHeight: 1.6,
                maxWidth: 260,
              }}
            >
              Know what your AI actually built. Scan before you ship.
            </p>
            <div className="flex items-center mt-6" style={{ gap: 16 }}>
              <a
                href="https://github.com/labs3am/rismon.ai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                style={{ color: '#888888', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#888888')}
              >
                <Github size={18} />
              </a>
              <a
                href="https://x.com/rismonai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
                style={{ color: '#888888', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#888888')}
              >
                <XLogo size={18} />
              </a>
              <a
                href="mailto:hello@rismon.ai"
                aria-label="Email"
                style={{ color: '#888888', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#888888')}
              >
                <Mail size={18} />
              </a>
            </div>
            {/* Badges */}
            <div className="flex flex-wrap items-center mt-5" style={{ gap: 10 }}>
              <a
                href="https://peerpush.net/p/rismonai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Rismon.ai on PeerPush"
                style={{ display: 'inline-block', opacity: 0.85, transition: 'opacity 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
              >
                <img
                  src="https://peerpush.net/p/rismonai/badge.png"
                  alt="Rismon.ai on PeerPush"
                  width={180}
                  height={39}
                  style={{ width: 180, height: 39, display: 'block', borderRadius: 6 }}
                />
              </a>
              <a
                href="https://www.producthunt.com/products/rismon?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-rismon"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Rismon on Product Hunt"
                style={{ display: 'inline-block', opacity: 0.85, transition: 'opacity 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
              >
                <img
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1131680&theme=neutral&t=1777220069245"
                  alt="Rismon - Did your AI build what you meant? | Product Hunt"
                  width={180}
                  height={39}
                  style={{ width: 180, height: 39, display: 'block' }}
                />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="md:col-span-2">
            <h3 className={headingCls}>Product</h3>
            <ul className="flex flex-col" style={{ lineHeight: 2 }}>
              <li><Link to="/pricing" className={linkCls}>Pricing</Link></li>
              <li><Link to="/sample-report" className={linkCls}>Sample Report</Link></li>
              <li>
                <button
                  onClick={() => goToSection('how-it-works')}
                  className={linkCls}
                  style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                >
                  How it works
                </button>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-2">
            <h3 className={headingCls}>Company</h3>
            <ul className="flex flex-col" style={{ lineHeight: 2 }}>
              <li><Link to="/about" className={linkCls}>About</Link></li>
              <li><Link to="/blog" className={linkCls}>Blog</Link></li>
              <li><Link to="/open-source" className={linkCls}>Open Source</Link></li>
              <li><Link to="/contact" className={linkCls}>Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-3">
            <h3 className={headingCls}>Legal</h3>
            <ul className="flex flex-col" style={{ lineHeight: 2 }}>
              <li><Link to="/security" className={linkCls}>Security</Link></li>
              <li><Link to="/status" className={linkCls}>Status</Link></li>
              <li><Link to="/privacy" className={linkCls}>Privacy Policy</Link></li>
              <li><Link to="/terms" className={linkCls}>Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px solid #111111',
          }}
        >
          <p style={{ fontSize: 13, color: '#888888' }}>© 2026 Rismon.ai. All rights reserved.</p>
          <div className="flex items-center gap-5 sm:justify-end" style={{ flexWrap: 'wrap' }}>
            <Link
              to="/status"
              aria-label="System status: All systems operational"
              className="inline-flex items-center gap-2 rounded-full transition-colors"
              style={{
                fontSize: 12,
                color: '#9ca3af',
                padding: '5px 10px 5px 9px',
                border: '1px solid #1a1a1a',
                background: '#0a0a0a',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#262626'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#1a1a1a'; }}
            >
              <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '9999px',
                    background: '#22c55e',
                    opacity: 0.6,
                    animation: 'ping 1.8s cubic-bezier(0,0,0.2,1) infinite',
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '9999px',
                    background: '#22c55e',
                  }}
                />
              </span>
              All systems operational
            </Link>
            <p style={{ fontSize: 13, color: '#888888', whiteSpace: 'nowrap' }}>
              From the house of{' '}
              <a
                href="https://labs3am.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#f97316', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ea580c')}
                onMouseLeave={e => (e.currentTarget.style.color = '#f97316')}
              >
                Labs3am
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
