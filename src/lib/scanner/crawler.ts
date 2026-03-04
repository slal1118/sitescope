import { normalizeLink, isSameOrigin } from '../security';
import { load } from 'cheerio';
import type { SecurityHeaders, BrokenLink } from '../types';

const FETCH_TIMEOUT_MS = 6000;
const MAX_PAGES = 300;
const MAX_CONTENT_SIZE = 5 * 1024 * 1024; // 5 MB

const SKIP_EXTENSIONS = /\.(pdf|zip|gz|tar|jpg|jpeg|png|gif|svg|webp|mp4|mp3|css|js|woff|woff2|ttf|eot|ico|json)(\?.*)?$/i;

export interface FetchedPage {
  url: string;
  html: string;
  statusCode: number;
  error?: string;
  responseHeaders?: Record<string, string>;
}

export interface CrawlResult {
  pages: FetchedPage[];
  securityHeaders: SecurityHeaders;
  brokenLinks: BrokenLink[];
}

export interface RobotsRule {
  path: string;
  allow: boolean;
}

export interface RobotsResult {
  allowed: boolean;
  rules: RobotsRule[];
  hasSitemap: boolean;
  sitemapUrls: string[];
  disallowed: string[]; // compat
}

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SiteScope-Bot/1.0 (+https://sitescope.app/bot)',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

function wildcardMatch(pattern: string, path: string): boolean {
  if (!pattern) return true;
  const anchorEnd = pattern.endsWith('$');
  const parts = pattern.replace(/\$$/, '').split('*');
  let pos = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const idx = path.indexOf(part, pos);
    if (idx === -1) return false;
    pos = idx + part.length;
  }
  return anchorEnd ? pos === path.length : true;
}

export async function fetchRobots(baseUrl: URL): Promise<RobotsResult> {
  const empty: RobotsResult = { allowed: true, rules: [], disallowed: [], hasSitemap: false, sitemapUrls: [] };
  try {
    const res = await fetchWithTimeout(`${baseUrl.origin}/robots.txt`, 4000);
    if (!res.ok) return empty;
    const text = await res.text();
    const lines = text.split('\n').map((l) => l.trim());
    const rules: RobotsRule[] = [];
    const sitemapUrls: string[] = [];
    let active = false;

    for (const line of lines) {
      if (line.toLowerCase().startsWith('user-agent:')) {
        const agent = line.split(':')[1].trim();
        active = agent === '*' || agent.toLowerCase().includes('sitescope');
      }
      if (active && line.toLowerCase().startsWith('disallow:')) {
        const path = line.split(':')[1]?.trim();
        if (path !== undefined) rules.push({ path, allow: false });
      }
      if (active && line.toLowerCase().startsWith('allow:')) {
        const path = line.split(':')[1]?.trim();
        if (path) rules.push({ path, allow: true });
      }
      if (line.toLowerCase().startsWith('sitemap:')) {
        const su = line.split(':').slice(1).join(':').trim();
        if (su) sitemapUrls.push(su);
      }
    }

    rules.sort((a, b) => b.path.length - a.path.length);
    return { allowed: true, rules, disallowed: rules.filter((r) => !r.allow).map((r) => r.path), hasSitemap: sitemapUrls.length > 0, sitemapUrls };
  } catch {
    return empty;
  }
}

function isRobotsAllowed(path: string, rules: RobotsRule[]): boolean {
  for (const rule of rules) {
    if (wildcardMatch(rule.path, path)) return rule.allow;
  }
  return true;
}

export async function parseSitemapUrls(baseUrl: URL, sitemapUrls: string[]): Promise<string[]> {
  const urls: string[] = [];
  const tried = new Set<string>();
  for (const sitemapUrl of sitemapUrls.slice(0, 3)) {
    if (tried.has(sitemapUrl)) continue;
    tried.add(sitemapUrl);
    try {
      const res = await fetchWithTimeout(sitemapUrl, 5000);
      if (!res.ok) continue;
      const xml = await res.text();
      const $ = load(xml, { xmlMode: true });
      const subSitemaps: string[] = [];
      $('sitemapindex sitemap loc').each((_, el) => { subSitemaps.push($(el).text().trim()); });
      if (subSitemaps.length > 0) {
        const subUrls = await parseSitemapUrls(baseUrl, subSitemaps.slice(0, 2));
        urls.push(...subUrls);
        continue;
      }
      $('urlset url loc').each((_, el) => {
        const loc = $(el).text().trim();
        if (loc && isSameOrigin(baseUrl, loc)) urls.push(loc);
      });
    } catch { /* continue */ }
  }
  return [...new Set(urls)].slice(0, 50);
}

