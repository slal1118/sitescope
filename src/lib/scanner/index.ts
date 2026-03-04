import { v4 as uuidv4 } from 'uuid';
import { validateAndNormalizeUrl } from '../security';
import { fetchRobots, checkSitemap, crawlSite, parseSitemapUrls, detectJsRendered, renderWithBrowserless, fetchJinaRendered } from './crawler';
import { extractPageMetrics, detectTechStack } from './extractor';
import { computeScores } from './scorer';
import { generateRecommendations } from './recommender';
import { generateAIInsights } from './ai';
import { fetchPageSpeedMetrics, estimatePerformance } from './performance';
import type { Report, SiteMetrics, ScanProgressEvent, SiteType, PerformanceMetrics } from '../types';

export type ProgressCallback = (event: ScanProgressEvent) => void;

function detectSiteType(metrics: Omit<SiteMetrics, 'siteType' | 'performance' | 'isJsRendered'>): SiteType {
  const tech = metrics.techStack;
  if (tech.cms.includes('Shopify')) return 'ecommerce';
  if (tech.cms.includes('WordPress') || tech.cms.includes('Ghost') || metrics.hasBlogPage) return 'blog';
  if (metrics.hasPricingPage && (tech.frameworks.length > 0 || tech.cms.includes('Webflow') || tech.cms.includes('HubSpot'))) return 'saas';
  if (metrics.hasPricingPage) return 'saas';
  if (tech.cms.length === 0 && tech.frameworks.length === 0 && metrics.pagesCount < 5) return 'portfolio';
  return 'unknown';
}

