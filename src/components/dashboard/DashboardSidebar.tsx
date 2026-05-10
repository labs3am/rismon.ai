import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Target, ShieldAlert, Globe, FileText, Activity, Radio, Plug, Settings, Lock, PlusCircle,
} from 'lucide-react';

export type SectionKey =
  | 'overview' | 'intent' | 'security' | 'seo' | 'legal' | 'performance' | 'monitoring';

interface NavItem {
  key: SectionKey;
  label: string;
  icon: any;
  pro?: boolean;
}

const items: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'intent', label: 'Business Intent', icon: Target },
  { key: 'security', label: 'Security Issues', icon: ShieldAlert },
  { key: 'seo', label: 'Intent Match', icon: Globe },
  { key: 'legal', label: 'Legal & Trust', icon: FileText },
  { key: 'performance', label: 'Performance', icon: Activity, pro: true },
  { key: 'monitoring', label: 'Continuous Monitoring', icon: Radio, pro: true },
];

export default function DashboardSidebar({
  active, onSelect, hasApp, isPro,
}: {
  active: SectionKey;
  onSelect: (k: SectionKey) => void;
  hasApp: boolean;
  isPro: boolean;
}) {
  const navigate = useNavigate();

  const row = (
    onClick: (() => void) | null,
    icon: React.ReactNode,
    label: string,
    opts: { active?: boolean; locked?: boolean; pro?: boolean; danger?: boolean } = {},
  ) => (
    <button
      type="button"
      onClick={opts.locked ? undefined : onClick ?? undefined}
      disabled={opts.locked}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors"
      style={{
        background: opts.active ? '#181818' : 'transparent',
        color: opts.locked ? '#3f3f3f' : opts.active ? '#ffffff' : '#a3a3a3',
        fontSize: 13,
        fontWeight: opts.active ? 500 : 400,
        border: opts.active ? '1px solid #2a2a2a' : '1px solid transparent',
        cursor: opts.locked ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!opts.locked && !opts.active) (e.currentTarget.style.background = '#111'); }}
      onMouseLeave={(e) => { if (!opts.locked && !opts.active) (e.currentTarget.style.background = 'transparent'); }}
    >
      <span style={{ display: 'inline-flex', width: 16 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {opts.pro && !isPro && (
        <span
          style={{
            fontSize: 9,
            padding: '2px 6px',
            borderRadius: 4,
            background: '#1f1108',
            color: '#f97316',
            border: '1px solid #4f2710',
            letterSpacing: '0.05em',
          }}
        >
          PRO
        </span>
      )}
      {opts.locked && <Lock size={11} />}
    </button>
  );

  return (
    <>
    {/* Mobile horizontal section strip */}
    <div
      className="md:hidden sticky z-30 flex gap-2 overflow-x-auto no-scrollbar"
      style={{
        top: 56,
        background: '#000',
        borderBottom: '1px solid #1a1a1a',
        padding: '10px 12px',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.key && hasApp;
        const locked = !hasApp;
        return (
          <button
            key={it.key}
            type="button"
            onClick={locked ? undefined : () => onSelect(it.key)}
            disabled={locked}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full"
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              border: `1px solid ${isActive ? '#2a2a2a' : '#1a1a1a'}`,
              background: isActive ? '#181818' : '#0a0a0a',
              color: locked ? '#3f3f3f' : isActive ? '#fff' : '#a3a3a3',
              flexShrink: 0,
            }}
          >
            <Icon size={12} />
            {it.label}
            {it.pro && !isPro && (
              <span style={{ fontSize: 9, color: '#f97316', marginLeft: 2 }}>PRO</span>
            )}
          </button>
        );
      })}
    </div>

    <aside
      className="hidden md:flex flex-col"
      style={{
        width: 240,
        background: '#080808',
        borderRight: '1px solid #1a1a1a',
        padding: '20px 12px',
        position: 'sticky',
        top: 64,
        height: 'calc(100vh - 64px)',
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.12em', padding: '0 8px 8px', textTransform: 'uppercase' }}>
        Workspace
      </div>
      <div className="space-y-0.5">
        {items.map((it) => {
          const Icon = it.icon;
          const locked = !hasApp;
          return (
            <div key={it.key}>
              {row(
                () => onSelect(it.key),
                <Icon size={14} />,
                it.label,
                { active: active === it.key && !locked, locked, pro: it.pro },
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.12em', padding: '20px 8px 8px', textTransform: 'uppercase' }}>
        Setup
      </div>
      <div className="space-y-0.5">
        {row(() => navigate('/connect'), <PlusCircle size={14} />, hasApp ? 'Connect another app' : 'Connect your app', {
          active: false,
          danger: !hasApp,
        })}
        {row(() => navigate('/settings'), <Settings size={14} />, 'Settings')}
      </div>

      {!hasApp && (
        <div
          className="mt-auto"
          style={{
            background: 'linear-gradient(180deg, #14110a, #0a0a0a)',
            border: '1px solid #2a2210',
            borderRadius: 10,
            padding: 14,
            marginTop: 'auto',
          }}
        >
          <div style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>Get started</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 6, lineHeight: 1.5 }}>
            Connect your app to unlock the full dashboard.
          </div>
          <Link
            to="/connect"
            className="mt-3 inline-flex items-center gap-1.5"
            style={{
              fontSize: 11,
              fontWeight: 500,
              background: '#f97316',
              color: '#000',
              padding: '6px 10px',
              borderRadius: 6,
              textDecoration: 'none',
            }}
          >
            <Plug size={11} /> Connect now
          </Link>
        </div>
      )}
    </aside>
    </>
  );
}
