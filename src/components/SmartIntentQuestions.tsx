import { useMemo, useState, useEffect } from 'react';

export interface PreAnalysis {
  hasPayments?: boolean;
  paymentProvider?: string | null;
  hasUserAccounts?: boolean;
  hasAdminRoutes?: boolean;
  hasFreePaidTiers?: boolean;
  detectedAppType?: string;
  detectedPlatform?: string;
  // 'verified' = backend ground truth available, 'partial' = table list only, 'none' = nothing
  backendVisibility?: 'verified' | 'partial' | 'none';
}

interface SmartQ {
  id: string;
  contextBadge: string;
  question: string;
  options: { value: string; label: string; description?: string }[];
}

// Sentinel value used for the free-text "Other" choice. The actual typed text
// is stored as `other:<text>` so it flows straight into user_answers for the AI.
const OTHER_VALUE = 'other';
const OTHER_OPTION = {
  value: OTHER_VALUE,
  label: 'Other (describe in your own words)',
  description: 'Tell us exactly what your situation is — the AI will use this',
};

function isOtherAnswer(v: string | undefined) {
  return !!v && (v === OTHER_VALUE || v.startsWith('other:'));
}
function otherText(v: string | undefined) {
  if (!v || !v.startsWith('other:')) return '';
  return v.slice('other:'.length);
}

function buildQuestions(pre: PreAnalysis): SmartQ[] {
  const qs: SmartQ[] = [];

  // TIER 2: Honest follow-up questions when backend cannot be verified.
  // These let the AI ask instead of hallucinate.
  const noBackendVerify = !pre.backendVisibility || pre.backendVisibility !== 'verified';
  if (noBackendVerify && pre.hasUserAccounts) {
    qs.push({
      id: 'rls_self_report',
      contextBadge: 'We could not check your database directly',
      question: 'Did you set up access rules so users only see their own data?',
      options: [
        { value: 'yes_rules', label: 'Yes — I set up access rules', description: 'Each user can only read/edit their own rows' },
        { value: 'no_rules', label: 'No — I did not set this up', description: 'Anyone could potentially read everyone\'s data' },
        { value: 'not_sure', label: 'Not sure — the AI built this', description: 'We will mark database findings as unverified' },
        { value: 'no_backend', label: 'I don\'t use a database yet' },
      ],
    });
  }
  if (noBackendVerify && pre.hasAdminRoutes) {
    qs.push({
      id: 'admin_enforcement',
      contextBadge: 'Admin area detected',
      question: 'Where is the admin area protected?',
      options: [
        { value: 'server', label: 'In my backend / edge function', description: 'A server-side check rejects non-admins' },
        { value: 'database', label: 'In the database', description: 'Database rules enforce admin-only access' },
        { value: 'frontend_only', label: 'Only the frontend hides it', description: 'No real protection — anyone who finds the URL gets in' },
        { value: 'not_sure', label: 'Not sure' },
      ],
    });
  }
  if (noBackendVerify && pre.hasPayments) {
    qs.push({
      id: 'payment_webhook',
      contextBadge: `${pre.paymentProvider || 'Payment'} detected`,
      question: 'Is your payment confirmed by your server (not just the browser)?',
      options: [
        { value: 'webhook_yes', label: 'Yes — I have a webhook handler', description: 'Server verifies the payment before unlocking access' },
        { value: 'no_webhook', label: 'No — I just trust the browser', description: 'Users could fake a successful payment' },
        { value: 'not_sure', label: 'Not sure' },
      ],
    });
  }

  if (pre.hasPayments && pre.hasFreePaidTiers) {
    qs.push({
      id: 'free_vs_paid',
      contextBadge: `${pre.paymentProvider || 'Payment system'} detected`,
      question: 'What can free users NOT do compared to paid users?',
      options: [
        { value: 'usage_limits', label: 'They have usage limits', description: 'Example: only 3 scans per month' },
        { value: 'features_locked', label: 'Certain features are locked', description: 'Some pages or tools require payment' },
        { value: 'not_setup', label: 'I have not set this up yet', description: 'There is no difference currently' },
        { value: 'not_sure', label: 'Not sure what the difference is' },
      ],
    });
  } else if (pre.hasPayments) {
    qs.push({
      id: 'payment_model',
      contextBadge: 'Payment system detected',
      question: 'How do users pay?',
      options: [
        { value: 'one_time', label: 'One-time purchase', description: 'Pay once, access forever' },
        { value: 'subscription', label: 'Monthly or yearly subscription', description: 'Recurring payment' },
        { value: 'pay_per_use', label: 'Pay per use', description: 'Charged each time they use it' },
        { value: 'not_setup', label: 'Not fully set up yet' },
      ],
    });
  }

  if (pre.hasUserAccounts) {
    qs.push({
      id: 'data_visibility',
      contextBadge: 'User accounts detected',
      question: "Should users see each other's information?",
      options: [
        { value: 'private', label: 'No — everything is private', description: 'Each user only sees their own data' },
        { value: 'public', label: 'Yes — users can see each other', description: 'Like a community or marketplace' },
        { value: 'role_based', label: 'Depends on their role', description: 'Admins see more than regular users' },
        { value: 'not_sure', label: 'Not sure' },
      ],
    });
  }

  if (pre.hasAdminRoutes) {
    qs.push({
      id: 'admin_access',
      contextBadge: 'Admin area detected',
      question: 'Who should access your admin area?',
      options: [
        { value: 'owner_only', label: 'Only me (the owner)' },
        { value: 'team', label: 'Specific team members' },
        { value: 'any_user', label: 'Any logged-in user' },
        { value: 'not_sure', label: 'Not sure — the AI built this' },
      ],
    });
  }

  return qs;
}