export async function checkSitemap(baseUrl: URL): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${baseUrl.origin}/sitemap.xml`, 4000);
    return res.ok;
  } catch { return false; }
}

async function fetchPage(url: string, captureHeaders = false): Promise<FetchedPage> {
  try {
    const res = await fetchWithTimeout(url);
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return { url, html: '', statusCode: res.status, error: 'Not HTML' };
    const contentLength = parseInt(res.headers.get('content-length') ?? '0', 10);
    if (contentLength > MAX_CONTENT_SIZE) return { url, html: '', statusCode: res.status, error: 'Page too large' };
    const html = await res.text();
    const responseHeaders: Record<string, string> = {};
    if (captureHeaders) {
      res.headers.forEach((value, key) => { responseHeaders[key.toLowerCase()] = value; });
    }
    return { url, html, statusCode: res.status, responseHeaders: captureHeaders ? responseHeaders : undefined };
  } catch (err) {
    return { url, html: '', statusCode: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function checkLinkStatus(url: string): Promise<number> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'SiteScope-Bot/1.0 (+https://sitescope.app/bot)' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    return res.status;
  } catch {
    return 0;
  }
}

function extractSecurityHeaders(headers: Record<string, string>, isHttps: boolean): SecurityHeaders {
  return {
    https: isHttps,
    hsts: 'strict-transport-security' in headers,
    csp: 'content-security-policy' in headers,
    xFrameOptions: headers['x-frame-options'] ?? null,
    xContentTypeOptions: headers['x-content-type-options'] === 'nosniff',
    referrerPolicy: headers['referrer-policy'] ?? null,
  };
}

function extractLinks($: ReturnType<typeof load>, baseUrl: URL): string[] {
  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const normalized = normalizeLink(baseUrl, href);
    if (normalized && isSameOrigin(baseUrl, normalized)) links.push(normalized);
  });
  return links;
}

function prioritizeLinks(links: string[], baseUrl: URL, sitemapSet: Set<string>): string[] {
  const scored = links.map((link) => {
    const path = new URL(link).pathname;
    const segments = path.split('/').filter(Boolean).length;
    const hasKeyword = /\b(pricing|product|features|about|contact|blog|solution|service|how|why|start|get)\b/i.test(path);
    const inSitemap = sitemapSet.has(link) ? -5 : 0;
    return { link, score: inSitemap + (hasKeyword ? 0 : 10) + segments };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.link);
}

export async function crawlSite(
  baseUrl: URL,
  robots: RobotsResult,
  onProgress?: (msg: string, count: number) => void,
  sitemapPageUrls?: string[]
): Promise<CrawlResult> {
  const sitemapSet = new Set(sitemapPageUrls ?? []);
  const visited = new Set<string>();
  const queue: string[] = [baseUrl.href];
  const allFoundLinks = new Map<string, string>(); // link → foundOn page

  const defaultSecHeaders: SecurityHeaders = {
    https: baseUrl.protocol === 'https:',
    hsts: false, csp: false, xFrameOptions: null,
    xContentTypeOptions: false, referrerPolicy: null,
  };

  if (sitemapPageUrls && sitemapPageUrls.length > 0) {
    const highValue = sitemapPageUrls
      .filter((u) => u !== baseUrl.href && isSameOrigin(baseUrl, u))
      .filter((u) => /\/(pricing|features?|about|contact|product|solution|service|plans?)\b/i.test(new URL(u).pathname))
      .slice(0, 8);
    queue.push(...highValue);
  }

  const results: FetchedPage[] = [];
  let securityHeaders = defaultSecHeaders;
  let homepageHeadersCaptured = false;

  while (queue.length > 0 && results.length < MAX_PAGES) {
    const isFirstBatch = results.length === 0;
    const batch = queue.splice(0, 4);
    const fetches = batch
      .filter((url) => {
        if (visited.has(url)) return false;
        if (SKIP_EXTENSIONS.test(new URL(url).pathname)) return false;
        if (!isRobotsAllowed(new URL(url).pathname, robots.rules)) return false;
        visited.add(url);
        return true;
      })
      .map((url, idx) => fetchPage(url, isFirstBatch && idx === 0 && !homepageHeadersCaptured));

    const pages = await Promise.all(fetches);

    for (const page of pages) {
      if (page.html && !page.error) {
        results.push(page);
        onProgress?.(`Crawled ${results.length} pages...`, results.length);
        const $ = load(page.html);
        const links = extractLinks($, baseUrl);
        // Track all internal links found and where they were found
        for (const link of links) {
          if (!allFoundLinks.has(link)) allFoundLinks.set(link, page.url);
        }
        const prioritized = prioritizeLinks(links.filter((l) => !visited.has(l)), baseUrl, sitemapSet);
        queue.push(...prioritized.slice(0, 6));

        // Capture security headers from homepage
        if (!homepageHeadersCaptured && page.responseHeaders) {
          securityHeaders = extractSecurityHeaders(page.responseHeaders, baseUrl.protocol === 'https:');
          homepageHeadersCaptured = true;
        }
      }
    }
  }

  // Check unvisited internal links for broken links (max 20, skip common skip extensions)
  const unvisited = [...allFoundLinks.entries()]
    .filter(([url]) => !visited.has(url) && !SKIP_EXTENSIONS.test(new URL(url).pathname))
    .slice(0, 20);

  const brokenLinks: BrokenLink[] = [];
  if (unvisited.length > 0) {
    const checks = await Promise.all(
      unvisited.map(async ([url, foundOn]) => {
        const status = await checkLinkStatus(url);
        return { url, foundOn, statusCode: status };
      })
    );
    for (const { url, foundOn, statusCode } of checks) {
      if (statusCode === 404 || statusCode === 410 || statusCode === 0) {
        brokenLinks.push({ url, foundOn, statusCode });
      }
    }
  }

  return { pages: results, securityHeaders, brokenLinks };
}

/**
 * Render a page via Browserless.io (managed Chromium) and return the full HTML.
 * Requires BROWSERLESS_API_KEY. Returns null if key absent or request fails.
 * Used as the primary SPA renderer — replaces raw HTML before extraction runs.
 */
export async function renderWithBrowserless(pageUrl: string): Promise<string | null> {
  const apiKey = process.env.BROWSERLESS_API_KEY;
  if (!apiKey) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(`https://chrome.browserless.io/content?token=${apiKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: pageUrl,
        gotoOptions: { waitUntil: 'networkidle2', timeout: 20000 },
        waitFor: 1500,
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    return html.length > 200 ? html : null;
  } catch {
    return null;
  }
}

