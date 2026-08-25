import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PageSkeleton from '@/components/PageSkeleton';
import SEO from '@/components/SEO';


export default function AdminWaitlist() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      // Fetch waitlist
      const { data, error } = await supabase.functions.invoke('admin-waitlist', {
        body: { admin_email: user.email }
      });
      if (error || data?.error) {
        navigate('/');
        return;
      }
      setEntries(data.entries || []);
      setAuthed(true);
      setLoading(false);
    };
    check();
  }, [navigate]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' at ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const todayCount = entries.filter(e => {
    const d = new Date(e.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const weekCount = entries.filter(e => {
    const d = new Date(e.created_at);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return d >= weekAgo;
  }).length;

  const exportCSV = () => {
    const csv = 'Email,Date Joined\n' + entries.map(e => `${e.email},${e.created_at}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'waitlist.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <PageSkeleton variant="dashboard" withNav />;
  }

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <SEO title="Admin: Waitlist — Rismon" description="Internal waitlist management for Rismon staff." noindex />
      <div className="max-w-[800px] mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-[24px] font-semibold">Waitlist</h1>
          <button onClick={exportCSV} className="text-sm border border-hover-border text-foreground px-4 py-2 rounded-lg hover:border-muted-foreground/30 transition-colors">Export as CSV</button>
        </div>

        <div className="flex gap-6 mt-6">
          <div className="rounded-xl px-5 py-3" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
            <p className="text-foreground text-[24px] font-bold">{entries.length}</p>
            <p className="text-[13px]" style={{ color: '#71717a' }}>Total signups</p>
          </div>
          <div className="rounded-xl px-5 py-3" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
            <p className="text-foreground text-[24px] font-bold">{todayCount}</p>
            <p className="text-[13px]" style={{ color: '#71717a' }}>Today</p>
          </div>
          <div className="rounded-xl px-5 py-3" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
            <p className="text-foreground text-[24px] font-bold">{weekCount}</p>
            <p className="text-[13px]" style={{ color: '#71717a' }}>This week</p>
          </div>
        </div>

        <div className="mt-8 rounded-xl overflow-hidden" style={{ border: '1px solid #1e1e1e' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#1a1a1a' }}>
                <th className="text-left text-foreground font-medium px-4 py-3 w-12">#</th>
                <th className="text-left text-foreground font-medium px-4 py-3">Email</th>
                <th className="text-left text-foreground font-medium px-4 py-3">Date joined</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? '#111111' : '#0d0d0d' }}>
                  <td className="text-foreground px-4 py-3">{i + 1}</td>
                  <td className="text-foreground px-4 py-3">{e.email}</td>
                  <td className="px-4 py-3" style={{ color: '#71717a' }}>{e.created_at ? formatDate(e.created_at) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
