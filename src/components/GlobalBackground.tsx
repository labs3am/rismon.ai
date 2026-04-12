export default function GlobalBackground() {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute w-[600px] h-[600px] rounded-full top-[-100px] left-[-100px] bg-orb-orange animate-float-slow" />
      <div className="absolute w-[500px] h-[500px] rounded-full bottom-[-80px] right-[-80px] bg-orb-red animate-float-slow-reverse" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern" />

      {/* Noise texture */}
      <div className="absolute inset-0 bg-noise opacity-[0.03]" />

      {/* Left vertical text */}
      <div
        className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 z-10"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        <span className="text-[11px] font-semibold tracking-[0.3em] text-primary/20 select-none">
          RISMON.AI
        </span>
      </div>

      {/* Right floating badge */}
      <div className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-10 flex-col items-center gap-1">
        <div className="bg-card/60 border border-border/50 backdrop-blur-sm rounded-lg px-2.5 py-2 text-center">
          <p className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider">{today}</p>
          <p className="text-[10px] font-semibold text-primary/30 mt-0.5">v1.0</p>
        </div>
      </div>
    </div>
  );
}