/**
 * Fetch a URL via Jina Reader, which renders JS-heavy pages with a headless browser
 * and returns clean markdown. Free, no API key required.
 * Used as a fallback for SPA/JS-rendered sites when no Browserless key is set.
 */
export async function fetchJinaRendered(pageUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(`https://r.jina.ai/${pageUrl}`, {
      signal: controller.signal,
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'text',
        'User-Agent': 'SiteScope-Bot/1.0 (+https://sitescope.app/bot)',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 100 ? text : null;
  } catch {
    return null;
  }
}

export function detectJsRendered(pages: FetchedPage[]): boolean {
  if (pages.length === 0) return false;
  const home = pages[0];
  if (!home.html) return false;
  const $ = load(home.html);

  // Count meaningful body words — SSR/SSG frameworks like Next.js include full text,
  // so we use a tighter threshold to avoid false positives on well-hydrated pages.
  const bodyText = $('body').clone()
    .find('script,style,noscript').remove().end()
    .text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText.split(' ').filter((w) => w.length > 2).length;
  const scriptCount = $('script[src]').length;

  // Only flag as JS-rendered when body is nearly empty AND heavily scripted.
  // noscript > 2 is a strong signal (legacy SPAs often add noscript fallbacks).
  return (wordCount < 30 && scriptCount > 5) || ($('noscript').length > 2 && wordCount < 60);
}
