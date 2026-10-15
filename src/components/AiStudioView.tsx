import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  Upload,
  Layers,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';

interface AiStudioViewProps {
  onNavigate: (view: string) => void;
}

export const AiStudioView: React.FC<AiStudioViewProps> = ({ onNavigate }) => {
  // Input fields
  const [outputFormat, setOutputFormat] = useState<'blog_article' | 'newsletter' | 'broadcast_email' | 'article_summary' | 'digest'>('blog_article');
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('Registered Nurses & Nurse Practitioners');
  const [tone, setTone] = useState('Clinical, Authoritative & Practical');
  const [length, setLength] = useState<'short' | 'medium' | 'in_depth'>('medium');
  const [keywords, setKeywords] = useState('triage, acute care, evidence-based');
  const [cta, setCta] = useState('Encourage participation in clinical skills simulation');
  const [sourceMaterial, setSourceMaterial] = useState('');

  // File upload state
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  // Editable generated fields
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsExtractingDoc(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setSourceMaterial(text || '');
      setIsExtractingDoc(false);
    };
    reader.onerror = () => {
      setError('Failed to read file contents.');
      setIsExtractingDoc(false);
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!topic.trim() && !sourceMaterial.trim()) {
      setError('Please provide either a topic/title or source material to generate from.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setStatusMessage('Analyzing clinical parameters and consulting Gemini 2.5 Flash...');

    try {
      const res = await api.generateAiContent({
        topic,
        title: topic,
        audience,
        tone,
        length,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        sourceMaterial,
        cta,
        outputFormat
      });

      setGeneratedResult(res.result);
      setEditedTitle(res.result.title);
      setEditedContent(res.result.contentHtml);
      setStatusMessage('Content generated successfully!');
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToBlog = async () => {
    if (!generatedResult) return;
    try {
      await api.createArticle({
        title: editedTitle,
        slug: generatedResult.slug,
        excerpt: generatedResult.excerpt,
        content: editedContent,
        category: generatedResult.category || 'Clinical Practice',
        tags: generatedResult.tags || ['clinical-guide'],
        seoTitle: generatedResult.seoTitle,
        metaDescription: generatedResult.metaDescription,
        status: 'published'
      });
      alert('Article successfully published to your Blog CMS!');
      onNavigate('blog-cms');
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  const handleCreateBroadcast = async () => {
    if (!generatedResult) return;
    try {
      await api.createCampaign({
        name: `Campaign: ${editedTitle}`,
        subject: generatedResult.suggestedSubjectLines?.[0] || editedTitle,
        preheader: generatedResult.excerpt,
        senderName: 'HealthPulse Editorial',
        senderEmail: 'editorial@healthpulse.org',
        replyTo: 'contact@healthpulse.org',
        htmlBody: editedContent,
        targetSegmentId: 'all',
        status: 'draft'
      });
      alert('Broadcast campaign draft created! Redirecting to Campaign Manager...');
      onNavigate('campaigns');
    } catch (err: any) {
      alert(`Error creating campaign: ${err.message}`);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-cyan-600 mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">AI Content Studio</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Healthcare Content & Broadcast Generator</h1>
        <p className="text-xs text-slate-500">
          Transform notes, clinical guidelines, and research papers into published blog articles or email newsletters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generator Controls (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Format</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'blog_article', label: 'Blog Article' },
                { id: 'newsletter', label: 'Newsletter' },
                { id: 'broadcast_email', label: 'Email Broadcast' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOutputFormat(f.id as any)}
                  className={`py-2 px-2 text-center rounded-lg border font-medium transition-all ${
                    outputFormat === f.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Topic or Core Thesis *</label>
            <input
              type="text"
              placeholder="e.g. Sepsis Alert Protocols in Post-Surgical Ward Care"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Audience Persona</label>
              <select
                value={audience}
                onChange={e => setAudience(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Registered Nurses & Nurse Practitioners">Registered Nurses</option>
                <option value="Resident Physicians & Clinical Directors">Physicians & Leads</option>
                <option value="Hospital Managers & Nursing Directors">Hospital Directors</option>
                <option value="Nursing Students & Licensure Candidates">Students & Candidates</option>
                <option value="All Healthcare Professionals">General Healthcare</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tone of Voice</label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Clinical, Authoritative & Practical">Clinical & Authoritative</option>
                <option value="Compassionate, Encouraging & Clear">Compassionate & Supportive</option>
                <option value="Concise, Executive Briefing">Executive Briefing</option>
                <option value="Step-by-Step Educational Tutorial">Educational Tutorial</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Length</label>
              <select
                value={length}
                onChange={e => setLength(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="short">Short (~400 words)</option>
                <option value="medium">Medium (~800 words)</option>
                <option value="in_depth">In-Depth (~1,400 words)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Keywords</label>
              <input
                type="text"
                placeholder="sepsis, triage, vital signs"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Document Upload Input */}
          <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Attach Document / Guidelines</span>
              <span className="text-[10px] text-slate-400">TXT, MD, CSV</span>
            </div>
            <label className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <Upload className="w-4 h-4 text-cyan-600" />
              <span className="text-slate-600 font-medium">
                {uploadedFileName ? uploadedFileName : 'Choose file to extract text'}
              </span>
              <input type="file" accept=".txt,.md,.csv,.json" onChange={handleFileUpload} className="hidden" />
            </label>
            {isExtractingDoc && <p className="text-[11px] text-cyan-700">Extracting text...</p>}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Raw Notes or Source Material</label>
            <textarea
              rows={4}
              placeholder="Paste clinical study notes, conference minutes, or bullet points here..."
              value={sourceMaterial}
              onChange={e => setSourceMaterial(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="w-full py-2.5 bg-slate-900 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{isGenerating ? 'Synthesizing with Gemini...' : 'Generate with Gemini 2.5'}</span>
          </button>
        </div>

        {/* Right Column: Output & Editor (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Generated Editorial Draft</h2>
              <p className="text-[11px] text-slate-500">Edit, review takeaways, and publish or broadcast</p>
            </div>

            {generatedResult && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy HTML'}</span>
                </button>
              </div>
            )}
          </div>

          {!generatedResult && !isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400 space-y-3">
              <BookOpen className="w-10 h-10 stroke-[1.5] text-slate-300" />
              <div>
                <p className="text-xs font-semibold text-slate-700">No content generated yet.</p>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Specify a healthcare topic or attach a clinical report on the left, then click Generate to create structured articles and subject lines.
                </p>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-800">{statusMessage}</p>
              <p className="text-[11px] text-slate-400">Verifying non-hallucinated clinical best practices...</p>
            </div>
          )}

          {generatedResult && (
            <div className="space-y-4 text-xs">
              {/* Editable Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Headline</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  className="w-full p-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              {/* Key Takeaways */}
              {generatedResult.keyTakeaways && generatedResult.keyTakeaways.length > 0 && (
                <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-lg space-y-1.5">
                  <span className="font-bold text-cyan-950 block">Key Clinical Takeaways:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-cyan-900">
                    {generatedResult.keyTakeaways.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subject Lines Options */}
              {generatedResult.suggestedSubjectLines && generatedResult.suggestedSubjectLines.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="font-semibold text-slate-800 block">Suggested Email Subject Lines:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {generatedResult.suggestedSubjectLines.map((subj: string, i: number) => (
                      <div key={i} className="p-2 bg-white rounded border border-slate-200 text-[11px] text-slate-700">
                        {subj}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HTML Content Body */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Body Content (HTML)</label>
                <textarea
                  rows={10}
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              {/* Action Buttons: Publish to Blog or Create Broadcast */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
                <span className="text-[11px] text-slate-500">
                  Category: <strong>{generatedResult.category}</strong>
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveToBlog}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Publish to Blog</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateBroadcast}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Create Campaign Draft</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
