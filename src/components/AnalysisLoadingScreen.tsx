import { useState, useEffect } from 'react';

const readingMessages = [
  "Sneaking into your codebase...",
  "Reading 847 lines so you don't have to...",
  "Finding the things your AI forgot to mention...",
  "Checking if your payments actually work...",
  "Looking for doors your AI left unlocked...",
  "Counting tables in your database...",
  "Investigating suspicious admin routes...",
  "Asking your code some tough questions...",
  "Discovering features you didn't know existed...",
  "Reading the fine print your AI skipped...",
  "Checking who can see what in your app...",
  "Making sure your secrets are actually secret...",
];

const analyzingMessages = [
  "Comparing what you said to what was built...",
  "Finding the gaps between dream and reality...",
  "Your AI worked hard. We check its homework...",
  "Looking for things that could go wrong...",
  "Cross-referencing your vision with your code...",
  "Hunting for the sneaky security stuff...",
  "Checking if your business logic makes sense...",
  "Making sure the right people see the right things...",
  "Verifying your payment gates are actually locked...",
  "Almost there. Your report is taking shape...",
];

const generatingMessages = [
  "Writing your fix instructions...",
  "Learning how your code thinks...",
  "Crafting prompts your AI will actually understand...",
  "Making fixes that match your code style...",
  "Writing the exact words to make Lovable behave...",
  "Almost ready. Good things take a moment...",
  "Packaging your fixes with care...",
  "Your prompts are being hand-crafted by AI...",
  "Making sure each fix is specific to your app...",
  "Putting the finishing touches on your report...",
];

const subMessages = [
  "This usually takes about 30 seconds",
  "Your code is never stored",
  "We read everything so you don't have to",
  "Almost done. Promise.",
];

const tips = [
  "Most AI-built apps have at least one gap between intent and reality",
  "The most common issue we find is paid features accessible for free",
  "Rismon.ai reads your code but never stores it",
  "After fixing issues, run another scan to verify",
  "The free plan includes 3 analyses per week",
];

const fakeCodeLines = [
  { num: 1, text: 'import { auth } from', color: '#818cf8' },
  { num: 2, text: 'const verifyPayment =', color: '#86efac' },
  { num: 3, text: '  if (!user.isPaid)', color: '#fcd34d' },
  { num: 4, text: '    throw new Error(', color: '#fca5a5' },
  { num: 5, text: 'export async function', color: '#818cf8' },
  { num: 6, text: '  const session = await', color: '#71717a' },
  { num: 7, text: '  return db.query({', color: '#86efac' },
  { num: 8, text: '    where: { role:', color: '#fcd34d' },
  { num: 9, text: '  const policy = new', color: '#818cf8' },
  { num: 10, text: '  await stripe.check(', color: '#fca5a5' },
  { num: 11, text: '  if (isAdmin) {', color: '#86efac' },
  { num: 12, text: '    grant("full")', color: '#fcd34d' },
];

