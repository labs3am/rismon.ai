import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, BookOpen } from 'lucide-react';

const STORAGE_KEY = 'rismon_welcome_guide_dismissed';
const TRIGGER_KEY = 'rismon_show_welcome_guide';

export default function WelcomeGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === '1';
      const triggered = localStorage.getItem(TRIGGER_KEY) === '1';
      // Show on first dashboard visit (triggered by signup) OR if never dismissed
      if (!dismissed || triggered) {
        setVisible(true);
        localStorage.removeItem(TRIGGER_KEY);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="mt-5"
      style={{
        background: '#0d0d0d',
        border: '1px solid #222222',
        borderLeft: '3px solid #f97316',
        borderRadius: 8,
        padding: '16px 20px',
      }}
    >
      <div className="flex items-start gap-3">
        <BookOpen size={18} strokeWidth={2} style={{ color: '#f97316', marginTop: 2, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
            New here? Read this first.
          </p>
          <p style={{ color: '#888888', fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>
            A two-minute guide on connecting your app, writing a clear description, and reading
            your report so every finding is accurate.{' '}
            <Link
              to="/blog/how-to-get-a-proper-report-from-rismon"
              style={{ color: '#f97316', fontWeight: 500 }}
              className="hover:underline"
            >
              Read the guide
            </Link>
            .
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666666',
            cursor: 'pointer',
            padding: 4,
            marginTop: -2,
            flexShrink: 0,
          }}
          className="hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}