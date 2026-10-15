import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  BookOpen,
  Calendar,
  Clock,
  ArrowLeft,
  Mail,
  CheckCircle2,
  Share2,
  Tag,
  ExternalLink
} from 'lucide-react';
import { api } from '../lib/api';

interface PublicBlogViewProps {
  initialSlug?: string | null;
  onBackToAdmin: () => void;
}

export const PublicBlogView: React.FC<PublicBlogViewProps> = ({
  initialSlug,
  onBackToAdmin
}) => {
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Newsletter subscribe form
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeName, setSubscribeName] = useState('');
  const [subscribeProfession, setSubscribeProfession] = useState('Registered Nurse');
  const [subscribeMessage, setSubscribeMessage] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    loadPublicArticles();
  }, []);

  const loadPublicArticles = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPublicBlog();
      const list = res.articles || [];
      setArticles(list);

      if (initialSlug) {
        const found = list.find((a: any) => a.slug === initialSlug);
        if (found) setSelectedArticle(found);
      }
    } catch (err) {
      console.error('Failed to load public blog:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenArticle = async (art: any) => {
    setSelectedArticle(art);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      // Trigger view increment
      await api.getPublicArticle(art.slug);
    } catch (err) {
      // ignore
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribeEmail.trim()) return;
    setIsSubscribing(true);
    setSubscribeMessage('');

    try {
      const res = await api.publicSubscribe({
        email: subscribeEmail,
        fullName: subscribeName,
        profession: subscribeProfession
      });
      setSubscribeMessage(res.message || 'Subscribed successfully!');
      setSubscribeEmail('');
      setSubscribeName('');
    } catch (err: any) {
      setSubscribeMessage(`Error: ${err.message}`);
    } finally {
      setIsSubscribing(false);
    }
  };

  const categories = [
    'All Topics',
    'Clinical Practice',
    'Nursing Education',
    'Recruitment & Career',
    'Healthcare Leadership',
    'Continuing Education'
  ];

  const filtered = articles.filter(a => {
    if (selectedCategory && selectedCategory !== 'All Topics' && a.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.excerpt.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Blog Hero Navbar */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            onClick={() => setSelectedArticle(null)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-cyan-400 shadow-md">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-base font-extrabold text-slate-900 tracking-tight">HealthPulse Journal</span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-medium">Clinical Education & Career Network</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToAdmin}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Back to Admin Console &rarr;
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {selectedArticle ? (
          /* SINGLE ARTICLE READER VIEW */
          <article className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
            <button
              onClick={() => setSelectedArticle(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:text-cyan-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to all clinical publications</span>
            </button>

            {/* Header info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-cyan-100 text-cyan-800 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedArticle.category}
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {selectedArticle.readingTimeMinutes} min read
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {selectedArticle.title}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                {selectedArticle.excerpt}
              </p>

              {/* Author & Attribution metadata */}
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
                    {selectedArticle.authorName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{selectedArticle.authorName}</h4>
                    <p className="text-[11px] text-slate-500">{selectedArticle.authorRole}</p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(selectedArticle.publishedAt || selectedArticle.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span>{selectedArticle.viewsCount || 1} views</span>
                </div>
              </div>
            </div>

            {/* Featured Image */}
            {selectedArticle.featuredImage && (
              <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200 max-h-96">
                <img
                  src={selectedArticle.featuredImage}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Repurposed source attribution alert */}
            {selectedArticle.sourceAttribution && (
              <div className="p-3.5 bg-slate-100 rounded-lg border border-slate-300 text-xs text-slate-700 flex items-center justify-between">
                <div>
                  <strong>Source Attribution:</strong> {selectedArticle.sourceAttribution}
                </div>
                {selectedArticle.sourceUrl && (
                  <a
                    href={selectedArticle.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-700 hover:underline flex items-center gap-1 font-semibold ml-2 shrink-0"
                  >
                    <span>Original Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Body */}
            <div
              className="prose prose-slate lg:prose-lg max-w-none text-slate-800 leading-relaxed font-normal"
              dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
            />

            {/* Tags */}
            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-1.5 items-center">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {selectedArticle.tags.map((t: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Inline Reader Opt-In Card */}
            <div className="p-8 bg-slate-900 rounded-2xl text-white shadow-xl space-y-4">
              <div className="max-w-xl space-y-1">
                <h3 className="text-lg font-bold">Never miss a healthcare clinical briefing</h3>
                <p className="text-xs text-slate-300">
                  Join verified nurses, clinical leads, and healthcare educators receiving our weekly newsletter.
                </p>
              </div>

              {subscribeMessage ? (
                <div className="p-3 bg-emerald-500/20 border border-emerald-400 rounded-lg text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{subscribeMessage}</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      value={subscribeName}
                      onChange={e => setSubscribeName(e.target.value)}
                      className="p-2.5 bg-slate-800 text-white rounded-lg border border-slate-700 text-xs focus:outline-cyan-400"
                    />
                    <input
                      type="email"
                      required
                      placeholder="work.email@hospital.org"
                      value={subscribeEmail}
                      onChange={e => setSubscribeEmail(e.target.value)}
                      className="p-2.5 bg-slate-800 text-white rounded-lg border border-slate-700 text-xs focus:outline-cyan-400"
                    />
                    <select
                      value={subscribeProfession}
                      onChange={e => setSubscribeProfession(e.target.value)}
                      className="p-2.5 bg-slate-800 text-white rounded-lg border border-slate-700 text-xs focus:outline-cyan-400"
                    >
                      <option value="Registered Nurse">Registered Nurse</option>
                      <option value="Clinical Director">Clinical Director</option>
                      <option value="Resident Physician">Resident Physician</option>
                      <option value="Hospital Manager">Hospital Manager</option>
                      <option value="Nursing Student">Nursing Student</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubscribing}
                    className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-md disabled:opacity-50"
                  >
                    {isSubscribing ? 'Subscribing...' : 'Subscribe to HealthPulse Weekly Briefing'}
                  </button>
                </form>
              )}
            </div>
          </article>
        ) : (
          /* BLOG DIRECTORY / FEED VIEW */
          <div className="space-y-8">
            {/* Hero Directory Banner */}
            <div className="text-center max-w-2xl mx-auto space-y-3 py-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-100 px-3 py-1 rounded-full">
                Peer-Reviewed & Clinical Guides
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Healthcare Professional Journal & Resource Library
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Evidence-based protocols, emergency nursing workflows, global licensure pathways, and clinical leadership insights.
              </p>
            </div>

            {/* Filter Categories and Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
                {categories.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCategory(c === 'All Topics' ? '' : c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      (selectedCategory === c) || (!selectedCategory && c === 'All Topics')
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-cyan-500"
                />
              </div>
            </div>

            {/* Grid of Articles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading publications...</div>
              ) : filtered.length === 0 ? (
                <div className="col-span-full p-12 text-center text-xs text-slate-400">No articles match your search.</div>
              ) : (
                filtered.map(art => (
                  <div
                    key={art.id}
                    onClick={() => handleOpenArticle(art)}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col group cursor-pointer hover:shadow-lg transition-all"
                  >
                    <div className="h-48 relative overflow-hidden bg-slate-100">
                      <img
                        src={art.featuredImage}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {art.category}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-cyan-700 transition-colors line-clamp-2">
                          {art.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                          {art.excerpt}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-700">{art.authorName}</span>
                        <span>{art.readingTimeMinutes} min read</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-bold text-slate-800">HealthPulse Healthcare Professional Network</p>
          <p className="text-[11px] text-slate-400">
            Committed to accredited medical education, clinical career empowerment, and ethical communication.
          </p>
        </div>
      </footer>
    </div>
  );
};
