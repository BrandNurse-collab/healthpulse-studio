import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  FileText,
  Lock,
  Download,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs();
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.adminEmail.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q)
    );
  });

  const exportAuditLog = () => {
    const csvStr = [
      'Timestamp,Action,Entity Type,Admin Email,Details',
      ...logs.map(l => `"${l.timestamp}","${l.action}","${l.entityType}","${l.adminEmail}","${l.details.replace(/"/g, '""')}"`)
    ].join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthpulse_audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security Audit Trail & Compliance</h1>
          <p className="text-xs text-slate-500">
            Immutable log of publishing, broadcasting, subscriber consent mutations, and OAuth actions.
          </p>
        </div>

        <button
          onClick={exportAuditLog}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Audit Log</span>
        </button>
      </div>

      {/* Compliance Standards Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>RFC 822 & List-Unsubscribe</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Every outgoing email carries an RFC-compliant <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">List-Unsubscribe: One-Click</code> header and discrete recipient addressing.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-cyan-700 font-bold">
            <Lock className="w-4 h-4" />
            <span>Least Privilege Gmail Scopes</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Restricted exclusively to <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">gmail.send</code> with in-memory token lifecycle. No refresh tokens stored in browser storage.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-purple-700 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>SSRF & Untrusted Input Isolation</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            External scraping enforces strict DNS loopback and private subnet filtering. AI prompts prevent data exfiltration.
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white"
            />
          </div>

          <button onClick={loadLogs} className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="p-3.5">Timestamp (UTC)</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Initiator</th>
                <th className="p-3.5">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Loading audit records...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">No records match criteria.</td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3.5 uppercase text-[10px] font-bold text-slate-500">
                      {l.entityType}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">
                      {l.adminEmail}
                    </td>
                    <td className="p-3.5 text-slate-800 max-w-md">
                      {l.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
