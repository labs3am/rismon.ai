import { useState } from 'react';
import { CheckCircle, Edit3, X } from 'lucide-react';

export interface AppUnderstanding {
  business_type_guess?: string;
  features_found?: string[];
  user_roles_found?: string[];
  has_payments_code?: boolean;
  has_admin?: boolean;
  has_messaging?: boolean;
  database_tables?: string[];
  protected_routes?: string[];
  public_routes?: string[];
  edge_functions_found?: string[];
  unknown_features?: string[];
  platform_detected?: string;
}

interface Props {
  understanding: AppUnderstanding;
  onConfirm: (correction?: string) => void;
}

/**
 * "Here's what we think your app does" screen.
 * User confirms, edits, or rejects Claude's understanding before we run the audit.
 * This is the most important UX step — it anchors every finding that follows.
 */
export default function AppUnderstandingCard({ understanding, onConfirm }: Props) {
  const [mode, setMode] = useState<'idle' | 'edit' | 'reject'>('idle');
  const [correction, setCorrection] = useState('');

  const u = understanding || {};
  const features = (u.features_found || []).slice(0, 8);
  const roles = u.user_roles_found || [];
  const tables = (u.database_tables || []).slice(0, 8);

  const summary = u.business_type_guess
    ? `This looks like a ${u.business_type_guess}.`
    : 'We read your code.';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <span
          style={{
            display: 'inline-block',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.20)',
            borderRadius: 999,
            padding: '4px 12px',
            fontSize: 11,
            color: '#818cf8',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Step 1 of 2 · Confirm
        </span>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#ffffff',
            margin: '12px 0 8px',
            lineHeight: 1.3,
          }}
        >
          Here's what we think your app does
        </h2>
        <p style={{ fontSize: 15, color: '#888', lineHeight: 1.5 }}>
          {summary} Tell us if we got it right — this makes the report 10× more accurate.
        </p>
      </div>

      {/* Understanding panel */}
      <div
        style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: 12,
          padding: 24,
          marginBottom: 20,
        }}
      >
        {features.length > 0 && (
          <Section label="Main features we found">
            <PillList items={features} />
          </Section>
        )}

        {(u.has_payments_code || u.has_admin || u.has_messaging) && (
          <Section label="What it can do">
            <PillList
              items={[
                u.has_payments_code && 'Accepts payments',
                u.has_admin && 'Has an admin area',
                u.has_messaging && 'Sends messages',
              ].filter(Boolean) as string[]}
            />
          </Section>
        )}

        {roles.length > 0 && (
          <Section label="Who uses it">
            <PillList items={roles} />
          </Section>
        )}

        {tables.length > 0 && (
          <Section label="Data it stores">
            <PillList items={tables} muted />
          </Section>
        )}

        {(u.protected_routes?.length || 0) > 0 && (
          <Section label="Pages that need login">
            <PillList items={(u.protected_routes || []).slice(0, 6)} muted />
          </Section>
        )}

        {(u.unknown_features?.length || 0) > 0 && (
          <Section label="Things we're not sure about">
            <PillList items={(u.unknown_features || []).slice(0, 5)} warning />
          </Section>
        )}

        {features.length === 0 && tables.length === 0 && (
          <p style={{ color: '#666', fontSize: 14 }}>
            We didn't find much yet — please describe what your app does below.
          </p>
        )}
      </div>

      {/* Action buttons */}
      {mode === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ActionButton
            icon={<CheckCircle size={18} />}
            label="Yes, that's right"
            sublabel="Continue to a few quick questions"
            color="#22c55e"
            primary
            onClick={() => onConfirm()}
          />
          <ActionButton
            icon={<Edit3 size={18} />}
            label="Mostly right — let me add details"
            sublabel="Tell us what's missing or wrong"
            color="#f59e0b"
            onClick={() => setMode('edit')}
          />
          <ActionButton
            icon={<X size={18} />}
            label="No, this isn't what my app is"
            sublabel="Describe it in your own words"
            color="#ef4444"
            onClick={() => setMode('reject')}
          />
        </div>
      )}

      {(mode === 'edit' || mode === 'reject') && (
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              color: '#a1a1aa',
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            {mode === 'edit'
              ? 'What did we miss or get wrong?'
              : 'In 1–3 sentences, what is your app actually for?'}
          </label>
          <textarea
            autoFocus
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder={
              mode === 'edit'
                ? "Example: It's not just a marketplace — sellers also get a dashboard to upload bulk products via CSV."
                : "Example: It's a Discord bot that summarizes long YouTube videos for my friends — no users, no payments, just me running it on a server."
            }
            rows={5}
            style={{
              width: '100%',
              background: '#000',
              border: '1px solid #f97316',
              borderRadius: 8,
              padding: 14,
              color: '#fff',
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setMode('idle')}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a2a',
                color: '#a1a1aa',
                padding: '12px 20px',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={correction.trim().length < 5}
              onClick={() => onConfirm(correction.trim())}
              style={{
                background: correction.trim().length < 5 ? '#1a1a1a' : '#ffffff',
                color: correction.trim().length < 5 ? '#555' : '#000',
                padding: '12px 24px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                flex: 1,
                border: 'none',
                cursor: correction.trim().length < 5 ? 'not-allowed' : 'pointer',
              }}
            >
              Continue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p
        style={{
          fontSize: 11,
          color: '#555',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function PillList({
  items,
  muted,
  warning,
}: {
  items: string[];
  muted?: boolean;
  warning?: boolean;
}) {
  const bg = warning ? 'rgba(245,158,11,0.08)' : muted ? '#0f0f0f' : '#141414';
  const border = warning ? 'rgba(245,158,11,0.25)' : muted ? '#1f1f1f' : '#262626';
  const color = warning ? '#fbbf24' : muted ? '#888' : '#e5e5e5';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((it) => (
        <span
          key={it}
          style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 13,
            color,
          }}
        >
          {it}
        </span>
      ))}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  sublabel,
  color,
  primary,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  color: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: primary ? color : '#0a0a0a',
        border: `1px solid ${primary ? color : '#1f1f1f'}`,
        borderRadius: 10,
        padding: '14px 18px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'border-color 0.15s ease, background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!primary) e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        if (!primary) e.currentTarget.style.borderColor = '#1f1f1f';
      }}
    >
      <span style={{ color: primary ? '#000' : color, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: primary ? '#000' : '#fff',
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: primary ? 'rgba(0,0,0,0.7)' : '#777',
            marginTop: 2,
          }}
        >
          {sublabel}
        </div>
      </span>
    </button>
  );
}
