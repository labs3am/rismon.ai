import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'rismon_announcements_dismissed';
const HIDE_AFTER_MS = 6000;
const SCROLL_HIDE_PX = 20;
const SUPPRESS_HOURS = 24;

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

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
    const t = window.setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    const onScroll = () => {
      if (window.scrollY > SCROLL_HIDE_PX) setVisible(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
    };
  }, [visible]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 200,
        width: '100%',
        background: '#111111',
        borderBottom: '1px solid #222222',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        fontSize: 13,
        animation: 'rismon-anno-slide-down 240ms ease-out',
      }}
    >
      <style>{`
        @keyframes rismon-anno-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>

      {/* Left announcement */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span
          style={{
            background: 'rgba(249,115,22,0.15)',
            border: '1px solid rgba(249,115,22,0.3)',
            color: '#f97316',
            borderRadius: 999,
            padding: '2px 10px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          NEW
        </span>
        <span style={{ color: '#888888', fontSize: 13 }} className="truncate">
          Claude + Gemini now verify every finding
        </span>
        <Link
          to="/blog/claude-is-here"
          style={{ color: '#f97316', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}
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
          height: 16,
          background: '#222222',
          margin: '0 16px',
        }}
        aria-hidden
      />

      {/* Right announcement (hidden on mobile) */}
      <div
        className="hidden md:flex"
        style={{ alignItems: 'center', gap: 10, minWidth: 0 }}
      >
        <span
          style={{
            background: 'rgba(34,197,94,0.10)',
            border: '1px solid rgba(34,197,94,0.2)',
            color: '#22c55e',
            borderRadius: 999,
            padding: '2px 10px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          TIP
        </span>
        <span style={{ color: '#888888', fontSize: 13 }} className="truncate">
          Connect Supabase for verified findings
        </span>
        <Link
          to="/blog/supabase-support"
          style={{ color: '#22c55e', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#22c55e')}
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
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          color: '#444444',
          cursor: 'pointer',
          fontSize: 16,
          padding: '0 8px',
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