export async function runScan(
  rawUrl: string,
  onProgress?: ProgressCallback,
  expiresIn: '24h' | '7d' | '30d' | 'never' = '7d'
): Promise<Report> {
  const t0 = Date.now();
  const emit = (event: ScanProgressEvent) => onProgress?.(event);

  // 1. Validate
  emit({ stage: 'validating', message: 'Validating URL…' });
  const validation = validateAndNormalizeUrl(rawUrl);
  if (!validation.valid || !validation.url) {
    throw new Error(validation.error ?? 'Invalid URL');
  }
  const baseUrl = validation.url;
  const domain = baseUrl.hostname.replace('www.', '');

  // 2. Robots
  emit({ stage: 'robots', message: 'Checking robots.txt…' });
  const robots = await fetchRobots(baseUrl);

  // 3. Sitemap
  emit({ stage: 'sitemap', message: 'Parsing sitemap…' });
  let sitemapPageUrls: string[] = [];
  const sitemapUrlsList = robots.sitemapUrls.length > 0
    ? robots.sitemapUrls
    : (await checkSitemap(baseUrl)) ? [`${baseUrl.origin}/sitemap.xml`] : [];
  const hasSitemap = sitemapUrlsList.length > 0;
  if (hasSitemap) {
    sitemapPageUrls = await parseSitemapUrls(baseUrl, sitemapUrlsList);
  }

  // 4. Crawl
  emit({ stage: 'crawling', message: 'Crawling pages…', pagesFound: 0 });
  const crawlResult = await crawlSite(baseUrl, robots, (msg, count) => {
    emit({ stage: 'crawling', message: msg, pagesFound: count });
  }, sitemapPageUrls);
  const crawledRaw = crawlResult.pages;

  // 5. JS-rendering detection + pre-extraction enrichment
  const isJsRendered = detectJsRendered(crawledRaw);
  let browserlessEnriched = false;

  if (isJsRendered) {
    if (process.env.BROWSERLESS_API_KEY) {
      emit({ stage: 'extracting', message: 'JS-rendered site — fetching via Browserless…' });
      const renderedHtml = await renderWithBrowserless(baseUrl.href);
      if (renderedHtml) {
        // Replace raw HTML before extraction so ALL signals (CTAs, links, images, keywords) are real
        crawledRaw[0] = { ...crawledRaw[0], html: renderedHtml };
        browserlessEnriched = true;
      }
    }
  }

  // 6. Extract
  emit({ stage: 'extracting', message: 'Extracting page data…' });
  const allPageMetrics = crawledRaw.map((p) => extractPageMetrics(p, baseUrl));
  const homePage = allPageMetrics[0];

  if (!homePage) {
    throw new Error('Failed to crawl the homepage. The site may be blocking bots or is unreachable.');
  }

  const techStack = detectTechStack(allPageMetrics, crawledRaw.map((p) => p.html));
  const allUrls = allPageMetrics.map((p) => p.url.toLowerCase());
  const hasPricingPage = allUrls.some((u) => /\/(pricing|plans?|packages?|cost)\b/i.test(u));
  const hasContactPage = allUrls.some((u) => /\/(contact|reach-us|get-in-touch|support)\b/i.test(u));
  const hasBlogPage = allUrls.some((u) => /\/(blog|news|articles?|insights?|resources?)\b/i.test(u));
  const hasAboutPage = allUrls.some((u) => /\/(about|team|company|our-story|who-we-are|founders?)\b/i.test(u));
  const hasCaseStudiesPage = allUrls.some((u) => /\/(case-stud|success|customers?|clients?|portfolio)\b/i.test(u));
  const hasNewsletterCapture = allPageMetrics.some(p => p.hasNewsletterSignup ?? false);
  // Aggregate social links from all pages (deduplicated)
  const socialLinks = [...new Set(allPageMetrics.flatMap(p => p.socialLinks ?? []))];

  // ── Deep analysis: orphan pages ───────────────────────────────────────────
  // Build a set of all URLs that are linked to from any page
  const linkedUrls = new Set(allPageMetrics.flatMap(p => p.internalLinks));
  // Orphan = crawled page that nobody links to (excluding homepage which is always linked)
  const orphanPages = allPageMetrics
    .slice(1) // skip homepage
    .filter(p => !linkedUrls.has(p.url) && !linkedUrls.has(p.url.replace(/\/$/, '')))
    .map(p => p.url);

  // ── Deep analysis: average readability ────────────────────────────────────
  const pagesWithReadability = allPageMetrics.filter(p => p.readabilityScore !== undefined);
  const avgReadabilityScore = pagesWithReadability.length > 0
    ? Math.round(pagesWithReadability.reduce((s, p) => s + (p.readabilityScore ?? 0), 0) / pagesWithReadability.length)
    : undefined;

  // ── Deep analysis: image optimization score ───────────────────────────────
  const totalImages = allPageMetrics.reduce((s, p) => s + (p.imageFormats?.total ?? 0), 0);
  const modernImages = allPageMetrics.reduce((s, p) => s + (p.imageFormats?.webp ?? 0) + (p.imageFormats?.avif ?? 0), 0);
  const imageOptimizationScore = totalImages > 0 ? Math.round((modernImages / totalImages) * 100) : undefined;

  // ── Deep analysis: site-wide keyword aggregation ──────────────────────────
  const siteKeywordMap = new Map<string, number>();
  for (const p of allPageMetrics) {
    for (const kw of p.topKeywords ?? []) {
      siteKeywordMap.set(kw.word, (siteKeywordMap.get(kw.word) ?? 0) + kw.count);
    }
  }
  const siteKeywords = [...siteKeywordMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, count]) => ({ word, count }));

  // ── Deep analysis: contact page has actual info ───────────────────────────
  const contactPage = allPageMetrics.find(p => /\/(contact|reach-us|get-in-touch|support)\b/i.test(p.url));
  const contactPageHasInfo = contactPage
    ? (contactPage.contactInfo?.hasEmail || contactPage.contactInfo?.hasPhone) ?? false
    : false;
  // ── Jina Reader enrichment — only when Browserless didn't already replace HTML ──
  // Recovers word count, headings, and title from markdown when full HTML wasn't fetched.
  let jinaEnriched = false;
  if (isJsRendered && !browserlessEnriched) {
    emit({ stage: 'extracting', message: 'JS-rendered site — fetching content via reader…' });
    const jinaText = await fetchJinaRendered(baseUrl.href);
    if (jinaText && jinaText.length > 200) {
      // Title from "Title: ..." header line
      const titleMatch = jinaText.match(/^Title:\s*(.+)$/m);
      if (titleMatch && !homePage.title) {
        homePage.title = titleMatch[1].trim();
      }

      // Clean markdown to plain text for word count
      const cleanText = jinaText
        .replace(/^(Title|URL Source|Published Time|Description):.+$/mg, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/#{1,6}\s+/g, '')
        .replace(/[*_`~>|]+/g, '');
      const renderedWords = cleanText.split(/\s+/).filter(w => w.length > 2).length;
      if (renderedWords > homePage.wordCount) homePage.wordCount = renderedWords;

      // H1 from first # heading
      const h1Match = jinaText.match(/^#\s+(.+)$/m);
      if (h1Match && homePage.h1.length === 0) homePage.h1 = [h1Match[1].trim()];

      // H2s from ## headings
      if (homePage.h2.length === 0) {
        const h2Matches = [...jinaText.matchAll(/^##\s+(.+)$/mg)];
        if (h2Matches.length > 0) homePage.h2 = h2Matches.map(m => m[1].trim()).slice(0, 10);
      }

      jinaEnriched = true;
    }
  }

  // Compute duplicate titles and meta descriptions
  const titleGroups = new Map<string, number>();
  const metaGroups = new Map<string, number>();
  for (const p of allPageMetrics) {
    if (p.title) { const k = p.title.toLowerCase().trim(); titleGroups.set(k, (titleGroups.get(k) ?? 0) + 1); }
    if (p.metaDescription) { const k = p.metaDescription.toLowerCase().trim(); metaGroups.set(k, (metaGroups.get(k) ?? 0) + 1); }
  }
  const duplicateTitles = [...titleGroups.entries()].filter(([, c]) => c > 1).map(([t]) => t);
  const duplicateMetas = [...metaGroups.entries()].filter(([, c]) => c > 1).map(([t]) => t);

  const baseMetrics = {
    crawledPages: allPageMetrics,
    pagesCount: allPageMetrics.length,
    hasSitemap,
    hasRobotsTxt: robots.rules.length > 0 || robots.sitemapUrls.length > 0,
    robotsAllowed: robots.allowed,
    hasPricingPage,
    hasContactPage,
    hasBlogPage,
    totalImages: allPageMetrics.reduce((s, p) => s + p.imageCount, 0),
    totalScripts: allPageMetrics.reduce((s, p) => s + p.scriptSrcs.length, 0),
    totalWords: allPageMetrics.reduce((s, p) => s + p.wordCount, 0),
    uniqueInternalLinks: new Set(allPageMetrics.flatMap((p) => p.internalLinks)).size,
    techStack,
    crawlDurationMs: Date.now() - t0,
    securityHeaders: crawlResult.securityHeaders,
    brokenLinks: crawlResult.brokenLinks,
    duplicateTitles,
    duplicateMetas,
    hasAboutPage,
    hasCaseStudiesPage,
    hasNewsletterCapture,
    socialLinks,
    orphanPages,
    avgReadabilityScore,
    imageOptimizationScore,
    siteKeywords,
    contactPageHasInfo,
    jinaEnriched: jinaEnriched || browserlessEnriched,
  };

  const siteType = detectSiteType(baseMetrics);

  // 7. Performance
  emit({ stage: 'performance', message: 'Fetching performance data…' });
  const psiData = await fetchPageSpeedMetrics(baseUrl.href);
  const performance = psiData
    ? { ...psiData, estimatedScripts: baseMetrics.totalScripts, estimatedImages: baseMetrics.totalImages }
    : estimatePerformance(crawledRaw[0], { ...baseMetrics, isJsRendered, siteType, performance: {} as PerformanceMetrics } as SiteMetrics);

  const siteMetrics: SiteMetrics = { ...baseMetrics, isJsRendered, siteType, performance };

  // 8. Score
  emit({ stage: 'scoring', message: 'Computing scores…' });
  const scores = computeScores(homePage, allPageMetrics, siteMetrics);
  const recommendations = generateRecommendations(homePage, allPageMetrics, siteMetrics, scores);

  // 9. AI
  let aiInsights = null;
  if (process.env.GROQ_API_KEY) {
    emit({ stage: 'ai', message: 'Generating AI insights…' });
    aiInsights = await generateAIInsights(baseUrl.href, homePage, allPageMetrics, siteMetrics, scores);
  }

  // Compute expiry
  const expiryMs: Record<string, number | null> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    'never': null,
  };
  const ms = expiryMs[expiresIn] ?? expiryMs['7d'];
  const expiresAt = ms ? new Date(Date.now() + ms).toISOString() : null;

  return {
    id: uuidv4(),
    url: baseUrl.href,
    domain,
    createdAt: new Date().toISOString(),
    expiresAt,
    favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    pageTitle: homePage.title,
    siteMetrics,
    scores,
    recommendations,
    aiInsights,
    aiEnabled: !!aiInsights,
  };
}
