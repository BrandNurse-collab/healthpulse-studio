import React from 'react';
import {
  LayoutDashboard,
  Users,
  Send,
  Sparkles,
  Link2,
  FileText,
  MailOpen,
  Cpu,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  pendingDraftsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  pendingDraftsCount = 0
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'subscribers',
      label: 'Subscribers & Groups',
      icon: Users,
      badge: null
    },
    {
      id: 'campaigns',
      label: 'Email Broadcasts',
      icon: Send,
      badge: null
    },
    {
      id: 'ai-studio',
      label: 'AI Content Studio',
      icon: Sparkles,
      badge: 'Gemini'
    },
    {
      id: 'repurpose-url',
      label: 'Repurpose Blog URL',
      icon: Link2,
      badge: null
    },
    {
      id: 'blog-cms',
      label: 'Articles & CMS',
      icon: FileText,
      badge: null
    },
    {
      id: 'newsletters',
      label: 'Newsletter Engine',
      icon: MailOpen,
      badge: pendingDraftsCount > 0 ? `${pendingDraftsCount} Draft` : null
    },
    {
      id: 'automations',
      label: 'Automations & Jobs',
      icon: Cpu,
      badge: 'Cron'
    },
    {
      id: 'audit-logs',
      label: 'Audit & Compliance',
      icon: ShieldCheck,
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Section label */}
      <div className="px-5 py-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
        Management Platform
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 font-semibold border-l-2 border-cyan-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-cyan-400/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 m-3 bg-slate-800/70 rounded-xl border border-slate-700/60 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold text-white">Gmail API Sending</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        </div>
        <p className="text-[11px] text-slate-400 leading-normal">
          Direct Google Workspace OAuth with recipient privacy and RFC822 formatting.
        </p>
      </div>
    </aside>
  );
};
