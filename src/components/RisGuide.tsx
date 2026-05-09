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
    <div className="w-full mb-6 bg-card border border-border rounded-xl px-4 py-3.5 flex items-start gap-3">
      <div className="w-7 h-7 min-w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[12px] font-bold">
        R
      </div>
      <p className="flex-1 text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line m-0">
        {message}
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 mt-0.5 text-muted-foreground/60 hover:text-foreground transition-colors bg-transparent border-0 cursor-pointer"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
