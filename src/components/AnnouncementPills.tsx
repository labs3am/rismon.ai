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
};

const PILLS: Pill[] = [
  {
    id: 'rismon-claude-live-v1',
    buttonText: 'Claude is here',
    description: 'Two AI models now verify every Deep Scan finding.',
    href: '/blog/claude-is-now-in-rismon',
    accent: '#f97316',
    icon: <Sparkles className="h-3 w-3" strokeWidth={2.4} />,
  },
  {
    id: 'rismon-supabase-live-v1',
    buttonText: 'Connect Supabase',
    description: 'Verified backend findings. Postgres, MySQL, Mongo in beta.',
    href: '/blog/connect-your-supabase-for-deeper-accuracy',
    accent: '#3ECF8E',
    icon: <Database className="h-3 w-3" strokeWidth={2.4} />,
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
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            background: '#000',
            borderBottom: '1px solid #ffffff10',
            padding: '8px 16px',
          }}
        >
          <div
            className="mx-auto flex flex-col gap-1.5"
            style={{ maxWidth: 1200 }}
          >
            {visible.map((p) => (
              <UpgradeBanner
                key={p.id}
                buttonText={p.buttonText}
                description={p.description}
                accent={p.accent}
                icon={p.icon}
                onClick={() => navigate(p.href)}
                onClose={() => dismiss(p.id)}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
