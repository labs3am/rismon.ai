import { useState, useEffect } from 'react';

interface TwoLineMessage {
  line1: string;
  line2: string;
}

const readingMessages: TwoLineMessage[] = [
  { line1: "Sneaking into your codebase...", line2: "Reading your authentication files" },
  { line1: "Your AI worked hard. We check its homework...", line2: "Scanning for exposed API keys and secrets" },
  { line1: "Looking for doors your AI left unlocked...", line2: "Checking if your admin panel is protected" },
  { line1: "Reading 800+ lines so you do not have to...", line2: "Analyzing your payment and subscription logic" },
  { line1: "Investigating suspicious activity...", line2: "Checking who can access what in your app" },
  { line1: "Your database has some explaining to do...", line2: "Checking if user data is protected or public" },
  { line1: "Finding features your AI built in secret...", line2: "Looking for code you never asked for" },
  { line1: "Making sure secrets are actually secret...", line2: "Scanning GitHub history for exposed keys" },
  { line1: "Checking if free users found a loophole...", line2: "Verifying your payment gates are locked" },
  { line1: "Reading the fine print your AI skipped...", line2: "Checking your database access rules" },
  { line1: "Is your admin page a public tourist spot?", line2: "Verifying admin routes require proper access" },
  { line1: "Almost done spying on your code...", line2: "Understanding your full app structure" },
];

const analyzingMessages: TwoLineMessage[] = [
  { line1: "Comparing your vision to reality...", line2: "Matching your description to your code" },
  { line1: "Your AI meant well. Let us see what happened...", line2: "Finding gaps between intent and implementation" },
  { line1: "Hunting for the sneaky stuff...", line2: "Checking security configurations" },
  { line1: "Who can see what? Good question...", line2: "Analyzing user role and permission logic" },
  { line1: "Are paying users actually paying?", line2: "Verifying subscription and payment gates" },
  { line1: "Cross-referencing everything...", line2: "Comparing code patterns to your business" },
  { line1: "Preparing your honest report...", line2: "Ranking issues by business impact" },
];

const generatingMessages: TwoLineMessage[] = [
  { line1: "Learning how your code thinks...", line2: "Matching fix style to your codebase" },
  { line1: "Writing words that Lovable will understand...", line2: "Generating platform specific fix prompts" },
  { line1: "Making sure each fix actually fits...", line2: "Customizing prompts to your code patterns" },
  { line1: "Hand-crafting your fixes with care...", line2: "Writing step by step repair instructions" },
  { line1: "Almost ready. Good things take a moment...", line2: "Finalizing your complete fix report" },
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
  const [tipIdx, setTipIdx] = useState(0);
  const [codeRound, setCodeRound] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [msgFade, setMsgFade] = useState(false);
  const [promptCharIdx, setPromptCharIdx] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);

  const messages = stage === 'reading' ? readingMessages : stage === 'analyzing' ? analyzingMessages : generatingMessages;

  useEffect(() => {
    const t = setInterval(() => {
      setMsgFade(true);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % messages.length);
        setMsgFade(false);
      }, 400);
    }, 3000);
    return () => clearInterval(t);
  }, [messages.length]);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 5000);
    return () => clearInterval(t);
  }, []);

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

  const currentMsg = messages[msgIdx];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top status bar */}
      <div className="w-full border-b px-6 md:px-10 py-3 flex items-center justify-between" style={{ background: '#111111', borderColor: '#1e1e1e' }}>
        <span className="text-[13px]" style={{ color: '#71717a' }}>
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
        {stage === 'reading' && (
          <div className="w-full max-w-[480px] mx-auto rounded-2xl overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid #1e1e1e' }}>
            <div className="flex items-center px-5 py-3 border-b" style={{ borderColor: '#1e1e1e' }}>
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
              </div>
              <span className="text-xs mx-auto" style={{ color: '#52525b' }}>app-analysis.ts</span>
            </div>
            <div className="p-5 min-h-[320px]">
              {fakeCodeLines.map((line, i) => (
                <div key={`${codeRound}-${i}`} className="flex items-center gap-3 h-6"
                  style={{
                    opacity: i < visibleLines ? (fadeOut ? 0 : 1) : 0,
                    transform: i < visibleLines ? 'translateX(0)' : 'translateX(-20px)',
                    transition: fadeOut ? 'opacity 0.6s ease' : 'opacity 0.3s ease, transform 0.3s ease',
                  }}>
                  <span className="text-xs w-5 text-right shrink-0" style={{ color: '#3f3f46' }}>{line.num}</span>
                  <span className="text-sm font-mono" style={{ color: line.color }}>{line.text}</span>
                </div>
              ))}
            </div>
            <div className="mx-5 mb-5 rounded-full overflow-hidden" style={{ background: '#1e1e1e', height: '3px' }}>
              <div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #6366f1, #818cf8)', animation: 'progressSweep 8s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        {stage === 'analyzing' && (
          <div className="w-full max-w-[600px] mx-auto">
            <div className="flex items-stretch gap-3 md:gap-6">
              <div className="flex-1 rounded-xl p-5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-xs font-semibold mb-4" style={{ color: '#818cf8' }}>Your description</p>
                {['Users pay for premium', 'Admin panel is private', 'Orders are per-user', 'Roles control access'].map((t, i) => (
                  <div key={i} className="mb-2" style={{ animation: `fadeSlideIn 0.4s ease ${i * 0.3}s both` }}>
                    <span className="inline-block text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>{t}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-center gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="text-primary" style={{ animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite` }}>→</div>
                ))}
              </div>
              <div className="flex-1 rounded-xl p-5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-xs font-semibold mb-4" style={{ color: '#f59e0b' }}>What we found in code</p>
                {['Payment gate missing', 'Admin route exposed', 'No RLS on orders', 'Roles unchecked'].map((t, i) => (
                  <div key={i} className="mb-2" style={{ animation: `fadeSlideIn 0.4s ease ${i * 0.3 + 0.5}s both` }}>
                    <span className="inline-block text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[15px] text-center mt-8" style={{ color: '#71717a' }}>Comparing your vision to your code</p>
          </div>
        )}

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
            <p className="text-sm text-center mt-5" style={{ color: '#71717a' }}>
              Writing prompt {promptCount || (promptIdx + 1)} of {totalPrompts || '...'}
            </p>
          </div>
        )}

        {/* Two-line rotating messages */}
        <div className="mt-10 text-center max-w-[480px] mx-auto" style={{ opacity: msgFade ? 0 : 1, transition: 'opacity 0.4s ease' }}>
          <p className="text-foreground text-[20px] font-semibold">{currentMsg.line1}</p>
          <p className="text-[15px] mt-2" style={{ color: '#71717a' }}>{currentMsg.line2}</p>
        </div>

        {stage === 'reading' && totalFiles > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: '#71717a' }}>Reading file {fileCount} of {totalFiles}</p>
            {currentFile && <p className="text-xs font-mono mt-1" style={{ color: '#52525b' }}>{currentFile}</p>}
          </div>
        )}
      </div>

      {/* Bottom tips - fixed and centered */}
      <div className="fixed bottom-0 left-0 right-0 w-full" style={{ background: '#080808', borderTop: '1px solid #1e1e1e', padding: '16px 40px' }}>
        <div className="max-w-[600px] mx-auto flex items-center justify-center gap-2">
          <span className="text-[11px] font-semibold shrink-0" style={{ color: '#6366f1', letterSpacing: '0.1em' }}>TIP</span>
          <span className="text-[13px] text-center leading-[1.5]" style={{ color: '#52525b' }}>{tips[tipIdx]}</span>
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
