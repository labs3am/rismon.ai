/**
 * "How we score" — clean, monochrome, structural.
 * No color zones, no shimmer. Typography, hairlines, tabular numbers.
 */

const ZONES = [
  { from: 40, to: 54, label: 'Needs work' },
  { from: 55, to: 74, label: 'Needs work' },
  { from: 75, to: 88, label: 'Good' },
  { from: 89, to: 94, label: 'Strong' },
  { from: 95, to: 100, label: 'Excellent' },
];

const RANGE_MIN = 40;
const RANGE_MAX = 100;
const SPAN = RANGE_MAX - RANGE_MIN;

const DEDUCTIONS = [
  { label: 'Critical', delta: '−10', desc: 'Anyone-can-read data, exposed master key, paywall bypass.' },
  { label: 'High', delta: '−5', desc: 'Paid users overlap with free, admin actions without checks.' },
  { label: 'Medium', delta: '−2', desc: 'False promise on the homepage, missing usage cap, weak fallback.' },
  { label: 'Low', delta: '−0.5', desc: 'Minor inconsistency or polish item we noticed.' },
];

const EXAMPLE_SCORE = 90.5;
const EXAMPLE_PCT = ((EXAMPLE_SCORE - RANGE_MIN) / SPAN) * 100;

function pct(n: number) {
  return ((n - RANGE_MIN) / SPAN) * 100;
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #ffffff14',
  borderRadius: 12,
  background: '#0a0a0a',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.12em',
  color: '#666',
  fontWeight: 500,
  textTransform: 'uppercase',
};