const fakePrompts = [
  `In the file src/middleware/auth.ts, add a check before the route handler that verifies the user has an active subscription. Right now, any logged-in user can access /api/premium without payment verification.`,
  `Update your RLS policy on the orders table. Currently it allows SELECT for all authenticated users. Change it to only allow users to see their own orders using auth.uid() = user_id.`,
  `In src/pages/AdminDashboard.tsx, the admin check only looks at localStorage. Replace this with a server-side role check using your user_roles table and the has_role() function.`,
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
  const [subIdx, setSubIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [codeRound, setCodeRound] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [msgFade, setMsgFade] = useState(false);
  const [promptCharIdx, setPromptCharIdx] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);

  const messages = stage === 'reading' ? readingMessages : stage === 'analyzing' ? analyzingMessages : generatingMessages;

  // Rotate messages
  useEffect(() => {
    const t = setInterval(() => {
      setMsgFade(true);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % messages.length);
        setSubIdx(i => (i + 1) % subMessages.length);
        setMsgFade(false);
      }, 400);
    }, 2500);
    return () => clearInterval(t);
  }, [messages.length]);

  // Rotate tips
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Code line animation for reading stage
  useEffect(() => {
    if (stage !== 'reading') return;
    setVisibleLines(0);
    setFadeOut(false);
    const lineTimer = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= 12) {
          setFadeOut(true);
          setTimeout(() => {
            setFadeOut(false);
            setCodeRound(r => r + 1);
            setVisibleLines(0);
          }, 800);
          clearInterval(lineTimer);
          return prev;
        }
        return prev + 1;
      });
    }, 400);
    return () => clearInterval(lineTimer);
  }, [stage, codeRound]);

  // Prompt typing animation for generating stage
  useEffect(() => {
    if (stage !== 'generating') return;
    const currentPrompt = fakePrompts[promptIdx % fakePrompts.length];
    if (promptCharIdx >= currentPrompt.length) {
      const timeout = setTimeout(() => {
        setPromptCharIdx(0);
        setPromptIdx(i => i + 1);
      }, 1500);
      return () => clearTimeout(timeout);
    }
    const t = setTimeout(() => setPromptCharIdx(i => i + 2), 30);
    return () => clearTimeout(t);
  }, [stage, promptCharIdx, promptIdx]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top status bar */}
      <div className="w-full border-b border-border px-6 md:px-10 py-3 flex items-center justify-between" style={{ background: '#111111', borderColor: '#1e1e1e' }}>
        <span className="text-muted-foreground text-[13px]">
          {stage === 'reading' && 'Rismon.ai is reading your app'}
          {stage === 'analyzing' && 'Rismon.ai is analyzing your app'}
          {stage === 'generating' && 'Rismon.ai is writing your fix prompts'}
        </span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#22c55e' }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#22c55e' }} />
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-start pt-12 md:pt-16 px-4">
        {/* Reading stage: fake code editor */}
        {stage === 'reading' && (
          <div className="w-full max-w-[480px] mx-auto rounded-2xl overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid #1e1e1e' }}>
            {/* Editor header */}
            <div className="flex items-center px-5 py-3 border-b" style={{ borderColor: '#1e1e1e' }}>
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
              </div>
              <span className="text-xs mx-auto" style={{ color: '#52525b' }}>app-analysis.ts</span>
            </div>
            {/* Code lines */}
            <div className="p-5 min-h-[320px]">
              {fakeCodeLines.map((line, i) => (
                <div
                  key={`${codeRound}-${i}`}
                  className="flex items-center gap-3 h-6"
                  style={{
                    opacity: i < visibleLines ? (fadeOut ? 0 : 1) : 0,
                    transform: i < visibleLines ? 'translateX(0)' : 'translateX(-20px)',
                    transition: fadeOut ? 'opacity 0.6s ease' : 'opacity 0.3s ease, transform 0.3s ease',
                  }}
                >
                  <span className="text-xs w-5 text-right shrink-0" style={{ color: '#3f3f46' }}>{line.num}</span>
                  <span className="text-sm font-mono" style={{ color: line.color }}>{line.text}</span>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="mx-5 mb-5 rounded-full overflow-hidden" style={{ background: '#1e1e1e', height: '3px' }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                  animation: 'progressSweep 8s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        )}

        {/* Analyzing stage: comparison visual */}
        {stage === 'analyzing' && (
          <div className="w-full max-w-[600px] mx-auto">
            <div className="flex items-stretch gap-3 md:gap-6">
              {/* Left: description */}
              <div className="flex-1 rounded-xl p-5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-xs font-semibold mb-4" style={{ color: '#818cf8' }}>Your description</p>
                {['Users pay for premium', 'Admin panel is private', 'Orders are per-user', 'Roles control access'].map((t, i) => (
                  <div key={i} className="mb-2" style={{ animation: `fadeSlideIn 0.4s ease ${i * 0.3}s both` }}>
                    <span className="inline-block text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>{t}</span>
                  </div>
                ))}
              </div>
              {/* Arrows */}
              <div className="flex flex-col justify-center gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="text-primary" style={{ animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite` }}>→</div>
                ))}
              </div>
              {/* Right: code findings */}
              <div className="flex-1 rounded-xl p-5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-xs font-semibold mb-4" style={{ color: '#f59e0b' }}>What we found in code</p>
                {['Payment gate missing', 'Admin route exposed', 'No RLS on orders', 'Roles unchecked'].map((t, i) => (
                  <div key={i} className="mb-2" style={{ animation: `fadeSlideIn 0.4s ease ${i * 0.3 + 0.5}s both` }}>
                    <span className="inline-block text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-muted-foreground text-[15px] text-center mt-8">Comparing your vision to your code</p>
          </div>
        )}

        {/* Generating stage: prompt builder */}
        {stage === 'generating' && (
          <div className="w-full max-w-[480px] mx-auto">
            <div className="rounded-2xl overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid #1e1e1e' }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: '#1e1e1e' }}>
                <span className="text-xs font-mono" style={{ color: '#52525b' }}>fix-prompt-{String(promptIdx + 1).padStart(2, '0')}.txt</span>
              </div>
              <div className="p-5 min-h-[200px]">
                <p className="text-sm font-mono leading-relaxed" style={{ color: '#c4b5fd' }}>
                  {fakePrompts[promptIdx % fakePrompts.length].slice(0, promptCharIdx)}
                  <span className="inline-block w-px h-4 ml-0.5 align-middle" style={{ background: '#818cf8', animation: 'blink 1s step-end infinite' }} />
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm text-center mt-5">
              Writing prompt {promptCount || (promptIdx + 1)} of {totalPrompts || '...'}
            </p>
          </div>
        )}

        {/* Rotating messages */}
        <div className="mt-10 text-center max-w-[480px] mx-auto">
          <p
            className="text-foreground text-lg font-medium"
            style={{ opacity: msgFade ? 0 : 1, transition: 'opacity 0.4s ease' }}
          >
            {messages[msgIdx]}
          </p>
          <p
            className="text-[13px] mt-2"
            style={{ color: '#52525b', opacity: msgFade ? 0 : 1, transition: 'opacity 0.4s ease' }}
          >
            {subMessages[subIdx]}
          </p>
        </div>

        {/* File counter (reading only) */}
        {stage === 'reading' && totalFiles > 0 && (
          <div className="mt-8 text-center">
            <p className="text-muted-foreground text-sm">Reading file {fileCount} of {totalFiles}</p>
            {currentFile && <p className="text-xs font-mono mt-1" style={{ color: '#52525b' }}>{currentFile}</p>}
          </div>
        )}
      </div>

      {/* Bottom tips */}
      <div className="border-t px-6 md:px-10 py-5" style={{ borderColor: '#1e1e1e' }}>
        <div className="max-w-[600px] mx-auto">
          <span className="text-xs font-semibold" style={{ color: '#6366f1' }}>TIP: </span>
          <span className="text-xs" style={{ color: '#52525b' }}>{tips[tipIdx]}</span>
        </div>
      </div>

      <style>{`
        @keyframes progressSweep {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
