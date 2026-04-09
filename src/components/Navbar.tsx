import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] h-16" style={{ background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e1e1e' }}>
      <div className="flex h-full items-center justify-between px-6 md:px-10 max-w-[1200px] mx-auto">
        <Link to="/" className="text-[20px] font-bold text-foreground">Rismon.ai</Link>
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollTo('how-it-works')} className="text-sm transition-colors cursor-pointer bg-transparent border-none" style={{ color: '#71717a' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#71717a'}>How it works</button>
          <button onClick={() => scrollTo('what-we-check')} className="text-sm transition-colors cursor-pointer bg-transparent border-none" style={{ color: '#71717a' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#71717a'}>What we check</button>
          <button onClick={() => scrollTo('pricing')} className="text-sm transition-colors cursor-pointer bg-transparent border-none" style={{ color: '#71717a' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#71717a'}>Pricing</button>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm transition-colors" style={{ color: '#71717a' }} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#71717a')}>Log in</Link>
          <Link to="/signup" className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Get Started</Link>
        </div>
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden px-6 py-4 flex flex-col gap-3" style={{ background: 'rgba(8,8,8,0.95)', borderTop: '1px solid #1e1e1e' }}>
          <button onClick={() => scrollTo('how-it-works')} className="text-sm py-2 text-left" style={{ color: '#71717a' }}>How it works</button>
          <button onClick={() => scrollTo('what-we-check')} className="text-sm py-2 text-left" style={{ color: '#71717a' }}>What we check</button>
          <button onClick={() => scrollTo('pricing')} className="text-sm py-2 text-left" style={{ color: '#71717a' }}>Pricing</button>
          <Link to="/login" className="text-foreground text-sm py-2" onClick={() => setOpen(false)}>Log in</Link>
          <Link to="/signup" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium text-center" onClick={() => setOpen(false)}>Get Started</Link>
        </div>
      )}
    </nav>
  );
}
