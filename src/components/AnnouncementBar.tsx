import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'rismon_announcements_dismissed';
const HIDE_AFTER_MS = 6000;
const SCROLL_HIDE_PX = 40;
const SUPPRESS_HOURS = 24;

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
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
    window.setTimeout(() => setVisible(false), 300);
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

  const text = isMobile
    ? 'Claude + Gemini verify every finding —'
    : 'Claude + Gemini now verify every Deep Scan finding —';

  return (
    <div
      style={{
        width: '100%',
        height: 36,
        background: '#000000',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        position: 'relative',
        overflow: 'hidden',
        animation: closing
          ? 'rismon-anno-slide-up 300ms ease forwards'
          : 'rismon-anno-slide-down 300ms ease',
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

      <span
        style={{
          color: '#555555',
          fontSize: 12,
          fontWeight: 400,
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 'calc(100% - 80px)',
        }}
      >
        {text}
      </span>
      <Link
        to="/blog/claude-is-now-in-rismon"
        style={{
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 500,
          marginLeft: 6,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#f97316')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
      >
        See what changed →
      </Link>

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
          color: '#333333',
          cursor: 'pointer',
          fontSize: 16,
          padding: '4px 8px',
          lineHeight: 1,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#888888')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#333333')}
      >
        ×
      </button>
    </div>
  );
}
