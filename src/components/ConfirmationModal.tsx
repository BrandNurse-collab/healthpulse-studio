import React from 'react';
import { AlertTriangle, Mail, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  details?: { label: string; value: string | number }[];
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
  details
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-cyan-50 text-cyan-700'}`}>
              {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">Explicit confirmation required</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>

          {details && details.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
              {details.map((d, i) => (
                <div key={i} className="flex justify-between items-center py-0.5 border-b border-slate-200/60 last:border-0">
                  <span className="text-slate-500 font-medium">{d.label}:</span>
                  <span className="text-slate-800 font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-semibold rounded-lg text-white transition-all shadow-xs ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-400'
                : 'bg-slate-900 hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-400'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
