import { getAccessToken } from './auth';

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject current memory-cached Google Workspace access token if available
  const token = await getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Stats
  getStats: () => apiRequest('/api/stats'),

  // Subscribers
  getSubscribers: (params?: { search?: string; status?: string; profession?: string; tag?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/subscribers${q ? `?${q}` : ''}`);
  },
  createSubscriber: (sub: any) =>
    apiRequest('/api/subscribers', { method: 'POST', body: JSON.stringify(sub) }),
  importSubscribers: (rows: any[]) =>
    apiRequest('/api/subscribers/import', { method: 'POST', body: JSON.stringify({ rows }) }),
  bulkActionSubscribers: (ids: string[], action: 'unsubscribe' | 'suppress' | 'delete') =>
    apiRequest('/api/subscribers/bulk-action', { method: 'POST', body: JSON.stringify({ ids, action }) }),
  updateSubscriber: (id: string, updates: any) =>
    apiRequest(`/api/subscribers/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteSubscriber: (id: string) =>
    apiRequest(`/api/subscribers/${id}`, { method: 'DELETE' }),

  // Segments
  getSegments: () => apiRequest('/api/segments'),

  // Articles / Blog CMS
  getArticles: (params?: { status?: string; category?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/articles${q ? `?${q}` : ''}`);
  },
  createArticle: (article: any) =>
    apiRequest('/api/articles', { method: 'POST', body: JSON.stringify(article) }),
  updateArticle: (id: string, updates: any) =>
    apiRequest(`/api/articles/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteArticle: (id: string) =>
    apiRequest(`/api/articles/${id}`, { method: 'DELETE' }),

  // Public Blog
  getPublicBlog: () => apiRequest('/api/public/blog'),
  getPublicArticle: (slug: string) => apiRequest(`/api/public/blog/${slug}`),
  publicSubscribe: (data: { email: string; fullName?: string; profession?: string }) =>
    apiRequest('/api/public/subscribe', { method: 'POST', body: JSON.stringify(data) }),

  // Campaigns
  getCampaigns: () => apiRequest('/api/campaigns'),
  createCampaign: (campaign: any) =>
    apiRequest('/api/campaigns', { method: 'POST', body: JSON.stringify(campaign) }),
  sendCampaign: (id: string, senderDetails?: { senderName?: string; senderEmail?: string }) =>
    apiRequest(`/api/campaigns/${id}/send`, { method: 'POST', body: JSON.stringify(senderDetails || {}) }),
  testSendCampaign: (id: string, testRecipientEmail: string, senderDetails?: { senderName?: string; senderEmail?: string }) =>
    apiRequest(`/api/campaigns/${id}/test-send`, {
      method: 'POST',
      body: JSON.stringify({ testRecipientEmail, ...(senderDetails || {}) }),
    }),
  deleteCampaign: (id: string) =>
    apiRequest(`/api/campaigns/${id}`, { method: 'DELETE' }),

  // Email Engine Settings (Gmail vs High-Volume Resend/SendGrid)
  getEmailEngineSettings: () => apiRequest('/api/settings/email-engine'),
  saveEmailEngineSettings: (data: any) =>
    apiRequest('/api/settings/email-engine', { method: 'POST', body: JSON.stringify(data) }),

  // Templates
  getTemplates: () => apiRequest('/api/templates'),

  // Newsletters
  getNewsletters: () => apiRequest('/api/newsletters'),
  createNewsletter: (data: { articleIds: string[]; introPrompt?: string; audience?: string }) =>
    apiRequest('/api/newsletters', { method: 'POST', body: JSON.stringify(data) }),
  turnNewsletterIntoCampaign: (id: string) =>
    apiRequest(`/api/newsletters/${id}/create-campaign`, { method: 'POST' }),

  // Automations
  getAutomations: () => apiRequest('/api/automations'),
  saveAutomation: (auto: any) =>
    apiRequest('/api/automations', { method: 'POST', body: JSON.stringify(auto) }),

  // Audit Logs
  getAuditLogs: () => apiRequest('/api/audit-logs'),

  // AI Studio
  generateAiContent: (payload: any) =>
    apiRequest('/api/ai/generate', { method: 'POST', body: JSON.stringify(payload) }),
  repurposeUrl: (payload: { url: string; audience?: string; tone?: string }) =>
    apiRequest('/api/ai/repurpose-url', { method: 'POST', body: JSON.stringify(payload) }),
};
