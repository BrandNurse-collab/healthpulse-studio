import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Play,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Sliders,
  X
} from 'lucide-react';
import { api } from '../lib/api';

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: number;
  timeOfDay: string;
  timezone: string;
  targetSegmentId: string;
  categoryFilter?: string;
  maxArticles: number;
  requireApproval: boolean;
  autoSend: boolean;
  introPrompt: string;
  lastRunAt?: string;
  nextRunAt: string;
}

export const AutomationsView: React.FC = () => {
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('Weekly Critical Care & Career Digest');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [targetSegmentId, setTargetSegmentId] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [maxArticles, setMaxArticles] = useState(3);
  const [requireApproval, setRequireApproval] = useState(true);
  const [introPrompt, setIntroPrompt] = useState('Curate key clinical emergency triage and nurse retention insights.');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        api.getAutomations(),
        api.getSegments()
      ]);
      setAutomations(aRes.automations || []);
      setSegments(sRes.segments || []);
    } catch (err) {
      console.error('Failed to load automations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (rule: AutomationRule) => {
    try {
      await api.saveAutomation({
        ...rule,
        enabled: !rule.enabled
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveAutomation({
        name,
        frequency,
        dayOfWeek,
        timeOfDay,
        timezone: 'UTC',
        targetSegmentId,
        categoryFilter,
        maxArticles,
        requireApproval,
        autoSend: !requireApproval,
        introPrompt,
        enabled: true
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving automation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Automation Engine & Background Jobs</h1>
          <p className="text-xs text-slate-500">
            Configure automated content synthesis, recurring scheduled newsletters, and approval workflows.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Automation Workflow</span>
        </button>
      </div>

      {/* Background Worker Status Banner */}
      <div className="p-4 bg-slate-900 rounded-xl text-white flex items-center justify-between shadow-xs border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <p className="text-xs font-bold">Node.js Server Scheduler Active</p>
            <p className="text-[11px] text-slate-400">
              Evaluates due articles, recurring newsletter runs, and scheduled broadcasts every 20 seconds.
            </p>
          </div>
        </div>

        <div className="text-right text-[11px] text-cyan-400 font-mono">
          Persistent Queue: Healthy
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {automations.map(rule => (
          <div
            key={rule.id}
            className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">{rule.name}</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Cadence: <strong className="text-slate-700 capitalize">{rule.frequency}</strong> at{' '}
                  <span className="font-mono text-slate-700">{rule.timeOfDay} {rule.timezone}</span>
                </p>
              </div>

              <button
                onClick={() => handleToggle(rule)}
                className={`text-2xl transition-colors ${
                  rule.enabled ? 'text-cyan-600' : 'text-slate-300'
                }`}
                title={rule.enabled ? 'Disable Automation' : 'Enable Automation'}
              >
                {rule.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Target Segment:</span>
                <span className="font-semibold text-slate-800">{rule.targetSegmentId}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Approval Policy:</span>
                <span className={`font-semibold ${rule.requireApproval ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {rule.requireApproval ? 'Mandatory Admin Review' : 'Auto-Send'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Articles Per Edition:</span>
                <span className="font-semibold text-slate-800">Up to {rule.maxArticles}</span>
              </div>
            </div>

            {rule.introPrompt && (
              <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-200">
                "{rule.introPrompt}"
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t text-[11px] text-slate-400">
              <span>Last Run: {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleDateString() : 'Never'}</span>
              <span>Next Run: {new Date(rule.nextRunAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* New Workflow Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Configure Automation Workflow</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Workflow Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cadence / Frequency</label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dispatch Time (UTC)</label>
                  <input
                    type="time"
                    value={timeOfDay}
                    onChange={e => setTimeOfDay(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Segment</label>
                  <select
                    value={targetSegmentId}
                    onChange={e => setTargetSegmentId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {segments.map(seg => (
                      <option key={seg.id} value={seg.id}>{seg.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Articles per Issue</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={maxArticles}
                    onChange={e => setMaxArticles(parseInt(e.target.value, 10))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">AI Prompt & Clinical Tone</label>
                <textarea
                  rows={2}
                  value={introPrompt}
                  onChange={e => setIntroPrompt(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Require Admin Approval</span>
                  <span className="text-[11px] text-slate-500">Saves draft for manual review before sending</span>
                </div>
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={e => setRequireApproval(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-600"
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
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Automation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