export default function HowWeScore() {
  return (
    <section
      id="how-we-score"
      style={{
        background: '#000',
        borderTop: '1px solid #ffffff14',
        padding: '120px 24px',
      }}
    >
      <div className="max-w-[1100px] mx-auto">
        <p className="vercel-label">HOW WE SCORE</p>
        <h1 className="vercel-headline">From 100 to your real score</h1>
        <p
          style={{
            fontSize: 16,
            color: '#888',
            lineHeight: 1.7,
            maxWidth: 640,
            marginTop: 16,
          }}
        >
          Same math every time. We start at 100, subtract for each finding, and floor at 55 so a
          single bad finding never wipes out a working app.
        </p>

        {/* Score scale */}
        <div className="mt-16 animate-fade-in" style={{ ...cardStyle, padding: '36px 32px 28px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 28,
            }}
          >
            <p style={labelStyle}>The scale</p>
            <p style={{ fontSize: 12, color: '#555', fontVariantNumeric: 'tabular-nums' }}>
              {RANGE_MIN} → {RANGE_MAX}
            </p>
          </div>

          {/* Tick rail */}
          <div style={{ position: 'relative', height: 56 }}>
            {/* Base line */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 22,
                height: 1,
                background: '#ffffff14',
              }}
            />

            {/* Zone segments */}
            {ZONES.map((z, i) => {
              const left = pct(z.from);
              const right = pct(z.to);
              const width = right - left;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${left}%`,
                    width: `${width}%`,
                    top: 18,
                    height: 9,
                    borderLeft: i === 0 ? 'none' : '1px solid #ffffff20',
                  }}
                />
              );
            })}

            {/* Example marker — slides in from left on mount */}
            <div
              className="hws-marker-line"
              style={{
                position: 'absolute',
                left: `${EXAMPLE_PCT}%`,
                top: 8,
                bottom: 24,
                width: 1,
                background: '#fff',
                transform: 'translateX(-50%)',
              }}
            />
            <div
              className="hws-marker-label"
              style={{
                position: 'absolute',
                left: `${EXAMPLE_PCT}%`,
                top: 0,
                transform: 'translateX(-50%)',
                fontSize: 11,
                color: '#fff',
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                background: '#000',
                padding: '0 6px',
              }}
            >
              {EXAMPLE_SCORE}
            </div>
          </div>

          {/* Zone labels */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              borderTop: '1px solid #ffffff10',
              marginTop: 8,
            }}
          >
            {ZONES.map((z, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 10px 0',
                  borderLeft: i === 0 ? 'none' : '1px solid #ffffff10',
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: '#555',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.02em',
                  }}
                >
                  {z.from}–{z.to}
                </p>
                <p style={{ fontSize: 13, color: '#e5e5e5', fontWeight: 500, marginTop: 4 }}>
                  {z.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Two columns: rules + worked example */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          {/* Rules */}
          <div className="hws-card-in" style={{ ...cardStyle, padding: 32, animationDelay: '120ms' }}>
            <p style={{ ...labelStyle, marginBottom: 6 }}>Deduction rules</p>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>
              Each finding is weighted by severity. Verified findings count fully, unverified ones
              count at half weight.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {DEDUCTIONS.map((d, i) => (
                  <tr key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid #ffffff0a' }}>
                    <td
                      style={{
                        padding: '14px 16px 14px 0',
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#fff',
                        verticalAlign: 'top',
                        width: 90,
                      }}
                    >
                      {d.label}
                    </td>
                    <td
                      style={{
                        padding: '14px 0',
                        fontSize: 13,
                        color: '#888',
                        lineHeight: 1.55,
                        verticalAlign: 'top',
                      }}
                    >
                      {d.desc}
                    </td>
                    <td
                      style={{
                        padding: '14px 0 14px 16px',
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#fff',
                        textAlign: 'right',
                        verticalAlign: 'top',
                        fontVariantNumeric: 'tabular-nums',
                        width: 56,
                      }}
                    >
                      {d.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Worked example */}
          <div className="hws-card-in" style={{ ...cardStyle, padding: 32, display: 'flex', flexDirection: 'column', animationDelay: '220ms' }}>
            <p style={{ ...labelStyle, marginBottom: 6 }}>Worked example</p>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>
              A real Deep Scan with 1 high, 2 medium, and 1 low finding.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', fontVariantNumeric: 'tabular-nums' }}>
              <ExampleRow label="Starting score" value="100" />
              <ExampleRow label="1 × High" value="−5" />
              <ExampleRow label="2 × Medium" value="−4" />
              <ExampleRow label="1 × Low" value="−0.5" />
            </div>

            <div
              style={{
                borderTop: '1px solid #ffffff14',
                marginTop: 16,
                paddingTop: 18,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontSize: 13, color: '#888' }}>Final score</span>
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 600,
                  color: '#fff',
                  letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                90.5
                <span style={{ fontSize: 14, color: '#555', fontWeight: 500 }}> / 100</span>
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#666', marginTop: 12, lineHeight: 1.5 }}>
              Lands in the <span style={{ color: '#fff' }}>Strong</span> band. Ship-ready, but the
              High finding should be fixed before launch.
            </p>
          </div>
        </div>

        {/* Footer note */}
        <div
          className="hws-card-in"
          style={{
            marginTop: 24,
            padding: '20px 24px',
            animationDelay: '320ms',
            ...cardStyle,
          }}
        >
          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
            <span style={{ color: '#fff', fontWeight: 500 }}>Same input, same score, every time.</span>{' '}
            We publish the rules so you can re-check our math. If a finding is wrong, mark it and the
            score recalculates instantly.
          </p>
        </div>

        {/* Homepage vs code check */}
        <div
          className="hws-card-in"
          style={{ marginTop: 24, padding: 32, animationDelay: '400ms', ...cardStyle }}
        >
          <p style={{ ...labelStyle, marginBottom: 6 }}>Homepage vs code check</p>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
            Part of your Intent Match score. We compare every promise on your live homepage to what
            actually exists in your repo, then weight each verdict.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
            {[
              { dot: '#22c55e', label: 'Verified', desc: 'Claim is backed by working code.', delta: '0' },
              { dot: '#f59e0b', label: 'Partial', desc: 'Built but incomplete, sandboxed, or only on some routes.', delta: '−2' },
              { dot: '#ef4444', label: 'Contradicted', desc: 'Promised on the site, not present in the code. High-severity finding.', delta: '−5' },
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 0',
                  borderTop: i === 0 ? 'none' : '1px solid #ffffff0a',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: r.dot, flexShrink: 0 }} />
                <div style={{ width: 110, fontSize: 14, fontWeight: 500, color: '#fff' }}>{r.label}</div>
                <div style={{ flex: 1, fontSize: 13, color: '#888', lineHeight: 1.55 }}>{r.desc}</div>
                <div style={{ width: 56, textAlign: 'right', fontSize: 14, fontWeight: 500, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                  {r.delta}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#555', marginTop: 16, lineHeight: 1.5 }}>
            Deductions per promise. A page with five contradicted claims can drop your Intent Match by
            25 points on its own.
          </p>
        </div>

        {/* Local keyframes for marker reveal + card stagger */}
        <style>{`
          .hws-marker-line {
            animation: hwsLineGrow 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
            transform-origin: top center;
          }
          .hws-marker-label {
            animation: hwsFadeUp 600ms cubic-bezier(0.22, 1, 0.36, 1) 500ms both;
          }
          .hws-card-in {
            opacity: 0;
            animation: hwsFadeUp 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          @keyframes hwsLineGrow {
            from { transform: translateX(-50%) scaleY(0); opacity: 0; }
            to   { transform: translateX(-50%) scaleY(1); opacity: 1; }
          }
          @keyframes hwsFadeUp {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .hws-marker-line, .hws-marker-label, .hws-card-in {
              animation: none !important;
              opacity: 1 !important;
              transform: translateX(-50%) !important;
            }
            .hws-card-in { transform: none !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

function ExampleRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderTop: '1px solid #ffffff08',
      }}
    >
      <span style={{ fontSize: 13.5, color: '#aaa' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{value}</span>
    </div>
  );
}
