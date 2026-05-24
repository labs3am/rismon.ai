import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  FileText,
  TrendingUp,
  MessageSquare,
  Inbox,
  AlertCircle,
  Trash2,
  Crown,
  ArrowLeft,
  KeyRound,
  Mail,
  UserX,
  GitBranch,
  Activity,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import DashboardNavbar from "@/components/DashboardNavbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tab = "overview" | "users" | "scans" | "traffic" | "inactive" | "no-github" | "tools";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: string;
  pro_credits: number;
  pro_until: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  scan_count: number;
  app_count: number;
}

interface Stats {
  total_users: number;
  total_scans: number;
  total_apps: number;
  scans_this_week: number;
  signups_this_week: number;
  pro_users: number;
  waitlist_count: number;
}

interface ScanRow {
  id: string;
  user_email: string | null;
  scan_type: string | null;
  status: string | null;
  files_scanned: number | null;
  scan_duration_seconds: number | null;
  created_at: string;
}

interface TopScanner {
  user_id: string;
  email: string | null;
  full_name: string | null;
  scan_count: number;
  last_scan_at: string | null;
}

interface InactiveUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  app_count: number;
}

interface NoGithubUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  app_count: number;
  scan_count: number;
}

interface TimeseriesPoint {
  day: string;
  signups: number;
  scans: number;
}

interface PlanRow {
  plan: string;
  user_count: number;
}

interface TrafficStats {
  views_today: number;
  views_7d: number;
  views_30d: number;
  unique_sessions_7d: number;
  unique_visitors_7d: number;
}

interface TopPage {
  path: string;
  views: number;
  unique_sessions: number;
}

interface TopReferrer {
  referrer: string;
  views: number;
}

interface TrafficPoint {
  day: string;
  views: number;
  unique_sessions: number;
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
      <div className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{label}</div>
      <div className="text-foreground text-3xl font-semibold mt-2 tabular-nums">{value}</div>
      {hint && <div className="text-subtle text-xs mt-1">{hint}</div>}
    </div>
  );
}