function DetectedPills({ pre }: { pre: PreAnalysis }) {
  const pills: string[] = [];
  if (pre.detectedAppType && pre.detectedAppType !== 'unknown') pills.push(pre.detectedAppType);
  if (pre.detectedPlatform && pre.detectedPlatform !== 'unknown') pills.push(pre.detectedPlatform);
  if (pre.hasPayments) pills.push(pre.paymentProvider || 'Payments');
  if (pre.hasUserAccounts) pills.push('User accounts');
  if (pre.hasAdminRoutes) pills.push('Admin area');
  if (pre.hasFreePaidTiers) pills.push('Free + paid tiers');

  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: 8,
        padding: '16px 20px',
        marginBottom: 32,
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: '#555555',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 12,
        }}
      >
        What we found in your code
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', margin: -4 }}>
        {pills.length === 0 && (
          <span style={{ fontSize: 13, color: '#666' }}>Nothing notable detected.</span>
        )}
        {pills.map((p) => (
          <span
            key={p}
            style={{
              background: '#111111',
              border: '1px solid #222222',
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 12,
              color: '#888888',
              display: 'inline-flex',
              margin: 4,
            }}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  preAnalysis: PreAnalysis | null;
  questionAnswers: Record<string, string>;
  setQuestionAnswers: (a: Record<string, string>) => void;
  onComplete: () => void;
  loading?: boolean;
}

export default function SmartIntentQuestions({
  preAnalysis,
  questionAnswers,
  setQuestionAnswers,
  onComplete,
  loading,
}: Props) {
  const questions = useMemo(() => (preAnalysis ? buildQuestions(preAnalysis) : []), [preAnalysis]);
  const [step, setStep] = useState(0);

  // Reset step when questions change (new pre-analysis)
  useEffect(() => {
    setStep(0);
  }, [questions.length]);

  // Loading state
  if (loading || !preAnalysis) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
        <div
          style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: 8,
            padding: '24px 20px',
            animation: 'rismonPulse 1.6s ease-in-out infinite',
          }}
        >
          <p style={{ fontSize: 15, color: '#888888' }}>Reading your code...</p>
        </div>
        <style>{`
          @keyframes rismonPulse {
            0%, 100% { border-color: #1a1a1a; }
            50% { border-color: #2a2a2a; }
          }
        `}</style>
      </div>
    );
  }

  const allAnswered = questions.every((q) => questionAnswers[q.id]);
  const noQuestions = questions.length === 0;

  const handleSelect = (qId: string, value: string) => {
    const next = { ...questionAnswers, [qId]: value };
    setQuestionAnswers(next);
    // Auto-advance
    if (step < questions.length - 1) {
      setTimeout(() => setStep((s) => s + 1), 150);
    }
  };

  const currentQ = questions[step];

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
      <DetectedPills pre={preAnalysis} />

      {noQuestions ? (
        <div>
          <p style={{ fontSize: 18, color: '#ffffff', fontWeight: 500, lineHeight: 1.5 }}>
            We have everything we need.
          </p>
          <p style={{ fontSize: 15, color: '#888888', marginTop: 6 }}>Ready to scan your app.</p>
        </div>
      ) : (
        <>
          {/* Progress dots */}
          {questions.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
              {questions.map((q, i) => {
                const answered = !!questionAnswers[q.id];
                return (
                  <span
                    key={q.id}
                    onClick={() => setStep(i)}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      cursor: 'pointer',
                      background: answered ? '#f97316' : 'transparent',
                      border: answered ? '1px solid #f97316' : '1px solid #333',
                      outline: i === step ? '2px solid rgba(249,115,22,0.30)' : 'none',
                      outlineOffset: 2,
                    }}
                  />
                );
              })}
            </div>
          )}

          {currentQ && (
            <div>
              <span
                style={{
                  display: 'inline-block',
                  background: 'rgba(249,115,22,0.08)',
                  border: '1px solid rgba(249,115,22,0.20)',
                  borderRadius: 999,
                  padding: '4px 12px',
                  fontSize: 11,
                  color: '#f97316',
                }}
              >
                {currentQ.contextBadge}
              </span>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#ffffff',
                  margin: '16px 0',
                  lineHeight: 1.4,
                }}
              >
                {currentQ.question}
              </h2>

              <div>
                {currentQ.options.map((opt) => {
                  const selected = questionAnswers[currentQ.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(currentQ.id, opt.value)}
                      onMouseEnter={(e) => {
                        if (!selected) e.currentTarget.style.borderColor = '#333333';
                      }}
                      onMouseLeave={(e) => {
                        if (!selected) e.currentTarget.style.borderColor = '#1a1a1a';
                      }}
                      style={{
                        background: selected ? 'rgba(249,115,22,0.06)' : '#0a0a0a',
                        border: `1px solid ${selected ? '#f97316' : '#1a1a1a'}`,
                        borderRadius: 8,
                        padding: '16px 20px',
                        marginBottom: 8,
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'border-color 0.15s ease, background 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: 15, color: '#ffffff', fontWeight: 500 }}>{opt.label}</div>
                      {opt.description && (
                        <div style={{ fontSize: 13, color: '#555555', marginTop: 4 }}>
                          {opt.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {(noQuestions || allAnswered) && (
        <button
          type="button"
          onClick={onComplete}
          style={{
            background: '#ffffff',
            color: '#000000',
            padding: '14px 28px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 15,
            width: '100%',
            marginTop: 32,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Start scan →
        </button>
      )}
    </div>
  );
}
