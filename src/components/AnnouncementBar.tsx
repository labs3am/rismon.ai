import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'rismon_announcements_dismissed';
const HIDE_AFTER_MS = 6000;
const SCROLL_HIDE_PX = 30;
const SUPPRESS_HOURS = 24;

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ts = Number(raw);
        if (!Number.isNaN(ts) && Date.now() - ts < SUPPRESS_HOURS * 60 * 60 * 1000) {
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => startClose(), HIDE_AFTER_MS);
    const onScroll = () => {
      if (window.scrollY > SCROLL_HIDE_PX) startClose();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
    };
  }, [visible]);

  const startClose = () => {
    setClosing(true);
    window.setTimeout(() => setVisible(false), 240);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    startClose();
  };

  if (!visible) return null;

  return (
    <div
      style={{
        width: '100%',
        background: '#000000',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        fontSize: 13,
        position: 'relative',
        animation: closing
          ? 'rismon-anno-slide-up 240ms ease-in forwards'
          : 'rismon-anno-slide-down 240ms ease-out',
      }}
    >
      <style>{`
        @keyframes rismon-anno-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes rismon-anno-slide-up {
          from { transform: translateY(0);     opacity: 1; }
          to   { transform: translateY(-100%); opacity: 0; }
        }
      `}</style>

      {/* Left announcement */}
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <span
          style={{
            background: '#f97316',
            color: '#000000',
            borderRadius: 999,
            padding: '2px 8px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            marginRight: 8,
          }}
        >
          NEW
        </span>
        <span style={{ color: '#888888', fontSize: 13, marginRight: 8 }} className="truncate">
          Claude + Gemini now verify every finding
        </span>
        <Link
          to="/blog/claude-is-now-in-rismon"
          style={{ color: '#f97316', fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#f97316')}
        >
          Read more →
        </Link>
      </div>

      {/* Divider */}
      <div
        className="hidden md:block"
        style={{
          width: 1,
          height: 12,
          background: '#222222',
        }}
        aria-hidden
      />

      {/* Right announcement (hidden on mobile) */}
      <div
        className="hidden md:flex"
        style={{ alignItems: 'center', minWidth: 0 }}
      >
        <span
          style={{
            background: 'transparent',
            border: '1px solid #333333',
            color: '#888888',
            borderRadius: 999,
            padding: '2px 8px',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            marginRight: 8,
          }}
        >
          TIP
        </span>
        <span style={{ color: '#888888', fontSize: 13, marginRight: 8 }} className="truncate">
          Connect Supabase for verified backend findings
        </span>
        <Link
          to="/blog/connect-your-supabase-for-deeper-accuracy"
          style={{ color: '#888888', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#888888')}
        >
          Learn more →
        </Link>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcements"
        style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          color: '#444444',
          cursor: 'pointer',
          fontSize: 14,
          padding: '0 0 0 16px',
          lineHeight: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#444444')}
      >
        ×
      </button>
    </div>
  );
}
