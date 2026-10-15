import { GoogleGenAI } from '@google/genai';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI();
}

export function isAiConfigured(): boolean {
  return !!getAiClient();
}

export interface ContentGenerationInput {
  title?: string;
  topic?: string;
  audience: string;
  tone: string;
  length: 'short' | 'medium' | 'in_depth';
  keywords?: string[];
  sourceMaterial?: string;
  cta?: string;
  outputFormat: 'blog_article' | 'newsletter' | 'broadcast_email' | 'article_summary' | 'digest';
}

export interface GeneratedArticleResult {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  category: string;
  tags: string[];
  seoTitle: string;
  metaDescription: string;
  suggestedSubjectLines: string[];
  keyTakeaways: string[];
}

export interface RepurposedArticleResult {
  originalTitle: string;
  sourceAttribution: string;
  originalAuthor: string;
  keyInsights: string[];
  transformativeArticleHtml: string;
  suggestedTitle: string;
  slug: string;
  excerpt: string;
  newsletterSummaryHtml: string;
  subjectLineOptions: { subject: string; preheader: string; targetAngle: string }[];
  tags: string[];
}

export async function generateContentWithGemini(input: ContentGenerationInput): Promise<GeneratedArticleResult> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('Gemini API is not configured. Please ensure GEMINI_API_KEY is configured in your environment.');
  }

  const prompt = `You are a senior healthcare medical editor, clinical education specialist, and email newsletter strategist.
Your task is to write high-value, factually grounded healthcare content based on the following instructions.

TOPIC/TITLE: ${input.title || input.topic || 'Contemporary Clinical Excellence'}
TARGET AUDIENCE: ${input.audience} (e.g. Registered Nurses, Resident Physicians, Nurse Managers, Healthcare Students)
TONE: ${input.tone} (e.g. Authoritative & Clinical, Compassionate & Accessible, Educational, Professional)
TARGET LENGTH: ${input.length} (short: ~400 words, medium: ~800 words, in_depth: ~1400 words)
KEYWORDS: ${input.keywords?.join(', ') || 'None specified'}
CALL TO ACTION: ${input.cta || 'Encourage continuing education or feedback'}
SOURCE MATERIAL / REFERENCE NOTES:
${input.sourceMaterial ? input.sourceMaterial.slice(0, 8000) : 'None provided; create based on established medical and clinical knowledge.'}

STRICT GUIDELINES:
1. Do NOT invent fraudulent clinical trials, bogus citations, or fabricated statistics. Use authentic, generalizable clinical best practices.
2. Structure the body in clean semantic HTML with <h2>, <h3>, <p>, <ul>, <li>, and <strong> tags.
3. Provide a clear, actionable slug (kebab-case).
4. Provide an excerpt (120-160 characters).
5. Suggest 4 high-converting, non-spammy email subject lines.
6. Return your answer strictly as a valid JSON object matching the requested schema.

Output valid JSON only with this structure:
{
  "title": "Clear engaging title",
  "slug": "kebab-case-slug",
  "excerpt": "Concise summary for previews and social cards",
  "contentHtml": "<h2>...</h2><p>...</p>",
  "category": "Clinical Practice | Nursing Education | Recruitment & Career | Healthcare Leadership | Continuing Education",
  "tags": ["tag1", "tag2", "tag3"],
  "seoTitle": "SEO title under 60 characters",
  "metaDescription": "SEO meta description under 155 characters",
  "suggestedSubjectLines": ["Subject 1", "Subject 2", "Subject 3", "Subject 4"],
  "keyTakeaways": ["Point 1", "Point 2", "Point 3"]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.3
    }
  });

  const text = response.text || '{}';
  try {
    return JSON.parse(text) as GeneratedArticleResult;
  } catch (err) {
    // Fallback if parsing has quirks
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as GeneratedArticleResult;
  }
}

export async function repurposeExternalArticle(
  sourceUrl: string,
  sourceTitle: string,
  sourceAuthor: string,
  sourceText: string,
  audience = 'Healthcare Professionals and Nurses',
  tone = 'Evidence-Based & Engaging'
): Promise<RepurposedArticleResult> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('Gemini API is not configured. Please ensure GEMINI_API_KEY is configured in your environment.');
  }

  const prompt = `You are a medical journalist, clinical educator, and newsletter curator.
