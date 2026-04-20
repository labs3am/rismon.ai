import { useState, useEffect } from 'react';
import Logo from './Logo';

const readingMessages = [
  'Reading your repository',
  'Scanning authentication',
  'Checking secrets and keys',
  'Analyzing payment logic',
  'Verifying admin protection',
  'Inspecting database access',
  'Mapping your app structure',
];

const analyzingMessages = [
  'Comparing your vision to your code',
  'Finding gaps between intent and implementation',
  'Reviewing security configurations',
  'Verifying paid features are gated',
  'Ranking issues by business impact',
];

const generatingMessages = [
  'Learning your code style',
  'Crafting platform-specific fixes',
  'Customizing prompts to your codebase',
  'Finalizing your report',
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
  const [fade, setFade] = useState(false);

  const messages = stage === 'reading' ? readingMessages : stage === 'analyzing' ? analyzingMessages : generatingMessages;

  useEffect(() => {
    const t = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % messages.length);
        setFade(false);
      }, 400);
    }, 2800);
    return () => clearInterval(t);
  }, [messages.length]);

  const stageLabel =
    stage === 'reading' ? 'Reading' : stage === 'analyzing' ? 'Analyzing' : 'Generating fixes';

  const progressPct =
    stage === 'reading' && totalFiles > 0
      ? Math.max(2, (fileCount / totalFiles) * 100)
      : stage === 'generating' && totalPrompts > 0
        ? Math.max(2, (promptCount / totalPrompts) * 100)
        : null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#000000' }}
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(ellipse at center top, rgba(249,115,22,0.08), transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', textAlign: 'center', width: '100%', maxWidth: 480 }}>
        <Logo to={undefined as any} size="lg" />

        {/* Stage label */}
        <div
          style={{
            marginTop: 48,
            fontSize: 11,
            color: '#666',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {stageLabel}
        </div>

        {/* Rotating message */}
        <div
          style={{
            marginTop: 14,
            minHeight: 36,
            opacity: fade ? 0 : 1,
            transition: 'opacity 0.4s ease',
            color: '#ffffff',
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1.3,
          }}
        >
          {messages[msgIdx]}
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 36,
            width: '100%',
            height: 3,
            background: '#141414',
            borderRadius: 999,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {progressPct !== null ? (
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: '#f97316',
                borderRadius: 999,
                transition: 'width 0.5s ease',
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '35%',
                background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
                animation: 'rismonIndeterminate 1.6s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {/* Counter */}
        <div
          style={{
            marginTop: 14,
            fontSize: 12,
            color: '#555',
            fontVariantNumeric: 'tabular-nums',
            minHeight: 18,
          }}
        >
          {stage === 'reading' && totalFiles > 0 && (
            <span>
              {fileCount} of {totalFiles} files
              {currentFile && (
                <span style={{ marginLeft: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#3a3a3a' }}>
                  · {currentFile.length > 40 ? '…' + currentFile.slice(-40) : currentFile}
                </span>
              )}
            </span>
          )}
          {stage === 'generating' && totalPrompts > 0 && (
            <span>
              {promptCount} of {totalPrompts} prompts
            </span>
          )}
          {stage === 'analyzing' && <span>This usually takes 30–60 seconds</span>}
        </div>
      </div>

      <style>{`
        @keyframes rismonIndeterminate {
          0% { left: -35%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
