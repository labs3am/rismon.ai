import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-animated "How we score" section.
 * Shows 100 → deductions → cap rule → final score, with each step
 * fading in as the user scrolls into view.
 */
const STEPS = [
  {
    label: 'Start',
    op: 'Every scan starts at',
    delta: '100',
    color: '#22c55e',
    desc: 'A perfect app would keep all 100 points.',
  },
  {
    op: 'Critical issue',
    delta: '−25',
    color: '#ef4444',
    desc: 'Anyone-can-read data, exposed master key, hardcoded paywall bypass.',
  },
  {
    op: 'High issue',
    delta: '−15',
    color: '#f97316',
    desc: 'Logic that lets paying users overlap with free users, or admin actions without checks.',
  },
  {
    op: 'Medium issue',
    delta: '−8',
    color: '#eab308',
    desc: 'False promise on the homepage, missing usage cap, weaker fallback.',
  },
  {
    op: 'False promise',
    delta: '−8',
    color: '#a78bfa',
    desc: 'Homepage claims something the code does not actually do (encryption, real-time, integrations).',
  },
];

const CAPS = [
  { count: '1 critical', cap: 'cap at 60' },
  { count: '2 criticals', cap: 'cap at 35' },
  { count: '3+ criticals', cap: 'cap at 20' },
];

function useReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, shown };
}

function CountUp({ to, shown, duration = 900 }: { to: number; shown: boolean; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!shown) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown, to, duration]);
  return <>{n}</>;
}

export default function HowWeScore() {
  const header = useReveal<HTMLDivElement>(0.15);
  const final = useReveal<HTMLDivElement>(0.4);

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
        <div
          ref={header.ref}
          style={{
            opacity: header.shown ? 1 : 0,
            transform: header.shown ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
          }}
        >
          <p className="vercel-label">HOW WE SCORE</p>
          <h2 className="vercel-headline">From 100 to your real score</h2>
          <p
            style={{
              fontSize: '16px',
              color: '#888888',
              lineHeight: 1.7,
              maxWidth: '640px',
              marginTop: '16px',
            }}
          >
            Your Intent Score is the same math every time. No vibes, no AI guessing.
            We start at 100 and subtract for each thing that does not match your business.
          </p>
        </div>

        {/* Deduction ladder */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
          {/* Left rail: deductions */}
          <div>
            {STEPS.map((s, i) => {
              const item = useReveal<HTMLDivElement>(0.3);
              return (
                <div
                  key={i}
                  ref={item.ref}
                  style={{
                    opacity: item.shown ? 1 : 0,
                    transform: item.shown ? 'translateX(0)' : 'translateX(-20px)',
                    transition: `opacity 0.5s ease-out ${i * 90}ms, transform 0.5s ease-out ${i * 90}ms`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '14px 16px',
                    marginBottom: '8px',
                    border: '1px solid #ffffff10',
                    borderRadius: '10px',
                    background: '#000000',
                  }}
                >
                  <div
                    style={{
                      minWidth: '60px',
                      textAlign: 'center',
                      fontSize: '20px',
                      fontWeight: 700,
                      color: s.color,
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.1,
                      paddingTop: '2px',
                    }}
                  >
                    {s.delta}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#ffffff',
                        marginBottom: '4px',
                      }}
                    >
                      {s.op}
                    </p>
                    <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center connector — only on desktop */}
          <div
            className="hidden md:flex flex-col items-center justify-center"
            style={{ height: '100%', minHeight: '380px', paddingTop: '40px' }}
          >
            <div
              style={{
                width: '1px',
                flex: 1,
                background: 'linear-gradient(to bottom, transparent, #f97316 50%, transparent)',
                opacity: header.shown ? 1 : 0,
                transition: 'opacity 0.8s ease-out 0.3s',
              }}
            />
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#f97316',
                margin: '8px 0',
                boxShadow: '0 0 16px #f97316aa',
                opacity: header.shown ? 1 : 0,
                transition: 'opacity 0.8s ease-out 0.5s',
              }}
            />
            <div
              style={{
                width: '1px',
                flex: 1,
                background: 'linear-gradient(to bottom, transparent, #f97316 50%, transparent)',
                opacity: header.shown ? 1 : 0,
                transition: 'opacity 0.8s ease-out 0.7s',
              }}
            />
          </div>

          {/* Right rail: caps + final score */}
          <div>
            <div
              style={{
                border: '1px solid #ffffff14',
                borderRadius: '12px',
                padding: '20px',
                background: '#000000',
                marginBottom: '16px',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  color: '#f97316',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                }}
              >
                Critical caps
              </p>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '14px', lineHeight: 1.5 }}>
                Even if the math says higher, criticals force a hard ceiling.
              </p>
              {CAPS.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderTop: i === 0 ? 'none' : '1px solid #ffffff0a',
                  }}
                >
                  <span style={{ fontSize: '13px', color: '#ffffff' }}>{c.count}</span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#ef4444',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {c.cap}
                  </span>
                </div>
              ))}
            </div>

            {/* Final-score reveal */}
            <div
              ref={final.ref}
              style={{
                border: '1px solid #f9731633',
                borderRadius: '12px',
                padding: '28px 20px',
                background: 'radial-gradient(120% 140% at 50% 0%, #f9731610, transparent 70%), #000000',
                textAlign: 'center',
                opacity: final.shown ? 1 : 0,
                transform: final.shown ? 'scale(1)' : 'scale(0.96)',
                transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  color: '#888',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                }}
              >
                Example final score
              </p>
              <div
                style={{
                  fontSize: '64px',
                  fontWeight: 700,
                  color: '#f97316',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.04em',
                }}
              >
                <CountUp to={42} shown={final.shown} />
                <span style={{ fontSize: '24px', color: '#555', fontWeight: 500 }}>/100</span>
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: '#888',
                  marginTop: '14px',
                  lineHeight: 1.5,
                }}
              >
                100 − 25 (1 critical) − 15 (1 high) − 8 (1 medium) − 8 (1 false promise)
                <br />
                <span style={{ color: '#666' }}>= 44, then capped at 60 for the critical = </span>
                <span style={{ color: '#f97316', fontWeight: 600 }}>44</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div
          style={{
            marginTop: '40px',
            padding: '20px',
            border: '1px dashed #ffffff14',
            borderRadius: '10px',
            background: '#000000',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            opacity: final.shown ? 1 : 0,
            transition: 'opacity 0.6s ease-out 0.2s',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#22c55e',
              marginTop: '8px',
              flexShrink: 0,
            }}
          />
          <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.6 }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>Same input, same score, every time.</span>{' '}
            We publish the rules so anyone can re-check our math. If a finding turns out to be wrong, you can dispute it
            and the score recalculates instantly.
          </p>
        </div>
      </div>
    </section>
  );
}
