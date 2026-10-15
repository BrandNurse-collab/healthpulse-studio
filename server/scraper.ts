import http from 'http';
import https from 'https';
import { URL } from 'url';

export interface ExtractedArticle {
  title: string;
  author: string;
  publishedDate: string;
  content: string;
  sourceUrl: string;
  sourceDomain: string;
  wordCount: number;
}

// Disallow private IP ranges, loopback, and metadata endpoints (SSRF Defense)
function isDisallowedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower === 'metadata.google.internal' ||
    lower === '169.254.169.254' ||
    lower.endsWith('.internal') ||
    lower.endsWith('.local')
  ) {
    return true;
  }

  // IPv4 Private subnets
  const parts = lower.split('.').map(p => parseInt(p, 10));
  if (parts.length === 4 && parts.every(p => !isNaN(p))) {
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
  }

  return false;
}

export async function fetchAndExtractArticle(targetUrl: string): Promise<ExtractedArticle> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch (err) {
    throw new Error('Invalid URL format. Please provide a full HTTP or HTTPS URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsupported protocol. Only HTTP and HTTPS URLs are allowed.');
  }

  if (isDisallowedHost(parsed.hostname)) {
    throw new Error('Access to private or local network hosts is strictly prohibited.');
  }

  // Fetch with timeout and size limit
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HealthPulseNewsBot/1.0 (+https://healthpulse.org/bot)',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
      }
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`External website returned HTTP ${res.status}: ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new Error(`Unsupported content type: ${contentType}. Expected HTML or Text.`);
    }

    const html = await res.text();
    if (html.length > 5 * 1024 * 1024) {
      throw new Error('The target page is larger than the 5MB size limit.');
    }

    return extractContentFromHtml(html, parsed.toString(), parsed.hostname);
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Request to the external website timed out after 10 seconds.');
    }
    throw new Error(`Failed to retrieve article: ${err.message}`);
  }
}

function extractContentFromHtml(html: string, sourceUrl: string, hostname: string): ExtractedArticle {
  // Title extraction: check og:title, twitter:title, h1, then <title>
  let title = '';
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
  if (ogTitleMatch && ogTitleMatch[1]) {
    title = ogTitleMatch[1];
  } else {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(/\s*[-|–]\s*.*$/, '').trim();
    } else {
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      title = h1Match && h1Match[1] ? h1Match[1].trim() : 'External Article';
    }
  }

  // Author extraction
  let author = 'Editorial Contributor';
  const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/class=["'][^"']*author[^"']*["'][^>]*>([^<]+)<\//i);
  if (authorMatch && authorMatch[1]) {
    author = authorMatch[1].trim();
  }

  // Publication date
  let publishedDate = new Date().toISOString().split('T')[0];
  const dateMatch = html.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/<time[^>]*datetime=["']([^"']+)["']/i);
  if (dateMatch && dateMatch[1]) {
    publishedDate = dateMatch[1].split('T')[0];
  }

  // Clean HTML body
  // Strip head, scripts, styles, svg, nav, footer, header
  let cleaned = html
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Extract paragraphs
  const paragraphMatches = cleaned.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const textParagraphs: string[] = [];

  for (const p of paragraphMatches) {
    const rawText = p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
    if (rawText.length > 40 && !rawText.toLowerCase().includes('cookie') && !rawText.toLowerCase().includes('all rights reserved')) {
      textParagraphs.push(rawText);
    }
  }

  const content = textParagraphs.length > 0 ? textParagraphs.join('\n\n') : 'No readable article paragraphs found. Please paste the article text manually.';
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return {
    title: decodeHtmlEntities(title),
    author: decodeHtmlEntities(author),
    publishedDate,
    content,
    sourceUrl,
    sourceDomain: hostname,
    wordCount
  };
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
