/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { SubscribersView } from './components/SubscribersView';
import { CampaignsView } from './components/CampaignsView';
import { AiStudioView } from './components/AiStudioView';
import { RepurposeUrlView } from './components/RepurposeUrlView';
import { BlogCmsView } from './components/BlogCmsView';
import { NewslettersView } from './components/NewslettersView';
import { AutomationsView } from './components/AutomationsView';
import { AuditLogsView } from './components/AuditLogsView';
import { PublicBlogView } from './components/PublicBlogView';
import { initAuth, googleSignIn, logout } from './lib/auth';
import { api } from './lib/api';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [selectedArticleSlug, setSelectedArticleSlug] = useState<string | null>(null);

  // Check if URL is an unsubscribe request
  const [isUnsubscribeView, setIsUnsubscribeView] = useState(false);
  const [unsubscribedEmail, setUnsubscribedEmail] = useState('');

  useEffect(() => {
    // Check URL parameters for direct unsubscribe link
    const params = new URLSearchParams(window.location.search);
    const unsubEmail = params.get('email');
    if (window.location.pathname.includes('/unsubscribe') || (unsubEmail && window.location.search.includes('unsubscribe'))) {
      setIsUnsubscribeView(true);
      setUnsubscribedEmail(unsubEmail || '');
      if (unsubEmail) {
        fetch(`/api/unsubscribe?email=${encodeURIComponent(unsubEmail)}`).catch(console.error);
      }
    }

    // Initialize Firebase Auth listener
    const unsubscribeAuth = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    loadStats();

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    }
  };

  const handleSignIn = async () => {
    setIsConnecting(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        loadStats();
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      alert(`Sign in error: ${err.message || 'Authentication cancelled'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
  };

  const handleViewPublicArticle = (slug: string) => {
    setSelectedArticleSlug(slug);
    setActiveView('public-blog');
  };

  // If user navigated via email unsubscribe link
  if (isUnsubscribeView) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Unsubscribe Confirmed</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            {unsubscribedEmail ? (
              <>
                <strong className="text-slate-800">{unsubscribedEmail}</strong> has been successfully unsubscribed from HealthPulse email broadcasts and newsletters.
              </>
            ) : (
              'You have been unsubscribed from our email mailing list in accordance with anti-spam standards.'
            )}
          </p>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>RFC 822 One-Click List Unsubscribe</span>
          </div>
        </div>
      </div>
    );
  }

  // If user toggled to public blog view
  if (activeView === 'public-blog') {
    return (
      <PublicBlogView
        initialSlug={selectedArticleSlug}
        onBackToAdmin={() => {
          setSelectedArticleSlug(null);
          setActiveView('dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
      {/* Top Header */}
      <Header
        user={user}
        token={token}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isConnecting={isConnecting}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main SaaS Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          pendingDraftsCount={stats?.draftsAwaitingReview || 0}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && (
              <DashboardView
                stats={stats}
                onNavigate={setActiveView}
                isGmailConnected={!!(user && token)}
                onConnectGmail={handleSignIn}
              />
            )}

            {activeView === 'subscribers' && <SubscribersView />}

            {activeView === 'campaigns' && (
              <CampaignsView
                isGmailConnected={!!(user && token)}
                userEmail={user?.email || undefined}
                onConnectGmail={handleSignIn}
              />
            )}

            {activeView === 'ai-studio' && (
              <AiStudioView onNavigate={setActiveView} />
            )}

            {activeView === 'repurpose-url' && (
              <RepurposeUrlView onNavigate={setActiveView} />
            )}

            {activeView === 'blog-cms' && (
              <BlogCmsView onViewPublicArticle={handleViewPublicArticle} />
            )}

            {activeView === 'newsletters' && (
              <NewslettersView onNavigate={setActiveView} />
            )}

            {activeView === 'automations' && <AutomationsView />}

            {activeView === 'audit-logs' && <AuditLogsView />}
          </div>
        </main>
      </div>
    </div>
  );
}
