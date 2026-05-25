import { useEffect, useState } from "react";
import { ArrowLeft, Send, Eye, AlertTriangle, CheckCircle2, Mail, CalendarClock, Rocket, Bell, Sparkles, GitBranch, MessageCircle, UserPlus, Megaphone } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Admin broadcast hub: pick a campaign → test → confirm → broadcast.
// Hard-gated to admins (also enforced server-side).

const ADMIN_EMAILS = new Set(["risvan@labs3am.com", "hello@rismon.ai"]);

type CampaignId = "scan-nudge" | "producthunt-launch" | "first-scan-reminder" | "complete-your-scan" | "personal-outreach" | "new-signup-nudge" | "promise-audit-announcement";

interface Campaign {
  id: CampaignId;
  fn: string; // edge function name
  label: string;
  subject: string;
  description: string;
  audience: string;
  icon: typeof Bell;
  supportsInactiveDays: boolean;
}

const CAMPAIGNS: Campaign[] = [
  {
    id: "scan-nudge",
    fn: "send-scan-nudge",
    label: "Scan nudge",
    subject: "A quick note before you decide Rismon isn't for you",
    description: "Personal \"haven't scanned yet?\" note to inactive users who never ran a scan. Each user gets it at most once.",
    audience: "Inactive signups (configurable window) who never scanned",
    icon: Bell,
    supportsInactiveDays: true,
  },
  {
    id: "producthunt-launch",
    fn: "send-producthunt-launch",
    label: "Product Hunt launch",
    subject: "We're live on Product Hunt 🚀",
    description: "Launch-day note asking users to upvote on Product Hunt and star the GitHub repo.",
    audience: "All users with an email in profiles",
    icon: Rocket,
    supportsInactiveDays: false,
  },
  {
    id: "first-scan-reminder",
    fn: "send-first-scan-reminder",
    label: "First scan reminder",
    subject: "Your app is waiting to be scanned",
    description: "Nudge for users who signed up but never ran a scan. Walks them through the 3-step flow.",
    audience: "Users with zero analyses",
    icon: Sparkles,
    supportsInactiveDays: false,
  },
  {
    id: "complete-your-scan",
    fn: "send-complete-your-scan",
    label: "Complete your scan",
    subject: "You are one step away from your first report",
    description: "Reminder for users who connected a repo but never ran a scan. Lists the most common findings.",
    audience: "Users with at least one connected app and zero analyses",
    icon: GitBranch,
    supportsInactiveDays: false,
  },
  {
    id: "personal-outreach",
    fn: "send-personal-outreach",
    label: "Personal outreach — never scanned",
    subject: "Quick note from the Rismon founder",
    description: "Plain-text personal note from Risvan to users who signed up but never ran a scan. No HTML, no buttons.",
    audience: "Users with zero analyses (deduped, one-time per user)",
    icon: MessageCircle,
    supportsInactiveDays: false,
  },
  {
    id: "new-signup-nudge",
    fn: "send-new-signup-nudge",
    label: "New signup nudge (24h)",
    subject: "You signed up — but you haven't run your first scan yet",
    description: "Friendly nudge to users who signed up in the last 24 hours and haven't run a scan yet.",
    audience: "Users who signed up < 24h ago with zero analyses",
    icon: UserPlus,
    supportsInactiveDays: false,
  },
  {
    id: "promise-audit-announcement",
    fn: "send-promise-audit-announcement",
    label: "Promise Audit announcement",
    subject: "New in Rismon.ai: Promise Audit — does your landing page tell the truth?",
    description: "Announces the new Promise Audit feature with feature list and CTA to /promise-audit.",
    audience: "All users with an email in profiles",
    icon: Megaphone,
    supportsInactiveDays: false,
  },
];

const PRESETS: { label: string; days: number }[] = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
  { label: "1 year", days: 365 },
];

