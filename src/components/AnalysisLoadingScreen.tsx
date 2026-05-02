import { useState, useEffect, useRef } from 'react';
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

// Each stage owns a slice of the bar. The bar moves continuously inside its
// slice using real signals when we have them, and a smooth time-based easing
// otherwise. This makes the scan feel honest and alive instead of stalling
// at an arbitrary number while the AI thinks.
const STAGE_BOUNDS: Record<Props['stage'], [number, number]> = {
  reading: [0, 35],
  analyzing: [35, 75],
  generating: [75, 98],
};

// Rough expected duration per stage (ms). Used only when we have no real
// signal — generates a smooth crawl that asymptotically approaches the upper
// bound but never reaches it, so the bar feels like progress without ever
// "lying" by claiming completion early.
const STAGE_EXPECTED_MS: Record<Props['stage'], number> = {
  reading: 18000,
  analyzing: 35000,
  generating: 22000,
};

export default function AnalysisLoadingScreen({ stage, fileCount = 0, totalFiles = 0, currentFile = '', promptCount = 0, totalPrompts = 0 }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [fade, setFade] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [tick, setTick] = useState(0);
  const stageStartRef = useRef<number>(Date.now());
  const lastStageRef = useRef<Props['stage']>(stage);

  // Reset the per-stage timer whenever we move to a new stage.
  useEffect(() => {
    if (lastStageRef.current !== stage) {
      lastStageRef.current = stage;
      stageStartRef.current = Date.now();
    }
  }, [stage]);

  // Drive a smooth, frequent re-render so the time-based easing animates.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, []);

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

  // Warn the user not to switch tabs / close the tab while a scan is running.
  // Background tabs throttle network requests, which can kill the in-flight
  // edge function call and surface as a "scan failed" toast on return.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onVisibility = () => setTabHidden(document.visibilityState === 'hidden');
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const stageLabel =
    stage === 'reading' ? 'Reading' : stage === 'analyzing' ? 'Analyzing' : 'Generating fixes';

  // ---- Compute a single, continuous percentage across all three stages ----
  const [lo, hi] = STAGE_BOUNDS[stage];
  const range = hi - lo;

  // Real-signal portion (0..1) within the current stage, when available.
  let signalRatio: number | null = null;
  if (stage === 'reading' && totalFiles > 0) {
    signalRatio = Math.min(1, fileCount / totalFiles);
  } else if (stage === 'generating' && totalPrompts > 0) {
    signalRatio = Math.min(1, promptCount / totalPrompts);
  }

  // Time-based easing portion (0..1). Approaches 1 asymptotically so it
  // never claims the stage is done before it actually is.
  const elapsed = Date.now() - stageStartRef.current;
  const expected = STAGE_EXPECTED_MS[stage];
  const timeRatio = 1 - Math.exp(-elapsed / (expected * 0.6));

  // Use whichever is further along — real signal beats easing, but easing
  // keeps the bar moving when no signal is reported.
  const innerRatio = Math.max(signalRatio ?? 0, timeRatio * 0.95);
  const progressPct = Math.min(hi - 0.5, lo + range * innerRatio);
  // Suppress unused-variable lint for the render tick.
  void tick;

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
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #f97316, #fb923c)',
              borderRadius: 999,
              transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
              boxShadow: '0 0 12px rgba(249,115,22,0.45)',
            }}
          />
          {/* Subtle shimmer on top of the filled bar to keep it feeling alive */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: `${progressPct}%`,
              overflow: 'hidden',
              borderRadius: 999,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '40%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                animation: 'rismonShimmer 2.2s ease-in-out infinite',
              }}
            />
          </div>
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

        {/* Tab-switch warning */}
        <div
          style={{
            marginTop: 28,
            padding: '12px 16px',
            borderRadius: 10,
            background: tabHidden ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.02)',
            border: tabHidden ? '1px solid rgba(249,115,22,0.35)' : '1px solid #1a1a1a',
            transition: 'background 0.3s ease, border-color 0.3s ease',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: tabHidden ? '#f97316' : '#a1a1aa',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {tabHidden ? 'Come back to this tab' : 'Keep this tab open'}
          </div>
          <div style={{ fontSize: 13, color: '#71717a', marginTop: 6, lineHeight: 1.5 }}>
            Switching tabs or closing this window can interrupt the scan. Please wait here until your report is ready.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rismonShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
