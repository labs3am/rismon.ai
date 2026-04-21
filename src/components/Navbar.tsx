import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from './Logo';

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

  const linkStyle: React.CSSProperties = {
    color: '#888888',
    fontSize: 13.5,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 0.15s ease',
    fontWeight: 450,
    letterSpacing: '-0.005em',
  };

  const isActive = (path: string) => location.pathname === path;
  const activeStyle: React.CSSProperties = { color: '#ffffff', fontWeight: 500 };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 64,
        background: scrolled ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.4)',
        backdropFilter: 'saturate(180%) blur(16px)',
        WebkitBackdropFilter: 'saturate(180%) blur(16px)',
        borderBottom: scrolled ? '1px solid #ffffff14' : '1px solid transparent',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div className="flex h-full items-center justify-between max-w-[1200px] mx-auto" style={{ padding: '0 24px' }}>
        <div className="hidden md:flex items-center gap-6">
          <Logo />
          <div className="flex items-center gap-5">
            <button onClick={() => goToSection('how-it-works')} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>How it works</button>
            <button onClick={() => goToSection('what-we-check')} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>What we find</button>
            <Link to="/pricing" style={isActive('/pricing') ? { ...linkStyle, ...activeStyle } : linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = isActive('/pricing') ? '#ffffff' : '#888888')}>Pricing</Link>
            <button onClick={() => goToSection('security-privacy')} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Security</button>
            <Link to="/blog" style={isActive('/blog') ? { ...linkStyle, ...activeStyle } : linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = isActive('/blog') ? '#ffffff' : '#888888')}>Blog</Link>
          </div>
        </div>

        <div className="md:hidden">
          <Logo />
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" style={{ color: '#888888', fontSize: 13.5, transition: 'color 0.15s ease', fontWeight: 450 }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Log in</Link>
          <Link
            to="/signup"
            style={{
              background: '#ffffff',
              color: '#000000',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 13.5,
              fontWeight: 500,
              transition: 'background 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e5e5e5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
          >
            Get Started
          </Link>
        </div>

        <button className="md:hidden" style={{ color: '#ffffff', background: 'transparent', border: 'none' }} onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden flex flex-col gap-2" style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid #ffffff10', padding: '16px 24px' }}>
          <button onClick={() => goToSection('how-it-works')} className="text-left" style={{ color: '#888888', fontSize: 14, padding: '10px 0', background: 'transparent', border: 'none' }}>How it works</button>
          <button onClick={() => goToSection('what-we-check')} className="text-left" style={{ color: '#888888', fontSize: 14, padding: '10px 0', background: 'transparent', border: 'none' }}>What we find</button>
          <Link to="/pricing" style={{ color: '#a3a3a3', fontSize: 14, padding: '10px 0' }} onClick={() => setOpen(false)}>Pricing</Link>
          <button onClick={() => goToSection('security-privacy')} className="text-left" style={{ color: '#a3a3a3', fontSize: 14, padding: '10px 0', background: 'transparent', border: 'none' }}>Security</button>
          <Link to="/blog" style={{ color: '#a3a3a3', fontSize: 14, padding: '10px 0' }} onClick={() => setOpen(false)}>Blog</Link>
          <div style={{ height: 1, background: '#ffffff10', margin: '8px 0' }} />
          <Link to="/login" style={{ color: '#a3a3a3', fontSize: 14, padding: '10px 0' }} onClick={() => setOpen(false)}>Log in</Link>
          <Link to="/signup" style={{ background: '#ffffff', color: '#000000', padding: '12px 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, textAlign: 'center', marginTop: 4 }} onClick={() => setOpen(false)}>Get Started</Link>
        </div>
      )}
    </nav>
  );
}
