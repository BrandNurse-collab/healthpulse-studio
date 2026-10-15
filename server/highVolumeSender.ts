import { Subscriber, Campaign, RecipientSendResult, getDb, saveDb, logAudit } from './db';
import { buildRfc822Message } from './gmailSender';

export interface HighVolumeSendOptions {
  campaignId: string;
  provider: 'resend' | 'sendgrid' | 'custom_api';
  apiKey: string;
  fromEmail: string;
  fromName: string;
  isTestSend?: boolean;
  testRecipientEmail?: string;
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

/**
 * Send an email via Resend REST API (Supports thousands of emails at scale)
 */
async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
  unsubscribeUrl?: string
): Promise<{ id: string }> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  const payload: any = {
    from,
    to: [to],
    subject,
    html
  };

  if (replyTo) payload.reply_to = replyTo;
  if (unsubscribeUrl) {
    payload.headers = {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    let msg = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      msg = parsed.message || parsed.error || errorBody;
    } catch {}
    throw new Error(`Resend API Error (${res.status}): ${msg}`);
  }

  return await res.json();
}

/**
 * Send an email via SendGrid v3 API
 */
async function sendViaSendGrid(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  toEmail: string,
  toName: string,
  subject: string,
  html: string,
  replyTo?: string
): Promise<{ id: string }> {
  const payload = {
    personalizations: [
      {
        to: [{ email: toEmail, name: toName }]
      }
    ],
    from: { email: fromEmail, name: fromName },
    reply_to: replyTo ? { email: replyTo } : undefined,
    subject,
    content: [
      {
        type: 'text/html',
        value: html
      }
    ]
  };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`SendGrid API Error (${res.status}): ${errorBody}`);
  }

  const msgId = res.headers.get('x-message-id') || `sg_${Date.now()}`;
  return { id: msgId };
}

/**
 * Execute High-Volume broadcast supporting >2,000+ recipients with concurrency batching
 */
export async function executeHighVolumeSend(
  options: HighVolumeSendOptions,
  appUrl: string
): Promise<Campaign> {
  const db = getDb();
  const campaign = db.campaigns.find(c => c.id === options.campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const fromEmail = options.fromEmail || campaign.senderEmail || 'newsletter@healthpulse.org';
  const fromName = options.fromName || campaign.senderName || 'HealthPulse Editorial';
  const formattedFrom = `"${fromName.replace(/"/g, '')}" <${fromEmail}>`;

  // Test send handling
  if (options.isTestSend && options.testRecipientEmail) {
    const testSub: Partial<Subscriber> = {
      email: options.testRecipientEmail,
      fullName: 'Test Recipient',
      organization: 'Preview Health Unit',
      profession: 'Registered Nurse',
      country: 'Global'
    };

    const personalizedHtml = personalize(campaign.htmlBody, testSub, appUrl);
    const personalizedSubject = `[TEST HIGH-VOLUME] ${personalize(campaign.subject, testSub, appUrl)}`;
    const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(options.testRecipientEmail)}`;

    let resultId = '';
    if (options.provider === 'sendgrid') {
      const res = await sendViaSendGrid(
        options.apiKey,
        fromEmail,
        fromName,
        options.testRecipientEmail,
        'Test Recipient',
        personalizedSubject,
        personalizedHtml,
        campaign.replyTo
      );
      resultId = res.id;
    } else {
      // Default to Resend
      const res = await sendViaResend(
        options.apiKey,
        formattedFrom,
        options.testRecipientEmail,
        personalizedSubject,
        personalizedHtml,
        campaign.replyTo,
        unsubscribeUrl
      );
      resultId = res.id;
    }

    logAudit('test_email_sent', 'campaign', `Test email sent to ${options.testRecipientEmail} via ${options.provider.toUpperCase()} (ID: ${resultId})`, fromEmail, campaign.id);
    return campaign;
  }

  // Live High-Volume Dispatch
  campaign.status = 'sending';
  saveDb(db);

  // Filter eligible subscribers
  const targetSubs = db.subscribers.filter(s => {
    if (s.consentStatus !== 'subscribed') return false;
    if (campaign.targetSegmentId && campaign.targetSegmentId !== 'all') {
      const segment = db.segments.find(seg => seg.id === campaign.targetSegmentId);
      if (segment?.criteria?.profession && s.profession !== segment.criteria.profession) {
        return false;
      }
    }
    if (campaign.targetTags && campaign.targetTags.length > 0) {
      if (!campaign.targetTags.some(t => s.tags.includes(t))) return false;
    }
    return true;
  });

  campaign.totalRecipients = db.subscribers.length;
  campaign.eligibleRecipients = targetSubs.length;
  campaign.recipientLogs = [];
  campaign.sentCount = 0;
  campaign.failedCount = 0;

  // Process in concurrent batches of 10 to ensure rapid sending for 2,000 to 50,000 recipients
  const BATCH_SIZE = 10;
  for (let i = 0; i < targetSubs.length; i += BATCH_SIZE) {
    const chunk = targetSubs.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async sub => {
        const personalizedHtml = personalize(campaign.htmlBody, sub, appUrl);
        const personalizedSubject = personalize(campaign.subject, sub, appUrl);
        const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(sub.email)}`;

        try {
          let sendResult: { id: string };
          if (options.provider === 'sendgrid') {
            sendResult = await sendViaSendGrid(
              options.apiKey,
              fromEmail,
              fromName,
              sub.email,
              sub.fullName,
              personalizedSubject,
              personalizedHtml,
              campaign.replyTo
            );
          } else {
            sendResult = await sendViaResend(
              options.apiKey,
              formattedFrom,
              sub.email,
              personalizedSubject,
              personalizedHtml,
              campaign.replyTo,
              unsubscribeUrl
            );
          }

          campaign.recipientLogs.push({
            email: sub.email,
            fullName: sub.fullName,
            status: 'sent',
            gmailMessageId: sendResult.id,
            timestamp: new Date().toISOString()
          });
          campaign.sentCount++;
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
      })
    );

    // Minimal delay between batches
    await new Promise(r => setTimeout(r, 60));
  }

  campaign.status = campaign.failedCount === 0 ? 'sent' : campaign.sentCount > 0 ? 'partially_sent' : 'failed';
  campaign.sentAt = new Date().toISOString();
  campaign.updatedAt = new Date().toISOString();

  saveDb(db);
  logAudit(
    'high_volume_campaign_dispatched',
    'campaign',
    `High-volume broadcast "${campaign.name}" dispatched via ${options.provider.toUpperCase()}: ${campaign.sentCount} sent, ${campaign.failedCount} failed`,
    fromEmail,
    campaign.id
  );

  return campaign;
}
