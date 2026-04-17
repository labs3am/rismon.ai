import { useState, useRef } from 'react';

const PROJECT_TYPES = ['SaaS', 'E-commerce', 'Marketplace', 'Portfolio', 'Internal Tool', 'Directory', 'Community', 'Booking App', 'Course Platform'];
const MONETIZATION = ['Free Only', 'Free + Paid Tiers', 'One-time Payment', 'Subscription', 'Pay Per Use', 'No Payments'];

// Short, neutral project descriptions WITHOUT payment language.
// Payment details are appended separately based on the monetization chip.
const TEMPLATES: Record<string, string> = {
  'SaaS': 'I am building a SaaS tool that helps [who it is for, e.g. freelance designers] to [main benefit, e.g. send invoices in 30 seconds]. Key features: [feature 1, feature 2, feature 3].',
  'E-commerce': 'I am building an online shop selling [type of product, e.g. handmade candles]. Each customer sees only their own orders and address.',
  'Marketplace': 'I am building a marketplace where [sellers, e.g. local bakers] list [items, e.g. cakes] and [buyers, e.g. customers] buy them. I take [X]% commission. Sellers only see their own listings.',
  'Portfolio': 'I am building a portfolio to showcase my [work type, e.g. photography]. Visitors can browse my work and contact me via a form.',
  'Internal Tool': 'I am building an internal tool for [team, e.g. our sales team] to manage [process, e.g. client follow-ups]. Only invited team members can log in. Admins see everything; staff see only their own data.',
  'Directory': 'I am building a directory of [category, e.g. dog-friendly cafes in Berlin]. Anyone can browse. Businesses can claim and edit their own listing.',
  'Community': 'I am building a community where members can [activity, e.g. share running routes and comment]. Members only edit their own posts.',
  'Booking App': 'I am building a booking system for [service, e.g. yoga classes]. Customers pick a time slot and book. Each booking is private to that customer.',
  'Course Platform': 'I am building an online course platform about [topic, e.g. learning Spanish]. Students track their own progress through lessons.',
};

const PAYMENT_TEMPLATES: Record<string, string> = {
  'Free Only': 'This app is completely free. No payments required. All features available to everyone.',
  'Free + Paid Tiers': 'Free users have limited access. Paid users at $[price]/month get full access to all features. Free users must NOT access paid features without upgrading.',
  'One-time Payment': 'Users pay once at $[price] to get lifetime access. No recurring charges.',
  'Subscription': 'Users pay $[price]/month for continued access. Cancelling subscription should remove access immediately.',
  'Pay Per Use': 'Users pay for each action they take. $[price] per [action]. Usage tracked per user.',
  'No Payments': 'No payment system needed. This is an internal or private tool.',
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

  // Separator used to split project-type text from payment text
  const SEPARATOR = '\n\n';

  const getProjectPart = (text: string) => {
    // Strip any known payment template from the end
    for (const key of Object.keys(PAYMENT_TEMPLATES)) {
      const pt = PAYMENT_TEMPLATES[key];
      if (text.endsWith(pt)) {
        return text.slice(0, text.length - pt.length).replace(/\n+$/, '');
      }
    }
    return text;
  };

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
    const projectText = TEMPLATES[type] || '';
    const paymentText = monetization ? PAYMENT_TEMPLATES[monetization] : '';
    const combined = paymentText ? `${projectText}${SEPARATOR}${paymentText}` : projectText;
    onChange(combined.slice(0, 300));
    onMetaChange?.({ projectType: type, monetization });
  };

  const handleMonetization = (m: string) => {
    const newVal = monetization === m ? null : m;
    setMonetization(newVal);
    onMetaChange?.({ projectType, monetization: newVal });

    // Get the project-type portion of current text
    const projectPart = getProjectPart(value);

    if (newVal === null) {
      // Deselected — keep only project part
      onChange(projectPart);
    } else {
      const paymentText = PAYMENT_TEMPLATES[newVal] || '';
      const combined = projectPart ? `${projectPart}${SEPARATOR}${paymentText}` : paymentText;
      onChange(combined.slice(0, 300));
    }
    setUserEdited(false);
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
          rows={6}
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
