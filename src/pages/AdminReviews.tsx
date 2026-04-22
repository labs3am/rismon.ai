import { useEffect, useState } from 'react';
import { Loader2, Sparkles, ThumbsUp, ThumbsDown, HelpCircle, Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import DashboardNavbar from '@/components/DashboardNavbar';
import BackButton from '@/components/BackButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ADMIN_EMAILS = ['risvan@labs3am.com', 'hello@rismon.ai'];

interface Review {
  id: string;
  verdict: 'accurate' | 'wrong' | 'unclear';
  comment: string | null;
  finding_name: string | null;
  finding_severity: string | null;
  finding_category: string | null;
  analysis_id: string;
  created_at: string;
}

interface OverallFeedback {
  id: string;
  analysis_id: string;
  user_id: string;
  user_email: string | null;
  rating: number;
  comment: string | null;
  scan_type: string | null;
  created_at: string;
  updated_at: string;
}

interface FeedbackStats {
  total: number;
  avg_rating: number | null;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
  with_comments: number;
}

export default function AdminReviews() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'unclear' | 'accurate'>('all');
  const [digest, setDigest] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<'findings' | 'overall'>('findings');
  const [overall, setOverall] = useState<OverallFeedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [overallFilter, setOverallFilter] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      navigate('/dashboard');
      return;
    }
    Promise.all([
      supabase
        .from('report_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.rpc('admin_list_report_feedback' as any, { _limit: 500 } as any),
      supabase.rpc('admin_feedback_stats' as any),
    ]).then(([revRes, fbRes, statsRes]) => {
      setReviews((revRes.data as Review[]) || []);
      setOverall((fbRes.data as OverallFeedback[]) || []);
      setFeedbackStats(((statsRes.data as FeedbackStats[]) || [])[0] ?? null);
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  const filtered = reviews.filter(r => filter === 'all' || r.verdict === filter);
  const counts = {
    accurate: reviews.filter(r => r.verdict === 'accurate').length,
    wrong: reviews.filter(r => r.verdict === 'wrong').length,
    unclear: reviews.filter(r => r.verdict === 'unclear').length,
  };

  const generateDigest = async () => {
    setGenerating(true);
    setDigest('');
    try {
      const { data, error } = await supabase.functions.invoke('summarize-reviews', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDigest(data?.digest || 'No digest returned.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate digest');
    } finally {
      setGenerating(false);
    }
  };

  const verdictBadge = (v: string) => {
    const map: Record<string, { color: string; bg: string; Icon: any; label: string }> = {
      accurate: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', Icon: ThumbsUp, label: 'Accurate' },
      wrong: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', Icon: ThumbsDown, label: 'Wrong' },
      unclear: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', Icon: HelpCircle, label: 'Unclear' },
    };
    const m = map[v] || map.unclear;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
        color: m.color, background: m.bg, padding: '3px 8px', borderRadius: 999,
      }}>
        <m.Icon size={11} /> {m.label}
      </span>
    );
  };

  const filteredOverall = overall.filter(o => overallFilter === 0 || o.rating === overallFilter);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="max-w-[960px] mx-auto px-5 pt-24 pb-16">
        <BackButton to="/dashboard" label="Dashboard" />
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-foreground text-[28px] font-semibold">Report reviews</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {reviews.length} total · {counts.accurate} accurate · {counts.wrong} wrong · {counts.unclear} unclear
            </p>
          </div>
          <button
            onClick={generateDigest}
            disabled={generating || reviews.length === 0}
            className="inline-flex items-center gap-2 bg-[#f97316] text-black px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#ea580c] disabled:opacity-50"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generating ? 'Analysing…' : 'Generate AI digest'}
          </button>
        </div>

        {digest && (
          <div className="bg-card border border-border rounded-2xl p-7 mb-8">
            <div className="text-[10px] uppercase tracking-wider text-[#f97316] font-semibold mb-3">AI Digest</div>
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{digest}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-5 flex-wrap">
          {(['all', 'wrong', 'unclear', 'accurate'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === f
                  ? 'bg-[#f97316] text-black border-[#f97316]'
                  : 'bg-transparent text-muted-foreground border-border hover:border-[#444]'
              }`}
            >
              {f === 'all' ? `All (${reviews.length})` : `${f} (${counts[f]})`}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
              No reviews in this filter yet.
            </div>
          ) : (
            filtered.map(r => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="text-foreground text-[15px] font-medium">{r.finding_name || '—'}</div>
                  {verdictBadge(r.verdict)}
                </div>
                {r.comment && (
                  <div className="text-muted-foreground text-sm leading-relaxed mt-2 italic">
                    "{r.comment}"
                  </div>
                )}
                <div className="text-[11px] text-[#555] mt-3 flex gap-3 flex-wrap">
                  {r.finding_severity && <span>severity: {r.finding_severity}</span>}
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
