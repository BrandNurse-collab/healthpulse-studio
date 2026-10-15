import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Tag,
  Trash2,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { api } from '../lib/api';

interface Subscriber {
  id: string;
  email: string;
  fullName: string;
  organization: string;
  profession: string;
  country: string;
  tags: string[];
  subscriptionSource: string;
  consentStatus: 'subscribed' | 'pending' | 'unsubscribed' | 'bounced' | 'suppressed';
  consentTimestamp: string;
  dateSubscribed: string;
  lastInteraction?: string;
  notes?: string;
}

export const SubscribersView: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('');

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);

  // Form states for manual add
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newProfession, setNewProfession] = useState('Registered Nurse');
  const [newCountry, setNewCountry] = useState('Nigeria');
  const [newTags, setNewTags] = useState('nursing, cme');
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState('');

  // CSV Import state
  const [csvContent, setCsvContent] = useState('');
  const [importReport, setImportReport] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subsRes, segsRes] = await Promise.all([
        api.getSubscribers({
          search: search || undefined,
          status: selectedStatus || undefined,
          profession: selectedProfession || undefined
        }),
        api.getSegments()
      ]);
      setSubscribers(subsRes.subscribers || []);
      setSegments(segsRes.segments || []);
    } catch (err) {
      console.error('Failed to load subscribers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedStatus, selectedProfession]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newEmail || !newEmail.includes('@')) {
      setFormError('Please provide a valid email address.');
      return;
    }

    try {
      await api.createSubscriber({
        email: newEmail,
        fullName: newName || 'Colleague',
        organization: newOrg || 'Healthcare Clinic',
        profession: newProfession,
        country: newCountry,
        tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
        notes: newNotes,
        consentStatus: 'subscribed'
      });
      setIsAddModalOpen(false);
      setNewEmail('');
      setNewName('');
      setNewOrg('');
      setNewNotes('');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add subscriber');
    }
  };

  const handleCsvImport = async () => {
    if (!csvContent.trim()) return;

    // Parse CSV lines
    const lines = csvContent.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const emailIdx = header.findIndex(h => h.includes('email'));
    const nameIdx = header.findIndex(h => h.includes('name'));
    const orgIdx = header.findIndex(h => h.includes('org') || h.includes('hospital'));
    const profIdx = header.findIndex(h => h.includes('prof') || h.includes('role') || h.includes('title'));
    const countryIdx = header.findIndex(h => h.includes('country'));

    if (emailIdx === -1) {
      alert('CSV must contain an "email" header column.');
      return;
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts[emailIdx]) {
        rows.push({
          email: parts[emailIdx],
          fullName: nameIdx !== -1 ? parts[nameIdx] : 'Healthcare Colleague',
          organization: orgIdx !== -1 ? parts[orgIdx] : 'Hospital/Practice',
          profession: profIdx !== -1 ? parts[profIdx] : 'Registered Nurse',
          country: countryIdx !== -1 ? parts[countryIdx] : 'Global'
        });
      }
    }

    try {
      const res = await api.importSubscribers(rows);
      setImportReport(res);
      loadData();
    } catch (err: any) {
      alert(err.message || 'CSV Import error');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Email', 'Full Name', 'Organization', 'Profession', 'Country', 'Tags', 'Status', 'Date Subscribed'];
    const rows = subscribers.map(s => [
      `"${s.email}"`,
      `"${s.fullName}"`,
      `"${s.organization}"`,
      `"${s.profession}"`,
      `"${s.country}"`,
      `"${s.tags.join(';')}"`,
      `"${s.consentStatus}"`,
      `"${s.dateSubscribed}"`
    ]);
    const csvStr = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthpulse_subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleBulkAction = async (action: 'unsubscribe' | 'suppress' | 'delete') => {
    if (selectedIds.length === 0) return;
    const confirmText = action === 'delete'
      ? `Are you sure you want to permanently delete ${selectedIds.length} subscriber(s)?`
      : `Are you sure you want to mark ${selectedIds.length} subscriber(s) as ${action}?`;
    if (!confirm(confirmText)) return;

    try {
      await api.bulkActionSubscribers(selectedIds, action);
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === subscribers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(subscribers.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Email Subscribers & Audience Groups</h1>
          <p className="text-xs text-slate-500">
            Consented healthcare contacts, clinical profession segmentation, and double opt-in records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Subscriber</span>
          </button>
        </div>
      </div>

      {/* Segments Quick Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider shrink-0">Segments:</span>
        {segments.map(seg => (
          <button
            key={seg.id}
            onClick={() => {
              if (seg.criteria.profession) {
                setSelectedProfession(selectedProfession === seg.criteria.profession ? '' : seg.criteria.profession);
              } else {
                setSelectedProfession('');
                setSelectedStatus('');
              }
            }}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all ${
              (seg.criteria.profession && selectedProfession === seg.criteria.profession) || (!selectedProfession && seg.id === 'all')
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {seg.name} <span className="opacity-70 ml-1">({seg.count})</span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email, name, hospital..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedProfession}
            onChange={e => setSelectedProfession(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 text-slate-700"
          >
            <option value="">All Professions</option>
            <option value="Registered Nurse">Registered Nurse</option>
            <option value="Clinical Director">Clinical Director</option>
            <option value="Resident Physician">Resident Physician</option>
            <option value="Hospital Manager">Hospital Manager</option>
            <option value="Nursing Student">Nursing Student</option>
            <option value="Medical Recruiter">Medical Recruiter</option>
            <option value="Training Participant">Training Participant</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="subscribed">Subscribed</option>
            <option value="pending">Pending Opt-In</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="suppressed">Suppressed</option>
          </select>

          <button
            onClick={loadData}
            title="Refresh List"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (when rows are selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg flex items-center justify-between text-xs text-cyan-900 animate-in fade-in">
          <span className="font-semibold">{selectedIds.length} subscriber(s) selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('unsubscribe')}
              className="px-3 py-1 bg-white text-slate-700 hover:bg-slate-100 rounded border border-slate-300 font-medium"
            >
              Unsubscribe Selected
            </button>
            <button
              onClick={() => handleBulkAction('suppress')}
              className="px-3 py-1 bg-white text-slate-700 hover:bg-slate-100 rounded border border-slate-300 font-medium"
            >
              Suppress Selected
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 rounded font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={subscribers.length > 0 && selectedIds.length === subscribers.length}
                    onChange={toggleSelectAll}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                </th>
                <th className="p-3.5">Subscriber</th>
                <th className="p-3.5">Organization & Role</th>
                <th className="p-3.5">Country</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Tags</th>
                <th className="p-3.5">Subscribed Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading subscribers...
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No subscribers found matching criteria.
                  </td>
                </tr>
              ) : (
                subscribers.map(sub => {
                  const isSelected = selectedIds.includes(sub.id);
                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-cyan-50/40' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(sub.id)}
                          className="rounded text-cyan-600 focus:ring-cyan-500"
                        />
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{sub.fullName}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{sub.email}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800">{sub.organization}</div>
                        <div className="text-slate-500 text-[11px]">{sub.profession}</div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-600">{sub.country}</td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            sub.consentStatus === 'subscribed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : sub.consentStatus === 'unsubscribed'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : sub.consentStatus === 'suppressed'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {sub.consentStatus === 'subscribed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {sub.consentStatus === 'unsubscribed' && <XCircle className="w-2.5 h-2.5" />}
                          {sub.consentStatus}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {sub.tags.slice(0, 2).map((t, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                              {t}
                            </span>
                          ))}
                          {sub.tags.length > 2 && (
                            <span className="text-[10px] text-slate-400">+{sub.tags.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(sub.dateSubscribed).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedSubscriber(sub)}
                          className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-md transition-colors"
                          title="View Profile & Consent Log"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Add New Healthcare Subscriber</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="p-5 space-y-3 text-xs">
              {formError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sarah.nurse@hospital.org"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins, RN"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Profession</label>
                  <select
                    value={newProfession}
                    onChange={e => setNewProfession(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Registered Nurse">Registered Nurse</option>
                    <option value="Clinical Director">Clinical Director</option>
                    <option value="Resident Physician">Resident Physician</option>
                    <option value="Hospital Manager">Hospital Manager</option>
                    <option value="Nursing Student">Nursing Student</option>
                    <option value="Medical Recruiter">Medical Recruiter</option>
                    <option value="Training Participant">Training Participant</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={newCountry}
                    onChange={e => setNewCountry(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Organization / Hospital</label>
                <input
                  type="text"
                  placeholder="e.g. St. Thomas Acute Care"
                  value={newOrg}
                  onChange={e => setNewOrg(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="icu, mentorship, cme"
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional context about opt-in or interests..."
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Subscriber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-cyan-600" />
                <h3 className="font-bold text-slate-900 text-sm">Batch Import Subscribers (CSV)</h3>
              </div>
              <button onClick={() => { setIsImportModalOpen(false); setImportReport(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Paste CSV data below with column headers. The system automatically detects <code className="bg-slate-100 px-1 py-0.5 rounded text-cyan-700">email</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-cyan-700">name</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-cyan-700">organization</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-cyan-700">profession</code>, and <code className="bg-slate-100 px-1 py-0.5 rounded text-cyan-700">country</code>. Duplicate emails are skipped.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">CSV Content:</label>
                <textarea
                  rows={6}
                  placeholder={`email,name,organization,profession,country
nurse.joy@clinic.org,Joy Adeleke,Lagos Clinic,Registered Nurse,Nigeria
dr.dave@teaching.ac.uk,Dave Wilson,Royal Infirmary,Resident Physician,UK`}
                  value={csvContent}
                  onChange={e => setCsvContent(e.target.value)}
                  className="w-full p-2.5 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              {importReport && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs space-y-1">
                  <p className="font-bold">Import Completed:</p>
                  <p>&bull; {importReport.imported} subscribers added.</p>
                  <p>&bull; {importReport.duplicates} duplicate emails skipped.</p>
                  <p>&bull; {importReport.invalid} invalid rows ignored.</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setCsvContent(`email,name,organization,profession,country
ngozi.nurse@federalhealth.org,Ngozi Eze,Federal Medical Centre,Registered Nurse,Nigeria
tunde.lead@stjoseph.com,Tunde Bakare,St. Joseph Hospital,Hospital Manager,Nigeria
rachel.student@healthuni.edu,Rachel Clark,University Hospital,Nursing Student,United Kingdom`)}
                  className="text-cyan-700 hover:underline"
                >
                  Load Sample CSV
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsImportModalOpen(false); setImportReport(null); }}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleCsvImport}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    Process CSV Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Subscriber Profile Drawer */}
      {selectedSubscriber && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md h-full bg-white shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedSubscriber.fullName}</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedSubscriber.email}</p>
              </div>
              <button onClick={() => setSelectedSubscriber(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg space-y-2 border border-slate-200">
                <p className="font-bold text-slate-800">Healthcare Profile</p>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="block text-slate-400">Profession:</span>
                    <span className="font-semibold text-slate-800">{selectedSubscriber.profession}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Country:</span>
                    <span className="font-semibold text-slate-800">{selectedSubscriber.country}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-slate-400">Organization:</span>
                    <span className="font-semibold text-slate-800">{selectedSubscriber.organization}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg space-y-2 border border-slate-200">
                <p className="font-bold text-slate-800">Consent & Compliance Record</p>
                <p className="text-slate-600">
                  Consent Status: <span className="font-bold text-emerald-700 uppercase">{selectedSubscriber.consentStatus}</span>
                </p>
                <p className="text-slate-600">
                  Subscription Source: <span className="font-medium text-slate-800">{selectedSubscriber.subscriptionSource}</span>
                </p>
                <p className="text-slate-600">
                  Consent Timestamp: <span className="font-mono text-slate-700">{selectedSubscriber.consentTimestamp}</span>
                </p>
                <p className="text-slate-600">
                  Last Activity: <span className="font-mono text-slate-700">{selectedSubscriber.lastInteraction || 'None'}</span>
                </p>
              </div>

              {selectedSubscriber.notes && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                  <p className="font-bold">Subscriber Notes:</p>
                  <p className="mt-1">{selectedSubscriber.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t flex flex-col gap-2">
                <button
                  onClick={async () => {
                    await api.updateSubscriber(selectedSubscriber.id, {
                      consentStatus: selectedSubscriber.consentStatus === 'subscribed' ? 'unsubscribed' : 'subscribed'
                    });
                    setSelectedSubscriber(null);
                    loadData();
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg"
                >
                  Toggle Consent Status
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Delete subscriber permanently?')) {
                      await api.deleteSubscriber(selectedSubscriber.id);
                      setSelectedSubscriber(null);
                      loadData();
                    }
                  }}
                  className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg font-semibold"
                >
                  Delete Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
