import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from './Logo';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 64,
        background: '#000000',
        borderBottom: scrolled ? '1px solid #1a1a1a' : '1px solid transparent',
        transition: 'border-color 0.25s ease',
      }}
    >
      <div className="flex h-full items-center justify-between max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="hidden md:flex items-center gap-6">
          <Logo />
          <div className="flex items-center gap-5">
            <Link to="/blog" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Blog</Link>
            <Link to="/security" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Security</Link>
            <Link to="/contact" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Contact</Link>
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

        <button
          className="md:hidden inline-flex items-center justify-center"
          style={{ width: 44, height: 44, color: '#ffffff', background: 'transparent', border: 'none', cursor: 'pointer', marginRight: -8 }}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div
          className="md:hidden flex flex-col"
          style={{
            background: '#000000',
            borderTop: '1px solid #1a1a1a',
            padding: '8px 16px 20px',
            maxHeight: 'calc(100vh - 64px)',
            overflowY: 'auto',
          }}
        >
          <Link to="/blog" style={{ color: '#e5e5e5', fontSize: 15, padding: '14px 4px', borderBottom: '1px solid #ffffff08' }} onClick={() => setOpen(false)}>Blog</Link>
          <Link to="/security" style={{ color: '#e5e5e5', fontSize: 15, padding: '14px 4px', borderBottom: '1px solid #ffffff08' }} onClick={() => setOpen(false)}>Security</Link>
          <Link to="/contact" style={{ color: '#e5e5e5', fontSize: 15, padding: '14px 4px', borderBottom: '1px solid #ffffff08' }} onClick={() => setOpen(false)}>Contact</Link>
          <Link to="/login" style={{ color: '#a3a3a3', fontSize: 15, padding: '14px 4px' }} onClick={() => setOpen(false)}>Log in</Link>
          <Link to="/signup" style={{ background: '#ffffff', color: '#000000', padding: '14px 16px', borderRadius: 8, fontSize: 15, fontWeight: 500, textAlign: 'center', marginTop: 12 }} onClick={() => setOpen(false)}>Get Started</Link>
        </div>
      )}
    </nav>
  );
}
