import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goToSection = (id: string) => {
    setOpen(false);
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

  const linkStyle: React.CSSProperties = { color: '#888888', fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s ease', fontWeight: 500 };

  const navStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    height: 64,
    background: scrolled ? 'rgba(0,0,0,0.72)' : '#000000',
    backdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
    WebkitBackdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
    borderBottom: scrolled ? '1px solid #ffffff14' : '1px solid #ffffff08',
    transition: 'background 0.2s ease, border-color 0.2s ease',
  };

  const Logo = () => (
    <Link to="/" className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em' }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f97316', boxShadow: '0 0 12px rgba(249,115,22,0.6)' }} />
      Rismon.ai
    </Link>
  );

  return (
    <nav style={navStyle}>
      <div className="flex h-full items-center justify-between max-w-[1200px] mx-auto" style={{ padding: '0 24px' }}>
        <Logo />

        <div className="hidden md:flex items-center gap-7">
          <button onClick={() => goToSection('how-it-works')} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>How it works</button>
          <button onClick={() => goToSection('what-we-check')} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>What we check</button>
          <Link to="/pricing" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Pricing</Link>
          <button onClick={() => goToSection('security-privacy')} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Security</button>
          <Link to="/blog" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Blog</Link>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/login" style={{ color: '#888888', fontSize: 13, fontWeight: 500, padding: '8px 12px', transition: 'color 0.15s ease' }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Log in</Link>
          <Link to="/signup" style={{ background: '#ffffff', color: '#000000', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, transition: 'background 0.15s ease' }} onMouseEnter={e => (e.currentTarget.style.background = '#e5e5e5')} onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}>Get Started</Link>
        </div>

        <button className="md:hidden" style={{ color: '#ffffff', background: 'transparent', border: 'none' }} onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden flex flex-col gap-1" style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(14px)', borderTop: '1px solid #ffffff10', padding: '12px 24px 18px' }}>
          <button onClick={() => goToSection('how-it-works')} className="text-left" style={{ color: '#a1a1aa', fontSize: 14, padding: '10px 0', background: 'transparent', border: 'none' }}>How it works</button>
          <button onClick={() => goToSection('what-we-check')} className="text-left" style={{ color: '#a1a1aa', fontSize: 14, padding: '10px 0', background: 'transparent', border: 'none' }}>What we check</button>
          <Link to="/pricing" style={{ color: '#a1a1aa', fontSize: 14, padding: '10px 0' }} onClick={() => setOpen(false)}>Pricing</Link>
          <button onClick={() => goToSection('security-privacy')} className="text-left" style={{ color: '#a1a1aa', fontSize: 14, padding: '10px 0', background: 'transparent', border: 'none' }}>Security</button>
          <Link to="/blog" style={{ color: '#a1a1aa', fontSize: 14, padding: '10px 0' }} onClick={() => setOpen(false)}>Blog</Link>
          <Link to="/login" style={{ color: '#a1a1aa', fontSize: 14, padding: '10px 0' }} onClick={() => setOpen(false)}>Log in</Link>
          <Link to="/signup" style={{ background: '#ffffff', color: '#000000', padding: '11px 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, textAlign: 'center', marginTop: 8 }} onClick={() => setOpen(false)}>Get Started</Link>
        </div>
      )}
    </nav>
  );
}
