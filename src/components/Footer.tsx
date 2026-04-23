import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Github, Mail } from 'lucide-react';
import Logo from './Logo';

const XLogo = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const linkCls =
  'text-[14px] text-[#555555] hover:text-white transition-colors duration-150 w-fit';
const headingCls =
  'text-[11px] font-semibold tracking-[0.1em] uppercase text-[#333333] mb-5';

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
                color: '#555555',
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
                style={{ color: '#444444', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444444')}
              >
                <Github size={18} />
              </a>
              <a
                href="https://x.com/rismonai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
                style={{ color: '#444444', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444444')}
              >
                <XLogo size={18} />
              </a>
              <a
                href="mailto:hello@rismon.ai"
                aria-label="Email"
                style={{ color: '#444444', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444444')}
              >
                <Mail size={18} />
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
              <li><Link to="/changelog" className={linkCls}>Changelog</Link></li>
              <li><Link to="/open-source" className={linkCls}>Open Source</Link></li>
              <li><Link to="/contact" className={linkCls}>Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-3">
            <h3 className={headingCls}>Legal</h3>
            <ul className="flex flex-col" style={{ lineHeight: 2 }}>
              <li><Link to="/security" className={linkCls}>Security</Link></li>
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
          <p style={{ fontSize: 13, color: '#333333' }}>© 2026 Rismon.ai. All rights reserved.</p>
          <p style={{ fontSize: 13, color: '#333333', whiteSpace: 'nowrap', overflow: 'visible' }}>
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
    </footer>
  );
}