An administrator has provided an external healthcare or news article.
Your objective is to produce a TRANSFORMATIVE, ORIGINAL commentary and educational guide inspired by the core insights, with proper attribution to the source.

SOURCE DETAILS:
- Title: ${sourceTitle}
- Original Author: ${sourceAuthor}
- Source URL: ${sourceUrl}

SOURCE EXCERPT/TEXT:
${sourceText.slice(0, 9000)}

AUDIENCE: ${audience}
TONE: ${tone}

LEGAL & ETHICAL RULES:
1. Do NOT copy paragraphs verbatim or create a close paraphrase.
2. Produce an INDEPENDENT analysis: discuss implications for bedside nurses, clinical teams, or hospital management.
3. Clearly provide attribution: "Based on reporting and insights originally published by ${sourceAuthor || 'the source'} at ${sourceUrl}".
4. Generate a concise, ready-to-send newsletter summary module.
5. Suggest 4 email subject lines with preheaders and rationale.

Return strictly a valid JSON object matching:
{
  "originalTitle": "${sourceTitle}",
  "sourceAttribution": "Originally reported by ${sourceAuthor} (${sourceUrl})",
  "originalAuthor": "${sourceAuthor}",
  "keyInsights": ["Core finding 1", "Core finding 2", "Core finding 3"],
  "suggestedTitle": "Original transformed title for our platform",
  "slug": "original-transformed-slug",
  "excerpt": "Brief 1-2 sentence preview",
  "transformativeArticleHtml": "<h2>...</h2><p>...</p>",
  "newsletterSummaryHtml": "<p><strong>Clinical Spotlight:</strong> ...</p>",
  "subjectLineOptions": [
    { "subject": "Subject line text", "preheader": "Supporting preheader", "targetAngle": "Clinical update" }
  ],
  "tags": ["tag1", "tag2", "tag3"]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.35
    }
  });

  const text = response.text || '{}';
  try {
    return JSON.parse(text) as RepurposedArticleResult;
  } catch (err) {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as RepurposedArticleResult;
  }
}

export async function generateNewsletterDigest(
  articles: { title: string; excerpt: string; slug: string; category: string }[],
  introPrompt?: string,
  audience = 'All Healthcare Professionals'
): Promise<{
  title: string;
  subject: string;
  preheader: string;
  introNote: string;
  htmlBody: string;
}> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('Gemini API is not configured.');
  }

  const articlesSummary = articles
    .map((a, i) => `${i + 1}. [${a.category}] "${a.title}" - ${a.excerpt} (Slug: /blog/${a.slug})`)
    .join('\n');

  const prompt = `You are a chief newsletter editor for HealthPulse.
Generate a structured, engaging email newsletter digest combining the following curated articles:

ARTICLES:
${articlesSummary}

AUDIENCE: ${audience}
EDITORIAL EMPHASIS: ${introPrompt || 'Provide an upbeat, professional summary connecting these clinical stories into a cohesive weekly briefing.'}

GUIDELINES:
- Output a personalized newsletter HTML structure formatted for email clients (inline styled elements).
- Use placeholder {{first_name}} for personalization.
- Include {{unsubscribe_url}} in footer.
- Return strictly a valid JSON object:
{
  "title": "Edition Title (e.g. HealthPulse Clinical Briefing #15)",
  "subject": "Email Subject Line",
  "preheader": "Email preheader line",
  "introNote": "Warm 2-paragraph editor's note",
  "htmlBody": "<div style=\\"...\\">...</div>"
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.3
    }
  });

  const text = response.text || '{}';
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}
