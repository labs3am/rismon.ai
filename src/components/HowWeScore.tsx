/**
 * Clean, static "How we score" section.
 * No scroll fade-ins, no AI shimmer. Just a horizontal score bar with labeled
 * zones and a worked example. Apple/Linear feel.
 */

const ZONES = [
  { from: 55, to: 64, label: 'Significant work', color: '#ef4444' },
  { from: 65, to: 74, label: 'Needs work', color: '#f97316' },
  { from: 75, to: 88, label: 'Good', color: '#eab308' },
  { from: 89, to: 94, label: 'Strong', color: '#84cc16' },
  { from: 95, to: 100, label: 'Excellent', color: '#22c55e' },
];

const RANGE_MIN = 55;
const RANGE_MAX = 100;
const SPAN = RANGE_MAX - RANGE_MIN;

const DEDUCTIONS = [
  { label: 'Critical issue', delta: '−10', color: '#ef4444', desc: 'Anyone-can-read data, exposed master key, paywall bypass.' },
  { label: 'High issue', delta: '−5', color: '#f97316', desc: 'Paid users overlap with free users, admin actions without checks.' },
  { label: 'Medium issue', delta: '−2', color: '#eab308', desc: 'False promise on the homepage, missing usage cap, weak fallback.' },
  { label: 'Low issue', delta: '−0.5', color: '#3b82f6', desc: 'Minor inconsistency or polish item we noticed.' },
];

const EXAMPLE_SCORE = 83;
const EXAMPLE_PCT = ((EXAMPLE_SCORE - RANGE_MIN) / SPAN) * 100;

function pct(n: number) {
  return ((n - RANGE_MIN) / SPAN) * 100;
}

export default function HowWeScore() {
  return (
    <section
      id="how-we-score"
      style={{
        background: '#0a0a0a',
        borderTop: '1px solid #ffffff14',
        padding: '120px 24px',
      }}
    >
      <div className="max-w-[1100px] mx-auto">
        <p className="vercel-label">HOW WE SCORE</p>
        <h2 className="vercel-headline">From 100 to your real score</h2>
        <p
          style={{
            fontSize: 16,
            color: '#888',
            lineHeight: 1.7,
            maxWidth: 640,
            marginTop: 16,
          }}
        >
          Your Intent Score is the same math every time. No vibes. We start at 100, subtract for each
          thing that does not match your business, and floor at 55 so a single bad finding never wipes
          out a working app.
        </p>

        {/* Horizontal score bar */}
        <div className="mt-16">
          <div
            style={{
              border: '1px solid #ffffff14',
              borderRadius: 16,
              padding: '32px 28px 24px',
              background: '#000',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 18,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  color: '#888',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Score range
              </p>
              <p style={{ fontSize: 12, color: '#555', fontVariantNumeric: 'tabular-nums' }}>
                {RANGE_MIN} – {RANGE_MAX}
              </p>
            </div>

            {/* Bar */}
            <div
              style={{
                position: 'relative',
                height: 28,
                borderRadius: 999,
                overflow: 'hidden',
                display: 'flex',
                background: '#0a0a0a',
                border: '1px solid #ffffff10',
              }}
            >
              {ZONES.map((z, i) => {
                const width = ((z.to - z.from + 1) / (SPAN + 1)) * 100;
                return (
                  <div
                    key={i}
                    style={{
                      width: `${width}%`,
                      background: z.color,
                      opacity: 0.85,
                    }}
                    title={`${z.from}–${z.to} · ${z.label}`}
                  />
                );
              })}

              {/* Example score marker */}
              <div
                style={{
                  position: 'absolute',
                  top: -4,
                  bottom: -4,
                  left: `${EXAMPLE_PCT}%`,
                  width: 3,
                  background: '#fff',
                  borderRadius: 2,
                  transform: 'translateX(-50%)',
                  boxShadow: '0 0 0 4px rgba(0,0,0,0.6)',
                }}
              />
            </div>

            {/* Tick labels */}
            <div
              style={{
                position: 'relative',
                marginTop: 10,
                height: 36,
              }}
            >
              {ZONES.map((z, i) => {
                const center = (z.from + z.to) / 2;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${pct(center)}%`,
                      transform: 'translateX(-50%)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#555', fontVariantNumeric: 'tabular-nums' }}>
                      {z.from}–{z.to}
                    </div>
                    <div style={{ fontSize: 11, color: z.color, fontWeight: 500, marginTop: 2 }}>
                      {z.label}
                    </div>
                  </div>
                );
              })}

              {/* Example marker label */}
              <div
                style={{
                  position: 'absolute',
                  left: `${EXAMPLE_PCT}%`,
                  transform: 'translateX(-50%)',
                  bottom: -28,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    background: '#fff',
                    color: '#000',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 999,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  Example: {EXAMPLE_SCORE}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two columns: rules + worked example */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-16">
          {/* Rules */}
          <div
            style={{
              border: '1px solid #ffffff14',
              borderRadius: 16,
              padding: 28,
              background: '#000',
            }}
          >
            <p
              style={{
                fontSize: 11,
                letterSpacing: '0.1em',
                color: '#888',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Deduction rules
            </p>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
              Each finding is weighted by severity. Verified findings count fully, unverified ones
              count at half weight.
            </p>
            <div>
              {DEDUCTIONS.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px 0',
                    borderTop: i === 0 ? 'none' : '1px solid #ffffff0a',
                  }}
                >
                  <div
                    style={{
                      minWidth: 44,
                      fontSize: 16,
                      fontWeight: 600,
                      color: d.color,
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.1,
                      paddingTop: 1,
                    }}
                  >
                    {d.delta}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 3 }}>
                      {d.label}
                    </p>
                    <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worked example */}
          <div
            style={{
              border: '1px solid #ffffff14',
              borderRadius: 16,
              padding: 28,
              background: '#000',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <p
              style={{
                fontSize: 11,
                letterSpacing: '0.1em',
                color: '#888',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Worked example
            </p>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
              A real Deep Scan with 1 high, 2 medium, and 1 low finding.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontVariantNumeric: 'tabular-nums' }}>
              <ExampleRow label="Starting score" value="100" valueColor="#22c55e" />
              <ExampleRow label="1 × High" value="−5" valueColor="#f97316" />
              <ExampleRow label="2 × Medium" value="−4" valueColor="#eab308" />
              <ExampleRow label="1 × Low" value="−0.5" valueColor="#3b82f6" />
              <div style={{ height: 1, background: '#ffffff14', margin: '8px 0' }} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingTop: 4,
                }}
              >
                <span style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>Final score</span>
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '-0.03em',
                  }}
                >
                  90.5
                  <span style={{ fontSize: 14, color: '#555', fontWeight: 500 }}>/100</span>
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                Lands in the <span style={{ color: '#84cc16' }}>Strong</span> band. The team can ship,
                but should fix the High before launch.
              </p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div
          style={{
            marginTop: 24,
            padding: '18px 20px',
            border: '1px solid #ffffff14',
            borderRadius: 12,
            background: '#000',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#22c55e',
              marginTop: 7,
              flexShrink: 0,
            }}
          />
          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>Same input, same score, every time.</span>{' '}
            We publish the rules so you can re-check our math. If a finding is wrong, mark it and the
            score recalculates instantly.
          </p>
        </div>
      </div>
    </section>
  );
}

function ExampleRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0',
      }}
    >
      <span style={{ fontSize: 13.5, color: '#aaa' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );
}
