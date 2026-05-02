import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Logo from './Logo';

function ProductMenuItem({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#ffffff08')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        borderRadius: 6,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.12s ease',
      }}
    >
      <div style={{ color: '#ffffff', fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.005em' }}>{label}</div>
      <div style={{ color: '#777777', fontSize: 12, marginTop: 2 }}>{desc}</div>
    </button>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hover-intent: small delay before close so the cursor can travel into the menu
  const openProduct = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setProductOpen(true);
  };
  const scheduleCloseProduct = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setProductOpen(false), 120);
  };

  const goToSection = (id: string) => {
    setOpen(false);
    setProductOpen(false);
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
      <div className="flex h-full items-center justify-between max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="hidden md:flex items-center gap-6">
          <Logo />
          <div className="flex items-center gap-5">
            {/* Product dropdown */}
            <div
              style={{ position: 'relative' }}
              onMouseEnter={openProduct}
              onMouseLeave={scheduleCloseProduct}
            >
              <button
                style={{ ...linkStyle, display: 'inline-flex', alignItems: 'center', gap: 4, color: productOpen ? '#ffffff' : '#888888' }}
                aria-haspopup="menu"
                aria-expanded={productOpen}
                onClick={() => setProductOpen((v) => !v)}
              >
                Product
                <ChevronDown size={13} style={{ transition: 'transform 0.15s ease', transform: productOpen ? 'rotate(180deg)' : 'none' }} />
              </button>
              {productOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    left: -12,
                    minWidth: 240,
                    background: 'rgba(10,10,10,0.96)',
                    backdropFilter: 'saturate(180%) blur(16px)',
                    WebkitBackdropFilter: 'saturate(180%) blur(16px)',
                    border: '1px solid #ffffff14',
                    borderRadius: 10,
                    padding: 6,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                  }}
                >
                  <ProductMenuItem label="How it works" desc="The 3-step scan flow" onClick={() => goToSection('how-it-works')} />
                  <ProductMenuItem label="What we find" desc="Security, intent & legal checks" onClick={() => goToSection('what-we-check')} />
                  <ProductMenuItem label="Security" desc="How we handle your code" onClick={() => { setProductOpen(false); navigate('/security'); }} />
                </div>
              )}
            </div>

            <button onClick={() => goToSection('pricing')} style={isActive('/pricing') ? { ...linkStyle, ...activeStyle } : linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = isActive('/pricing') ? '#ffffff' : '#888888')}>Pricing</button>
            <Link to="/blog" style={isActive('/blog') ? { ...linkStyle, ...activeStyle } : linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = isActive('/blog') ? '#ffffff' : '#888888')}>Blog</Link>
            <Link to="/contact" style={isActive('/contact') ? { ...linkStyle, ...activeStyle } : linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = isActive('/contact') ? '#ffffff' : '#888888')}>Contact</Link>
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
            background: 'rgba(0,0,0,0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid #ffffff10',
            padding: '8px 16px 20px',
            maxHeight: 'calc(100vh - 64px)',
            overflowY: 'auto',
          }}
        >
          <button onClick={() => goToSection('how-it-works')} className="text-left" style={{ color: '#e5e5e5', fontSize: 15, padding: '14px 4px', background: 'transparent', border: 'none', borderBottom: '1px solid #ffffff08' }}>How it works</button>
          <button onClick={() => goToSection('what-we-check')} className="text-left" style={{ color: '#e5e5e5', fontSize: 15, padding: '14px 4px', background: 'transparent', border: 'none', borderBottom: '1px solid #ffffff08' }}>What we find</button>
          <Link to="/security" onClick={() => setOpen(false)} style={{ color: '#e5e5e5', fontSize: 15, padding: '14px 4px', borderBottom: '1px solid #ffffff08' }}>Security</Link>
          <button onClick={() => goToSection('pricing')} className="text-left" style={{ color: '#e5e5e5', fontSize: 15, padding: '14px 4px', background: 'transparent', border: 'none', borderBottom: '1px solid #ffffff08' }}>Pricing</button>
          <Link to="/blog" style={{ color: '#e5e5e5', fontSize: 15, padding: '14px 4px', borderBottom: '1px solid #ffffff08' }} onClick={() => setOpen(false)}>Blog</Link>
          <Link to="/contact" style={{ color: '#e5e5e5', fontSize: 15, padding: '14px 4px', borderBottom: '1px solid #ffffff08' }} onClick={() => setOpen(false)}>Contact</Link>
          <Link to="/login" style={{ color: '#a3a3a3', fontSize: 15, padding: '14px 4px' }} onClick={() => setOpen(false)}>Log in</Link>
          <Link to="/signup" style={{ background: '#ffffff', color: '#000000', padding: '14px 16px', borderRadius: 8, fontSize: 15, fontWeight: 500, textAlign: 'center', marginTop: 12 }} onClick={() => setOpen(false)}>Get Started</Link>
        </div>
      )}
    </nav>
  );
}
