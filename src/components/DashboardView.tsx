import React from 'react';
import {
  Users,
  Send,
  FileText,
  Clock,
  Sparkles,
  Link2,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Play,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

interface DashboardViewProps {
  stats: any;
  onNavigate: (view: string) => void;
  isGmailConnected: boolean;
  onConnectGmail: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  onNavigate,
  isGmailConnected,
  onConnectGmail
}) => {
  const statCards = [
    {
      label: 'Confirmed Subscribers',
      value: stats?.confirmedSubscribers ?? '...',
      subtext: `${stats?.totalSubscribers ?? 0} total records (${stats?.unsubscribedCount ?? 0} unsubscribed)`,
      icon: Users,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-100',
      action: () => onNavigate('subscribers')
    },
    {
      label: 'Published Articles',
      value: stats?.publishedArticles ?? '...',
      subtext: 'Public clinical guides and resources',
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      action: () => onNavigate('blog-cms')
    },
    {
      label: 'Drafts Awaiting Review',
      value: stats?.draftsAwaitingReview ?? '...',
      subtext: 'Generated newsletters and articles',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      action: () => onNavigate('newsletters')
    },
    {
      label: 'Broadcasts Sent',
      value: stats?.campaignsSent ?? '...',
      subtext: `${stats?.campaignsScheduled ?? 0} scheduled for future dispatch`,
      icon: Send,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      action: () => onNavigate('campaigns')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Healthcare Email Marketing & Content Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {stats?.organizationName || 'HealthPulse Studio'}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Manage healthcare subscriber groups, write and publish accredited clinical articles, repurpose medical journals into engaging newsletters, and broadcast via official Gmail API.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {!isGmailConnected ? (
            <button
              onClick={onConnectGmail}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Connect Gmail to Send</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('campaigns')}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Compose Broadcast</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('ai-studio')}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>AI Content Studio</span>
          </button>
        </div>
      </div>

      {/* Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.action}
              className={`p-5 bg-white rounded-xl border ${card.border} shadow-xs hover:shadow-md transition-all cursor-pointer group`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.bg} ${card.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{card.value}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Visual Workflow Pipeline */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Content-to-Campaign Automation Pipeline</h2>
            <p className="text-xs text-slate-500">Visual state of how articles turn into newsletter broadcasts</p>
          </div>
          <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full">
            Active Workflow
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          {/* Step 1 */}
          <div
            onClick={() => onNavigate('repurpose-url')}
            className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-cyan-300 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 text-cyan-600 mb-2">
              <Link2 className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Step 1</span>
            </div>
            <h3 className="text-xs font-bold text-slate-800">Source Input</h3>
            <p className="text-[11px] text-slate-500 mt-1">Upload DOCX/PDF or paste public blog URL with SSRF check</p>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => onNavigate('ai-studio')}
            className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-cyan-300 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 text-cyan-600 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Step 2</span>
            </div>
            <h3 className="text-xs font-bold text-slate-800">AI Studio</h3>
            <p className="text-[11px] text-slate-500 mt-1">Generate structured article, takeaway outline & subject lines</p>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => onNavigate('blog-cms')}
            className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-cyan-300 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Step 3</span>
            </div>
            <h3 className="text-xs font-bold text-slate-800">Blog Publishing</h3>
            <p className="text-[11px] text-slate-500 mt-1">Review, assign categories, and publish with permanent URL</p>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => onNavigate('newsletters')}
            className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-cyan-300 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Layers className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Step 4</span>
            </div>
            <h3 className="text-xs font-bold text-slate-800">Curate Newsletter</h3>
            <p className="text-[11px] text-slate-500 mt-1">Bundle articles, format HTML email and preview on mobile</p>
          </div>

          {/* Step 5 */}
          <div
            onClick={() => onNavigate('campaigns')}
            className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-cyan-300 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <Send className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Step 5</span>
            </div>
            <h3 className="text-xs font-bold text-slate-800">Gmail Broadcast</h3>
            <p className="text-[11px] text-slate-500 mt-1">Discreet individual send with recipient privacy & audit trail</p>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Quick Actions & Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Launch Panel */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Immediate Actions</h2>

          <div className="space-y-2">
            <button
              onClick={() => onNavigate('campaigns')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-50 text-cyan-700 rounded-md">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">New Email Broadcast</p>
                  <p className="text-[11px] text-slate-500">Target segments & send via Gmail</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('repurpose-url')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-md">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Repurpose External Article</p>
                  <p className="text-[11px] text-slate-500">Transform public URL into original content</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('subscribers')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-md">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Import CSV Subscribers</p>
                  <p className="text-[11px] text-slate-500">Bulk upload nurses & medical staff</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('automations')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-md">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Recurring Automations</p>
                  <p className="text-[11px] text-slate-500">Configure weekly briefings & approvals</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Real Activity Stream from DB */}
        <div className="lg:col-span-2 p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Real Stored Activity & Audit Stream</h2>
              <p className="text-xs text-slate-500">Authentic operational logs from database</p>
            </div>
            <button
              onClick={() => onNavigate('audit-logs')}
              className="text-xs font-semibold text-cyan-700 hover:underline"
            >
              View Full Audit &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((log: any) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-800">{log.details}</p>
                    <p className="text-[11px] text-slate-400">
                      Action: <span className="font-mono text-slate-600">{log.action}</span> &bull; By: {log.adminEmail}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4">No recent activity logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
