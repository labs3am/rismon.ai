import React from 'react';

interface Props {
  value: number | null | undefined;
  label: string;
  sublabel?: string;
  size?: number;
  loading?: boolean;
  locked?: boolean;
}

function colorFor(v: number) {
  if (v >= 85) return '#22c55e';
  if (v >= 70) return '#84cc16';
  if (v >= 50) return '#f59e0b';
  return '#ef4444';
}

export default function ScoreDonut({ value, label, sublabel, size = 132, loading, locked }: Props) {
  const v = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : 0;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  const color = locked || loading ? '#3a3a3a' : colorFor(v);

  return (
    <div
      className="rounded-xl p-5 flex flex-col items-center justify-center text-center"
      style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', minHeight: size + 80 }}
    >
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#1a1a1a" strokeWidth={stroke} fill="none" />
          {!loading && !locked && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
            />
          )}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <span style={{ fontSize: 22, color: '#444', letterSpacing: '-0.04em' }}>· · ·</span>
          ) : locked ? (
            <span style={{ fontSize: 22, color: '#444' }}>—</span>
          ) : (
            <>
              <span style={{ fontSize: 34, color: color, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {Math.round(v)}
              </span>
              <span style={{ fontSize: 11, color: '#555', marginTop: 2 }}>/ 100</span>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 text-[13px] font-medium" style={{ color: '#e5e5e5' }}>{label}</div>
      {sublabel && <div className="text-[11px] mt-1" style={{ color: '#666' }}>{sublabel}</div>}
    </div>
  );
}
