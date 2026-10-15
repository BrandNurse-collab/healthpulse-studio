import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import {
  getDb,
  saveDb,
  logAudit,
  Subscriber,
  Campaign,
  BlogArticle,
  Newsletter,
  AutomationRule
} from './db';
import { fetchAndExtractArticle } from './scraper';
import {
  generateContentWithGemini,
  repurposeExternalArticle,
  generateNewsletterDigest,
  isAiConfigured
} from './gemini';
import { executeCampaignSend } from './gmailSender';

// Helper to parse JSON body from incoming connect/express request
export async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 10 * 1024 * 1024) {
        // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data.trim()) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

export function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  appUrl: string
): Promise<boolean> {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method || 'GET';

  // Only handle /api/ routes
  if (!pathname.startsWith('/api')) {
    return false;
  }

  try {
    const db = getDb();

    // 1. STATS
    if (pathname === '/api/stats' && method === 'GET') {
      const totalSubscribers = db.subscribers.length;
      const confirmedSubscribers = db.subscribers.filter(s => s.consentStatus === 'subscribed').length;
      const unsubscribedCount = db.subscribers.filter(s => s.consentStatus === 'unsubscribed').length;
      const publishedArticles = db.articles.filter(a => a.status === 'published').length;
      const draftsAwaitingReview = db.newsletters.filter(n => n.status === 'draft').length +
                                   db.articles.filter(a => a.status === 'review').length;
      const campaignsSent = db.campaigns.filter(c => c.status === 'sent' || c.status === 'partially_sent').length;
      const campaignsScheduled = db.campaigns.filter(c => c.status === 'scheduled').length;

      sendJson(res, 200, {
        totalSubscribers,
        confirmedSubscribers,
        unsubscribedCount,
        publishedArticles,
        draftsAwaitingReview,
        campaignsSent,
        campaignsScheduled,
        aiConfigured: isAiConfigured(),
        organizationName: db.meta.organizationName,
        senderName: db.meta.senderName,
        senderEmail: db.meta.senderEmail,
        recentActivity: db.auditLogs.slice(0, 8),
        activeAutomations: db.automations.filter(a => a.enabled).length
      });
      return true;
    }

    // 2. SUBSCRIBERS
    if (pathname === '/api/subscribers' && method === 'GET') {
      const search = parsedUrl.searchParams.get('search')?.toLowerCase() || '';
      const status = parsedUrl.searchParams.get('status') || '';
      const profession = parsedUrl.searchParams.get('profession') || '';
      const tag = parsedUrl.searchParams.get('tag') || '';

      let list = db.subscribers.filter(s => {
        if (status && s.consentStatus !== status) return false;
        if (profession && s.profession !== profession) return false;
        if (tag && !s.tags.includes(tag)) return false;
        if (search) {
          const matchEmail = s.email.toLowerCase().includes(search);
          const matchName = s.fullName.toLowerCase().includes(search);
          const matchOrg = s.organization.toLowerCase().includes(search);
          if (!matchEmail && !matchName && !matchOrg) return false;
        }
        return true;
      });

      sendJson(res, 200, { subscribers: list, total: list.length });
      return true;
    }

    if (pathname === '/api/subscribers' && method === 'POST') {
      const body = await parseJsonBody(req);
      const email = (body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        sendJson(res, 400, { error: 'Valid email address is required' });
        return true;
      }

      // Duplicate check
      if (db.subscribers.some(s => s.email.toLowerCase() === email)) {
        sendJson(res, 409, { error: 'A subscriber with this email address already exists.' });
        return true;
      }

      const newSub: Subscriber = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email,
        fullName: body.fullName?.trim() || 'Colleague',
        organization: body.organization?.trim() || 'Healthcare Facility',
        profession: body.profession || 'Registered Nurse',
        country: body.country?.trim() || 'Global',
        tags: Array.isArray(body.tags) ? body.tags : (body.tags ? body.tags.split(',').map((t: string) => t.trim()) : ['general']),
        subscriptionSource: body.subscriptionSource || 'manual',
        consentStatus: body.consentStatus || 'subscribed',
        consentTimestamp: new Date().toISOString(),
        dateSubscribed: new Date().toISOString(),
        notes: body.notes?.trim() || ''
      };

      db.subscribers.unshift(newSub);
      saveDb(db);
      logAudit('subscriber_added', 'subscriber', `Added subscriber ${newSub.email} (${newSub.profession})`, 'admin', newSub.id);

      sendJson(res, 201, { subscriber: newSub });
      return true;
    }

    // CSV IMPORT
    if (pathname === '/api/subscribers/import' && method === 'POST') {
      const body = await parseJsonBody(req);
      const rows = body.rows; // Array of subscriber objects or CSV raw rows
      if (!Array.isArray(rows) || rows.length === 0) {
        sendJson(res, 400, { error: 'Invalid or empty rows array provided.' });
        return true;
      }

      let imported = 0;
      let duplicates = 0;
      let invalid = 0;

      for (const row of rows) {
        const email = (row.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
          invalid++;
          continue;
        }
        if (db.subscribers.some(s => s.email.toLowerCase() === email)) {
          duplicates++;
          continue;
        }

        const sub: Subscriber = {
          id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          email,
          fullName: row.fullName || row.name || 'Healthcare Colleague',
          organization: row.organization || 'Clinical Center',
          profession: row.profession || 'Registered Nurse',
          country: row.country || 'Global',
          tags: Array.isArray(row.tags) ? row.tags : (row.tags ? row.tags.split(';').map((t: string) => t.trim()) : ['csv-import']),
          subscriptionSource: 'csv_import',
          consentStatus: 'subscribed',
          consentTimestamp: new Date().toISOString(),
          dateSubscribed: new Date().toISOString(),
          notes: `Imported via batch CSV: ${new Date().toLocaleDateString()}`
        };
        db.subscribers.push(sub);
        imported++;
      }

      saveDb(db);
      logAudit('subscribers_imported', 'subscriber', `Batch CSV import completed: ${imported} imported, ${duplicates} duplicates skipped, ${invalid} invalid`);
      sendJson(res, 200, { imported, duplicates, invalid, total: db.subscribers.length });
      return true;
    }

    // BULK ACTION (unsubscribe, suppress, delete)
    if (pathname === '/api/subscribers/bulk-action' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { ids, action } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        sendJson(res, 400, { error: 'No subscriber IDs specified.' });
        return true;
      }

      if (action === 'delete') {
        db.subscribers = db.subscribers.filter(s => !ids.includes(s.id));
      } else if (action === 'unsubscribe') {
        db.subscribers.forEach(s => {
          if (ids.includes(s.id)) s.consentStatus = 'unsubscribed';
        });
      } else if (action === 'suppress') {
        db.subscribers.forEach(s => {
          if (ids.includes(s.id)) s.consentStatus = 'suppressed';
        });
      }

      saveDb(db);
      logAudit('subscribers_bulk_action', 'subscriber', `Performed bulk ${action} on ${ids.length} subscribers`);
      sendJson(res, 200, { success: true, count: ids.length });
      return true;
    }

    // SINGLE SUBSCRIBER UPDATE / DELETE
    if (pathname.startsWith('/api/subscribers/') && method === 'PATCH') {
      const id = pathname.replace('/api/subscribers/', '');
      const sub = db.subscribers.find(s => s.id === id);
      if (!sub) {
        sendJson(res, 404, { error: 'Subscriber not found' });
        return true;
      }
      const body = await parseJsonBody(req);
      Object.assign(sub, body);
      saveDb(db);
      sendJson(res, 200, { subscriber: sub });
      return true;
    }

    if (pathname.startsWith('/api/subscribers/') && method === 'DELETE') {
      const id = pathname.replace('/api/subscribers/', '');
      const idx = db.subscribers.findIndex(s => s.id === id);
      if (idx !== -1) {
        const removed = db.subscribers.splice(idx, 1)[0];
        saveDb(db);
        logAudit('subscriber_deleted', 'subscriber', `Removed subscriber ${removed.email}`);
      }
      sendJson(res, 200, { success: true });
      return true;
    }

    // SEGMENTS
    if (pathname === '/api/segments' && method === 'GET') {
      const segmentsWithCounts = db.segments.map(seg => {
        let count = 0;
        if (seg.id === 'all') {
          count = db.subscribers.filter(s => s.consentStatus === 'subscribed').length;
        } else {
          count = db.subscribers.filter(s => {
            if (s.consentStatus !== 'subscribed') return false;
            if (seg.criteria.profession && s.profession !== seg.criteria.profession) return false;
            return true;
          }).length;
        }
        return { ...seg, count };
      });
      sendJson(res, 200, { segments: segmentsWithCounts });
      return true;
    }

    // 3. ARTICLES / BLOG CMS
    if (pathname === '/api/articles' && method === 'GET') {
      const status = parsedUrl.searchParams.get('status');
      const category = parsedUrl.searchParams.get('category');
      const search = parsedUrl.searchParams.get('search')?.toLowerCase();

      let list = db.articles.filter(a => {
        if (status && a.status !== status) return false;
        if (category && a.category !== category) return false;
        if (search && !a.title.toLowerCase().includes(search) && !a.content.toLowerCase().includes(search)) return false;
        return true;
      });

      sendJson(res, 200, { articles: list });
      return true;
    }

    if (pathname === '/api/articles' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.title || !body.content) {
        sendJson(res, 400, { error: 'Article title and content are required' });
        return true;
      }

      const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const words = (body.content.replace(/<[^>]+>/g, '')).split(/\s+/).filter(Boolean).length;
      const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

      const article: BlogArticle = {
        id: `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: body.title.trim(),
        slug,
        excerpt: body.excerpt?.trim() || body.title,
        content: body.content,
        category: body.category || 'Clinical Practice',
        tags: Array.isArray(body.tags) ? body.tags : ['clinical-guide'],
        authorName: body.authorName || db.meta.senderName,
        authorRole: body.authorRole || 'Clinical Specialist',
        featuredImage: body.featuredImage || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80',
        status: body.status || 'draft',
        seoTitle: body.seoTitle || `${body.title} | HealthPulse`,
        metaDescription: body.metaDescription || body.excerpt || '',
        canonicalUrl: `${appUrl}/blog/${slug}`,
        sourceUrl: body.sourceUrl,
        sourceAttribution: body.sourceAttribution,
        viewsCount: 0,
        readingTimeMinutes,
        scheduledAt: body.scheduledAt,
        publishedAt: body.status === 'published' ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revisionsCount: 1
      };

      db.articles.unshift(article);
      saveDb(db);
      logAudit('article_created', 'article', `Created article "${article.title}" (${article.status})`, 'admin', article.id);

      sendJson(res, 201, { article });
      return true;
    }

    if (pathname.startsWith('/api/articles/') && method === 'PATCH') {
      const id = pathname.replace('/api/articles/', '');
      const article = db.articles.find(a => a.id === id);
      if (!article) {
        sendJson(res, 404, { error: 'Article not found' });
        return true;
      }

      const body = await parseJsonBody(req);
      Object.assign(article, body);
      article.updatedAt = new Date().toISOString();
      article.revisionsCount = (article.revisionsCount || 1) + 1;

      if (body.status === 'published' && !article.publishedAt) {
        article.publishedAt = new Date().toISOString();
      }

      saveDb(db);
      logAudit('article_updated', 'article', `Updated article "${article.title}" (Status: ${article.status})`, 'admin', article.id);
      sendJson(res, 200, { article });
      return true;
    }

    if (pathname.startsWith('/api/articles/') && method === 'DELETE') {
      const id = pathname.replace('/api/articles/', '');
      const idx = db.articles.findIndex(a => a.id === id);
      if (idx !== -1) {
        const removed = db.articles.splice(idx, 1)[0];
        saveDb(db);
        logAudit('article_deleted', 'article', `Deleted article "${removed.title}"`, 'admin', id);
      }
      sendJson(res, 200, { success: true });
      return true;
    }

    // 4. PUBLIC BLOG ENDPOINTS
    if (pathname === '/api/public/blog' && method === 'GET') {
      const published = db.articles
        .filter(a => a.status === 'published')
        .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
      sendJson(res, 200, { articles: published });
      return true;
    }

    if (pathname.startsWith('/api/public/blog/') && method === 'GET') {
      const slug = pathname.replace('/api/public/blog/', '');
      const article = db.articles.find(a => a.slug === slug && a.status === 'published');
      if (!article) {
        sendJson(res, 404, { error: 'Article not found or not published' });
        return true;
      }
      article.viewsCount = (article.viewsCount || 0) + 1;
      saveDb(db);
      sendJson(res, 200, { article });
      return true;
    }

    // Public opt-in subscriber endpoint
    if (pathname === '/api/public/subscribe' && method === 'POST') {
      const body = await parseJsonBody(req);
      const email = (body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        sendJson(res, 400, { error: 'Please enter a valid email address.' });
        return true;
      }

      const existing = db.subscribers.find(s => s.email.toLowerCase() === email);
      if (existing) {
        if (existing.consentStatus === 'unsubscribed') {
          existing.consentStatus = 'subscribed';
          existing.consentTimestamp = new Date().toISOString();
          saveDb(db);
          sendJson(res, 200, { message: 'Welcome back! Your newsletter subscription has been reactivated.' });
          return true;
        }
        sendJson(res, 200, { message: 'You are already subscribed to HealthPulse updates.' });
        return true;
      }

      const newSub: Subscriber = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email,
        fullName: body.fullName?.trim() || 'Health Professional',
        organization: body.organization?.trim() || 'Clinical Practice',
        profession: body.profession || 'Registered Nurse',
        country: body.country?.trim() || 'Global',
        tags: ['website-optin', 'public-reader'],
        subscriptionSource: 'website_optin',
        consentStatus: 'subscribed',
        consentIp: req.socket.remoteAddress || 'unknown',
        consentTimestamp: new Date().toISOString(),
        dateSubscribed: new Date().toISOString(),
        notes: 'Opted in via public blog reader form'
      };

      db.subscribers.unshift(newSub);
      saveDb(db);
      logAudit('subscriber_optin', 'subscriber', `Public reader subscribed: ${email}`, 'public_reader', newSub.id);
      sendJson(res, 201, { message: 'Thank you for subscribing! You will receive our next clinical briefing.' });
      return true;
    }

    // Unsubscribe endpoint (handles both GET and POST)
    if (pathname === '/api/unsubscribe') {
      const email = (parsedUrl.searchParams.get('email') || '').trim().toLowerCase();
      if (email) {
        const sub = db.subscribers.find(s => s.email.toLowerCase() === email);
        if (sub) {
          sub.consentStatus = 'unsubscribed';
          saveDb(db);
          logAudit('subscriber_unsubscribed', 'subscriber', `Subscriber unsubscribed: ${email}`, 'user', sub.id);
        }
      }
      sendJson(res, 200, { message: 'You have been successfully unsubscribed from HealthPulse marketing broadcasts.' });
      return true;
    }

    // 5. CAMPAIGNS
    if (pathname === '/api/campaigns' && method === 'GET') {
      sendJson(res, 200, { campaigns: db.campaigns });
      return true;
    }

    if (pathname === '/api/campaigns' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.name || !body.subject || !body.htmlBody) {
        sendJson(res, 400, { error: 'Campaign name, subject, and email body are required' });
        return true;
      }

      const campaign: Campaign = {
        id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: body.name.trim(),
        subject: body.subject.trim(),
        preheader: body.preheader?.trim() || '',
        senderName: body.senderName?.trim() || db.meta.senderName,
        senderEmail: body.senderEmail?.trim() || db.meta.senderEmail,
        replyTo: body.replyTo?.trim() || db.meta.senderEmail,
        htmlBody: body.htmlBody,
        plainText: body.plainText || '',
        targetSegmentId: body.targetSegmentId || 'all',
        targetTags: Array.isArray(body.targetTags) ? body.targetTags : [],
        status: body.status || 'draft',
        scheduledAt: body.scheduledAt,
        totalRecipients: db.subscribers.length,
        eligibleRecipients: db.subscribers.filter(s => s.consentStatus === 'subscribed').length,
        sentCount: 0,
        failedCount: 0,
        recipientLogs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.campaigns.unshift(campaign);
      saveDb(db);
      logAudit('campaign_created', 'campaign', `Created campaign "${campaign.name}" (${campaign.status})`, 'admin', campaign.id);

      sendJson(res, 201, { campaign });
      return true;
    }

    if (pathname.startsWith('/api/campaigns/') && pathname.endsWith('/send') && method === 'POST') {
      const id = pathname.replace('/api/campaigns/', '').replace('/send', '');
      const body = await parseJsonBody(req);

      // Bearer token from Authorization header or body
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : body.accessToken;

      if (!accessToken) {
        sendJson(res, 401, {
          error: 'Gmail access token missing. Please sign in with your Google Workspace account first.'
        });
        return true;
      }

      try {
        const campaign = await executeCampaignSend({
          campaignId: id,
          accessToken,
          senderEmail: body.senderEmail,
          senderName: body.senderName,
          isTestSend: false
        }, appUrl);

        sendJson(res, 200, { campaign });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message });
      }
      return true;
    }

    if (pathname.startsWith('/api/campaigns/') && pathname.endsWith('/test-send') && method === 'POST') {
      const id = pathname.replace('/api/campaigns/', '').replace('/test-send', '');
      const body = await parseJsonBody(req);

      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : body.accessToken;

      if (!accessToken) {
        sendJson(res, 401, { error: 'Gmail access token missing. Please connect Gmail first.' });
        return true;
      }

      if (!body.testRecipientEmail) {
        sendJson(res, 400, { error: 'Test recipient email is required.' });
        return true;
      }

      try {
        await executeCampaignSend({
          campaignId: id,
          accessToken,
          senderEmail: body.senderEmail,
          senderName: body.senderName,
          isTestSend: true,
          testRecipientEmail: body.testRecipientEmail
        }, appUrl);

        sendJson(res, 200, { success: true, message: `Test email sent to ${body.testRecipientEmail}` });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message });
      }
      return true;
    }

    if (pathname.startsWith('/api/campaigns/') && method === 'DELETE') {
      const id = pathname.replace('/api/campaigns/', '');
      const idx = db.campaigns.findIndex(c => c.id === id);
      if (idx !== -1) {
        const removed = db.campaigns.splice(idx, 1)[0];
        saveDb(db);
        logAudit('campaign_deleted', 'campaign', `Deleted campaign "${removed.name}"`, 'admin', id);
      }
      sendJson(res, 200, { success: true });
      return true;
    }

    // 6. TEMPLATES
    if (pathname === '/api/templates' && method === 'GET') {
      sendJson(res, 200, { templates: db.templates });
      return true;
    }

    // 7. NEWSLETTERS
    if (pathname === '/api/newsletters' && method === 'GET') {
      sendJson(res, 200, { newsletters: db.newsletters });
      return true;
    }

    if (pathname === '/api/newsletters' && method === 'POST') {
      const body = await parseJsonBody(req);
      const articleIds = body.articleIds || [];
      const articles = db.articles.filter(a => articleIds.includes(a.id));

      if (articles.length === 0) {
        sendJson(res, 400, { error: 'Please select at least one article to include in the newsletter.' });
        return true;
      }

      let generated;
      try {
        generated = await generateNewsletterDigest(
          articles.map(a => ({ title: a.title, excerpt: a.excerpt, slug: a.slug, category: a.category })),
          body.introPrompt,
          body.audience
        );
      } catch (err: any) {
        // Fallback if AI not configured
        const edition = db.newsletters.length + 1;
        generated = {
          title: `HealthPulse Clinical Briefing #${edition}`,
          subject: `HealthPulse Clinical Briefing #${edition}`,
          preheader: 'This week in healthcare practice and professional development',
          introNote: body.introPrompt || 'Welcome to this week’s curated clinical digest.',
          htmlBody: `<div style="padding: 24px;"><h2>HealthPulse Issue #${edition}</h2>${articles.map(a => `<h3>${a.title}</h3><p>${a.excerpt}</p>`).join('')}</div>`
        };
      }

      const newsletter: Newsletter = {
        id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: generated.title,
        edition: db.newsletters.length + 1,
        status: 'draft',
        introNote: generated.introNote,
        articleIds,
        htmlBody: generated.htmlBody,
        plainText: generated.introNote,
        generatedBy: 'editorial_team',
        createdAt: new Date().toISOString()
      };

      db.newsletters.unshift(newsletter);
      saveDb(db);
      logAudit('newsletter_created', 'newsletter', `Generated newsletter draft "${newsletter.title}"`, 'admin', newsletter.id);

      sendJson(res, 201, { newsletter });
      return true;
    }

    if (pathname.startsWith('/api/newsletters/') && pathname.endsWith('/create-campaign') && method === 'POST') {
      const id = pathname.replace('/api/newsletters/', '').replace('/create-campaign', '');
      const newsletter = db.newsletters.find(n => n.id === id);
      if (!newsletter) {
        sendJson(res, 404, { error: 'Newsletter not found' });
        return true;
      }

      const campaign: Campaign = {
        id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Campaign: ${newsletter.title}`,
        subject: `${newsletter.title} | Weekly Briefing`,
        preheader: 'Curated healthcare clinical guidelines and career pathways',
        senderName: db.meta.senderName,
        senderEmail: db.meta.senderEmail,
        replyTo: db.meta.senderEmail,
        htmlBody: newsletter.htmlBody,
        plainText: newsletter.plainText || '',
        targetSegmentId: 'all',
        targetTags: [],
        status: 'draft',
        totalRecipients: db.subscribers.length,
        eligibleRecipients: db.subscribers.filter(s => s.consentStatus === 'subscribed').length,
        sentCount: 0,
        failedCount: 0,
        recipientLogs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.campaigns.unshift(campaign);
      newsletter.campaignId = campaign.id;
      newsletter.status = 'ready';
      saveDb(db);
      logAudit('campaign_from_newsletter', 'campaign', `Created campaign draft from newsletter "${newsletter.title}"`, 'admin', campaign.id);

      sendJson(res, 201, { campaign, newsletter });
      return true;
    }

    // 8. AUTOMATIONS
    if (pathname === '/api/automations' && method === 'GET') {
      sendJson(res, 200, { automations: db.automations });
      return true;
    }

    if (pathname === '/api/automations' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.name) {
        sendJson(res, 400, { error: 'Automation rule name is required' });
        return true;
      }

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (body.frequency === 'daily' ? 1 : 7));

      const rule: AutomationRule = {
        id: body.id || `auto_${Date.now()}`,
        name: body.name.trim(),
        enabled: body.enabled !== false,
        frequency: body.frequency || 'weekly',
        dayOfWeek: typeof body.dayOfWeek === 'number' ? body.dayOfWeek : 1,
        timeOfDay: body.timeOfDay || '08:00',
        timezone: body.timezone || 'UTC',
        targetSegmentId: body.targetSegmentId || 'all',
        categoryFilter: body.categoryFilter || '',
        maxArticles: body.maxArticles || 3,
        requireApproval: body.requireApproval !== false,
        autoSend: !!body.autoSend,
        introPrompt: body.introPrompt || '',
        nextRunAt: nextDate.toISOString(),
        createdAt: new Date().toISOString()
      };

      const existingIdx = db.automations.findIndex(a => a.id === rule.id);
      if (existingIdx !== -1) {
        db.automations[existingIdx] = rule;
      } else {
        db.automations.push(rule);
      }

      saveDb(db);
      logAudit('automation_saved', 'automation', `Saved automation workflow "${rule.name}"`, 'admin', rule.id);
      sendJson(res, 200, { automation: rule });
      return true;
    }

    // 9. AI STUDIO ENDPOINTS
    if (pathname === '/api/ai/generate' && method === 'POST') {
      const body = await parseJsonBody(req);
      try {
        const result = await generateContentWithGemini({
          title: body.title,
          topic: body.topic,
          audience: body.audience || 'Registered Nurses and Healthcare Professionals',
          tone: body.tone || 'Clinical, Authoritative & Engaging',
          length: body.length || 'medium',
          keywords: body.keywords,
          sourceMaterial: body.sourceMaterial,
          cta: body.cta,
          outputFormat: body.outputFormat || 'blog_article'
        });
        sendJson(res, 200, { result });
      } catch (err: any) {
        sendJson(res, 500, { error: err.message });
      }
      return true;
    }

    // SSRF PROTECTED REPURPOSING OF EXTERNAL BLOG URL
    if (pathname === '/api/ai/repurpose-url' && method === 'POST') {
      const body = await parseJsonBody(req);
      const url = body.url?.trim();
      if (!url) {
        sendJson(res, 400, { error: 'Please enter a valid external article URL.' });
        return true;
      }

      try {
        // Step 1: Scrape & validate URL with SSRF protection
        const extracted = await fetchAndExtractArticle(url);

        // Step 2: AI transformative generation
        const aiResult = await repurposeExternalArticle(
          extracted.sourceUrl,
          extracted.title,
          extracted.author,
          extracted.content,
          body.audience || 'Healthcare professionals and bedside nurses',
          body.tone || 'Evidence-Based & Engaging'
        );

        logAudit('external_article_repurposed', 'article', `Repurposed external article from ${extracted.sourceDomain}: "${extracted.title}"`);
        sendJson(res, 200, { extracted, aiResult });
      } catch (err: any) {
        sendJson(res, 400, { error: err.message });
      }
      return true;
    }

    // AUDIT LOGS
    if (pathname === '/api/audit-logs' && method === 'GET') {
      sendJson(res, 200, { logs: db.auditLogs });
      return true;
    }

    // Not matched
    sendJson(res, 404, { error: 'API route not found' });
    return true;
  } catch (err: any) {
    console.error('API Error:', err);
    sendJson(res, 500, { error: err.message || 'Internal server error' });
    return true;
  }
}
