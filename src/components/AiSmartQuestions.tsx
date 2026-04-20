import { useMemo, useState } from 'react';

export interface AiQuestion {
  id: string;
  question: string;
  context?: string;
  answer_type?: 'yes_no' | 'text' | 'select';
  options?: string[];
}

interface Props {
  /** Questions Claude generated from reading the code (3–8). */
  questions: AiQuestion[];
  /** Free-text correction the user wrote on the previous step (if any). */
  userCorrection?: string;
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
  onComplete: () => void;
}

/**
 * Renders the dynamic questions Claude wrote after reading the code.
 * Every question is skippable — we'd rather have an honest "skip" than a
 * bad guess. The 2 most important questions are always asked even if Claude
 * generated none, so we always have minimum signal on access + concern.
 */
const ALWAYS_ASK: AiQuestion[] = [
  {
    id: '_concern',
    question: "What worries you most about your app right now?",
    context: 'Your answer drives what we look at first.',
    answer_type: 'text',
  },
  {
    id: '_access',
    question: 'Who should be able to use the main features?',
    context: 'This helps us check if the access rules match.',
    answer_type: 'select',
    options: [
      'Only me / my team',
      'Anyone who signs up',
      'Only paying users',
      'Mix — some free, some paid',
      "It's complicated — I'll explain",
    ],
  },
];

const SKIP_VALUE = '__skip__';

export default function AiSmartQuestions({
  questions,
  userCorrection,
  answers,
  setAnswers,
  onComplete,
}: Props) {
  // Merge Claude's questions with the always-ask ones, deduped by id.
  const merged = useMemo(() => {
    const all = [...ALWAYS_ASK, ...(questions || [])];
    const seen = new Set<string>();
    return all
      .filter((q) => {
        if (!q?.id || seen.has(q.id)) return false;
        seen.add(q.id);
        return true;
      })
      .slice(0, 10);
  }, [questions]);

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
          Step 2 of 2 · {answeredCount}/{merged.length} answered
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
          A few quick questions
        </h2>
        <p style={{ fontSize: 14, color: '#888', lineHeight: 1.5 }}>
          Skip anything you're not sure about — we'd rather you skip than guess.
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
          onChange={(v) => setAnswer(currentQ.id, v)}
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
          <textarea
            autoFocus
            value={value === SKIP_VALUE ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer here..."
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
