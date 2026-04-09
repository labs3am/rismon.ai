import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function AdminWaitlist() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setDenied(false);
    const { data, error } = await supabase.functions.invoke('admin-waitlist', {
      body: { password }
    });
    if (error || data?.error) {
      setDenied(true);
      setLoading(false);
      return;
    }
    setEntries(data.entries || []);
    setAuthed(true);
    setLoading(false);
  };

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

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-[360px] w-full text-center">
          <h1 className="text-foreground text-[24px] font-semibold">Admin access</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full mt-6 bg-input-bg border border-input rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
          <button onClick={handleLogin} disabled={loading} className="w-full mt-3 bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {loading ? 'Checking...' : 'Enter'}
          </button>
          {denied && <p className="text-destructive text-sm mt-3">Access denied</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
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
