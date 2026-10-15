import React, { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
  Copy,
  Smartphone,
  Monitor,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import { ConfirmationModal } from './ConfirmationModal';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  htmlBody: string;
  plainText: string;
  targetSegmentId: string;
  targetTags: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'partially_sent';
  scheduledAt?: string;
  sentAt?: string;
  totalRecipients: number;
  eligibleRecipients: number;
  sentCount: number;
  failedCount: number;
  recipientLogs: any[];
  createdAt: string;
}

interface CampaignsViewProps {
  isGmailConnected: boolean;
  userEmail?: string;
  onConnectGmail: () => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  isGmailConnected,
  userEmail,
  onConnectGmail
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Campaign editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [senderName, setSenderName] = useState('HealthPulse Editorial');
  const [senderEmail, setSenderEmail] = useState(userEmail || 'editorial@healthpulse.org');
  const [replyTo, setReplyTo] = useState(userEmail || 'contact@healthpulse.org');
  const [htmlBody, setHtmlBody] = useState('');
  const [targetSegmentId, setTargetSegmentId] = useState('all');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Test email state
  const [testEmailAddress, setTestEmailAddress] = useState(userEmail || '');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendStatus, setTestSendStatus] = useState<string | null>(null);

  // Sending confirmation
  const [isConfirmSendOpen, setIsConfirmSendOpen] = useState(false);
  const [campaignToDispatch, setCampaignToDispatch] = useState<Campaign | null>(null);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);

  // View logs modal
  const [selectedCampaignForLogs, setSelectedCampaignForLogs] = useState<Campaign | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cRes, tRes, sRes, subRes] = await Promise.all([
        api.getCampaigns(),
        api.getTemplates(),
        api.getSegments(),
        api.getSubscribers()
      ]);
      setCampaigns(cRes.campaigns || []);
      setTemplates(tRes.templates || []);
      setSegments(sRes.segments || []);
      setSubscribers(subRes.subscribers || []);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (userEmail && (!senderEmail || senderEmail.includes('healthpulse.org'))) {
      setSenderEmail(userEmail);
      setReplyTo(userEmail);
      setTestEmailAddress(userEmail);
    }
  }, [userEmail]);

  const handleOpenNewCampaign = () => {
    setEditingCampaignId(null);
    setCampaignName(`Clinical Update - ${new Date().toLocaleDateString()}`);
    setSubject('HealthPulse Briefing: Clinical Practice & Career Opportunities');
    setPreheader('Essential insights for acute care and healthcare professional development.');
    setSenderName('HealthPulse Medical Education');
    setSenderEmail(userEmail || 'editorial@healthpulse.org');
    setReplyTo(userEmail || 'contact@healthpulse.org');
    setTargetSegmentId('all');

    if (templates.length > 0) {
      setHtmlBody(templates[0].htmlBody);
    } else {
      setHtmlBody('<p>Hello {{first_name}},</p><p>Here are your healthcare insights.</p>');
    }

    setIsEditorOpen(true);
    setTestSendStatus(null);
  };

  const handleApplyTemplate = (tmpl: any) => {
    setHtmlBody(tmpl.htmlBody);
    if (tmpl.subject) setSubject(tmpl.subject);
    if (tmpl.preheader) setPreheader(tmpl.preheader);
  };

  // Calculate live eligible recipients
  const eligibleCount = subscribers.filter(s => {
    if (s.consentStatus !== 'subscribed') return false;
    if (targetSegmentId !== 'all') {
      const seg = segments.find(g => g.id === targetSegmentId);
      if (seg?.criteria?.profession && s.profession !== seg.criteria.profession) return false;
    }
    return true;
  }).length;

  const excludedCount = subscribers.filter(s => s.consentStatus !== 'subscribed').length;

  const handleSaveCampaign = async (status: 'draft' | 'scheduled' = 'draft') => {
    if (!campaignName || !subject || !htmlBody) {
      alert('Please fill out campaign name, subject, and content.');
      return;
    }

    try {
      await api.createCampaign({
        name: campaignName,
        subject,
        preheader,
        senderName,
        senderEmail,
        replyTo,
        htmlBody,
        targetSegmentId,
        status
      });
      setIsEditorOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save campaign');
    }
  };

  const handleSendTestEmail = async () => {
    if (!isGmailConnected) {
      onConnectGmail();
      return;
    }
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      alert('Please provide a valid test email address.');
      return;
    }

    setIsSendingTest(true);
    setTestSendStatus(null);

    try {
      // First save or get a temporary campaign ID
      let tempCampaignId = editingCampaignId;
      if (!tempCampaignId) {
        const created = await api.createCampaign({
          name: `[Test Draft] ${campaignName}`,
          subject,
          preheader,
          senderName,
          senderEmail,
          replyTo,
          htmlBody,
          targetSegmentId,
          status: 'draft'
        });
        tempCampaignId = created.campaign.id;
        setEditingCampaignId(tempCampaignId);
      }

      if (!tempCampaignId) {
        throw new Error('Failed to create campaign draft for test send');
      }

      await api.testSendCampaign(tempCampaignId, testEmailAddress, {
        senderName,
        senderEmail
      });

      setTestSendStatus(`Test preview successfully dispatched to ${testEmailAddress} via Gmail API.`);
    } catch (err: any) {
      setTestSendStatus(`Error: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleInitiateSend = (campaign: Campaign) => {
    if (!isGmailConnected) {
      onConnectGmail();
      return;
    }
    setCampaignToDispatch(campaign);
    setIsConfirmSendOpen(true);
  };

  const handleConfirmSend = async () => {
    if (!campaignToDispatch) return;
    setIsSendingCampaign(true);
    setIsConfirmSendOpen(false);

    try {
      await api.sendCampaign(campaignToDispatch.id, {
        senderName: campaignToDispatch.senderName,
        senderEmail: userEmail || campaignToDispatch.senderEmail
      });
      loadData();
    } catch (err: any) {
      alert(`Send Error: ${err.message}`);
    } finally {
      setIsSendingCampaign(false);
      setCampaignToDispatch(null);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm('Delete this campaign record?')) {
      await api.deleteCampaign(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Email Broadcast Campaigns</h1>
          <p className="text-xs text-slate-500">
            Create, personalize, preview, and dispatch broadcasts through your connected Gmail account.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isGmailConnected && (
            <button
              onClick={onConnectGmail}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Connect Gmail to Enable Sending</span>
            </button>
          )}
          <button
            onClick={handleOpenNewCampaign}
            className="px-4 py-2 bg-slate-900 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-600" />
            <h2 className="text-sm font-bold text-slate-900">Campaign History & Queues</h2>
          </div>
          <button
            onClick={loadData}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Mail className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No email campaigns created yet.</p>
              <p className="text-xs text-slate-400">Click "Create Campaign" to compose your first broadcast.</p>
            </div>
          ) : (
            campaigns.map(camp => (
              <div key={camp.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{camp.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        camp.status === 'sent'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : camp.status === 'sending'
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 animate-pulse'
                          : camp.status === 'scheduled'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium">
                    Subject: <span className="font-semibold text-slate-800">{camp.subject}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                    <span>Target: <strong className="text-slate-700">{camp.targetSegmentId}</strong></span>
                    <span>&bull;</span>
                    <span>Recipients: <strong className="text-slate-700">{camp.sentCount || camp.eligibleRecipients}</strong></span>
                    {camp.sentAt && (
                      <>
                        <span>&bull;</span>
                        <span>Sent: {new Date(camp.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {camp.status === 'draft' && (
                    <button
                      onClick={() => handleInitiateSend(camp)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send via Gmail</span>
                    </button>
                  )}

                  {camp.recipientLogs && camp.recipientLogs.length > 0 && (
                    <button
                      onClick={() => setSelectedCampaignForLogs(camp)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Delivery Logs ({camp.recipientLogs.length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteCampaign(camp.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Campaign Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900">Email Broadcast Designer</h2>
                <p className="text-xs text-slate-500">Rich HTML template styling, personalization tokens, and preview</p>
              </div>
              <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split into Settings / Editor and Live Preview */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* Left Column: Form & Source */}
              <div className="p-5 space-y-4 overflow-y-auto text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campaign Internal Name *</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={e => setCampaignName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Subject Line *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Preheader (Preview Text)</label>
                  <input
                    type="text"
                    value={preheader}
                    onChange={e => setPreheader(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white"
                  />
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
                        <option key={seg.id} value={seg.id}>
                          {seg.name} ({seg.count})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Templates</label>
                    <select
                      onChange={e => {
                        const t = templates.find(item => item.id === e.target.value);
                        if (t) handleApplyTemplate(t);
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Apply Prebuilt Template...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Recipient Calculation Card */}
                <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between items-center text-cyan-950 font-bold">
                    <span>Eligible Consented Recipients:</span>
                    <span className="text-sm text-cyan-700">{eligibleCount}</span>
                  </div>
                  <p className="text-[11px] text-cyan-800">
                    {excludedCount} contact(s) automatically excluded (unsubscribed or suppressed) in accordance with anti-spam standards.
                  </p>
                </div>

                {/* Personalization Tokens Guide */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <span className="font-semibold text-slate-800 block">Available Personalization Tags:</span>
                  <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{'{{first_name}}'}</span>
                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{'{{full_name}}'}</span>
                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{'{{profession}}'}</span>
                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{'{{organization}}'}</span>
                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{'{{unsubscribe_url}}'}</span>
                  </div>
                </div>

                {/* HTML Body Editor */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HTML Email Source</label>
                  <textarea
                    rows={10}
                    value={htmlBody}
                    onChange={e => setHtmlBody(e.target.value)}
                    className="w-full p-3 font-mono text-[11px] bg-slate-900 text-slate-100 rounded-lg border border-slate-700 focus:outline-cyan-500"
                  />
                </div>

                {/* Test Send Box */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <span className="font-semibold text-slate-800 block">Send Real Test Email</span>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="test.recipient@domain.com"
                      value={testEmailAddress}
                      onChange={e => setTestEmailAddress(e.target.value)}
                      className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      disabled={isSendingTest}
                      onClick={handleSendTestEmail}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs disabled:opacity-50"
                    >
                      {isSendingTest ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                  {testSendStatus && (
                    <p className={`text-[11px] font-medium ${testSendStatus.includes('Error') ? 'text-red-600' : 'text-emerald-700'}`}>
                      {testSendStatus}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Live Viewport Preview */}
              <div className="bg-slate-100 p-5 flex flex-col items-center justify-start overflow-y-auto">
                <div className="w-full flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recipient Preview</span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded ${previewDevice === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                      title="Desktop View"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded ${previewDevice === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                      title="Mobile View"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  className={`bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden transition-all duration-200 ${
                    previewDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-[620px]'
                  }`}
                >
                  {/* Email Chrome Preview Bar */}
                  <div className="bg-slate-50 border-b border-slate-200 p-3 text-[11px] text-slate-600 space-y-1">
                    <div><strong>From:</strong> {senderName} &lt;{senderEmail}&gt;</div>
                    <div><strong>Subject:</strong> {subject}</div>
                    {preheader && <div className="text-slate-400"><strong>Preheader:</strong> {preheader}</div>}
                  </div>

                  {/* Rendered HTML */}
                  <div
                    className="p-4"
                    dangerouslySetInnerHTML={{
                      __html: htmlBody
                        .replace(/{{first_name}}/gi, 'Sarah')
                        .replace(/{{fullName}}/gi, 'Sarah Jenkins, RN')
                        .replace(/{{full_name}}/gi, 'Sarah Jenkins, RN')
                        .replace(/{{profession}}/gi, 'Registered Nurse')
                        .replace(/{{organization}}/gi, 'St. Thomas Acute Care')
                        .replace(/{{unsubscribe_url}}/gi, '#unsubscribe')
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-200 bg-white flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Recipient privacy: Sent individually via official Gmail API.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCampaign('draft')}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveCampaign('draft');
                  }}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-cyan-700 text-white rounded-lg shadow-xs"
                >
                  Save Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog before dispatching bulk emails */}
      {isConfirmSendOpen && campaignToDispatch && (
        <ConfirmationModal
          isOpen={isConfirmSendOpen}
          title={`Confirm Live Gmail Dispatch`}
          message={`You are about to broadcast "${campaignToDispatch.name}" via your connected Google Workspace account. Messages will be sent individually to each eligible subscriber.`}
          confirmLabel={isSendingCampaign ? 'Dispatching...' : 'Confirm & Send Broadcast'}
          onConfirm={handleConfirmSend}
          onCancel={() => setIsConfirmSendOpen(false)}
          details={[
            { label: 'Campaign Subject', value: campaignToDispatch.subject },
            { label: 'Target Audience', value: campaignToDispatch.targetSegmentId },
            { label: 'Eligible Recipients', value: eligibleCount },
            { label: 'Excluded Unsubscribed', value: excludedCount },
            { label: 'Sender Account', value: userEmail || campaignToDispatch.senderEmail }
          ]}
        />
      )}

      {/* Delivery Logs Modal */}
      {selectedCampaignForLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Campaign Delivery Logs</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedCampaignForLogs.name}</p>
              </div>
              <button onClick={() => setSelectedCampaignForLogs(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 text-xs">
              {selectedCampaignForLogs.recipientLogs.map((log, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">{log.fullName}</span>
                    <span className="text-slate-500 font-mono ml-2">({log.email})</span>
                    {log.gmailMessageId && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Gmail ID: {log.gmailMessageId}
                      </div>
                    )}
                    {log.error && (
                      <div className="text-[11px] text-red-600 font-medium mt-0.5">
                        Error: {log.error}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.status === 'sent'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {log.status}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
