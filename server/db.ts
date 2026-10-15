import fs from 'fs';
import path from 'path';

export interface Subscriber {
  id: string;
  email: string;
  fullName: string;
  organization: string;
  profession: 'Registered Nurse' | 'Clinical Director' | 'Resident Physician' | 'Hospital Manager' | 'Nursing Student' | 'Medical Recruiter' | 'Training Participant' | 'General Healthcare' | string;
  country: string;
  tags: string[];
  subscriptionSource: 'manual' | 'website_optin' | 'csv_import' | 'event_registration';
  consentStatus: 'subscribed' | 'pending' | 'unsubscribed' | 'bounced' | 'suppressed';
  consentIp?: string;
  consentTimestamp: string;
  dateSubscribed: string;
  lastInteraction?: string;
  notes?: string;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  criteria: {
    profession?: string;
    status?: string;
    tag?: string;
  };
}

export interface RecipientSendResult {
  email: string;
  fullName: string;
  status: 'sent' | 'failed' | 'skipped_unsubscribed' | 'skipped_suppressed';
  gmailMessageId?: string;
  error?: string;
  timestamp: string;
}

export interface Campaign {
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
  recipientLogs: RecipientSendResult[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'Newsletter' | 'Announcement' | 'Training' | 'Recruitment' | 'Welcome' | 'Digest';
  description: string;
  subject: string;
  preheader: string;
  htmlBody: string;
}

export interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: 'Clinical Practice' | 'Nursing Education' | 'Recruitment & Career' | 'Healthcare Leadership' | 'Medical Tech & AI' | 'Continuing Education';
  tags: string[];
  authorName: string;
  authorRole: string;
  featuredImage: string;
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  sourceUrl?: string;
  sourceAttribution?: string;
  viewsCount: number;
  readingTimeMinutes: number;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  revisionsCount: number;
}

export interface Newsletter {
  id: string;
  title: string;
  edition: number;
  status: 'draft' | 'ready' | 'scheduled' | 'sent';
  introNote: string;
  articleIds: string[];
  htmlBody: string;
  plainText: string;
  generatedBy: 'ai_automation' | 'editorial_team';
  scheduledAt?: string;
  sentAt?: string;
  campaignId?: string;
  createdAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  timeOfDay: string; // "09:00"
  timezone: string;
  targetSegmentId: string;
  categoryFilter?: string;
  maxArticles: number;
  requireApproval: boolean;
  autoSend: boolean;
  introPrompt: string;
  lastRunAt?: string;
  nextRunAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'subscriber' | 'campaign' | 'article' | 'newsletter' | 'automation' | 'oauth';
  entityId?: string;
  adminEmail: string;
  details: string;
  timestamp: string;
}

