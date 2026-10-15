# HealthPulse Studio - AI-Powered Email Marketing, Blog & Newsletter Automation Platform

HealthPulse Studio is a production-oriented platform built for healthcare organizations, medical educators, and clinical recruitment networks to manage consented subscriber lists, compose and broadcast email campaigns via the official Gmail API, publish clinical blog articles, and automatically generate newsletters from uploaded content or external articles.

---

## 🌟 Key Features

### 1. Subscriber Management & Audience Segmentation
- **Manual & CSV Import:** Add individual contacts or bulk import CSV records with automatic column header detection and duplicate filtering.
- **Healthcare Personas:** Built-in groups for Registered Nurses, Clinical Directors, Resident Physicians, Hospital Managers, Nursing Students, Medical Recruiters, and Training Participants.
- **Double Opt-In & Compliance:** Full consent timestamps, IP tracking, and statuses: `subscribed`, `pending`, `unsubscribed`, `bounced`, and `suppressed`.
- **Bulk Operations:** Unsubscribe, suppress, or delete subscriber batches in one click.
- **CSV Export:** Export authorized subscriber records with consent evidence.

### 2. Official Gmail API Integration
- **OAuth 2.0 & Firebase Auth:** Least-privilege permissions (`https://www.googleapis.com/auth/gmail.send`, `userinfo.email`, `userinfo.profile`) with in-memory token security.
- **Discreet Individual Sending:** Recipient privacy is strictly maintained—recipients never see other subscriber emails.
- **RFC 822 MIME Engine:** Automatic boundary creation, HTML and plain-text alternatives, sender name, custom reply-to, and `List-Unsubscribe: One-Click` headers.
- **Personalization Tokens:** `{{first_name}}`, `{{full_name}}`, `{{profession}}`, `{{organization}}`, `{{country}}`, and `{{unsubscribe_url}}`.
- **Live Test Sends & Delivery Logging:** Send instant preview tests to your inbox and view per-recipient delivery statuses and Gmail message IDs.
- **Safety Confirmations:** Explicit user confirmation dialog before any bulk dispatch is triggered.

### 3. AI Content Studio (Powered by Gemini 2.5 Flash)
- **Multi-Format Synthesis:** Create Blog Articles, Newsletters, Broadcast Emails, Executive Summaries, and Weekly Digests.
- **Document Text Extractor:** Upload TXT, Markdown, or report notes with real-time extracted preview.
- **Clinical Persona & Tone:** Configure target audience (bedside nurses, physicians, executives) and clinical tone.
- **Anti-Hallucination Discipline:** Strictly prevents fabricated clinical trials or bogus citations while structuring actionable evidence-based takeaways.
- **High-Converting Subject Lines:** Suggests 4 email subject lines and matching preheaders with expected engagement angles.

### 4. External Article Repurposing (SSRF Protected)
- **Secure Server-Side Scraping:** Validates public URLs, blocking loopback addresses, local subnets (10.x, 192.168.x, 172.16.x), and cloud metadata endpoints.
- **Transformative Commentary:** Generates original educational guides, executive takeaways, and newsletter summary modules with transparent attribution to the original source.

### 5. Blog CMS & Public Reader View
- **Article Manager:** Create, preview, schedule, publish, unpublish, and archive articles.
- **SEO & Social Optimization:** Title tags, meta descriptions, slugs, canonical URLs, categories, reading time, and view counts.
- **Public Blog Mode:** Clean reader experience with search, category filtering, and an inline newsletter opt-in form.

### 6. Automated Newsletter Engine & Background Worker
- **Multi-Article Curation:** Combine multiple published articles into an issue with AI-crafted editor notes.
- **Server-Side Scheduler:** Persistent worker running in Node.js evaluates due articles, automations, and recurring schedules without requiring an active browser tab.
- **Audit Logs:** Immutable activity trail tracking logins, broadcasts, publishing events, and subscriber mutations.

---

## 🚀 Setup & Execution

### Prerequisites
- Node.js 20+
- Google Workspace / Gmail account
- Gemini API key (`GEMINI_API_KEY`)

### Environment Variables
Configure your `.env` file based on `.env.example`:
```bash
GEMINI_API_KEY="your-google-ai-studio-api-key"
APP_URL="https://your-domain.run.app"
```

### Installation & Development
```bash
# Install dependencies
npm install

# Start Vite dev server with integrated API middleware & background scheduler
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```
