import { Subscriber, Campaign, RecipientSendResult, getDb, saveDb, logAudit } from './db';

export interface SendCampaignOptions {
  campaignId: string;
  accessToken: string;
  senderEmail?: string;
  senderName?: string;
  isTestSend?: boolean;
  testRecipientEmail?: string;
}

// Convert a standard string or Buffer into base64url encoding required by Gmail API
function toBase64Url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Strip HTML tags to produce a clean plain-text fallback
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function personalize(text: string, sub: Partial<Subscriber>, appUrl: string): string {
  const firstName = sub.fullName ? sub.fullName.split(' ')[0] : 'Colleague';
  const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(sub.email || '')}`;

  return text
    .replace(/{{first_name}}/gi, firstName)
    .replace(/{{fullName}}/gi, sub.fullName || 'Colleague')
    .replace(/{{full_name}}/gi, sub.fullName || 'Colleague')
    .replace(/{{organization}}/gi, sub.organization || 'Healthcare Organization')
    .replace(/{{profession}}/gi, sub.profession || 'Healthcare Professional')
    .replace(/{{country}}/gi, sub.country || '')
    .replace(/{{unsubscribe_url}}/gi, unsubscribeUrl)
    .replace(/{{year}}/gi, new Date().getFullYear().toString());
}

export function buildRfc822Message({
  fromName,
  fromEmail,
  toEmail,
  toName,
  subject,
  htmlBody,
  plainTextBody,
  replyTo,
  appUrl
}: {
  fromName: string;
  fromEmail: string;
  toEmail: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  plainTextBody?: string;
  replyTo?: string;
  appUrl: string;
}): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 9)}@healthpulse.org>`;
  const dateStr = new Date().toUTCString();
  const plainText = plainTextBody || htmlToPlainText(htmlBody);
  const recipientHeader = toName ? `"${toName.replace(/"/g, '')}" <${toEmail}>` : `<${toEmail}>`;
  const senderHeader = `"${fromName.replace(/"/g, '')}" <${fromEmail}>`;
  const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(toEmail)}`;

  const lines = [
    `From: ${senderHeader}`,
    `To: ${recipientHeader}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `Date: ${dateStr}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
    `List-Unsubscribe: <${unsubscribeUrl}>`,
    `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    replyTo ? `Reply-To: ${replyTo}` : '',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    Buffer.from(plainText).toString('base64'),
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    Buffer.from(htmlBody).toString('base64'),
    '',
    `--${boundary}--`
  ].filter(line => line !== null && line !== undefined);

  return lines.join('\r\n');
}

export async function sendEmailViaGmailApi(rawRfc822: string, accessToken: string): Promise<{ id: string; threadId: string }> {
  const encoded = toBase64Url(rawRfc822);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encoded })
  });

  if (!res.ok) {
    const errorBody = await res.text();
    let parsedError: any;
    try {
      parsedError = JSON.parse(errorBody);
    } catch {
      parsedError = { error: { message: errorBody } };
    }
    const message = parsedError.error?.message || `Gmail API returned ${res.status}`;
    throw new Error(message);
  }

  return await res.json();
}

export async function executeCampaignSend(options: SendCampaignOptions, appUrl: string): Promise<Campaign> {
  const db = getDb();
  const campaign = db.campaigns.find(c => c.id === options.campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const senderEmail = options.senderEmail || campaign.senderEmail || 'editorial@healthpulse.org';
  const senderName = options.senderName || campaign.senderName || 'HealthPulse Editorial';

  // If this is a single test send
  if (options.isTestSend && options.testRecipientEmail) {
    const testSub: Partial<Subscriber> = {
      email: options.testRecipientEmail,
      fullName: 'Test Recipient',
      organization: 'HealthPulse Preview Unit',
      profession: 'Registered Nurse',
      country: 'Global'
    };

    const personalizedHtml = personalize(campaign.htmlBody, testSub, appUrl);
    const personalizedSubject = `[TEST PREVIEW] ${personalize(campaign.subject, testSub, appUrl)}`;
    const rfc822 = buildRfc822Message({
      fromName: senderName,
      fromEmail: senderEmail,
      toEmail: options.testRecipientEmail,
      toName: testSub.fullName,
      subject: personalizedSubject,
      htmlBody: personalizedHtml,
      replyTo: campaign.replyTo,
      appUrl
    });

    const result = await sendEmailViaGmailApi(rfc822, options.accessToken);
    logAudit('test_email_sent', 'campaign', `Test email sent to ${options.testRecipientEmail} (Gmail ID: ${result.id})`, senderEmail, campaign.id);
    return campaign;
  }

  // Full campaign dispatch:
  // Mark as sending
  campaign.status = 'sending';
  saveDb(db);

  // Filter subscribers
  let targetSubs = db.subscribers.filter(s => {
    // Exclude unsubscribed, bounced, suppressed, pending
    if (s.consentStatus !== 'subscribed') return false;

    // Filter by segment if specified
    if (campaign.targetSegmentId && campaign.targetSegmentId !== 'all') {
      const segment = db.segments.find(seg => seg.id === campaign.targetSegmentId);
      if (segment && segment.criteria.profession && s.profession !== segment.criteria.profession) {
        return false;
      }
    }

    // Filter by tags if specified
    if (campaign.targetTags && campaign.targetTags.length > 0) {
      const hasTag = campaign.targetTags.some(t => s.tags.includes(t));
      if (!hasTag) return false;
    }

    return true;
  });

  campaign.totalRecipients = db.subscribers.length;
  campaign.eligibleRecipients = targetSubs.length;
  campaign.recipientLogs = [];
  campaign.sentCount = 0;
  campaign.failedCount = 0;

  // Process sequentially with slight pacing (150ms) to respect Gmail rate limits
  for (const sub of targetSubs) {
    const personalizedHtml = personalize(campaign.htmlBody, sub, appUrl);
    const personalizedSubject = personalize(campaign.subject, sub, appUrl);

    const rfc822 = buildRfc822Message({
      fromName: senderName,
      fromEmail: senderEmail,
      toEmail: sub.email,
      toName: sub.fullName,
      subject: personalizedSubject,
      htmlBody: personalizedHtml,
      replyTo: campaign.replyTo,
      appUrl
    });

    try {
      const res = await sendEmailViaGmailApi(rfc822, options.accessToken);
      campaign.recipientLogs.push({
        email: sub.email,
        fullName: sub.fullName,
        status: 'sent',
        gmailMessageId: res.id,
        timestamp: new Date().toISOString()
      });
      campaign.sentCount++;
      // update subscriber last interaction
      sub.lastInteraction = new Date().toISOString();
    } catch (err: any) {
      campaign.recipientLogs.push({
        email: sub.email,
        fullName: sub.fullName,
        status: 'failed',
        error: err.message,
        timestamp: new Date().toISOString()
      });
      campaign.failedCount++;
    }

    // 120ms throttle
    await new Promise(resolve => setTimeout(resolve, 120));
  }

  campaign.status = campaign.failedCount === 0 ? 'sent' : campaign.sentCount > 0 ? 'partially_sent' : 'failed';
  campaign.sentAt = new Date().toISOString();
  campaign.updatedAt = new Date().toISOString();

  saveDb(db);
  logAudit(
    'campaign_dispatched',
    'campaign',
    `Campaign "${campaign.name}" dispatched: ${campaign.sentCount} sent, ${campaign.failedCount} failed`,
    senderEmail,
    campaign.id
  );

  return campaign;
}