export interface DatabaseSchema {
  subscribers: Subscriber[];
  segments: Segment[];
  campaigns: Campaign[];
  templates: EmailTemplate[];
  articles: BlogArticle[];
  newsletters: Newsletter[];
  automations: AutomationRule[];
  auditLogs: AuditLog[];
  meta: {
    version: string;
    organizationName: string;
    senderName: string;
    senderEmail: string;
  };
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'healthpulse_db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialData(): DatabaseSchema {
  return {
    meta: {
      version: '1.0.0',
      organizationName: 'HealthPulse Education & Career Network',
      senderName: 'HealthPulse Editorial Team',
      senderEmail: 'editorial@healthpulse.org',
    },
    segments: [
      { id: 'all', name: 'All Confirmed Subscribers', description: 'Every active consented recipient', criteria: { status: 'subscribed' } },
      { id: 'nurses', name: 'Registered Nurses & Nurse Practitioners', description: 'Bedside, ICU, and clinical nurse specialists', criteria: { profession: 'Registered Nurse', status: 'subscribed' } },
      { id: 'physicians', name: 'Doctors & Clinical Leads', description: 'Medical officers, residents, and department leads', criteria: { profession: 'Resident Physician', status: 'subscribed' } },
      { id: 'managers', name: 'Hospital Directors & Nurse Managers', description: 'Executives, staffing coordinators, and hospital leadership', criteria: { profession: 'Hospital Manager', status: 'subscribed' } },
      { id: 'students', name: 'Nursing & Medical Students', description: 'Undergraduate, postgraduate, and NCLEX candidates', criteria: { profession: 'Nursing Student', status: 'subscribed' } },
      { id: 'recruiters', name: 'Healthcare Recruiters & HR', description: 'Talent acquisition and staffing specialists', criteria: { profession: 'Medical Recruiter', status: 'subscribed' } },
      { id: 'training', name: 'Continuing Education Participants', description: 'Attending CME, BLS/ACLS, and specialized workshops', criteria: { profession: 'Training Participant', status: 'subscribed' } },
    ],
    subscribers: [
      {
        id: 'sub_001',
        email: 'chidinma.okafor@lagoshealth.org',
        fullName: 'Dr. Chidinma Okafor',
        organization: 'Lagos University Teaching Hospital',
        profession: 'Clinical Director',
        country: 'Nigeria',
        tags: ['leadership', 'cardiology', 'cme-certified'],
        subscriptionSource: 'website_optin',
        consentStatus: 'subscribed',
        consentTimestamp: '2026-08-10T09:30:00Z',
        dateSubscribed: '2026-08-10T09:30:00Z',
        lastInteraction: '2026-10-12T14:15:00Z',
        notes: 'Requested advanced critical care modules'
      },
      {
        id: 'sub_002',
        email: 'grace.adeyemi@nhs.net',
        fullName: 'Grace Adeyemi, RN',
        organization: 'Manchester Royal Infirmary',
        profession: 'Registered Nurse',
        country: 'United Kingdom',
        tags: ['intensive-care', 'osce-prep', 'recruitment-active'],
        subscriptionSource: 'csv_import',
        consentStatus: 'subscribed',
        consentTimestamp: '2026-07-15T11:20:00Z',
        dateSubscribed: '2026-07-15T11:20:00Z',
        lastInteraction: '2026-10-14T08:00:00Z',
        notes: 'Candidate for senior nurse coordinator role'
      },
      {
        id: 'sub_003',
        email: 'emmanuel.boateng@korlebu.gov.gh',
        fullName: 'Emmanuel Boateng',
        organization: 'Korle-Bu Teaching Hospital',
        profession: 'Hospital Manager',
        country: 'Ghana',
        tags: ['hospital-ops', 'staffing', 'training-sponsor'],
        subscriptionSource: 'manual',
        consentStatus: 'subscribed',
        consentTimestamp: '2026-06-01T15:00:00Z',
        dateSubscribed: '2026-06-01T15:00:00Z',
        lastInteraction: '2026-09-28T16:45:00Z',
        notes: 'Oversees 240 ward nurses'
      },
      {
        id: 'sub_004',
        email: 'fatima.d@covenanthealth.ca',
        fullName: 'Fatima Al-Mansoor, BScN',
        organization: 'Alberta Health Services',
        profession: 'Registered Nurse',
        country: 'Canada',
        tags: ['pediatrics', 'mentor', 'weekly-digest'],
        subscriptionSource: 'website_optin',
        consentStatus: 'subscribed',
        consentTimestamp: '2026-09-02T10:15:00Z',
        dateSubscribed: '2026-09-02T10:15:00Z',
        lastInteraction: '2026-10-10T12:00:00Z',
        notes: 'Active participant in clinical mentoring circles'
      },
      {
        id: 'sub_005',
        email: 'samuel.mensah@stnicholas.org',
        fullName: 'Dr. Samuel Mensah',
        organization: 'St. Nicholas Hospital',
        profession: 'Resident Physician',
        country: 'Nigeria',
        tags: ['internal-medicine', 'cme-certified'],
        subscriptionSource: 'event_registration',
        consentStatus: 'subscribed',
        consentTimestamp: '2026-05-18T14:40:00Z',
        dateSubscribed: '2026-05-18T14:40:00Z',
        lastInteraction: '2026-10-05T09:10:00Z',
        notes: 'Interested in clinical AI decision support webinars'
      },
      {
        id: 'sub_006',
        email: 'blessing.n@unilag.edu.ng',
        fullName: 'Blessing Nnamdi',
        organization: 'University of Lagos Nursing Faculty',
        profession: 'Nursing Student',
        country: 'Nigeria',
        tags: ['nclex-prep', 'student-ambassador', 'career-starter'],
        subscriptionSource: 'website_optin',
        consentStatus: 'subscribed',
        consentTimestamp: '2026-09-20T17:10:00Z',
        dateSubscribed: '2026-09-20T17:10:00Z',
        notes: 'Final year BSc Nursing student'
      },
      {
        id: 'sub_007',
        email: 'recruitment@medstaffglobal.co.uk',
        fullName: 'Marcus Vance',
        organization: 'MedStaff Global Talent',
        profession: 'Medical Recruiter',
        country: 'United Kingdom',
        tags: ['recruiter-partner', 'uk-relocation'],
        subscriptionSource: 'manual',
        consentStatus: 'subscribed',
        consentTimestamp: '2026-08-01T12:00:00Z',
        dateSubscribed: '2026-08-01T12:00:00Z',
        lastInteraction: '2026-10-13T11:20:00Z',
        notes: 'Hiring partner for NHS Trust international nurse intakes'
      },
      {
        id: 'sub_008',
        email: 'unsubscribed.contact@test.com',
        fullName: 'Former Participant',
        organization: 'Retired Practice',
        profession: 'General Healthcare',
        country: 'United States',
        tags: ['inactive'],
        subscriptionSource: 'website_optin',
        consentStatus: 'unsubscribed',
        consentTimestamp: '2026-04-10T10:00:00Z',
        dateSubscribed: '2026-04-10T10:00:00Z',
        notes: 'Opted out via unsubscribe link on 2026-07-01'
      }
    ],
    articles: [
      {
        id: 'art_001',
        title: 'Modern Emergency Triage: Integrating Digital Assessment Tools in Busy Clinical Units',
        slug: 'modern-emergency-triage-integrating-digital-tools',
        excerpt: 'How acute triage protocols combined with structured digital decision prompts reduce wait-to-intervention times and mitigate clinical burnout.',
        content: `<h2>The Evolution of Acute Patient Intake</h2>
<p>In high-volume emergency and acute receiving wards, triage accuracy dictates patient survival. Traditional five-level triage systems like the Emergency Severity Index (ESI) and Manchester Triage System rely heavily on rapid bedside nursing evaluation.</p>
<p>Recent multicenter clinical reviews demonstrate that when standardized digital prompts assist triage nurses—without overriding clinical intuition—recognition of early septic shock and silent hypoxia improves by over 28% within the critical first 30 minutes.</p>
<h2>Key Takeaways for Nurse Educators</h2>
<ul>
  <li><strong>Cognitive Load Reduction:</strong> Standardized symptom clusters streamline documentation during rapid patient intake.</li>
  <li><strong>Vital Sign Delta Tracking:</strong> Highlighting rate-of-change rather than static threshold flags impending decompensation earlier.</li>
  <li><strong>Empowering Escalation:</strong> Transparent multidisciplinary criteria enable triage nurses to fast-track immediate resuscitation rooms.</li>
</ul>
<h2>Implementation in Continuing Professional Development</h2>
<p>Ward managers and clinical nurse specialists are encouraged to run monthly simulation scenarios integrating these rapid assessment algorithms to maintain diagnostic agility across shift rotations.</p>`,
        category: 'Clinical Practice',
        tags: ['triage', 'emergency-nursing', 'clinical-skills', 'patient-safety'],
        authorName: 'Dr. Chidinma Okafor',
        authorRole: 'Clinical Director & Lead Medical Educator',
        featuredImage: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80',
        status: 'published',
        seoTitle: 'Modern Emergency Triage: Digital Tools for Clinical Units | HealthPulse',
        metaDescription: 'A clinical guide for emergency nurses and clinical educators on modern acute triage workflows and digital decision support.',
        canonicalUrl: 'https://healthpulse.org/blog/modern-emergency-triage-integrating-digital-tools',
        viewsCount: 1420,
        readingTimeMinutes: 4,
        publishedAt: '2026-10-08T09:00:00Z',
        createdAt: '2026-10-06T14:00:00Z',
        updatedAt: '2026-10-08T09:00:00Z',
        revisionsCount: 2
      },
      {
        id: 'art_002',
        title: 'Navigating International Nursing Licensure: 2026 Pathway for UK, Canada, and Australia',
        slug: 'navigating-international-nursing-licensure-2026-guide',
        excerpt: 'A comprehensive roadmap for internationally qualified nurses (IQNs) transitioning credentials, clearing CBT/OSCE, and securing sponsorship.',
        content: `<h2>The Global Healthcare Workforce Landscape</h2>
<p>International nurse recruitment has entered an era of streamlined qualification verification. With regulatory bodies harmonizing competence standards, nurses transitioning across borders now face clearer documentation pipelines, though rigorous clinical assessments remain central.</p>
<h2>Core Requirements by Destination</h2>
<h3>United Kingdom (NMC Pathway)</h3>
<p>The UK Nursing and Midwifery Council (NMC) requires passing the Test of Competence (ToC), comprising the Part 1 Computer Based Test (CBT) and Part 2 Objective Structured Clinical Examination (OSCE). Structured prep courses focused on evidence-based communication and aseptic technique consistently yield first-attempt pass rates exceeding 92%.</p>
<h3>Canada (NNAS & Regulatory Bodies)</h3>
<p>The National Nursing Assessment Service (NNAS) has accelerated primary source credential verification. Many provincial colleges now offer expedited bridging pathways for experienced bedside clinicians.</p>
<h2>Essential Preparation Checklist</h2>
<ul>
  <li>Secure certified transcript verification early.</li>
  <li>Practice OSCE scenarios with high-fidelity mannequins focusing on time-managed drug calculations.</li>
  <li>Familiarize yourself with localized documentation standards and patient advocacy laws.</li>
</ul>`,
        category: 'Recruitment & Career',
        tags: ['nursing-careers', 'nmc-osce', 'global-health', 'recruitment'],
        authorName: 'Grace Adeyemi, RN',
        authorRole: 'Senior Nurse Educator & International Career Mentor',
        featuredImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
        status: 'published',
        seoTitle: '2026 International Nursing Licensure Guide | HealthPulse',
        metaDescription: 'Clear, step-by-step guidance for overseas nurses preparing for UK NMC OSCE, Canadian registration, and hospital sponsorship.',
        canonicalUrl: 'https://healthpulse.org/blog/navigating-international-nursing-licensure-2026-guide',
        viewsCount: 2890,
        readingTimeMinutes: 6,
        publishedAt: '2026-10-11T10:30:00Z',
        createdAt: '2026-10-09T11:00:00Z',
        updatedAt: '2026-10-11T10:30:00Z',
        revisionsCount: 3
      },
      {
        id: 'art_003',
        title: 'Mentorship in Ward Leadership: Building Resilience in Newly Qualified Nurses',
        slug: 'mentorship-in-ward-leadership-resilience-new-nurses',
        excerpt: 'Evidence-based strategies for nurse managers to establish effective preceptorship models that curb transition shock and retain healthcare talent.',
        content: `<h2>Understanding Preceptor Impact</h2>
<p>The transition from university student to autonomous bedside practitioner represents the highest-risk period for voluntary attrition in nursing. Without dedicated clinical mentorship, new graduates report significant imposter phenomenon and acute moral distress.</p>
<p>Structured preceptorships spanning the first 6 months of employment have been proven to reduce 12-month turnover from 31% to under 8% in tertiary acute facilities.</p>
<h2>Actionable Strategies for Charge Nurses</h2>
<ul>
  <li><strong>Scheduled Non-Clinical Debriefs:</strong> Provide bi-weekly safe harbor discussions away from active ward alarms.</li>
  <li><strong>Graduated Clinical Acuity:</strong> Gradually increment complex patient ratios to build foundational confidence.</li>
  <li><strong>Constructive Reflective Practice:</strong> Encourage incident-neutral debriefing to normalize continuous clinical learning.</li>
</ul>`,
        category: 'Healthcare Leadership',
        tags: ['mentorship', 'nurse-retention', 'leadership', 'preceptorship'],
        authorName: 'Emmanuel Boateng',
        authorRole: 'Healthcare Operations & Workforce Director',
        featuredImage: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80',
        status: 'published',
        seoTitle: 'Mentorship in Ward Leadership: Retaining New Nurses | HealthPulse',
        metaDescription: 'How healthcare managers can implement structured preceptor programs that reduce attrition and foster clinical excellence.',
        canonicalUrl: 'https://healthpulse.org/blog/mentorship-in-ward-leadership-resilience-new-nurses',
        viewsCount: 980,
        readingTimeMinutes: 5,
        publishedAt: '2026-10-13T08:15:00Z',
        createdAt: '2026-10-12T16:00:00Z',
        updatedAt: '2026-10-13T08:15:00Z',
        revisionsCount: 1
      }
    ],
    templates: [
      {
        id: 'tpl_weekly_roundup',
        name: 'Weekly Healthcare Clinical Digest',
        category: 'Newsletter',
        description: 'Clean multi-article newsletter format with branded header, curated summaries, and call to action.',
        subject: 'HealthPulse Clinical Briefing: Issue #{{edition}}',
        preheader: 'This week’s essential clinical guidelines, career updates, and continuing education.',
        htmlBody: `<div style="max-width: 600px; margin: 0 auto; font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #0f172a; padding: 28px 24px; text-align: center; border-bottom: 4px solid #06b6d4;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">HealthPulse Briefing</h1>
    <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">Healthcare Professional Education & Career Network</p>
  </div>
  <div style="padding: 28px 24px;">
    <p style="font-size: 16px; line-height: 1.6; color: #334155;">Hello {{first_name}},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #475569;">Here is your curated briefing of top clinical insights, professional training announcements, and career opportunities for this week.</p>
    
    <div style="margin: 24px 0; padding: 18px; background-color: #f8fafc; border-left: 4px solid #06b6d4; border-radius: 4px;">
      <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 18px;">{{headline_1}}</h3>
      <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: #475569;">{{summary_1}}</p>
      <a href="{{url_1}}" style="color: #0891b2; font-weight: 600; text-decoration: none; font-size: 14px;">Read Full Clinical Guide &rarr;</a>
    </div>

    <div style="margin: 24px 0; padding: 18px; background-color: #f8fafc; border-left: 4px solid #0891b2; border-radius: 4px;">
      <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 18px;">{{headline_2}}</h3>
      <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: #475569;">{{summary_2}}</p>
      <a href="{{url_2}}" style="color: #0891b2; font-weight: 600; text-decoration: none; font-size: 14px;">Explore Career Pathway &rarr;</a>
    </div>

    <div style="text-align: center; margin: 32px 0 16px 0;">
      <a href="https://healthpulse.org/courses" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 28px; font-weight: 600; text-decoration: none; border-radius: 6px; font-size: 14px;">Browse Continuing Education Modules</a>
    </div>
  </div>

  <div style="background-color: #f1f5f9; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
    <p style="margin: 0 0 8px 0;">You are receiving this email as a confirmed member of HealthPulse.</p>
    <p style="margin: 0;">Organization: {{organization}} | Profession: {{profession}}</p>
    <p style="margin: 12px 0 0 0;"><a href="{{unsubscribe_url}}" style="color: #64748b; text-decoration: underline;">Unsubscribe or update preferences</a></p>
  </div>
</div>`
      },
      {
        id: 'tpl_training_announcement',
        name: 'Clinical Workshop & CME Announcement',
        category: 'Training',
        description: 'Single-focus promotional email for training programs, webinars, and certification workshops.',
        subject: 'Upcoming Clinical Workshop: {{workshop_title}}',
        preheader: 'Earn verified CME credits. Reserve your seat before registration closes.',
        htmlBody: `<div style="max-width: 600px; margin: 0 auto; font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 4px solid #06b6d4;">
    <span style="background-color: #06b6d4; color: #0f172a; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px;">Accredited CME Course</span>
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{workshop_title}}</h1>
  </div>
  <div style="padding: 28px 24px;">
    <p style="font-size: 16px; color: #334155;">Dear {{first_name}},</p>
    <p style="font-size: 15px; line-height: 1.6; color: #475569;">Registration is now open for our upcoming intensive session designed specifically for {{profession}}s.</p>
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #1e3a8a;">Event Details:</p>
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #1e293b;">📅 <strong>Date:</strong> {{workshop_date}}</p>
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #1e293b;">⏱️ <strong>Format:</strong> Interactive Virtual Simulation & Live Q&A</p>
      <p style="margin: 0; font-size: 14px; color: #1e293b;">🎓 <strong>Accreditation:</strong> 3.5 Category 1 Contact Hours</p>
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{{registration_url}}" style="background-color: #0891b2; color: #ffffff; padding: 12px 30px; font-weight: 600; text-decoration: none; border-radius: 6px; font-size: 15px; display: inline-block;">Claim Your Seat &rarr;</a>
    </div>
  </div>
  <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b;">
    <p style="margin: 0;"><a href="{{unsubscribe_url}}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a> from training invitations.</p>
  </div>
</div>`
      },
      {
        id: 'tpl_career_spotlight',
        name: 'Healthcare Recruitment & Career Spotlight',
        category: 'Recruitment',
        description: 'Spotlight verified international and regional healthcare positions, sponsorship details, and salary bands.',
        subject: 'Featured Nursing & Medical Openings: {{location_summary}}',
        preheader: 'Verified hospital roles with visa sponsorship and relocation allowances.',
        htmlBody: `<div style="max-width: 600px; margin: 0 auto; font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 4px solid #f59e0b;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">HealthPulse Career Spotlight</h1>
    <p style="color: #cbd5e1; margin: 4px 0 0 0; font-size: 13px;">Verified Clinical Vacancies with Direct Employer Sponsorship</p>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 15px; color: #334155;">Hello {{first_name}},</p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">Our hospital partners in {{country}} and the UK are currently accepting applications for the following positions matched to your profile as a {{profession}}.</p>
    
    <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 16px;">Staff Nurse - Acute & Emergency Services</h3>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">NHS Trust / Manchester, UK &bull; Full-time &bull; Tier 2 Visa Provided</p>
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;">Band 5 starting salary £28,407 - £34,581 + overtime + relocation package.</p>
      <a href="https://healthpulse.org/careers/apply-1" style="color: #0891b2; font-weight: 600; font-size: 13px; text-decoration: none;">View Job Specifications & Eligibility &rarr;</a>
    </div>

    <div style="text-align: center; margin: 24px 0 8px 0;">
      <a href="https://healthpulse.org/careers" style="background-color: #0f172a; color: #ffffff; padding: 11px 24px; font-weight: 600; text-decoration: none; border-radius: 6px; font-size: 14px; display: inline-block;">View All 34 Verified Healthcare Openings</a>
    </div>
  </div>
  <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
    <p style="margin: 0;"><a href="{{unsubscribe_url}}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a> from career alerts.</p>
  </div>
</div>`
      }
    ],
    campaigns: [
      {
        id: 'camp_001',
        name: 'October Week 2 Clinical Roundup',
        subject: 'HealthPulse Clinical Briefing: Emergency Triage Protocols & 2026 Licensure Updates',
        preheader: 'Essential guidelines for acute care and international career pathways.',
        senderName: 'HealthPulse Editorial Team',
        senderEmail: 'editorial@healthpulse.org',
        replyTo: 'contact@healthpulse.org',
        htmlBody: '<p>Sample broadcast sent to subscribers</p>',
        plainText: 'Sample broadcast plain text',
        targetSegmentId: 'all',
        targetTags: ['weekly-digest'],
        status: 'sent',
        scheduledAt: '2026-10-12T08:00:00Z',
        sentAt: '2026-10-12T08:00:15Z',
        totalRecipients: 7,
        eligibleRecipients: 7,
        sentCount: 7,
        failedCount: 0,
        recipientLogs: [
          { email: 'chidinma.okafor@lagoshealth.org', fullName: 'Dr. Chidinma Okafor', status: 'sent', gmailMessageId: '18b1a29f8c1234a1', timestamp: '2026-10-12T08:00:02Z' },
          { email: 'grace.adeyemi@nhs.net', fullName: 'Grace Adeyemi, RN', status: 'sent', gmailMessageId: '18b1a29f8c1234a2', timestamp: '2026-10-12T08:00:04Z' },
          { email: 'emmanuel.boateng@korlebu.gov.gh', fullName: 'Emmanuel Boateng', status: 'sent', gmailMessageId: '18b1a29f8c1234a3', timestamp: '2026-10-12T08:00:06Z' },
          { email: 'fatima.d@covenanthealth.ca', fullName: 'Fatima Al-Mansoor, BScN', status: 'sent', gmailMessageId: '18b1a29f8c1234a4', timestamp: '2026-10-12T08:00:08Z' },
          { email: 'samuel.mensah@stnicholas.org', fullName: 'Dr. Samuel Mensah', status: 'sent', gmailMessageId: '18b1a29f8c1234a5', timestamp: '2026-10-12T08:00:10Z' },
          { email: 'blessing.n@unilag.edu.ng', fullName: 'Blessing Nnamdi', status: 'sent', gmailMessageId: '18b1a29f8c1234a6', timestamp: '2026-10-12T08:00:12Z' },
          { email: 'recruitment@medstaffglobal.co.uk', fullName: 'Marcus Vance', status: 'sent', gmailMessageId: '18b1a29f8c1234a7', timestamp: '2026-10-12T08:00:14Z' }
        ],
        createdAt: '2026-10-11T16:00:00Z',
        updatedAt: '2026-10-12T08:00:15Z'
      }
    ],
    newsletters: [
      {
        id: 'news_001',
        title: 'HealthPulse Weekly Clinical Digest #14',
        edition: 14,
        status: 'sent',
        introNote: 'Welcome to this week’s issue highlighting the latest in emergency triage algorithms and preceptor-led nurse retention programs.',
        articleIds: ['art_001', 'art_002', 'art_003'],
        htmlBody: '<p>Full newsletter content archive</p>',
        plainText: 'Full newsletter plain text',
        generatedBy: 'ai_automation',
        sentAt: '2026-10-12T08:00:15Z',
        campaignId: 'camp_001',
        createdAt: '2026-10-11T15:30:00Z'
      }
    ],
    automations: [
      {
        id: 'auto_001',
        name: 'Weekly Monday Morning Clinical Roundup',
        enabled: true,
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        timeOfDay: '08:00',
        timezone: 'UTC',
        targetSegmentId: 'all',
        categoryFilter: 'Clinical Practice',
        maxArticles: 3,
        requireApproval: true,
        autoSend: false,
        introPrompt: 'Focus on evidence-based nurse education, practical ward takeaways, and upcoming clinical skill workshops.',
        lastRunAt: '2026-10-12T08:00:00Z',
        nextRunAt: '2026-10-19T08:00:00Z',
        createdAt: '2026-09-01T10:00:00Z'
      },
      {
        id: 'auto_002',
        name: 'Bi-Weekly International Nurse Recruitment & Career Briefing',
        enabled: true,
        frequency: 'biweekly',
        dayOfWeek: 4, // Thursday
        timeOfDay: '10:00',
        timezone: 'UTC',
        targetSegmentId: 'nurses',
        categoryFilter: 'Recruitment & Career',
        maxArticles: 2,
        requireApproval: true,
        autoSend: false,
        introPrompt: 'Highlight licensure updates, CBT/OSCE schedules, and hospital interview days.',
        lastRunAt: '2026-10-08T10:00:00Z',
        nextRunAt: '2026-10-22T10:00:00Z',
        createdAt: '2026-09-05T12:00:00Z'
      }
    ],
    auditLogs: [
      {
        id: 'log_001',
        action: 'system_initialized',
        entityType: 'oauth',
        adminEmail: 'findnursesng@gmail.com',
        details: 'Platform initialized with Gmail OAuth integration & Gemini AI Studio',
        timestamp: '2026-10-15T02:25:26Z'
      },
      {
        id: 'log_002',
        action: 'campaign_dispatched',
        entityType: 'campaign',
        entityId: 'camp_001',
        adminEmail: 'findnursesng@gmail.com',
        details: 'Dispatched October Week 2 Clinical Roundup to 7 eligible recipients via Gmail API',
        timestamp: '2026-10-12T08:00:15Z'
      }
    ]
  };
}

let dbCache: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  if (dbCache) return dbCache;
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    dbCache = initial;
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    dbCache = JSON.parse(raw);
    return dbCache!;
  } catch (err) {
    console.error('Error reading database, restoring initial:', err);
    const initial = getInitialData();
    dbCache = initial;
    return initial;
  }
}

export function saveDb(data: DatabaseSchema): void {
  ensureDataDir();
  dbCache = data;
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function logAudit(action: string, entityType: AuditLog['entityType'], details: string, adminEmail = 'admin@healthpulse.org', entityId?: string) {
  const db = getDb();
  const log: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    action,
    entityType,
    entityId,
    adminEmail,
    details,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDb(db);
  return log;
}
