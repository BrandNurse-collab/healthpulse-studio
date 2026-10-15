import React from 'react';
import { Activity, Sparkles, CheckCircle2, AlertCircle, LogOut, ExternalLink, Globe, LayoutDashboard } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  token: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isConnecting: boolean;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  token,
  onSignIn,
  onSignOut,
  isConnecting,
  activeView,
  setActiveView
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-cyan-400 shadow-md shadow-slate-900/10 ring-1 ring-white/20">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-slate-900 tracking-tight">HealthPulse</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">Studio</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Email Marketing & Healthcare Content Automation</p>
            </div>
          </div>

          {/* Center: Live Reader / Admin Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeView !== 'public-blog'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-cyan-600" />
              <span>Admin Console</span>
            </button>
            <button
              onClick={() => setActiveView('public-blog')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeView === 'public-blog'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-600" />
              <span>Public Blog View</span>
            </button>
          </div>

          {/* Right Actions: AI status & Gmail Auth */}
          <div className="flex items-center gap-3">
            {/* AI badge */}
            <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>Gemini 2.5 Flash</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            {/* Gmail Connection State */}
            {user && token ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-emerald-950 flex items-center gap-1">
                      <span>Gmail Connected</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                    </p>
                    <p className="text-[10px] text-emerald-700 max-w-[130px] sm:max-w-[190px] truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onSignOut}
                  title="Disconnect Gmail Account"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                disabled={isConnecting}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50"
              >
                {/* Official Google G Logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{isConnecting ? 'Authorizing...' : 'Connect Gmail'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
