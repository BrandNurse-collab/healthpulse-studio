import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  ExternalLink,
  Edit3,
  X
} from 'lucide-react';
import { api } from '../lib/api';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  authorName: string;
  authorRole: string;
  featuredImage: string;
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
  seoTitle: string;
  metaDescription: string;
  viewsCount: number;
  readingTimeMinutes: number;
  publishedAt?: string;
  createdAt: string;
  revisionsCount: number;
}

interface BlogCmsViewProps {
  onViewPublicArticle?: (slug: string) => void;
}

export const BlogCmsView: React.FC<BlogCmsViewProps> = ({ onViewPublicArticle }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Editor Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Clinical Practice');
  const [tags, setTags] = useState('clinical, patient-safety');
  const [authorName, setAuthorName] = useState('Dr. Chidinma Okafor');
  const [authorRole, setAuthorRole] = useState('Clinical Director');
  const [featuredImage, setFeaturedImage] = useState('https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80');
  const [status, setStatus] = useState<'draft' | 'review' | 'scheduled' | 'published' | 'archived'>('published');
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const res = await api.getArticles({
        search: search || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined
      });
      setArticles(res.articles || []);
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, [search, selectedCategory, selectedStatus]);

  const handleOpenNew = () => {
    setEditingArticleId(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('<h2>Clinical Background</h2>\n<p>Enter your clinical analysis and findings here.</p>');
    setCategory('Clinical Practice');
    setTags('nursing, triage');
    setStatus('published');
    setSeoTitle('');
    setMetaDescription('');
    setIsEditorOpen(true);
  };

  const handleEdit = (art: Article) => {
    setEditingArticleId(art.id);
    setTitle(art.title);
    setSlug(art.slug);
    setExcerpt(art.excerpt);
    setContent(art.content);
    setCategory(art.category);
    setTags(art.tags.join(', '));
    setAuthorName(art.authorName);
    setAuthorRole(art.authorRole);
    setFeaturedImage(art.featuredImage);
    setStatus(art.status);
    setSeoTitle(art.seoTitle);
    setMetaDescription(art.metaDescription);
    setIsEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Please fill out title and content');
      return;
    }

    const payload = {
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      excerpt,
      content,
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      authorName,
      authorRole,
      featuredImage,
      status,
      seoTitle: seoTitle || `${title} | HealthPulse`,
      metaDescription: metaDescription || excerpt
    };

    try {
      if (editingArticleId) {
        await api.updateArticle(editingArticleId, payload);
      } else {
        await api.createArticle(payload);
      }
      setIsEditorOpen(false);
      loadArticles();
    } catch (err: any) {
      alert(err.message || 'Error saving article');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this article?')) {
      await api.deleteArticle(id);
      loadArticles();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Articles & Blog CMS</h1>
          <p className="text-xs text-slate-500">
            Publish educational articles, clinical reviews, and guides for healthcare professionals.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 bg-slate-900 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Article</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="">All Categories</option>
            <option value="Clinical Practice">Clinical Practice</option>
            <option value="Nursing Education">Nursing Education</option>
            <option value="Recruitment & Career">Recruitment & Career</option>
            <option value="Healthcare Leadership">Healthcare Leadership</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>

          <button
            onClick={loadArticles}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Articles Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading articles...</div>
        ) : articles.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">No articles found.</div>
        ) : (
          articles.map(art => (
            <div
              key={art.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
            >
              <div className="h-40 relative bg-slate-100 overflow-hidden">
                <img
                  src={art.featuredImage}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {art.category}
                </span>
                <span
                  className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    art.status === 'published'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-400 text-slate-900'
                  }`}
                >
                  {art.status}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                    {art.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {art.excerpt}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{art.authorName}</span>
                    <span>{art.viewsCount || 0} views &bull; {art.readingTimeMinutes}m read</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {onViewPublicArticle && art.status === 'published' ? (
                      <button
                        onClick={() => onViewPublicArticle(art.slug)}
                        className="text-cyan-700 hover:underline text-xs font-semibold flex items-center gap-1"
                      >
                        <span>Reader View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">v{art.revisionsCount} revisions</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(art)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100"
                        title="Edit Article"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(art.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Article Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-4xl h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50">
              <h2 className="font-bold text-slate-900 text-sm">
                {editingArticleId ? 'Edit Article' : 'Compose New Article'}
              </h2>
              <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Article Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Clinical Practice">Clinical Practice</option>
                    <option value="Nursing Education">Nursing Education</option>
                    <option value="Recruitment & Career">Recruitment & Career</option>
                    <option value="Healthcare Leadership">Healthcare Leadership</option>
                    <option value="Continuing Education">Continuing Education</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="review">Needs Review</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Excerpt / Meta Description</label>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Featured Image URL</label>
                <input
                  type="url"
                  value={featuredImage}
                  onChange={e => setFeaturedImage(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Content (HTML formatted)</label>
                <textarea
                  rows={12}
                  required
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Author & SEO Settings</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Author Name</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={e => setAuthorName(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Author Role</label>
                    <input
                      type="text"
                      value={authorRole}
                      onChange={e => setAuthorRole(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Save & Publish Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
