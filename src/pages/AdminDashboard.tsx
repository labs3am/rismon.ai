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

type Tab = "overview" | "users" | "scans" | "inactive" | "no-github" | "tools";

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
    if (!key.trim().startsWith("eyJ")) {
      return toast.error("That doesn't look like a service role key");
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_set_notify_key" as any, { _key: key.trim() } as any);
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
            To receive email alerts when users sign up or complete their first scan, paste your Supabase
            service-role key once. Find it at <span className="font-mono">Lovable Cloud → Settings → API → service_role secret</span>.
          </p>
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 rounded-md text-xs font-medium hover:bg-foreground/90"
            >
              <KeyRound size={12} /> Configure
            </button>
          ) : (
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGci..."
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

  const [search, setSearch] = useState("");
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
    const [statsRes, usersRes, scansRes, topRes, inactiveRes, noGhRes, tsRes, planRes] = await Promise.all([
      supabase.rpc("admin_user_stats" as any),
      supabase.rpc("admin_list_users" as any),
      supabase.rpc("admin_recent_scans" as any, { _limit: 50 } as any),
      supabase.rpc("admin_top_scanners" as any, { _limit: 10 } as any),
      supabase.rpc("admin_inactive_users" as any, { _limit: 100 } as any),
      supabase.rpc("admin_users_without_github" as any, { _limit: 100 } as any),
      supabase.rpc("admin_activity_timeseries" as any, { _days: 30 } as any),
      supabase.rpc("admin_plan_distribution" as any),
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
    setLoading(false);

    const { data: keyData } = await supabase.rpc("admin_notify_key_set" as any);
    setKeyConfigured(keyData === true);
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

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
        <div className="flex gap-1 mt-6 border-b border-border">
          {([
            ["overview", "Overview", TrendingUp],
            ["users", `Users (${stats?.total_users ?? "…"})`, Users],
            ["scans", "Scans", FileText],
            ["tools", "Tools", Inbox],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key as Tab)}
              className={`px-4 py-2.5 text-sm flex items-center gap-2 border-b-2 -mb-px transition-colors ${
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

            <div className="grid lg:grid-cols-2 gap-4">
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
                            {u.full_name && <div className="text-subtle text-xs truncate">{u.full_name}</div>}
                          </div>
                        </div>
                        <div className="text-foreground text-sm tabular-nums font-medium">{u.scan_count}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

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
                            <button
                              onClick={() => deleteUser(u)}
                              className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={14} />
                            </button>
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
            <div className="bg-card border border-border rounded-2xl p-5">
              <Mail className="text-primary" size={20} />
              <h3 className="text-foreground font-semibold mt-3">Email notifications</h3>
              <p className="text-muted-foreground text-sm mt-1">
                You'll receive emails at <span className="text-foreground font-medium">hello@rismon.ai</span> when a new user signs up
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
