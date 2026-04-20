import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, HelpCircle, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Verdict = 'accurate' | 'wrong' | 'unclear';

interface Props {
  analysisId?: string;
  findingId: string;
  findingName: string;
  findingSeverity: string;
  findingCategory: string;
}

const PILL_BG = '#0a0a0a';
const PILL_BORDER = '#222222';
const ACTIVE_BG = 'rgba(249, 115, 22, 0.12)';
const ACTIVE_BORDER = '#f97316';

export default function FindingReviewPills({
  analysisId,
  findingId,
  findingName,
  findingSeverity,
  findingCategory,
}: Props) {
  const { user } = useAuth();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !analysisId || !findingId) return;
    supabase
      .from('report_reviews')
      .select('verdict, comment')
      .eq('user_id', user.id)
      .eq('analysis_id', analysisId)
      .eq('finding_id', findingId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setVerdict(data.verdict as Verdict);
          if (data.comment) setComment(data.comment);
        }
      });
  }, [user, analysisId, findingId]);

  const submit = async (v: Verdict, withComment?: string) => {
    if (!user || !analysisId) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      analysis_id: analysisId,
      finding_id: findingId,
      finding_name: findingName,
      finding_severity: findingSeverity,
      finding_category: findingCategory,
      verdict: v,
      comment: withComment?.trim() || null,
    };
    const { error } = await supabase
      .from('report_reviews')
      .upsert(payload, { onConflict: 'user_id,analysis_id,finding_id' });
    setSaving(false);
    if (error) {
      toast.error('Could not save your feedback.');
      return;
    }
    setVerdict(v);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    if (v !== 'accurate' && !withComment) setShowComment(true);
    else setShowComment(false);
  };

  const pill = (v: Verdict, label: string, Icon: any) => {
    const active = verdict === v;
    return (
      <button
        key={v}
        onClick={() => submit(v)}
        disabled={saving}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: active ? ACTIVE_BG : PILL_BG,
          border: `1px solid ${active ? ACTIVE_BORDER : PILL_BORDER}`,
          color: active ? '#f97316' : '#888888',
          padding: '5px 10px',
          borderRadius: 999,
          fontSize: 11,
          cursor: 'pointer',
          fontWeight: 500,
          transition: 'all 0.15s',
        }}
      >
        <Icon size={12} />
        {label}
      </button>
    );
  };

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #161616' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#555555', letterSpacing: '0.04em' }}>
          Was this finding helpful?
        </span>
        {pill('accurate', 'Accurate', ThumbsUp)}
        {pill('wrong', 'Wrong', ThumbsDown)}
        {pill('unclear', 'Unclear', HelpCircle)}
        {saved && (
          <span style={{ fontSize: 11, color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Check size={11} /> Saved
          </span>
        )}
      </div>
      {showComment && verdict && verdict !== 'accurate' && (
        <div style={{ marginTop: 10 }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder={
              verdict === 'wrong'
                ? "What did we get wrong? (helps us improve)"
                : "What's unclear about this finding?"
            }
            rows={2}
            style={{
              width: '100%',
              background: '#000',
              border: '1px solid #222',
              borderRadius: 6,
              padding: 10,
              color: '#fff',
              fontSize: 12,
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
            <button
              onClick={() => setShowComment(false)}
              style={{ background: 'transparent', border: 'none', color: '#666', fontSize: 11, cursor: 'pointer' }}
            >
              Skip
            </button>
            <button
              onClick={() => submit(verdict, comment)}
              disabled={saving}
              style={{
                background: '#f97316',
                border: 'none',
                color: '#000',
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
