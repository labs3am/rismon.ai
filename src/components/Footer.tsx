import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12 px-6 md:px-10">
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="text-foreground font-bold text-lg">Rismon.ai</p>
          <p className="text-muted-foreground text-[13px] mt-2">Proudly made in India 🇮🇳</p>
          <p className="text-muted-foreground text-[13px] mt-1">
            From the house of{' '}
            <a href="https://labs3am.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Labs3am</a>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Terms of Service</Link>
          <a href="mailto:hello@rismon.ai" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Contact</a>
        </div>
        <div>
          <p className="text-muted-foreground text-[13px]">© 2026 Rismon.ai</p>
          <p className="text-dimmed text-xs mt-1">Rismon.ai provides analysis assistance only and does not guarantee the security of any application.</p>
        </div>
      </div>
    </footer>
  );
}
