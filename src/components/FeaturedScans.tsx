import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hand-picked Promise Audit IDs. Showing real, recent scans of
 * well-known sites lets a first-time visitor (or sweepstake judge)
 * click through to a real report in one tap, without running a scan.
 * Keep this list short and current — replace IDs as better scans land.
 */
const FEATURED = [
  { id: '930a8529-fb50-46a0-a6c5-f8a361086e8b', tagline: 'AI app builder' },
  { id: '2b338ef9-4a09-4ed8-ac5e-68a720fce270', tagline: 'Pre-ship safety scanner' },
  { id: 'e9fda108-e71c-43a6-83f6-e52338563a04', tagline: 'Self-hosted monitoring' },
];

type Card = {
  id: string;
  host: string;
  title: string | null;
  clarity_score: number | null;
  reality_score: number | null;
  promise_count: number;
  tagline: string;
};

export default function FeaturedScans() {
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await Promise.all(
        FEATURED.map(async (f) => {
          const { data } = await supabase.rpc('get_public_audit', { _id: f.id });
          const row: any = Array.isArray(data) ? data[0] : data;
          if (!row) return null;
          return {
            id: row.id,
            host: row.url_host,
            title: row.title || null,
            clarity_score: row.clarity_score ?? null,
            reality_score: row.reality_score ?? null,
            promise_count: row.promise_count ?? 0,
            tagline: f.tagline,
          } as Card;
        }),
      );
      if (!cancelled) setCards(rows.filter(Boolean) as Card[]);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!cards || cards.length === 0) return null;

  return (
    <section className="px-5 sm:px-6 pb-16" style={{ background: '#000' }}>
      <div className="max-w-[900px] mx-auto">
        <div className="flex items-baseline justify-between mb-4">
          <p style={{ fontSize: 11, color: '#666', letterSpacing: '0.12em', fontWeight: 600 }}>
            FEATURED SCANS
          </p>
          <p style={{ fontSize: 12, color: '#555' }}>Real reports · click to open</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cards.map((c) => (
            <Link
              key={c.id}
              to={`/promise-audit/${c.id}`}
              className="rounded-xl p-4 transition-colors block group"
              style={{
                background: '#0a0a0a',
                border: '1px solid #1f1f1f',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2f2f2f')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1f1f1f')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className="truncate"
                    style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}
                    title={c.host}
                  >
                    {c.host}
                  </p>
                  <p style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{c.tagline}</p>
                </div>
                <ArrowRight
                  size={14}
                  style={{ color: '#555', flexShrink: 0, marginTop: 2 }}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </div>
              <div className="flex items-end gap-4 mt-4">
                <div className="flex items-baseline gap-1">
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {c.clarity_score ?? '—'}
                  </span>
                  <span style={{ fontSize: 10, color: '#666' }}>clarity</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa', lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {c.reality_score ?? '—'}
                  </span>
                  <span style={{ fontSize: 10, color: '#666' }}>reality</span>
                </div>
                <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto' }}>
                  {c.promise_count} claims
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}