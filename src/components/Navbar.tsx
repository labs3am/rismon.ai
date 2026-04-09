import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/90 backdrop-blur-[12px]">
      <div className="flex h-full items-center justify-between px-6 md:px-10 max-w-[1400px] mx-auto">
        <Link to="/" className="text-[20px] font-bold text-foreground">Rismon.ai</Link>
        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-foreground text-sm hover:text-foreground/80 transition-colors">Log in</Link>
          <Link to="/signup" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Get Started</Link>
        </div>
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-[12px] px-6 py-4 flex flex-col gap-3">
          <Link to="/login" className="text-foreground text-sm py-2" onClick={() => setOpen(false)}>Log in</Link>
          <Link to="/signup" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium text-center" onClick={() => setOpen(false)}>Get Started</Link>
        </div>
      )}
    </nav>
  );
}