const AdminBroadcast = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign>(CAMPAIGNS[0]);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [sample, setSample] = useState<string[]>([]);
  const [loadingCount, setLoadingCount] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [lastResult, setLastResult] = useState<null | { sent: number; failed: number; errors: string[] }>(null);
  const [inactiveDays, setInactiveDays] = useState<number>(14);
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !user.email || !ADMIN_EMAILS.has(user.email))) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const fetchEligible = async () => {
    setLoadingCount(true);
    try {
      const body: Record<string, unknown> = { mode: "broadcast", dryRun: true };
      if (campaign.supportsInactiveDays) body.inactiveDays = inactiveDays;
      const { data, error } = await supabase.functions.invoke(campaign.fn, {
        body,
      });
      if (error) throw error;
      setEligibleCount(data?.eligibleCount ?? 0);
      setSample(data?.sample ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load count");
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => {
    if (user?.email && ADMIN_EMAILS.has(user.email)) {
      // Reset state on campaign switch and re-fetch.
      setEligibleCount(null);
      setSample([]);
      setLastResult(null);
      setConfirmOpen(false);
      setConfirmText("");
      fetchEligible();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, inactiveDays, campaign.id]);

  const sendTest = async () => {
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke(campaign.fn, {
        body: { mode: "test" },
      });
      if (error) throw error;
      toast.success(`Test sent to ${data?.sentTo || "hello@rismon.ai"} — check your inbox.`);
    } catch (e: any) {
      toast.error(e?.message || "Test send failed");
    } finally {
      setSendingTest(false);
    }
  };

  const broadcast = async () => {
    if (confirmText !== "SEND") {
      toast.error("Type SEND to confirm");
      return;
    }
    setBroadcasting(true);
    try {
      const body: Record<string, unknown> = { mode: "broadcast" };
      if (campaign.supportsInactiveDays) body.inactiveDays = inactiveDays;
      const { data, error } = await supabase.functions.invoke(campaign.fn, {
        body,
      });
      if (error) throw error;
      setLastResult({ sent: data?.sent ?? 0, failed: data?.failed ?? 0, errors: data?.errors ?? [] });
      toast.success(`Broadcast complete: ${data?.sent ?? 0} sent, ${data?.failed ?? 0} failed`);
      setConfirmOpen(false);
      setConfirmText("");
      fetchEligible();
    } catch (e: any) {
      toast.error(e?.message || "Broadcast failed");
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to admin
        </Link>

        <div className="mb-2">
          <span className="inline-block text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
            Broadcast hub
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Email campaigns</h1>
        <p className="text-muted-foreground mb-10 leading-relaxed">
          Pick a campaign, send yourself a test, then broadcast to your users.
        </p>

        {/* Campaign picker */}
        <section className="rounded-2xl border border-border bg-card p-6 mb-5">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-3">Campaign</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {CAMPAIGNS.map((c) => {
              const Icon = c.icon;
              const active = campaign.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCampaign(c)}
                  disabled={loadingCount || broadcasting || sendingTest}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    active
                      ? "bg-primary/5 border-primary/40"
                      : "bg-background border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <p className={`text-sm font-semibold ${active ? "text-foreground" : "text-foreground"}`}>{c.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">{c.description}</p>
                  <p className="text-[10px] font-mono text-muted-foreground/70 truncate">"{c.subject}"</p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            <strong className="text-foreground">Audience:</strong> {campaign.audience}
          </p>
        </section>

        {/* Step 1 — Audience */}
        <section className="rounded-2xl border border-border bg-card p-6 mb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-1">Step 1</p>
              <h2 className="text-lg font-semibold">Eligible users</h2>
            </div>
            <Button variant="outline" size="sm" onClick={fetchEligible} disabled={loadingCount}>
              {loadingCount ? "Counting…" : "Refresh"}
            </Button>
          </div>

          {/* Inactivity window selector — only for campaigns that support it */}
          {campaign.supportsInactiveDays && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Inactive for at least</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active = !customMode && inactiveDays === p.days;
                return (
                  <button
                    key={p.days}
                    onClick={() => { setCustomMode(false); setInactiveDays(p.days); }}
                    disabled={loadingCount || broadcasting}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
              <button
                onClick={() => setCustomMode(true)}
                disabled={loadingCount || broadcasting}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  customMode
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                }`}
              >
                Custom
              </button>
            </div>
            {customMode && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={730}
                  value={inactiveDays}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (Number.isFinite(v)) setInactiveDays(Math.min(730, Math.max(1, v)));
                  }}
                  className="w-24 px-3 py-1.5 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">days (1–730)</span>
              </div>
            )}
          </div>
          )}

          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-5xl font-bold text-primary tabular-nums">{eligibleCount ?? "—"}</span>
            <span className="text-sm text-muted-foreground">eligible users</span>
          </div>
          {sample.length > 0 && (
            <p className="text-xs text-muted-foreground/80 font-mono leading-relaxed">
              e.g. {sample.join(", ")}
              {eligibleCount && eligibleCount > sample.length ? " …" : ""}
            </p>
          )}
        </section>

        {/* Step 2 — Test */}
        <section className="rounded-2xl border border-border bg-card p-6 mb-5">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-1">Step 2</p>
          <h2 className="text-lg font-semibold mb-2">Send test to yourself first</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Sends the live email <strong className="text-foreground">only to hello@rismon.ai</strong>. Open it in Gmail, check rendering on mobile, then come back.
          </p>
          <Button onClick={sendTest} disabled={sendingTest} className="gap-2">
            <Eye className="w-4 h-4" />
            {sendingTest ? "Sending…" : "Send test to hello@rismon.ai"}
          </Button>
        </section>

        {/* Step 3 — Broadcast */}
        <section className="rounded-2xl border border-primary/30 bg-card p-6">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase mb-1">Step 3 · Final</p>
          <h2 className="text-lg font-semibold mb-2">Broadcast to all eligible users</h2>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Only run this <strong className="text-foreground">after</strong> you've confirmed the test email looks right. This cannot be undone.
          </p>

          {!confirmOpen ? (
            <Button
              variant="default"
              onClick={() => setConfirmOpen(true)}
              disabled={!eligibleCount || eligibleCount === 0}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Broadcast to {eligibleCount ?? 0} users
            </Button>
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  About to email <strong>{eligibleCount}</strong> users with <strong>"{campaign.label}"</strong>. Type <code className="px-1.5 py-0.5 rounded bg-background border border-border text-xs">SEND</code> to confirm.
                </p>
              </div>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type SEND"
                className="w-full px-3 py-2 mb-3 bg-background border border-border rounded-md text-sm font-mono focus:outline-none focus:border-primary"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={broadcast}
                  disabled={broadcasting || confirmText !== "SEND"}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  {broadcasting ? "Sending…" : "Confirm broadcast"}
                </Button>
                <Button variant="ghost" onClick={() => { setConfirmOpen(false); setConfirmText(""); }} disabled={broadcasting}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>

        {lastResult && (
          <section className="rounded-2xl border border-border bg-card p-6 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Last broadcast result</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sent</p>
                <p className="text-2xl font-bold tabular-nums">{lastResult.sent}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Failed</p>
                <p className="text-2xl font-bold tabular-nums text-muted-foreground">{lastResult.failed}</p>
              </div>
            </div>
            {lastResult.errors.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer">Show first errors</summary>
                <pre className="text-xs mt-2 p-3 bg-background rounded border border-border overflow-x-auto">
                  {lastResult.errors.join("\n")}
                </pre>
              </details>
            )}
          </section>
        )}

        <p className="text-xs text-muted-foreground/70 mt-10 flex items-center gap-2">
          <Mail className="w-3 h-3" />
          Sender: hello@rismon.ai · Reply-to: hello@rismon.ai · Throttled to ~4/sec
        </p>
      </div>
    </div>
  );
};

export default AdminBroadcast;