import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface RisGuideProps {
  pageKey: string;
  message: string;
}

export default function RisGuide({ pageKey, message }: RisGuideProps) {
  const storageKey = `ris_dismissed_${pageKey}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) setVisible(true);
  }, [storageKey]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(storageKey, '1');
    setVisible(false);
  };

  return (
    <div
      className="w-full mb-6"
      style={{
        background: 'rgba(249,115,22,0.06)',
        border: '1px solid rgba(249,115,22,0.20)',
        borderLeft: '3px solid #f97316',
        borderRadius: 8,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          minWidth: 28,
          background: 'rgba(249,115,22,0.15)',
          border: '1px solid rgba(249,115,22,0.30)',
          borderRadius: '50%',
          fontSize: 12,
          fontWeight: 700,
          color: '#f97316',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        R
      </div>
      <p
        className="flex-1"
        style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.75)',
          lineHeight: 1.6,
          whiteSpace: 'pre-line',
          margin: 0,
        }}
      >
        {message}
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 mt-0.5 hover:opacity-70 transition-opacity"
        style={{ color: 'rgba(255,255,255,0.30)', background: 'none', border: 'none', cursor: 'pointer' }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
