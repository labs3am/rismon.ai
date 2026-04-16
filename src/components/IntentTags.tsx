import { useState, useRef } from 'react';

const PROJECT_TYPES = ['SaaS', 'E-commerce', 'Marketplace', 'Portfolio', 'Internal Tool', 'Directory', 'Community', 'Booking App', 'Course Platform'];
const MONETIZATION = ['Free Only', 'Free + Paid Tiers', 'One-time Payment', 'Subscription', 'Pay Per Use', 'No Payments'];

const TEMPLATES: Record<string, string> = {
  'SaaS': 'I am building a SaaS tool that helps [describe your target user] to [describe the main benefit]. Free plan includes [list free features]. Paid plan at $[price]/month unlocks [list paid features].',
  'E-commerce': 'I am building a shop to sell [type of product]. Customers pay with Stripe. Each customer sees only their own orders and personal data.',
  'Marketplace': 'I am building a marketplace where [sellers] list [products or services] and [buyers] purchase them. I take [X]% commission per transaction. Sellers see only their own listings.',
  'Portfolio': 'I am building a portfolio to showcase my [work type]. No login needed. Visitors can contact me via a form.',
  'Internal Tool': 'I am building an internal tool for [team name] to manage [process]. Only team members can access it. Admin sees all data. Each staff member sees only their own.',
  'Directory': 'I am building a directory of [category]. Anyone can browse for free. Businesses pay $[price] to get listed.',
  'Community': 'I am building a community where members can [describe activity]. Free members can [free actions]. Premium members at $[price] can [premium actions].',
  'Booking App': 'I am building a booking system for [type of service]. Customers schedule and pay online. Each booking is private per customer.',
  'Course Platform': 'I am building an online course platform about [topic]. Free users can preview [X] lessons only. Paid users at $[price] get full access.',
};

interface IntentTagsProps {
  value: string;
  onChange: (value: string) => void;
  concern: string;
  onConcernChange: (value: string) => void;
  onMetaChange?: (meta: { projectType: string | null; monetization: string | null }) => void;
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: selected ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? 'rgba(249,115,22,0.50)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 999,
        padding: '6px 14px',
        fontSize: 13,
        color: selected ? 'white' : 'rgba(255,255,255,0.60)',
        fontWeight: selected ? 500 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}

function RowLabel({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
      {text}
    </p>
  );
}

export default function IntentTags({ value, onChange, concern, onConcernChange, onMetaChange }: IntentTagsProps) {
  const [projectType, setProjectType] = useState<string | null>(null);
  const [monetization, setMonetization] = useState<string | null>(null);
  const [userEdited, setUserEdited] = useState(false);
  const [showReplaceWarning, setShowReplaceWarning] = useState(false);
  const pendingType = useRef<string | null>(null);

  const handleProjectType = (type: string) => {
    if (type === projectType) return;
    if (userEdited && value.length > 0) {
      pendingType.current = type;
      setShowReplaceWarning(true);
      return;
    }
    applyTemplate(type);
  };

  const applyTemplate = (type: string) => {
    setProjectType(type);
    setUserEdited(false);
    setShowReplaceWarning(false);
    pendingType.current = null;
    onChange(TEMPLATES[type] || '');
    onMetaChange?.({ projectType: type, monetization });
  };

  const handleMonetization = (m: string) => {
    const newVal = monetization === m ? null : m;
    setMonetization(newVal);
    onMetaChange?.({ projectType, monetization: newVal });
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, color: 'white', fontWeight: 600 }}>What are you building?</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 4 }}>Pick your project type and we'll fill in the details</p>

      {/* Row 1 - Project Type */}
      <div className="mt-6">
        <RowLabel text="PROJECT TYPE" />
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map(t => (
            <Chip key={t} label={t} selected={projectType === t} onClick={() => handleProjectType(t)} />
          ))}
        </div>
      </div>

      {/* Row 2 - Monetization */}
      <div className="mt-5">
        <RowLabel text="HOW DO USERS PAY?" />
        <div className="flex flex-wrap gap-2">
          {MONETIZATION.map(t => (
            <Chip key={t} label={t} selected={monetization === t} onClick={() => handleMonetization(t)} />
          ))}
        </div>
      </div>

      {/* Template text area */}
      <div className="mt-6">
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', marginBottom: 6 }}>Your intent (edit to add details)</p>

        {showReplaceWarning && (
          <div className="flex items-center gap-3 mb-2" style={{ fontSize: 12, color: '#f59e0b' }}>
            <span>Replace with new template? Your edits will be lost.</span>
            <button onClick={confirmReplace} className="underline" style={{ color: '#f97316' }}>Replace</button>
            <button onClick={dismissWarning} className="underline" style={{ color: 'rgba(255,255,255,0.40)' }}>Cancel</button>
          </div>
        )}

        <textarea
          value={value}
          onChange={e => {
            if (e.target.value.length <= 300) {
              setUserEdited(true);
              onChange(e.target.value);
            }
          }}
          rows={3}
          maxLength={300}
          placeholder="Edit the template above or describe what worries you most about your app"
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(249,115,22,0.20)',
            borderRadius: 8,
            padding: 16,
            fontSize: 14,
            color: 'white',
            maxHeight: 100,
            resize: 'none',
            outline: 'none',
          }}
        />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'right', marginTop: 4 }}>
          {value.length}/300
        </p>
      </div>

      {/* Concern input */}
      <div className="mt-5">
        <RowLabel text="YOUR BIGGEST CONCERN (OPTIONAL)" />
        <textarea
          value={concern}
          onChange={e => {
            if (e.target.value.length <= 200) {
              onConcernChange(e.target.value);
            }
          }}
          rows={1}
          maxLength={200}
          placeholder="Example: I'm not sure if my paywall actually stops free users from accessing paid features"
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(249,115,22,0.20)',
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            color: 'rgba(255,255,255,0.80)',
            resize: 'none',
            outline: 'none',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(249,115,22,0.50)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(249,115,22,0.20)'; }}
        />
        <div className="flex justify-between mt-1">
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            This helps us focus the scan on what matters most to you
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            {concern.length}/200
          </p>
        </div>
      </div>
    </div>
  );

  function confirmReplace() {
    if (pendingType.current) applyTemplate(pendingType.current);
  }

  function dismissWarning() {
    setShowReplaceWarning(false);
    pendingType.current = null;
  }
}