function PlanBadge({ plan, proUntil, credits }: { plan: string; proUntil: string | null; credits: number }) {
  const isPro = (proUntil && new Date(proUntil) > new Date()) || credits > 0;
  if (isPro) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] uppercase tracking-wider font-semibold">
        <Crown size={10} /> Pro
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">
      {plan}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status || "unknown";
  const cls =
    s === "complete"
      ? "bg-success/10 text-success"
      : s === "failed" || s === "error"
      ? "bg-destructive/10 text-destructive"
      : "bg-warning/10 text-warning";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold ${cls}`}>
      {s}
    </span>
  );
}

// ─────────────────────────── KEY SETUP BANNER ───────────────────────────
function NotifyKeyBanner({ onSet }: { onSet: () => void }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (key.trim().length < 16) {
      return toast.error("Secret must be at least 16 characters");
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_set_broadcast_secret" as any, { _secret: key.trim() } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Email notifications enabled");
    setOpen(false);
    setKey("");
    onSet();
  };

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-warning shrink-0 mt-0.5" size={18} />
        <div className="flex-1">
          <div className="text-foreground font-medium text-sm">Email notifications not configured</div>
          <p className="text-muted-foreground text-xs mt-1">
            To receive email alerts when users sign up or complete their first scan, paste the
            value of the <span className="font-mono">BROADCAST_FUNCTION_SECRET</span> edge-function
            secret once. This lets the database authenticate itself when calling the notification
            function. Use the exact same value you saved in Lovable Cloud → Edge Function Secrets.
          </p>
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 rounded-md text-xs font-medium hover:bg-foreground/90"
            >
              <KeyRound size={12} /> Configure
            </button>
          ) : (
            <div className="mt-3">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="paste BROADCAST_FUNCTION_SECRET value"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  className="flex-1 bg-input-bg border border-input rounded-md px-3 py-1.5 text-sm font-mono"
                />
                <button
                  onClick={save}
                  disabled={saving}
                  className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setOpen(false)} className="text-muted-foreground text-sm px-2">
                  Cancel
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/80 mt-2 leading-relaxed">
                🔒 Stored server-side only. The value is never returned to any client and is only
                used by the database trigger as an internal authentication header.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── MAIN PAGE ───────────────────────────
export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecking, setAdminChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [topScanners, setTopScanners] = useState<TopScanner[]>([]);
  const [keyConfigured, setKeyConfigured] = useState<boolean | null>(null);
  const [inactive, setInactive] = useState<InactiveUser[]>([]);
  const [noGithub, setNoGithub] = useState<NoGithubUser[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [planDist, setPlanDist] = useState<PlanRow[]>([]);
  const [trafficStats, setTrafficStats] = useState<TrafficStats | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [trafficSeries, setTrafficSeries] = useState<TrafficPoint[]>([]);

  const [search, setSearch] = useState("");
  const [trafficWindow, setTrafficWindow] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(true);

  // Admin gate — defense in depth.
  // Even if ProtectedRoute is bypassed, this hard-redirects non-admins.
  // 1. Not signed in → /login
  // 2. Signed in but not admin → /dashboard with toast
  // 3. RPC fails for any reason → /dashboard (fail closed)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    supabase.rpc("is_blog_admin").then(({ data, error }) => {
      if (error || data !== true) {
        setIsAdmin(false);
        setAdminChecking(false);
        toast.error("Admins only");
        navigate("/dashboard", { replace: true });
        return;
      }
      setIsAdmin(true);
      setAdminChecking(false);
    });
  }, [user, authLoading, navigate]);

  // Load all data
  const loadAll = async () => {
    setLoading(true);
    const [statsRes, usersRes, scansRes, topRes, inactiveRes, noGhRes, tsRes, planRes, trafRes, pagesRes, refRes, trafTsRes] = await Promise.all([
      supabase.rpc("admin_user_stats" as any),
      supabase.rpc("admin_list_users" as any),
      supabase.rpc("admin_recent_scans" as any, { _limit: 50 } as any),
      supabase.rpc("admin_top_scanners" as any, { _limit: 10 } as any),
      supabase.rpc("admin_inactive_users" as any, { _limit: 100 } as any),
      supabase.rpc("admin_users_without_github" as any, { _limit: 100 } as any),
      supabase.rpc("admin_activity_timeseries" as any, { _days: 30 } as any),
      supabase.rpc("admin_plan_distribution" as any),
      supabase.rpc("admin_traffic_stats" as any),
      supabase.rpc("admin_top_pages" as any, { _days: trafficWindow, _limit: 20 } as any),
      supabase.rpc("admin_top_referrers" as any, { _days: trafficWindow, _limit: 15 } as any),
      supabase.rpc("admin_traffic_timeseries" as any, { _days: 30 } as any),
    ]);
    if (statsRes.data) setStats((statsRes.data as Stats[])[0] ?? null);
    if (usersRes.data) setUsers(usersRes.data as UserRow[]);
    if (scansRes.data) setScans(scansRes.data as ScanRow[]);
    if (topRes.data) setTopScanners(topRes.data as TopScanner[]);
    if (inactiveRes.data) setInactive(inactiveRes.data as InactiveUser[]);
    if (noGhRes.data) setNoGithub(noGhRes.data as NoGithubUser[]);
    if (tsRes.data) {
      setTimeseries(
        (tsRes.data as { day: string; signups: number; scans: number }[]).map((r) => ({
          day: new Date(r.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          signups: Number(r.signups),
          scans: Number(r.scans),
        }))
      );
    }
    if (planRes.data) setPlanDist(planRes.data as PlanRow[]);
    if (trafRes.data) setTrafficStats((trafRes.data as TrafficStats[])[0] ?? null);
    if (pagesRes.data) setTopPages(pagesRes.data as TopPage[]);
    if (refRes.data) setTopReferrers(refRes.data as TopReferrer[]);
    if (trafTsRes.data) {
      setTrafficSeries(
        (trafTsRes.data as { day: string; views: number; unique_sessions: number }[]).map((r) => ({
          day: new Date(r.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          views: Number(r.views),
          unique_sessions: Number(r.unique_sessions),
        }))
      );
    }
    setLoading(false);

    const { data: keyData } = await supabase.rpc("admin_broadcast_secret_set" as any);
    setKeyConfigured(keyData === true);
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin, trafficWindow]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.id.includes(q)
    );
  }, [users, search]);

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`Delete ${u.email}? This permanently removes their account and all associated data. This cannot be undone.`))
      return;
    const { error } = await supabase.rpc("admin_delete_user" as any, { _target_user_id: u.id } as any);
    if (error) return toast.error(error.message);
    toast.success(`Deleted ${u.email}`);
    loadAll();
  };

  const toggleUserPlan = async (u: UserRow) => {
    const isPro = (u.pro_until && new Date(u.pro_until) > new Date()) || u.pro_credits > 0;
    const nextPlan = isPro ? "free" : "pro";
    const { error } = await supabase.rpc(
      "admin_set_user_plan" as any,
      { _target_user_id: u.id, _plan: nextPlan } as any,
    );
    if (error) return toast.error(error.message);
    toast.success(`${u.email} is now ${nextPlan === "pro" ? "Pro" : "Free"}`);
    // Optimistic local update so the badge flips immediately
    setUsers((prev) =>
      prev.map((row) =>
        row.id === u.id
          ? {
              ...row,
              plan: nextPlan,
              pro_until: nextPlan === "pro" ? new Date(Date.now() + 100 * 365 * 864e5).toISOString() : null,
              pro_credits: nextPlan === "pro" ? row.pro_credits : 0,
            }
          : row,
      ),
    );
  };

  // ─── Gating ───
  if (authLoading || adminChecking) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="pt-24 max-w-[1100px] mx-auto px-5 text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="pt-32 max-w-[480px] mx-auto px-5 text-center">
          <h1 className="text-foreground text-2xl font-semibold">Admins only</h1>
          <p className="text-muted-foreground mt-2">This area is restricted.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 text-primary hover:underline"
          >
            ← Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="max-w-[1100px] mx-auto px-5 pt-24 pb-16">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="flex items-end justify-between mt-4 flex-wrap gap-4">
          <div>
            <h1 className="text-foreground text-[28px] font-semibold">Admin</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Privacy-safe overview. You can see account metadata only — never user reports, code, or scan content.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 border-b border-border overflow-x-auto no-scrollbar -mx-5 px-5">
          {([
            ["overview", "Overview", TrendingUp],
            ["users", `Users (${stats?.total_users ?? "…"})`, Users],
            ["scans", "Scans", FileText],
            ["traffic", `Traffic${trafficStats ? ` (${trafficStats.views_7d})` : ""}`, Activity],
            ["inactive", `Inactive (${inactive.length})`, UserX],
            ["no-github", `No GitHub (${noGithub.length})`, GitBranch],
            ["tools", "Tools", Inbox],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key as Tab)}
              className={`px-4 py-2.5 text-sm flex items-center gap-2 border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${
                tab === key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Notify key banner */}
        {keyConfigured === false && (
          <div className="mt-6">
            <NotifyKeyBanner onSet={loadAll} />
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-muted-foreground text-sm mt-8">Loading data…</div>
        )}

        {/* OVERVIEW */}
        {!loading && tab === "overview" && stats && (
          <div className="mt-6 space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Total users" value={stats.total_users} hint={`+${stats.signups_this_week} this week`} />
              <StatCard label="Total scans" value={stats.total_scans} hint={`${stats.scans_this_week} this week`} />
              <StatCard label="Pro users" value={stats.pro_users} />
              <StatCard label="Waitlist" value={stats.waitlist_count} />
            </div>

            {/* Activity chart */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="text-foreground font-semibold text-sm">Activity — last 30 days</h3>
                  <p className="text-subtle text-xs mt-1">Daily signups and scans.</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Signups
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-success" /> Scans
                  </span>
                </div>
              </div>
              <div className="mt-4 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gScans" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="url(#gSignups)" strokeWidth={2} />
                    <Area type="monotone" dataKey="scans" stroke="hsl(var(--success))" fill="url(#gScans)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Plan distribution */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-foreground font-semibold text-sm">Plan distribution</h3>
              <p className="text-subtle text-xs mt-1">How users are split across plans.</p>
              <div className="mt-4 space-y-3">
                {planDist.length === 0 ? (
                  <div className="text-muted-foreground text-sm">No data.</div>
                ) : (
                  planDist.map((p) => {
                    const total = planDist.reduce((s, r) => s + Number(r.user_count), 0) || 1;
                    const pct = (Number(p.user_count) / total) * 100;
                    const isPro = p.plan === "pro";
                    return (
                      <div key={p.plan}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="capitalize text-foreground font-medium">{p.plan}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {p.user_count} <span className="text-subtle">({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={isPro ? "h-full bg-amber-500" : "h-full bg-primary"}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-foreground font-semibold text-sm">Recent signups</h3>
                <p className="text-subtle text-xs mt-1">Newest accounts first.</p>
                <div className="mt-4 space-y-1">
                  {users.slice(0, 8).map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2 border-t border-border first:border-t-0 gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground text-sm truncate">{u.email}</div>
                        <div className="text-subtle text-xs truncate">{u.full_name || "—"}</div>
                      </div>
                      <div className="text-subtle text-xs">{formatDate(u.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-foreground font-semibold text-sm">Top scanners</h3>
                <p className="text-subtle text-xs mt-1">Most active users by scan count.</p>
                <div className="mt-4 space-y-1">
                  {topScanners.length === 0 ? (
                    <div className="text-muted-foreground text-sm py-4">No scans yet.</div>
                  ) : (
                    topScanners.map((u, i) => (
                      <div key={u.user_id} className="flex items-center justify-between py-2 border-t border-border first:border-t-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-subtle text-xs w-5 tabular-nums">{i + 1}</span>
                          <div className="min-w-0">
                            <div className="text-foreground text-sm truncate">{u.email || "(no email)"}</div>
                            <div className="text-subtle text-xs truncate">
                              Last scan: {formatDate(u.last_scan_at)}
                            </div>
                          </div>
                        </div>
                        <div className="text-foreground text-sm tabular-nums font-medium">{u.scan_count}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {!loading && tab === "users" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, name or ID…"
                className="flex-1 max-w-md bg-input-bg border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <div className="text-muted-foreground text-xs">
                Showing {filteredUsers.length} of {users.length}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium text-right">Scans</th>
                      <th className="px-4 py-3 font-medium text-right">Apps</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                      <th className="px-4 py-3 font-medium">Last seen</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div className="text-foreground font-medium">{u.email || "(no email)"}</div>
                            <div className="text-subtle text-xs">{u.full_name || "—"}</div>
                          </td>
                          <td className="px-4 py-3">
                            <PlanBadge plan={u.plan} proUntil={u.pro_until} credits={u.pro_credits} />
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">{u.scan_count}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{u.app_count}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.created_at)}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.last_sign_in_at)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(() => {
                                const isPro = (u.pro_until && new Date(u.pro_until) > new Date()) || u.pro_credits > 0;
                                return (
                                  <button
                                    onClick={() => toggleUserPlan(u)}
                                    className={`px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider transition-colors ${
                                      isPro
                                        ? "bg-muted text-muted-foreground hover:bg-muted/70"
                                        : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                    }`}
                                    title={isPro ? "Downgrade to Free" : "Upgrade to Pro"}
                                  >
                                    {isPro ? "Make Free" : "Make Pro"}
                                  </button>
                                );
                              })()}
                              <button
                                onClick={() => deleteUser(u)}
                                className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                                title="Delete user"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-subtle text-xs">
              <strong className="text-muted-foreground">Privacy:</strong> Reports, code, repos and scan content are
              never shown here. Deleting a user permanently removes their account and cascades all their data.
            </p>
          </div>
        )}

        {/* SCANS */}
        {!loading && tab === "scans" && (
          <div className="mt-6 space-y-4">
            <p className="text-subtle text-xs">
              Metadata only — scan results are private to each user.
            </p>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Files</th>
                    <th className="px-4 py-3 font-medium text-right">Duration</th>
                    <th className="px-4 py-3 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No scans yet.</td>
                    </tr>
                  ) : (
                    scans.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-4 py-3 text-foreground">{s.user_email || "(deleted)"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.scan_type || "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{s.files_scanned ?? "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {s.scan_duration_seconds ? `${s.scan_duration_seconds}s` : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(s.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TRAFFIC */}
        {!loading && tab === "traffic" && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-subtle text-xs">
                Privacy-safe pageview tracking. We log path + referrer hostname only — no IPs, no cookies, no fingerprints.
              </p>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {([7, 30] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setTrafficWindow(d)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      trafficWindow === d
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Last {d} days
                  </button>
                ))}
              </div>
            </div>

            {trafficStats && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Views today" value={trafficStats.views_today} />
                <StatCard label="Views (7d)" value={trafficStats.views_7d} />
                <StatCard
                  label="Unique visitors (7d)"
                  value={trafficStats.unique_visitors_7d}
                  hint={`${trafficStats.unique_sessions_7d} sessions`}
                />
                <StatCard label="Views (30d)" value={trafficStats.views_30d} />
              </div>
            )}

            {/* Traffic chart */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="text-foreground font-semibold text-sm">Traffic — last 30 days</h3>
                  <p className="text-subtle text-xs mt-1">Daily pageviews and unique sessions.</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Views
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-success" /> Sessions
                  </span>
                </div>
              </div>
              <div className="mt-4 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#gViews)" strokeWidth={2} />
                    <Area type="monotone" dataKey="unique_sessions" stroke="hsl(var(--success))" fill="url(#gSessions)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top pages + Top referrers */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-foreground font-semibold text-sm">Top pages</h3>
                <p className="text-subtle text-xs mt-1">
                  Where visitors spend their time. Compare to find drop-off points in your funnel.
                </p>
                <div className="mt-4 space-y-1">
                  {topPages.length === 0 ? (
                    <div className="text-muted-foreground text-sm py-4">No traffic yet.</div>
                  ) : (
                    topPages.map((p, i) => {
                      const max = topPages[0]?.views || 1;
                      const pct = (Number(p.views) / max) * 100;
                      return (
                        <div key={p.path} className="py-2 border-t border-border first:border-t-0">
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-subtle text-xs w-5 tabular-nums">{i + 1}</span>
                              <span className="text-foreground text-sm font-mono truncate">{p.path}</span>
                            </div>
                            <div className="text-foreground text-sm tabular-nums font-medium shrink-0">
                              {p.views}
                              <span className="text-subtle text-xs font-normal ml-1">({p.unique_sessions} uniq)</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-8">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-foreground font-semibold text-sm">Top referrers</h3>
                <p className="text-subtle text-xs mt-1">External sources driving traffic to your site.</p>
                <div className="mt-4 space-y-1">
                  {topReferrers.length === 0 ? (
                    <div className="text-muted-foreground text-sm py-4">No referrer data yet.</div>
                  ) : (
                    topReferrers.map((r, i) => (
                      <div key={r.referrer} className="flex items-center justify-between py-2 border-t border-border first:border-t-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-subtle text-xs w-5 tabular-nums">{i + 1}</span>
                          <span className="text-foreground text-sm truncate">{r.referrer}</span>
                        </div>
                        <div className="text-foreground text-sm tabular-nums font-medium">{r.views}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INACTIVE USERS */}
        {!loading && tab === "inactive" && (
          <div className="mt-6 space-y-4">
            <p className="text-subtle text-xs">
              Users who signed up but never ran a single scan. Good candidates for activation outreach.
            </p>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium text-right">Apps</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium">Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {inactive.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                        Everyone has scanned at least once 🎉
                      </td>
                    </tr>
                  ) : (
                    inactive.map((u) => (
                      <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="text-foreground font-medium">{u.email || "(no email)"}</div>
                          <div className="text-subtle text-xs">{u.full_name || "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{u.app_count}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.created_at)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.last_sign_in_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS WITHOUT GITHUB */}
        {!loading && tab === "no-github" && (
          <div className="mt-6 space-y-4">
            <p className="text-subtle text-xs">
              Users who haven't connected a GitHub repo to any of their apps yet.
            </p>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium text-right">Apps</th>
                    <th className="px-4 py-3 font-medium text-right">Scans</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {noGithub.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                        Everyone has connected GitHub 🎉
                      </td>
                    </tr>
                  ) : (
                    noGithub.map((u) => (
                      <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="text-foreground font-medium">{u.email || "(no email)"}</div>
                          <div className="text-subtle text-xs">{u.full_name || "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{u.app_count}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{u.scan_count}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.created_at)}</td>
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
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <Link
              to="/admin/blog"
              className="bg-card border border-border rounded-2xl p-5 hover:border-hover-border transition-colors group"
            >
              <FileText className="text-primary" size={20} />
              <h3 className="text-foreground font-semibold mt-3">Blog</h3>
              <p className="text-muted-foreground text-sm mt-1">Create, edit and publish blog posts.</p>
            </Link>
            <Link
              to="/admin/waitlist"
              className="bg-card border border-border rounded-2xl p-5 hover:border-hover-border transition-colors"
            >
              <Inbox className="text-primary" size={20} />
              <h3 className="text-foreground font-semibold mt-3">Waitlist</h3>
              <p className="text-muted-foreground text-sm mt-1">Manage early-access waitlist signups.</p>
            </Link>
            <Link
              to="/admin/reviews"
              className="bg-card border border-border rounded-2xl p-5 hover:border-hover-border transition-colors"
            >
              <MessageSquare className="text-primary" size={20} />
              <h3 className="text-foreground font-semibold mt-3">Reviews & disputes</h3>
              <p className="text-muted-foreground text-sm mt-1">User feedback and finding disputes.</p>
            </Link>
            <Link
              to="/admin/broadcast"
              className="bg-card border border-border rounded-2xl p-5 hover:border-hover-border transition-colors group"
            >
              <Mail className="text-primary" size={20} />
              <h3 className="text-foreground font-semibold mt-3 flex items-center gap-2">
                Broadcast nudge
                <span className="text-[10px] font-semibold tracking-wider text-primary uppercase px-1.5 py-0.5 rounded bg-primary/10">New</span>
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Send the founder note to inactive users (signed up 14+ days ago, never scanned). Test first, then broadcast.
              </p>
            </Link>
            <Link
              to="/admin/audit-test"
              className="bg-card border border-border rounded-2xl p-5 hover:border-hover-border transition-colors group"
            >
              <ShieldCheck className="text-primary" size={20} />
              <h3 className="text-foreground font-semibold mt-3">Promise Audit tester</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Run the public audit without the 3/day IP limit. Debug token stays server-side.
              </p>
            </Link>
            <div className="bg-card border border-border rounded-2xl p-5">
              <Mail className="text-primary" size={20} />
              <h3 className="text-foreground font-semibold mt-3">Email notifications</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Sent directly via <span className="text-foreground font-medium">Resend</span> to{" "}
                <span className="text-foreground font-medium">hello@rismon.ai</span> when a new user signs up
                or completes their first scan.
              </p>
              <div className="mt-3">
                {keyConfigured ? (
                  <span className="inline-flex items-center gap-1.5 text-success text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-warning text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning" /> Not configured
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
