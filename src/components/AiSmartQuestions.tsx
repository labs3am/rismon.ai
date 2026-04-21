import { useMemo, useState } from 'react';

export interface AiQuestion {
  id: string;
  question: string;
  context?: string;
  answer_type?: 'yes_no' | 'text' | 'select';
  options?: string[];
  /** Optional max characters for free-text questions. */
  maxLength?: number;
  /** Optional placeholder for free-text questions. */
  placeholder?: string;
}

/** Signals from the code-reading step used to gate which intent questions to ask. */
export interface IntentSignals {
  hasPayments?: boolean;
  hasUserAccounts?: boolean;
  hasAdminRoutes?: boolean;
  hasFreePaidTiers?: boolean;
}

interface Props {
  /** Code signals from the read step — used to gate questions. */
  signals?: IntentSignals;
  /** Free-text correction the user wrote on the previous step (if any). */
  userCorrection?: string;
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
  onComplete: () => void;
}

const SKIP_VALUE = '__skip__';

/**
 * Build the intent-questions list based on what we detected in the code.
 * These are about BUSINESS INTENT — what the founder meant to build —
 * NOT about code, files, or technical implementation.
 */
function buildIntentQuestions(s: IntentSignals): AiQuestion[] {
  const qs: AiQuestion[] = [];

  // Q1 — always
  qs.push({
    id: 'coreJob',
    question: 'What is your app supposed to do for the people who use it?',
    answer_type: 'select',
    options: [
      'Help them get something done faster or easier',
      'Let them buy or sell something',
      'Give them access to content or information they pay for',
      'Connect them with other people',
    ],
  });

  // Q2 — only if payments detected
  if (s.hasPayments) {
    qs.push({
      id: 'paymentBehavior',
      question: 'When someone stops paying, what should happen?',
      answer_type: 'select',
      options: [
        'They should lose access immediately',
        'They should keep access until their period ends',
        "Nothing — I haven't built this part yet",
        "This app doesn't have payments",
      ],
    });
  }

  // Q3 — only if user accounts
  if (s.hasUserAccounts) {
    qs.push({
      id: 'dataVisibility',
      question: "Should users be able to see each other's data or content?",
      answer_type: 'select',
      options: [
        'No — each user only sees their own',
        'Yes — they can see each other',
        'Only people in the same team or group',
        'Not sure',
      ],
    });
  }

  // Q4 — only if admin routes OR free/paid tiers
  if (s.hasAdminRoutes || s.hasFreePaidTiers) {
    qs.push({
      id: 'restrictedAccess',
      question: 'Is there anything in your app that ONLY you should be able to do?',
      answer_type: 'select',
      options: [
        'Yes — I have an admin or owner section',
        'Yes — some features are only for paying users',
        'Both of the above',
        'No — everyone gets the same access',
      ],
    });
  }

  // Q5 — always last. Free text. The most important answer.
  qs.push({
    id: 'corePromise',
    question: 'What is the ONE thing your app must do correctly to work?',
    context: "This is the most important answer — we'll check it specifically.",
    answer_type: 'text',
    maxLength: 100,
    placeholder: 'Example: charge users before giving them access to reports',
  });

  // Cap at 5.
  return qs.slice(0, 5);
}

