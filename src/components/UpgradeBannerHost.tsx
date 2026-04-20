import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UpgradeBanner } from './ui/upgrade-banner';

const STORAGE_KEY = 'rismon.dismiss.upgrade-banner-v1';
const AUTO_DISMISS_MS = 8000;
const SCROLL_DISMISS_PX = 120;

export default function UpgradeBannerHost() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // ignore
    }
    setVisible(true);

    const timer = window.setTimeout(() => setVisible(false), AUTO_DISMISS_MS);

    const onScroll = () => {
      if (window.scrollY > SCROLL_DISMISS_PX) setVisible(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 76,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        pointerEvents: 'auto',
      }}
    >
      <UpgradeBanner
        buttonText="Upgrade to Pro"
        description="for unlimited Deep Scans and Claude verification"
        onClose={dismiss}
        onClick={() => {
          dismiss();
          navigate('/pricing');
        }}
        visible={visible}
      />
    </div>
  );
}
