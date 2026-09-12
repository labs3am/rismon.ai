import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Github, Plug } from 'lucide-react';
import DashboardNavbar from '@/components/DashboardNavbar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

const PANEL_BG = '#0a0a0a';
const PANEL_BORDER = '#1f1f1f';

interface Repository {
  id: string;
  app_name: string | null;
  github_repo_name: string | null;
  github_owner: string | null;
  platform: string | null;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const loadRepositories = async () => {
      const { data } = await supabase
        .from('apps')
        .select('id, app_name, github_repo_name, github_owner, platform, created_at')
        .eq('user_id', user.id);
      setRepositories(data || []);
      setLoading(false);
    };
    loadRepositories();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Dashboard — Rismon" description="Your Rismon dashboard: connected repositories and policy management." noindex />
      <DashboardNavbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-foreground text-2xl font-semibold mb-6">Dashboard</h1>

        {loading ? (
          <div className="rounded-xl p-8" style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        ) : repositories.length === 0 ? (
          <div
            className="rounded-xl text-center"
            style={{ background: PANEL_BG, border: '1px solid #1a1a1a', padding: '56px 24px' }}
          >
            <div
              style={{
                width: 72, height: 72, borderRadius: 18, margin: '0 auto',
                background: 'linear-gradient(180deg, #1a1308, #0a0a0a)',
                border: '1px solid #3a2a14',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#f97316',
              }}
            >
              <Plug size={28} />
            </div>
            <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 600, marginTop: 22, letterSpacing: '-0.02em' }}>
              Connect your first repository
            </h2>
            <p style={{ color: '#888', fontSize: 15, marginTop: 10, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
              Connect a GitHub repository to start managing access policies for your codebase.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 mt-7"
              style={{ background: '#f97316', color: '#000', padding: '12px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            >
              <Github size={15} /> Connect a GitHub repo
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-foreground text-lg font-medium">Connected Repositories</h2>
            <div className="grid gap-4">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="rounded-xl p-5"
                  style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-foreground font-medium">{repo.app_name || repo.github_repo_name}</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        {repo.github_owner}/{repo.github_repo_name}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                      {repo.platform || 'GitHub'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
