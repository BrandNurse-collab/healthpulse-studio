import React, { useState } from 'react';
import {
  Link2,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Send,
  FileText,
  Copy,
  Clock,
  ArrowRight
} from 'lucide-react';
import { api } from '../lib/api';

interface RepurposeUrlViewProps {
  onNavigate: (view: string) => void;
}

export const RepurposeUrlView: React.FC<RepurposeUrlViewProps> = ({ onNavigate }) => {
  const [url, setUrl] = useState('');
  const [audience, setAudience] = useState('Registered Nurses & Clinical Teams');
  const [tone, setTone] = useState('Evidence-Based, Practical & Reflective');

  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');

  const [extractedData, setExtractedData] = useState<any>(null);
  const [aiResult, setAiResult] = useState<any>(null);

  const sampleUrls = [
    {
      title: 'WHO Nursing & Midwifery Global Report',
      url: 'https://www.who.int/news-room/fact-sheets/detail/nursing-and-midwifery'
    },
    {
      title: 'CDC Clinical Sepsis Awareness Guideline',
      url: 'https://www.cdc.gov/sepsis/clinical-tools/index.html'
    }
  ];

  const handleProcess = async () => {
    if (!url.trim()) {
      setError('Please provide a valid public URL.');
      return;
    }

    setIsLoading(true);
    setError('');
    setStatusText('Validating URL against SSRF rules & retrieving external article...');

    try {
      const res = await api.repurposeUrl({ url, audience, tone });
      setExtractedData(res.extracted);
      setAiResult(res.aiResult);
      setStatusText('Original transformative analysis & newsletter generated!');
    } catch (err: any) {
      setError(err.message || 'Failed to repurpose external article.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToBlog = async () => {
    if (!aiResult) return;
    try {
      await api.createArticle({
        title: aiResult.suggestedTitle,
        slug: aiResult.slug,
        excerpt: aiResult.excerpt,
        content: aiResult.transformativeArticleHtml,
        category: 'Clinical Practice',
        tags: aiResult.tags || ['external-commentary', 'clinical-review'],
        sourceUrl: extractedData?.sourceUrl || url,
        sourceAttribution: aiResult.sourceAttribution,
        status: 'published'
      });
      alert('Original commentary successfully published to your Blog CMS!');
      onNavigate('blog-cms');
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  const handleCreateBroadcast = async () => {
    if (!aiResult) return;
    try {
      const topSubject = aiResult.subjectLineOptions?.[0]?.subject || aiResult.suggestedTitle;
      const topPreheader = aiResult.subjectLineOptions?.[0]?.preheader || aiResult.excerpt;

      await api.createCampaign({
        name: `Broadcast: ${aiResult.suggestedTitle}`,
        subject: topSubject,
        preheader: topPreheader,
        senderName: 'HealthPulse Editorial',
        senderEmail: 'editorial@healthpulse.org',
        replyTo: 'contact@healthpulse.org',
        htmlBody: `<div>
  <div style="padding: 24px; font-family: sans-serif;">
    <h2 style="color: #0f172a;">${aiResult.suggestedTitle}</h2>
    ${aiResult.newsletterSummaryHtml}
    <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
      <em>${aiResult.sourceAttribution}</em>
    </p>
  </div>
</div>`,
        targetSegmentId: 'all',
        status: 'draft'
      });
      alert('Broadcast campaign draft created! Redirecting to Campaigns...');
      onNavigate('campaigns');
    } catch (err: any) {
      alert(`Error creating campaign: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 text-cyan-600 mb-1">
          <Link2 className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Content Repurposing Engine</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Repurpose External Healthcare Articles</h1>
        <p className="text-xs text-slate-500">
          Transform public medical journal articles, hospital press releases, and news into original, compliant commentary and newsletters with full attribution.
        </p>
      </div>

      {/* Input Box */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Public Article URL *</label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example-hospital.org/news/clinical-update-2026"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white"
            />
            <button
              type="button"
              disabled={isLoading}
              onClick={handleProcess}
              className="px-5 py-2.5 bg-slate-900 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{isLoading ? 'Processing...' : 'Repurpose Article'}</span>
            </button>
          </div>
        </div>

        {/* Preset quick test links */}
        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
          <span>Try a verified public sample:</span>
          {sampleUrls.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setUrl(s.url)}
              className="text-cyan-700 hover:underline bg-slate-50 px-2 py-0.5 rounded border border-slate-200"
            >
              {s.title}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
            <label className="block font-semibold text-slate-700 mb-1">Tone & Perspective</label>
            <input
              type="text"
              value={tone}
              onChange={e => setTone(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            <strong>SSRF Protected:</strong> Private subnets, localhost endpoints, and cloud metadata APIs are strictly blocked. The system transforms key concepts rather than duplicating copyrighted text.
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Progress / Status */}
      {isLoading && (
        <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-2">
          <Sparkles className="w-6 h-6 text-cyan-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-800">{statusText}</p>
        </div>
      )}

      {/* Results View: Extracted Source vs Transformed Output */}
      {aiResult && extractedData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Extracted Source Meta (4 cols) */}
          <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 border-b pb-2">Extracted Source Metadata</h3>

            <div className="space-y-1.5 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Original Headline</span>
                <span className="font-semibold text-slate-800">{extractedData.title}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Author / Source</span>
                <span>{extractedData.author} ({extractedData.sourceDomain})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Date & Word Count</span>
                <span>{extractedData.publishedDate} &bull; {extractedData.wordCount} words</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Key Insights Identified:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                {aiResult.keyInsights.map((pt: string, idx: number) => (
                  <li key={idx}>{pt}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2">
              <a
                href={extractedData.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-700 hover:underline flex items-center gap-1 font-semibold text-[11px]"
              >
                <span>View Original Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Generated Transformed Article & Newsletter (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Transformed Original Commentary</h3>
                <p className="text-[11px] text-slate-500 font-mono">{aiResult.sourceAttribution}</p>
              </div>
            </div>

            {/* Subject line suggestions */}
            {aiResult.subjectLineOptions && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-[11px]">Recommended Email Subject Lines:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {aiResult.subjectLineOptions.map((opt: any, i: number) => (
                    <div key={i} className="p-2 bg-white rounded border border-slate-200 text-[11px]">
                      <p className="font-semibold text-slate-800">{opt.subject}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">{opt.preheader}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter Summary Block */}
            <div className="p-3.5 bg-cyan-50/70 border border-cyan-200 rounded-lg space-y-1">
              <span className="font-bold text-cyan-950 block text-[11px]">Newsletter Spotlight Version:</span>
              <div
                className="text-cyan-900 leading-relaxed text-[11px]"
                dangerouslySetInnerHTML={{ __html: aiResult.newsletterSummaryHtml }}
              />
            </div>

            {/* Full Transformed Body */}
            <div>
              <span className="font-bold text-slate-800 block mb-1">Original Article Content (HTML):</span>
              <div
                className="p-4 bg-slate-50 rounded-lg border border-slate-200 max-h-72 overflow-y-auto prose prose-sm max-w-none text-slate-800"
                dangerouslySetInnerHTML={{ __html: aiResult.transformativeArticleHtml }}
              />
            </div>

            {/* Actions */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-end gap-3 border-t">
              <button
                type="button"
                onClick={handleSaveToBlog}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Publish to Blog CMS</span>
              </button>
              <button
                type="button"
                onClick={handleCreateBroadcast}
                className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Create Email Broadcast</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
