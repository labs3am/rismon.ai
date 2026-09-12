import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  FileText,
  ArrowLeft,
  Mail,
  Activity,
} from "lucide-react";
import DashboardNavbar from "@/components/DashboardNavbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SEO from '@/components/SEO';

type Tab = "overview" | "users" | "tools";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface Stats {
  total_users: number;
  signups_this_week: number;
}

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <SEO title="Admin: Dashboard — Rismon" description="Internal admin dashboard for Rismon staff." noindex />
      <div className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{label}</div>
      <div className="text-foreground text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-subtle text-xs mt-1">{hint}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: statsData } = await supabase.rpc("admin_user_stats");
        if (statsData) {
          const row = Array.isArray(statsData) ? statsData[0] : statsData;
          setStats({
            total_users: Number(row.total_users) || 0,
            signups_this_week: Number(row.signups_this_week) || 0,
          });
        }
        const { data: usersData } = await supabase.rpc("admin_list_users");
        setUsers(usersData || []);
      } catch (e) {
        console.error("Failed to load admin data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Activity size={16} /> },
    { key: "users", label: "Users", icon: <Users size={16} /> },
    { key: "tools", label: "Tools", icon: <Mail size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Admin: Dashboard — Rismon" description="Internal admin dashboard for Rismon staff." noindex />
      <DashboardNavbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        <h1 className="text-foreground text-2xl font-semibold mb-6">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {!loading && tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Total users" value={stats?.total_users ?? "—"} />
              <StatCard label="Signups this week" value={stats?.signups_this_week ?? "—"} />
            </div>
          </div>
        )}

        {/* USERS */}
        {!loading && tab === "users" && (
          <div className="mt-6 space-y-4">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium">Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="text-foreground font-medium">{u.full_name || "—"}</div>
                          <div className="text-muted-foreground text-xs">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-foreground text-xs px-2 py-1 rounded bg-muted">
                            {u.plan || "free"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatDate(u.last_sign_in_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TOOLS */}
        {!loading && tab === "tools" && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/admin/blog"
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors"
            >
              <FileText size={20} className="text-foreground" />
              <h3 className="text-foreground font-semibold mt-3">Blog</h3>
              <p className="text-muted-foreground text-sm mt-1">Manage blog posts and announcements.</p>
            </Link>
            <Link
              to="/admin/broadcast"
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors"
            >
              <Mail size={20} className="text-foreground" />
              <h3 className="text-foreground font-semibold mt-3">Broadcast</h3>
              <p className="text-muted-foreground text-sm mt-1">Send emails to user segments.</p>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
