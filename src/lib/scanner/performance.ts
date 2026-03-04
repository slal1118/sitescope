import { load } from 'cheerio';
import type { PerformanceMetrics, SiteMetrics } from '../types';
import type { FetchedPage } from './crawler';

// PageSpeed Insights v5 API — free tier: 25k req/day, no key needed for basic use
const PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

interface PsiResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } };
    audits?: {
      'largest-contentful-paint'?: { numericValue?: number };
      'first-contentful-paint'?: { numericValue?: number };
      'cumulative-layout-shift'?: { numericValue?: number };
      interactive?: { numericValue?: number };
    };
  };
}

export async function fetchPageSpeedMetrics(url: string): Promise<PerformanceMetrics | null> {
  try {
    const params = new URLSearchParams({ url, strategy: 'mobile', category: 'performance' });
    const apiKey = process.env.PAGESPEED_API_KEY;
    if (apiKey) params.set('key', apiKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${PSI_API}?${params}`, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;

    const data = (await res.json()) as PsiResponse;
    const lr = data.lighthouseResult;
    if (!lr) return null;

    const audits = lr.audits ?? {};
    const score = lr.categories?.performance?.score;

    return {
      source: 'pagespeed',
      performanceScore: score !== undefined ? Math.round(score * 100) : undefined,
      lcp: audits['largest-contentful-paint']?.numericValue,
      fcp: audits['first-contentful-paint']?.numericValue,
      cls: audits['cumulative-layout-shift']?.numericValue,
      tti: audits['interactive']?.numericValue,
      estimatedScripts: 0,
      estimatedImages: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Derive meaningful performance estimates from static HTML analysis.
 * No extra network requests — uses the homepage already fetched during crawl.
 */
export function estimatePerformance(homepage: FetchedPage, metrics: SiteMetrics): PerformanceMetrics {
  const base: PerformanceMetrics = {
    source: 'estimated',
    estimatedScripts: metrics.totalScripts,
    estimatedImages: metrics.totalImages,
  };

  if (!homepage.html) return base;

  const $ = load(homepage.html);
  const headers = homepage.responseHeaders ?? {};

  // ── Render-blocking resources in <head> ──────────────────────────────────
  // Scripts without async/defer/module in <head>
  let renderBlockingScripts = 0;
  $('head script[src]').each((_, el) => {
    const attrs = (el as unknown as { attribs: Record<string, string> }).attribs;
    const isAsync = 'async' in attrs;
    const isDefer = 'defer' in attrs;
    const type = attrs['type'] ?? '';
    if (!isAsync && !isDefer && type !== 'module') renderBlockingScripts++;
  });

  // Stylesheets (non-print, non-preload) in <head>
  let renderBlockingStyles = 0;
  $('head link[rel="stylesheet"]').each((_, el) => {
    const media = (el as unknown as { attribs: Record<string, string> }).attribs['media'] ?? 'all';
    if (media !== 'print') renderBlockingStyles++;
  });

  const renderBlocking = renderBlockingScripts + renderBlockingStyles;

  // ── Compression ──────────────────────────────────────────────────────────
  const enc = headers['content-encoding'] ?? '';
  const isCompressed = enc === 'gzip' || enc === 'br' || enc === 'zstd' || enc === 'deflate';

  // ── CDN signals ──────────────────────────────────────────────────────────
  const hasCDN = !!(
    headers['cf-ray'] ||              // Cloudflare
    headers['x-served-by'] ||         // Fastly
    headers['x-cache'] ||             // Generic CDN
    headers['x-fastly-request-id'] || // Fastly
    headers['x-amz-cf-id'] ||         // CloudFront
    headers['x-azure-ref'] ||         // Azure CDN
    headers['server']?.includes('cloudflare')
  );

  // ── Resource hints ───────────────────────────────────────────────────────
  const preloadCount = $('link[rel="preload"]').length;
  const preconnectCount = $('link[rel="preconnect"]').length;
  const hasResourceHints = preloadCount + preconnectCount > 0;

  // ── Image lazy loading ───────────────────────────────────────────────────
  const totalImgTags = $('img').length;
  const lazyImgs = $('img[loading="lazy"], img[data-src], img[data-lazy]').length;
  const lazyRatio = totalImgTags > 0 ? lazyImgs / totalImgTags : 1;

  // ── Third-party scripts ──────────────────────────────────────────────────
  const pageHost = new URL(homepage.url).hostname;
  let thirdPartyScripts = 0;
  $('script[src]').each((_, el) => {
    const src = (el as unknown as { attribs: Record<string, string> }).attribs['src'] ?? '';
    if (src.startsWith('http') && !src.includes(pageHost)) thirdPartyScripts++;
  });

  // ── Web font loading ─────────────────────────────────────────────────────
  const hasRenderBlockingFonts = $('link[href*="fonts.googleapis.com"]:not([rel="preconnect"])').length > 0 ||
    $('link[href*="fonts.gstatic.com"]:not([rel="preconnect"])').length > 0;

  // ── Inline CSS/JS weight ─────────────────────────────────────────────────
  let inlineWeight = 0;
  $('style').each((_, el) => { inlineWeight += ($(el).html() ?? '').length; });
  $('script:not([src])').each((_, el) => { inlineWeight += ($(el).html() ?? '').length; });
  const heavyInline = inlineWeight > 50_000; // > 50KB inline

  // ── Estimated HTML size ──────────────────────────────────────────────────
  const htmlSize = homepage.html.length; // bytes (uncompressed)
  const largeHtml = htmlSize > 200_000; // > 200KB uncompressed HTML

  // ── Score computation ────────────────────────────────────────────────────
  let score = 100;

  // Render-blocking resources — biggest performance killer
  score -= Math.min(renderBlocking * 5, 30);

  // No compression — major issue
  if (!isCompressed) score -= 15;

  // No CDN — significant latency impact
  if (!hasCDN) score -= 8;

  // Poor image lazy loading
  if (totalImgTags > 3 && lazyRatio < 0.5) score -= 8;

  // Too many third-party scripts
  score -= Math.min(thirdPartyScripts * 3, 12);

  // Render-blocking Google Fonts
  if (hasRenderBlockingFonts) score -= 5;

  // Heavy inline assets
  if (heavyInline) score -= 5;

  // Large uncompressed HTML
  if (largeHtml) score -= 5;

  // Bonuses
  if (hasResourceHints) score += 5;
  if (isCompressed && hasCDN) score += 3; // bonus for doing both

  score = Math.max(5, Math.min(100, Math.round(score)));

  // ── Estimated Core Web Vitals ────────────────────────────────────────────
  // Anchored to real-world median values (Crux data) adjusted by signals
  const blockPenaltyMs = renderBlocking * 150;
  const compressionPenaltyMs = isCompressed ? 0 : 350;
  const cdnPenaltyMs = hasCDN ? 0 : 200;
  const tpScriptPenaltyMs = thirdPartyScripts * 80;
  const fontPenaltyMs = hasRenderBlockingFonts ? 150 : 0;

  const baseFcp = 900;
  const baseLcp = 1800;

  const estimatedFcp = Math.round(
    baseFcp + blockPenaltyMs * 0.7 + compressionPenaltyMs * 0.5 + cdnPenaltyMs + tpScriptPenaltyMs * 0.4 + fontPenaltyMs
  );
  const estimatedLcp = Math.round(
    baseLcp + blockPenaltyMs + compressionPenaltyMs + cdnPenaltyMs + tpScriptPenaltyMs * 0.6 + fontPenaltyMs
  );
  // Rough CLS estimate: inline heavy / no preloads increases shift
  const estimatedCls = parseFloat((hasResourceHints ? 0.02 : heavyInline ? 0.12 : 0.05).toFixed(3));

  return {
    source: 'estimated',
    performanceScore: score,
    lcp: estimatedLcp,
    fcp: estimatedFcp,
    cls: estimatedCls,
    estimatedScripts: metrics.totalScripts,
    estimatedImages: metrics.totalImages,
  };
}
