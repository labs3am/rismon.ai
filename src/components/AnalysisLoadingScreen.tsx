import { useState, useEffect } from 'react';

interface TwoLineMessage {
  line1: string;
  line2: string;
}

const readingMessages: TwoLineMessage[] = [
  { line1: 'Reading your code', line2: 'Pulling files from your repository' },
  { line1: 'Mapping your auth flow', line2: 'Looking at how users sign in' },
  { line1: 'Inspecting payment paths', line2: 'Checking who pays and what they get' },
  { line1: 'Tracing admin routes', line2: 'Verifying restricted areas are restricted' },
  { line1: 'Checking your database rules', line2: 'Looking at row-level security' },
  { line1: 'Scanning for exposed secrets', line2: 'Keys, tokens, anything that should be private' },
  { line1: 'Almost done with the read', line2: 'Building a full picture of your app' },
];

const analyzingMessages: TwoLineMessage[] = [
  { line1: 'Comparing intent to code', line2: 'What you said vs what was built' },
  { line1: 'Reviewing every gap we found', line2: 'Ranking by real business impact' },
  { line1: 'Checking promise vs proof', line2: 'Does your homepage match your code?' },
  { line1: 'Cross-checking security findings', line2: 'Removing anything that does not hold up' },
  { line1: 'Preparing your honest report', line2: 'A few more seconds' },
];

const generatingMessages: TwoLineMessage[] = [
  { line1: 'Writing your fix prompts', line2: 'Tailored to your codebase style' },
  { line1: 'Matching prompts to your platform', line2: 'So you can paste them straight in' },
  { line1: 'Polishing the final report', line2: 'Almost there' },
];

const tips = [
  'We read your code but never store it.',
  'The free plan covers your most critical files.',
  'Most AI-built apps have at least one intent gap.',
  'After fixing issues, run another scan to verify.',
];

interface Props {
  stage: 'reading' | 'analyzing' | 'generating';
  fileCount?: number;
  totalFiles?: number;
  currentFile?: string;
  promptCount?: number;
  totalPrompts?: number;
}

export default function AnalysisLoadingScreen({ stage, fileCount = 0, totalFiles = 0, currentFile = '', promptCount = 0, totalPrompts = 0 }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [msgFade, setMsgFade] = useState(false);

  const messages = stage === 'reading' ? readingMessages : stage === 'analyzing' ? analyzingMessages : generatingMessages;

  useEffect(() => {
    const t = setInterval(() => {
      setMsgFade(true);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % messages.length);
        setMsgFade(false);
      }, 350);
    }, 3200);
    return () => clearInterval(t);
  }, [messages.length]);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 5000);
    return () => clearInterval(t);
  }, []);

  const currentMsg = messages[msgIdx];

  const pct = stage === 'reading' && totalFiles > 0
    ? Math.max(2, (fileCount / totalFiles) * 100)
    : stage === 'generating' && totalPrompts > 0
      ? Math.max(2, (promptCount / totalPrompts) * 100)
      : null;

  const stageLabel =
    stage === 'reading' ? 'Reading your code' :
    stage === 'analyzing' ? 'Analyzing your app' :
    'Writing fix prompts';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#000000' }}>
      {/* Top status bar */}
      <div style={{ borderBottom: '1px solid #ffffff10', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(14px)' }}>
        <div className="flex items-center justify-between" style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px' }}>
          <div className="flex items-center gap-3 min-w-0">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f97316', boxShadow: '0 0 12px rgba(249,115,22,0.6)', flexShrink: 0 }} />
            <span className="text-[13px] font-medium" style={{ color: '#ffffff', letterSpacing: '-0.01em' }}>{stageLabel}</span>
            {currentFile && stage === 'reading' && (
              <span className="text-[12px] font-mono truncate hidden sm:inline" style={{ color: '#52525b', maxWidth: 360 }}>
                {currentFile}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {totalFiles > 0 && stage === 'reading' && (
              <span className="text-[12px] tabular-nums" style={{ color: '#71717a' }}>
                {fileCount}/{totalFiles}
              </span>
            )}
            {stage === 'generating' && totalPrompts > 0 && (
              <span className="text-[12px] tabular-nums" style={{ color: '#71717a' }}>
                {promptCount}/{totalPrompts}
              </span>
            )}
          </div>
        </div>

        {/* Progress line */}
        <div style={{ height: 1.5, background: '#ffffff08', position: 'relative', overflow: 'hidden' }}>
          {pct !== null ? (
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: '#f97316',
                boxShadow: '0 0 12px rgba(249,115,22,0.5)',
                transition: 'width 0.5s ease',
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '32%',
                background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
                animation: 'rismonSweep 1.8s ease-in-out infinite',
              }}
            />
          )}
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full text-center" style={{ maxWidth: 520, marginTop: -32 }}>
          {/* Pulsing ring icon */}
          <div className="mx-auto" style={{ width: 64, height: 64, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px solid #ffffff10',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px solid #f97316',
                borderTopColor: 'transparent',
                animation: 'spin 1.4s linear infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 18,
                borderRadius: '50%',
                background: '#f97316',
                opacity: 0.85,
                boxShadow: '0 0 24px rgba(249,115,22,0.55)',
              }}
            />
          </div>

          {/* Rotating message */}
          <div className="mt-10" style={{ opacity: msgFade ? 0 : 1, transition: 'opacity 0.35s ease', minHeight: 64 }}>
            <p style={{ color: '#ffffff', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              {currentMsg.line1}
            </p>
            <p style={{ color: '#71717a', fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
              {currentMsg.line2}
            </p>
          </div>

          {/* File counter (subtle) */}
          {stage === 'reading' && totalFiles > 0 && (
            <p className="mt-8 text-[12px] tabular-nums" style={{ color: '#52525b' }}>
              File {fileCount} of {totalFiles}
            </p>
          )}
          {stage === 'generating' && totalPrompts > 0 && (
            <p className="mt-8 text-[12px] tabular-nums" style={{ color: '#52525b' }}>
              Prompt {promptCount} of {totalPrompts}
            </p>
          )}
        </div>
      </div>

      {/* Bottom rotating tip */}
      <div style={{ borderTop: '1px solid #ffffff10', padding: '16px 24px', background: '#000' }}>
        <div className="flex items-center justify-center gap-2" style={{ maxWidth: 600, margin: '0 auto' }}>
          <span className="text-[10px] font-semibold" style={{ color: '#f97316', letterSpacing: '0.12em' }}>TIP</span>
          <span className="text-[12px] text-center" style={{ color: '#52525b', lineHeight: 1.5 }}>{tips[tipIdx]}</span>
        </div>
      </div>

      <style>{`
        @keyframes rismonSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(420%); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