export default function AiSmartQuestions({
  signals,
  userCorrection,
  answers,
  setAnswers,
  onComplete,
}: Props) {
  // Build the intent-questions list from the code signals.
  const merged = useMemo(() => buildIntentQuestions(signals || {}), [signals]);

  const [step, setStep] = useState(0);
  const currentQ = merged[step];

  const setAnswer = (id: string, value: string) => {
    setAnswers({ ...answers, [id]: value });
  };

  const handleNext = () => {
    if (step < merged.length - 1) setStep(step + 1);
  };

  const allDone = merged.every((q) => {
    const a = answers[q.id];
    return a !== undefined && a !== '';
  });

  // Count answered (non-skip) for the progress display.
  const answeredCount = merged.filter((q) => {
    const a = answers[q.id];
    return a && a !== SKIP_VALUE && (q.answer_type !== 'text' || a.trim().length > 0);
  }).length;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 20 }}>
        <span
          style={{
            display: 'inline-block',
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.20)',
            borderRadius: 999,
            padding: '4px 12px',
            fontSize: 11,
            color: '#f97316',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          A few questions · {answeredCount}/{merged.length} answered
        </span>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#ffffff',
            margin: '12px 0 6px',
            lineHeight: 1.3,
          }}
        >
          Tell us what your app is meant to do
        </h2>
        <p style={{ fontSize: 14, color: '#888', lineHeight: 1.5 }}>
          These are about your business intent — not your code. Skip anything you're not sure about.
        </p>
      </div>

      {userCorrection && (
        <div
          style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.20)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            fontSize: 13,
            color: '#a5b4fc',
          }}
        >
          <strong style={{ color: '#c7d2fe' }}>You told us:</strong> "{userCorrection}"
        </div>
      )}

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {merged.map((q, i) => {
          const a = answers[q.id];
          const skipped = a === SKIP_VALUE;
          const answered = a && !skipped;
          return (
            <span
              key={q.id}
              onClick={() => setStep(i)}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                cursor: 'pointer',
                background: answered ? '#f97316' : skipped ? '#3a3a3a' : i === step ? '#555' : '#1a1a1a',
                transition: 'background 0.15s',
              }}
            />
          );
        })}
      </div>

      {currentQ && (
        <QuestionView
          q={currentQ}
          value={answers[currentQ.id] || ''}
          onChange={(v) => {
            // Enforce maxLength on free-text questions.
            if (currentQ.answer_type === 'text' && currentQ.maxLength) {
              setAnswer(currentQ.id, v.slice(0, currentQ.maxLength));
            } else {
              setAnswer(currentQ.id, v);
            }
          }}
          onSkip={() => {
            setAnswer(currentQ.id, SKIP_VALUE);
            handleNext();
          }}
          onNext={handleNext}
          isLast={step === merged.length - 1}
        />
      )}

      {allDone && (
        <button
          type="button"
          onClick={onComplete}
          style={{
            background: '#ffffff',
            color: '#000',
            padding: '14px 28px',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 15,
            width: '100%',
            marginTop: 28,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Run the scan →
        </button>
      )}
    </div>
  );
}

function QuestionView({
  q,
  value,
  onChange,
  onSkip,
  onNext,
  isLast,
}: {
  q: AiQuestion;
  value: string;
  onChange: (v: string) => void;
  onSkip: () => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const isText = q.answer_type === 'text';
  const isYesNo = q.answer_type === 'yes_no';
  const opts = q.options && q.options.length > 0 ? q.options : isYesNo ? ['Yes', 'No', 'Not sure'] : [];

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', lineHeight: 1.4, margin: 0 }}>
        {q.question}
      </h3>
      {q.context && (
        <p style={{ fontSize: 13, color: '#777', marginTop: 6, lineHeight: 1.5 }}>{q.context}</p>
      )}

      <div style={{ marginTop: 20 }}>
        {isText ? (
          <div>
            <textarea
              autoFocus
              value={value === SKIP_VALUE ? '' : value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={q.placeholder || 'Type your answer here...'}
              maxLength={q.maxLength}
              rows={4}
              style={{
              width: '100%',
              background: '#000',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              padding: 14,
              color: '#fff',
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              }}
            />
            {q.maxLength && (
              <div style={{ fontSize: 11, color: '#555', marginTop: 6, textAlign: 'right' }}>
                {(value === SKIP_VALUE ? 0 : value.length)}/{q.maxLength}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {opts.map((opt) => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(opt)}
                  style={{
                    background: selected ? 'rgba(249,115,22,0.06)' : '#0a0a0a',
                    border: `1px solid ${selected ? '#f97316' : '#1a1a1a'}`,
                    borderRadius: 8,
                    padding: '14px 18px',
                    color: '#fff',
                    fontSize: 15,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={onSkip}
          style={{
            background: 'transparent',
            border: '1px solid #2a2a2a',
            color: '#888',
            padding: '11px 18px',
            borderRadius: 8,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Skip — not sure
        </button>
        {!isLast && (
          <button
            type="button"
            onClick={onNext}
            disabled={!value || (isText && value.trim().length === 0)}
            style={{
              background: !value || (isText && value.trim().length === 0) ? '#1a1a1a' : '#ffffff',
              color: !value || (isText && value.trim().length === 0) ? '#555' : '#000',
              padding: '11px 24px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              flex: 1,
              border: 'none',
              cursor: !value || (isText && value.trim().length === 0) ? 'not-allowed' : 'pointer',
            }}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
