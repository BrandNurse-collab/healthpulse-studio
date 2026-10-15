import React, { useState, useEffect } from 'react';
import {
  MailOpen,
  Plus,
  Sparkles,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  X
} from 'lucide-react';
import { api } from '../lib/api';

interface Newsletter {
  id: string;
  title: string;
  edition: number;
  status: 'draft' | 'ready' | 'scheduled' | 'sent';
  introNote: string;
  articleIds: string[];
  htmlBody: string;
  plainText: string;
  generatedBy: string;
  createdAt: string;
  campaignId?: string;
}

interface NewslettersViewProps {
  onNavigate: (view: string) => void;
}

export const NewslettersView: React.FC<NewslettersViewProps> = ({ onNavigate }) => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Creator modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [introPrompt, setIntroPrompt] = useState('Emphasize acute patient safety and upcoming CME virtual simulations.');
  const [audience, setAudience] = useState('All Healthcare Professionals');
  const [isGenerating, setIsGenerating] = useState(false);

  // Preview modal
  const [previewNewsletter, setPreviewNewsletter] = useState<Newsletter | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [nRes, aRes] = await Promise.all([
        api.getNewsletters(),
        api.getArticles({ status: 'published' })
      ]);
      setNewsletters(nRes.newsletters || []);
      setArticles(aRes.articles || []);
    } catch (err) {
      console.error('Failed to load newsletters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateNewsletter = async () => {
    if (selectedArticleIds.length === 0) {
      alert('Please select at least 1 published article.');
      return;
    }

    setIsGenerating(true);
    try {
      await api.createNewsletter({
        articleIds: selectedArticleIds,
        introPrompt,
        audience
      });
      setIsModalOpen(false);
      setSelectedArticleIds([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate newsletter');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConvertToCampaign = async (newsletterId: string) => {
    try {
      await api.turnNewsletterIntoCampaign(newsletterId);
      alert('Campaign draft created from newsletter! Redirecting to Campaigns...');
      onNavigate('campaigns');
    } catch (err: any) {
      alert(err.message || 'Error converting to campaign');
    }
  };

  const toggleSelectArticle = (id: string) => {
    setSelectedArticleIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Newsletter Curation Engine</h1>
          <p className="text-xs text-slate-500">
            Synthesize multiple published articles into responsive email newsletters with AI intro notes.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedArticleIds(articles.slice(0, 3).map(a => a.id));
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-slate-900 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Curate New Issue</span>
        </button>
      </div>

      {/* Newsletters Archive */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MailOpen className="w-4 h-4 text-cyan-600" />
            <h2 className="text-sm font-bold text-slate-900">Newsletter Archive & Editions</h2>
          </div>
          <button onClick={loadData} className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading newsletter editions...</div>
          ) : newsletters.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No newsletters generated yet.</p>
              <p className="text-xs text-slate-400">Click "Curate New Issue" to compile your articles.</p>
            </div>
          ) : (
            newsletters.map(item => (
              <div key={item.id} className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">Issue #{item.edition}</span>
                    <span className="text-slate-400">&bull;</span>
                    <h3 className="text-sm font-semibold text-slate-800">{item.title}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'sent'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {item.introNote}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span>Includes <strong>{item.articleIds.length}</strong> clinical articles</span>
                    <span>&bull;</span>
                    <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPreviewNewsletter(item)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => handleConvertToCampaign(item.id)}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Turn into Broadcast</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Curate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Curate Healthcare Newsletter Issue</h3>
                <p className="text-xs text-slate-500">Select published articles and prompt AI to write the executive synthesis</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Articles to Include ({selectedArticleIds.length} selected):
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 p-2 rounded-lg bg-slate-50">
                  {articles.length === 0 ? (
                    <p className="p-3 text-slate-400">No published articles found.</p>
                  ) : (
                    articles.map(art => {
                      const isSelected = selectedArticleIds.includes(art.id);
                      return (
                        <div
                          key={art.id}
                          onClick={() => toggleSelectArticle(art.id)}
                          className={`p-2 rounded-md border flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-cyan-50 border-cyan-300 text-cyan-950 font-semibold'
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="truncate max-w-sm">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-1.5">
                              {art.category}
                            </span>
                            <span>{art.title}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-cyan-600"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Healthcare Audience</label>
                <input
                  type="text"
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Editorial Theme / Instructions for AI</label>
                <textarea
                  rows={3}
                  value={introPrompt}
                  onChange={e => setIntroPrompt(e.target.value)}
                  placeholder="e.g. Highlight new emergency protocols and congratulate recent workshop graduates."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isGenerating || selectedArticleIds.length === 0}
                  onClick={handleGenerateNewsletter}
                  className="px-5 py-2 bg-slate-900 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isGenerating ? 'Synthesizing Issue...' : 'Generate Newsletter Draft'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewNewsletter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{previewNewsletter.title}</h3>
                <p className="text-xs text-slate-500">Edition #{previewNewsletter.edition} Preview</p>
              </div>
              <button onClick={() => setPreviewNewsletter(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-slate-100">
              <div
                className="bg-white p-6 rounded-lg shadow-xs border border-slate-200 max-w-xl mx-auto"
                dangerouslySetInnerHTML={{ __html: previewNewsletter.htmlBody }}
              />
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewNewsletter(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = previewNewsletter.id;
                  setPreviewNewsletter(null);
                  handleConvertToCampaign(id);
                }}
                className="px-4 py-1.5 bg-slate-900 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold"
              >
                Turn into Broadcast Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
