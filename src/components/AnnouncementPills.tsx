import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Database } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { UpgradeBanner } from './ui/upgrade-banner';

/**
 * Slim announcement banners shown directly under the navbar.
 * Auto-hide after 8s OR when the user scrolls past 80px.
 * Each pill remembers per-session dismissal in localStorage.
 */

type Pill = {
  id: string;
  buttonText: string;
  description: React.ReactNode;
  href: string;
  accent: string;
  icon: React.ReactNode;
  cta?: string;
};

const PILLS: Pill[] = [
  {
    id: 'rismon-claude-live-v1',
    buttonText: 'Claude is here',
    description: 'Two AI models now verify every Deep Scan finding.',
    href: '/blog/claude-is-now-in-rismon',
    accent: '#f97316',
    icon: <Sparkles className="h-3 w-3" strokeWidth={2.4} />,
    cta: 'Read more',
  },
  {
    id: 'rismon-supabase-live-v1',
    buttonText: 'Connect Supabase',
    description: 'Verified backend findings. Postgres, MySQL, Mongo in beta.',
    href: '/blog/connect-your-supabase-for-deeper-accuracy',
    accent: '#3ECF8E',
    icon: <Database className="h-3 w-3" strokeWidth={2.4} />,
    cta: 'Learn more',
  },
];

const STORAGE_PREFIX = 'rismon.dismiss.';
const AUTO_HIDE_MS = 8000;
const SCROLL_HIDE_PX = 80;

export default function AnnouncementPills() {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [autoHidden, setAutoHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const next: Record<string, boolean> = {};
    PILLS.forEach((p) => {
      try {
        next[p.id] = sessionStorage.getItem(STORAGE_PREFIX + p.id) === '1';
      } catch {
        next[p.id] = false;
      }
    });
    setHidden(next);
    setMounted(true);
  }, []);

  // Auto-hide after timeout
  useEffect(() => {
    if (!mounted) return;
    const t = window.setTimeout(() => setAutoHidden(true), AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [mounted]);

  // Hide on scroll
  useEffect(() => {
    if (!mounted) return;
    const onScroll = () => {
      if (window.scrollY > SCROLL_HIDE_PX) setAutoHidden(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mounted]);

  const dismiss = (id: string) => {
    try {
      sessionStorage.setItem(STORAGE_PREFIX + id, '1');
    } catch {
      /* ignore */
    }
    setHidden((h) => ({ ...h, [id]: true }));
  };

  if (!mounted) return null;
  const visible = PILLS.filter((p) => !hidden[p.id]);
  if (visible.length === 0) return null;

  return (
    <AnimatePresence>
      {!autoHidden && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            background: '#000',
            borderBottom: '1px solid #ffffff10',
            padding: '8px 16px',
            overflow: 'hidden',
          }}
        >
          <div
            className="mx-auto flex flex-col gap-1.5"
            style={{ maxWidth: 1200 }}
          >
            <AnimatePresence initial={true}>
              {visible.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                  transition={{
                    duration: 0.45,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.08 + i * 0.12,
                  }}
                >
                  <UpgradeBanner
                    buttonText={p.buttonText}
                    description={
                      <span className="inline-flex items-center gap-1.5">
                        <span>{p.description}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(p.href);
                          }}
                          className="inline-flex items-center gap-0.5 font-medium underline-offset-2 hover:underline transition-colors"
                          style={{ color: '#e5e5e5' }}
                        >
                          {p.cta ?? 'Read more'}
                          <span aria-hidden style={{ marginLeft: 2 }}>→</span>
                        </button>
                      </span>
                    }
                    accent={p.accent}
                    icon={p.icon}
                    onClick={() => navigate(p.href)}
                    onClose={() => dismiss(p.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
