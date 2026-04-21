import { Link } from 'react-router-dom';
import { Github, Mail } from 'lucide-react';
import Logo from './Logo';

const XLogo = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const linkCls =
  'text-[13.5px] text-[#888] hover:text-white transition-colors duration-150 w-fit';
const headingCls =
  'text-[11px] font-semibold tracking-[0.12em] uppercase text-[#666] mb-4';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-10 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-5">
            <Logo />
            <p className="text-[13.5px] text-[#888] mt-4 max-w-xs leading-relaxed">
              Rismon reads your AI-built app and tells you what's broken, missing, or
              unsafe — before your users find out.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <a
                href="https://github.com/labs3am/rismon.ai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-9 h-9 flex items-center justify-center rounded-md border border-white/10 text-[#888] hover:text-white hover:border-white/25 transition-colors"
              >
                <Github size={16} />
              </a>
              <a
                href="https://x.com/rismonai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
                className="w-9 h-9 flex items-center justify-center rounded-md border border-white/10 text-[#888] hover:text-white hover:border-white/25 transition-colors"
              >
                <XLogo size={14} />
              </a>
              <a
                href="mailto:hello@rismon.ai"
                aria-label="Email"
                className="w-9 h-9 flex items-center justify-center rounded-md border border-white/10 text-[#888] hover:text-white hover:border-white/25 transition-colors"
              >
                <Mail size={16} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="md:col-span-2">
            <h3 className={headingCls}>Product</h3>
            <ul className="flex flex-col gap-3">
              <li><Link to="/pricing" className={linkCls}>Pricing</Link></li>
              <li><Link to="/sample-report" className={linkCls}>Sample report</Link></li>
              <li><Link to="/signup" className={linkCls}>Get started</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-2">
            <h3 className={headingCls}>Company</h3>
            <ul className="flex flex-col gap-3">
              <li><Link to="/blog" className={linkCls}>Blog</Link></li>
              <li><Link to="/contact" className={linkCls}>Contact</Link></li>
              <li>
                <a
                  href="https://labs3am.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkCls}
                >
                  Labs3am
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-3">
            <h3 className={headingCls}>Legal</h3>
            <ul className="flex flex-col gap-3">
              <li><Link to="/privacy" className={linkCls}>Privacy Policy</Link></li>
              <li><Link to="/terms" className={linkCls}>Terms of Service</Link></li>
              <li>
                <a href="mailto:hello@rismon.ai" className={linkCls}>
                  hello@rismon.ai
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[12.5px] text-[#555]">© 2026 Rismon.ai. All rights reserved.</p>
          <p className="text-[12.5px] text-[#555]">
            Built by{' '}
            <a
              href="https://labs3am.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#888] hover:text-white transition-colors"
            >
              Labs3am
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
