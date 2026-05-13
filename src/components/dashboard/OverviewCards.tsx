import { Globe } from 'lucide-react';

const PANEL_BG = '#0a0a0a';

export function IntentGaugeCard({ score }: { score: number | null }) {
  const v = score == null ? 0 : Math.max(0, Math.min(100, score));
  const has = score != null;
  const color =
    !has ? '#3a3a3a' :
    v >= 85 ? '#22c55e' :
    v >= 70 ? '#84cc16' :
    v >= 50 ? '#f59e0b' : '#ef4444';
  const status =
    !has ? 'Awaiting scan' :
    v >= 90 ? 'Excellent — your code lives up to your pitch' :
    v >= 75 ? 'Strong — a few small gaps' :
    v >= 60 ? 'Good — some claims aren’t backed by code' :
    v >= 40 ? 'Needs work — several intent gaps' :
    'Critical — your code does not match what you described';

  const W = 220, H = 130, stroke = 14;
  const cx = W / 2, cy = H - 10, r = (W - stroke) / 2;
  const arcLen = Math.PI * r;
  const dash = (v / 100) * arcLen;

  const polarArc = (start: number, end: number) => {
    const sx = cx + r * Math.cos(Math.PI - Math.PI * start);
    const sy = cy - r * Math.sin(Math.PI - Math.PI * start);
    const ex = cx + r * Math.cos(Math.PI - Math.PI * end);
    const ey = cy - r * Math.sin(Math.PI - Math.PI * end);
    return `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`;
  };

  return (
    <div
      className="rounded-xl p-5 sm:p-6"
      style={{
        background: 'radial-gradient(120% 100% at 0% 0%, #1a1308 0%, #0a0a0a 60%)',
        border: '1px solid #1f1f1f',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold" style={{ color: '#888' }}>
            Intent Match
          </div>
          <div className="text-[12px] mt-1" style={{ color: '#666' }}>
            How well your code delivers what you described
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 mt-4 flex-wrap">
        <div style={{ width: W, height: H, position: 'relative', flexShrink: 0 }}>
          <svg width={W} height={H}>
            <path d={polarArc(0, 1)} stroke="#1a1a1a" strokeWidth={stroke} fill="none" strokeLinecap="round" />
            {has && (
              <path
                d={polarArc(0, 1)}
                stroke={color}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${arcLen - dash}`}
                style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
              />
            )}
          </svg>
          <div
            style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
              paddingBottom: 6,
            }}
          >
            <span style={{ fontSize: 44, fontWeight: 700, color, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {has ? Math.round(v) : '—'}
            </span>
            <span style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{has ? 'out of 100' : 'no score yet'}</span>
          </div>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div
            className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 mb-2"
            style={{ background: '#11140d', border: `1px solid ${color}40`, color }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
              {has ? (v >= 90 ? 'EXCELLENT' : v >= 75 ? 'STRONG' : v >= 60 ? 'GOOD' : v >= 40 ? 'NEEDS WORK' : 'CRITICAL') : 'PENDING'}
            </span>
          </div>
          <div className="text-[14px] leading-snug" style={{ color: '#e5e5e5' }}>
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PromiseCoverageCard({
  liveUrl, promises, onView,
}: { liveUrl: string | null; promises: any[]; onView?: () => void }) {
  if (!liveUrl) {
    return (
      <div
        className="rounded-xl p-5 sm:p-6 flex flex-col"
        style={{ background: PANEL_BG, border: '1px dashed #2a2a2a' }}
      >
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: '#888' }} />
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold" style={{ color: '#888' }}>
            Homepage Promises
          </div>
        </div>
        <div className="text-[14px] mt-3" style={{ color: '#e5e5e5', lineHeight: 1.5 }}>
          Add your homepage URL on your next scan and we'll check if the claims on your site match your code.
        </div>
      </div>
    );
  }

  const verified = promises.filter((p) => (p.verdict || '').toLowerCase() === 'found').length;
  const partial = promises.filter((p) => (p.verdict || '').toLowerCase() === 'partial').length;
  const contradicted = promises.filter((p) => {
    const v = (p.verdict || '').toLowerCase();
    return v === 'not_found' || v === 'contradicted';
  }).length;
  const total = promises.length || 1;

  return (
    <div className="rounded-xl p-5 sm:p-6" style={{ background: PANEL_BG, border: '1px solid #1f1f1f' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold" style={{ color: '#888' }}>
            Homepage Promises
          </div>
          <div className="text-[12px] mt-1" style={{ color: '#666' }}>
            Are your public claims backed by the code we scanned?
          </div>
        </div>
        {onView && (
          <button
            onClick={onView}
            style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
          >
            View →
          </button>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-5">
        <span style={{ fontSize: 44, fontWeight: 700, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>{promises.length}</span>
        <span style={{ fontSize: 13, color: '#888' }}>{promises.length === 1 ? 'promise found' : 'promises found'}</span>
      </div>

      {promises.length > 0 && (
        <>
          <div className="mt-4 flex h-2.5 rounded-full overflow-hidden" style={{ background: '#161616' }}>
            {verified > 0 && <div style={{ width: `${(verified / total) * 100}%`, background: '#22c55e' }} />}
            {partial > 0 && <div style={{ width: `${(partial / total) * 100}%`, background: '#f59e0b' }} />}
            {contradicted > 0 && <div style={{ width: `${(contradicted / total) * 100}%`, background: '#ef4444' }} />}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
            <span style={{ color: '#22c55e' }}>● {verified} verified</span>
            <span style={{ color: '#f59e0b' }}>● {partial} partial</span>
            <span style={{ color: '#ef4444' }}>● {contradicted} contradicted</span>
          </div>
        </>
      )}
    </div>
  );
}

export function SeverityBarCard({
  securityIssues, onViewAll,
}: { securityIssues: any[]; onViewAll?: () => void }) {
  const buckets = [
    { key: 'critical', label: 'Critical', color: '#ef4444' },
    { key: 'high', label: 'High', color: '#f97316' },
    { key: 'medium', label: 'Medium', color: '#f59e0b' },
    { key: 'low', label: 'Low', color: '#3b82f6' },
  ].map((b) => ({ ...b, count: securityIssues.filter((s) => (s?.severity || '').toLowerCase() === b.key).length }));
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = securityIssues.length;
  return (
    <div className="rounded-xl p-5 sm:p-6" style={{ background: PANEL_BG, border: '1px solid #1f1f1f' }}>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Security issues by severity</div>
          <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
            {total === 0 ? 'No security issues found in this scan.' : `${total} ${total === 1 ? 'issue' : 'issues'} found across the code we scanned.`}
          </div>
        </div>
        {onViewAll && total > 0 && (
          <button onClick={onViewAll} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
            View all →
          </button>
        )}
      </div>
      {total === 0 ? (
        <div className="rounded-md p-4 text-sm" style={{ background: '#08130a', border: '1px solid #16401f', color: '#86efac' }}>
          All clear — nothing to fix here.
        </div>
      ) : (
        <div className="space-y-2.5">
          {buckets.map((b) => (
            <div key={b.key} className="flex items-center gap-3">
              <div style={{ width: 70, fontSize: 12, color: '#aaa' }}>{b.label}</div>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#161616' }}>
                <div style={{ width: `${(b.count / max) * 100}%`, height: '100%', background: b.color, transition: 'width 400ms ease' }} />
              </div>
              <div style={{ width: 28, textAlign: 'right', fontSize: 13, color: '#fff', fontWeight: 600 }}>{b.count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}