import { Link } from 'react-router-dom';
import { Github, Mail } from 'lucide-react';

const XLogo = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function Footer() {
  const linkStyle = { color: '#888888', fontSize: 14, transition: 'color 0.15s ease' } as const;
  const onEnter = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = '#ffffff');
  const onLeave = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = '#888888');

  return (
    <footer style={{ background: '#000000', borderTop: '1px solid #ffffff14', padding: '48px 24px' }}>
      <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-8">
        <div>
          <p style={{ color: '#ffffff', fontWeight: 600, fontSize: 16 }}>Rismon.ai</p>
          <p style={{ color: '#555555', fontSize: 13, marginTop: 8 }}>
            From the house of{' '}
            <a href="https://labs3am.com" target="_blank" rel="noopener noreferrer" style={{ color: '#888888' }} className="hover:underline">Labs3am</a>
          </p>
          <div className="flex items-center gap-3 mt-4">
            <a href="https://github.com/labs3am/rismon.ai" target="_blank" rel="noopener noreferrer" aria-label="GitHub" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
              <Github size={18} />
            </a>
            <a href="https://x.com/rismonai" target="_blank" rel="noopener noreferrer" aria-label="X" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
              <XLogo size={16} />
            </a>
            <a href="mailto:hello@rismon.ai" aria-label="Email" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
              <Mail size={18} />
            </a>
          </div>
          <p style={{ color: '#444444', fontSize: 13, marginTop: 16 }}>© 2026 Rismon.ai</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link to="/blog" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>Blog</Link>
          <Link to="/privacy" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>Privacy Policy</Link>
          <Link to="/terms" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>Terms of Service</Link>
          <a href="mailto:hello@rismon.ai" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>hello@rismon.ai</a>
        </div>
      </div>
    </footer>
  );
}
