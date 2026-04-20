import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Sparkles, Database } from 'lucide-react';

/**
 * Slim, dismissible announcement pills shown directly under the navbar.
 * Lovable-style: no popups, no dimming. Two stacked mini-pills.
 * Dismissed state is per-pill in localStorage so each can be closed independently.
 */

type Pill = {
  id: string;
  icon: React.ReactNode;
  text: React.ReactNode;
  href: string;
  cta: string;
  accent: string;
};

const PILLS: Pill[] = [
  {
    id: 'rismon-claude-live-v1',
    icon: <Sparkles size={13} strokeWidth={2.2} />,
    text: (
      <>
        <strong style={{ color: '#fff', fontWeight: 600 }}>Claude is here.</strong>{' '}
        Two AI models now verify every Deep Scan finding.
      </>
    ),
    href: '/blog/claude-is-now-in-rismon',
    cta: 'Read the post',
    accent: '#f97316',
  },
  {
    id: 'rismon-supabase-live-v1',
    icon: <Database size={13} strokeWidth={2.2} />,
    text: (
      <>
        <strong style={{ color: '#fff', fontWeight: 600 }}>Connect your Supabase</strong>{' '}
        for verified backend findings. Postgres, MySQL, Mongo in beta.
      </>
    ),
    href: '/blog/connect-your-supabase-for-deeper-accuracy',
    cta: 'See how',
    accent: '#3ECF8E',
  },
];

const STORAGE_PREFIX = 'rismon.dismiss.';

export default function AnnouncementPills() {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    PILLS.forEach((p) => {
      try {
        next[p.id] = localStorage.getItem(STORAGE_PREFIX + p.id) === '1';
      } catch {
        next[p.id] = false;
      }
    });
    setHidden(next);
    setMounted(true);
  }, []);

  const dismiss = (id: string) => {
    try {
      localStorage.setItem(STORAGE_PREFIX + id, '1');
    } catch {
      /* ignore quota errors */
    }
    setHidden((h) => ({ ...h, [id]: true }));
  };

  if (!mounted) return null;

  const visible = PILLS.filter((p) => !hidden[p.id]);
  if (visible.length === 0) return null;

  return (
    <div
      style={{
        background: '#000',
        borderBottom: '1px solid #ffffff10',
        padding: '8px 16px',
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: 1200,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {visible.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '7px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              fontSize: 12.5,
              color: '#a3a3a3',
              animation: 'fade-in 0.25s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: `${p.accent}1a`,
                  color: p.accent,
                  flexShrink: 0,
                }}
              >
                {p.icon}
              </span>
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  letterSpacing: '-0.005em',
                }}
              >
                {p.text}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Link
                to={p.href}
                style={{
                  fontSize: 12,
                  color: '#fff',
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                {p.cta}
              </Link>
              <button
                onClick={() => dismiss(p.id)}
                aria-label="Dismiss announcement"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  padding: 4,
                  borderRadius: 999,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  transition: 'color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#666';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
