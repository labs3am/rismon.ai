import { useState } from 'react';

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
 * "Here's what we read in your code" screen — Rismon's signature moment.
 * No emojis. Premium homepage-style buttons. Three actions: confirm, edit, reject.
 * The whole point of Rismon is that it TELLS the founder what they built — this is that screen.
 */
export default function AppUnderstandingCard({ understanding, onConfirm }: Props) {
  const [mode, setMode] = useState<'idle' | 'edit' | 'reject'>('idle');
  const [correction, setCorrection] = useState('');
  const [selectedUnsure, setSelectedUnsure] = useState<string[]>([]);

  const u = understanding || {};
  const features = (u.features_found || []).slice(0, 8);
  const roles = u.user_roles_found || [];
  const tables = (u.database_tables || []).slice(0, 8);
  const unsureItems = (u.unknown_features || []).slice(0, 5);

  const toggleUnsure = (item: string) => {
    setSelectedUnsure((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const buildEditPayload = () => {
    const parts: string[] = [];
    if (selectedUnsure.length > 0) {
      parts.push(
        'Please clarify these items:\n' + selectedUnsure.map((i) => `- ${i}`).join('\n')
      );
    }
    if (correction.trim()) parts.push(correction.trim());
    return parts.join('\n\n');
  };

  const canSubmitEdit =
    mode === 'edit'
      ? selectedUnsure.length > 0 || correction.trim().length >= 5
      : correction.trim().length >= 5;

  const summary = u.business_type_guess
    ? `This looks like a ${u.business_type_guess}.`
    : 'We read your code.';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
      {/* Pill — homepage style */}
      <div style={{ marginBottom: 20 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'transparent',
            border: '1px solid #333333',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 11,
            color: '#888888',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          Step 1 of 2 · Confirm
        </span>
      </div>

      <h2
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 12px',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
        }}
      >
        Here is what we read in your code
      </h2>
      <p style={{ fontSize: 16, color: '#888888', lineHeight: 1.6, marginBottom: 28 }}>
        {summary} Tell us if we got it right — this is what we will check your app against.
      </p>

      {/* Understanding panel */}
      <div
        style={{
          background: '#0a0a0a',
          border: '1px solid #ffffff14',
          borderRadius: 12,
          padding: 28,
          marginBottom: 24,
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
          <Section label="Things we are not sure about">
            <PillList items={(u.unknown_features || []).slice(0, 5)} warning />
          </Section>
        )}

        {features.length === 0 && tables.length === 0 && (
          <p style={{ color: '#666', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            We did not find much yet — please describe what your app does below.
          </p>
        )}
      </div>

      {/* Action buttons — homepage style */}
      {mode === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ActionButton
            label="Yes, that is right"
            sublabel="Continue to a few quick questions"
            primary
            onClick={() => onConfirm()}
          />
          <ActionButton
            label="Mostly right — let me add details"
            sublabel="Tell us what is missing or what we got wrong"
            onClick={() => setMode('edit')}
          />
          <ActionButton
            label="No, this is not what my app is"
            sublabel="Describe it in your own words"
            onClick={() => setMode('reject')}
          />
        </div>
      )}

      {(mode === 'edit' || mode === 'reject') && (
        <div>
          {mode === 'edit' && unsureItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: '#a1a1aa',
                  marginBottom: 10,
                  fontWeight: 500,
                }}
              >
                Pick the items you'd like to clarify (optional)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unsureItems.map((item) => {
                  const checked = selectedUnsure.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleUnsure(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        background: checked ? 'rgba(245,158,11,0.08)' : '#0a0a0a',
                        border: `1px solid ${checked ? 'rgba(245,158,11,0.45)' : '#1f1f1f'}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color 0.15s ease, background 0.15s ease',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          flexShrink: 0,
                          width: 16,
                          height: 16,
                          marginTop: 2,
                          borderRadius: 4,
                          border: `1px solid ${checked ? '#f59e0b' : '#3f3f46'}`,
                          background: checked ? '#f59e0b' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#000',
                          fontSize: 11,
                          lineHeight: 1,
                          fontWeight: 700,
                        }}
                      >
                        {checked ? '✓' : ''}
                      </span>
                      <span style={{ fontSize: 14, color: '#e5e5e5', lineHeight: 1.5 }}>
                        {item}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
              ? unsureItems.length > 0
                ? 'Anything else to add? (optional)'
                : 'What did we miss or get wrong?'
              : 'In one to three sentences, what is your app actually for?'}
          </label>
          <textarea
            autoFocus
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder={
              mode === 'edit'
                ? "Example: It is not just a marketplace — sellers also get a dashboard to upload bulk products via CSV."
                : "Example: It is a Discord bot that summarizes long YouTube videos for my friends. No users, no payments, just me running it on a server."
            }
            rows={5}
            style={{
              width: '100%',
              background: '#000',
              border: '1px solid #333',
              borderRadius: 8,
              padding: 14,
              color: '#fff',
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#f97316')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => {
                setMode('idle');
                setSelectedUnsure([]);
                setCorrection('');
              }}
              className="vercel-btn-secondary"
              style={{ cursor: 'pointer' }}
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canSubmitEdit}
              onClick={() =>
                onConfirm(mode === 'edit' ? buildEditPayload() : correction.trim())
              }
              className="vercel-btn-primary"
              style={{
                flex: 1,
                cursor: !canSubmitEdit ? 'not-allowed' : 'pointer',
                opacity: !canSubmitEdit ? 0.5 : 1,
              }}
            >
              Continue
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
          letterSpacing: '0.1em',
          marginBottom: 10,
          fontWeight: 600,
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
  const bg = warning ? 'rgba(245,158,11,0.06)' : muted ? '#0f0f0f' : '#141414';
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
            padding: '6px 12px',
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
  label,
  sublabel,
  primary,
  onClick,
}: {
  label: string;
  sublabel: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: primary ? '#ffffff' : '#0a0a0a',
        border: `1px solid ${primary ? '#ffffff' : '#1f1f1f'}`,
        borderRadius: 10,
        padding: '16px 20px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s ease, background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!primary) e.currentTarget.style.borderColor = '#444';
        else e.currentTarget.style.background = '#e5e5e5';
      }}
      onMouseLeave={(e) => {
        if (!primary) e.currentTarget.style.borderColor = '#1f1f1f';
        else e.currentTarget.style.background = '#ffffff';
      }}
    >
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
          fontSize: 13,
          color: primary ? 'rgba(0,0,0,0.65)' : '#777',
          marginTop: 4,
          lineHeight: 1.4,
        }}
      >
        {sublabel}
      </div>
    </button>
  );
}
