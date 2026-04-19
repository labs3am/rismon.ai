import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  const linkStyle: React.CSSProperties = { color: '#888888', fontSize: 14, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s ease' };

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, height: 64, background: '#000000', borderBottom: '1px solid #ffffff10' }}>
      <div className="flex h-full items-center justify-between max-w-[1200px] mx-auto" style={{ padding: '0 24px' }}>
        <Link to="/" style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>Rismon.ai</Link>

        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => goToSection('how-it-works')} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>How it works</button>
          <button onClick={() => goToSection('what-we-check')} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>What we check</button>
          <button onClick={() => goToSection('pricing')} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Pricing</button>
          <button onClick={() => goToSection('security-privacy')} style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Security</button>
          <Link to="/blog" style={linkStyle} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Blog</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" style={{ color: '#888888', fontSize: 14, transition: 'color 0.15s ease' }} onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')} onMouseLeave={e => (e.currentTarget.style.color = '#888888')}>Log in</Link>
          <Link to="/signup" style={{ background: '#ffffff', color: '#000000', padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 500, transition: 'background 0.15s ease' }} onMouseEnter={e => (e.currentTarget.style.background = '#e5e5e5')} onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}>Get Started</Link>
        </div>

        <button className="md:hidden" style={{ color: '#ffffff', background: 'transparent', border: 'none' }} onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden flex flex-col gap-3" style={{ background: '#000000', borderTop: '1px solid #ffffff10', padding: '16px 24px' }}>
          <button onClick={() => goToSection('how-it-works')} className="text-left" style={{ color: '#888888', fontSize: 14, padding: '8px 0', background: 'transparent', border: 'none' }}>How it works</button>
          <button onClick={() => goToSection('what-we-check')} className="text-left" style={{ color: '#888888', fontSize: 14, padding: '8px 0', background: 'transparent', border: 'none' }}>What we check</button>
          <button onClick={() => goToSection('pricing')} className="text-left" style={{ color: '#888888', fontSize: 14, padding: '8px 0', background: 'transparent', border: 'none' }}>Pricing</button>
          <button onClick={() => goToSection('security-privacy')} className="text-left" style={{ color: '#888888', fontSize: 14, padding: '8px 0', background: 'transparent', border: 'none' }}>Security</button>
          <Link to="/blog" style={{ color: '#888888', fontSize: 14, padding: '8px 0' }} onClick={() => setOpen(false)}>Blog</Link>
          <Link to="/login" style={{ color: '#888888', fontSize: 14, padding: '8px 0' }} onClick={() => setOpen(false)}>Log in</Link>
          <Link to="/signup" style={{ background: '#ffffff', color: '#000000', padding: '10px 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, textAlign: 'center' }} onClick={() => setOpen(false)}>Get Started</Link>
        </div>
      )}
    </nav>
  );
}
