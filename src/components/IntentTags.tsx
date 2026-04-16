import { useState, useEffect, useRef } from 'react';

const PROJECT_TYPES = ['SaaS', 'E-commerce', 'Marketplace', 'Portfolio', 'Internal Tool', 'Directory', 'Community', 'Booking App', 'Course Platform'];
const MONETIZATION = ['Free Only', 'Free + Paid Tiers', 'One-time Payment', 'Subscription', 'Pay Per Use', 'No Payments'];
const USER_TYPES = ['Solo Users', 'Teams', 'B2B Clients', 'Public Anyone', 'Invite Only'];

const TEMPLATES: Record<string, string> = {
  'SaaS': 'I am building a SaaS tool that helps [describe your target user] to [describe the main benefit]. Free plan includes [list free features]. Paid plan at $[price]/month unlocks [list paid features].',
  'E-commerce': 'I am building a shop to sell [type of product]. Customers pay with Stripe. Each customer sees only their own orders and personal data.',
  'Marketplace': 'I am building a marketplace where [sellers] list [products or services] and [buyers] purchase them. I take [X]% commission per transaction. Sellers see only their own listings.',
  'Booking App': 'I am building a booking system for [type of service]. Customers schedule and pay online. Each booking is private per customer.',
  'Course Platform': 'I am building an online course platform about [topic]. Free users preview [X] lessons only. Paid users at $[price] get full access.',
  'Internal Tool': 'I am building an internal tool for [team name] to manage [process]. Only team members can access it. Admin sees all data. Each staff member sees only their own.',
  'Directory': 'I am building a directory of [category]. Anyone can browse for free. Businesses pay $[price] to get listed.',
  'Portfolio': 'I am building a portfolio to showcase my [work type]. No login needed. Visitors can contact me via a form.',
  'Community': 'I am building a community where members can [describe activity]. Free members can [free actions]. Premium members at $[price] can [premium actions].',
};

interface IntentTagsProps {
  value: string;
  onChange: (value: string) => void;
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

export default function IntentTags({ value, onChange }: IntentTagsProps) {
  const [projectType, setProjectType] = useState<string | null>(null);
  const [monetization, setMonetization] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
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
  };

  const confirmReplace = () => {
    if (pendingType.current) applyTemplate(pendingType.current);
  };

  const dismissWarning = () => {
    setShowReplaceWarning(false);
    pendingType.current = null;
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
            <Chip key={t} label={t} selected={monetization === t} onClick={() => setMonetization(monetization === t ? null : t)} />
          ))}
        </div>
      </div>

      {/* Row 3 - User Type */}
      <div className="mt-5">
        <RowLabel text="WHO ARE YOUR USERS?" />
        <div className="flex flex-wrap gap-2">
          {USER_TYPES.map(t => (
            <Chip key={t} label={t} selected={userType === t} onClick={() => setUserType(userType === t ? null : t)} />
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
          onChange={e => { setUserEdited(true); onChange(e.target.value); }}
          rows={5}
          placeholder="Select a project type above or describe your app here..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(249,115,22,0.20)',
            borderRadius: 8,
            padding: 16,
            fontSize: 14,
            color: 'white',
            minHeight: 120,
            resize: 'vertical',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
