import { load } from 'cheerio';
import { normalizeLink, isSameOrigin } from '../security';
import type { PageMetrics, OGTags, TechDetection, CmsType, TrackerType, FrameworkType, AccessibilityMetrics } from '../types';
import type { FetchedPage } from './crawler';

// ── Stopwords for keyword extraction ────────────────────────────────────────
const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from','as',
  'is','was','are','were','be','been','being','have','has','had','do','does','did','will',
  'would','could','should','may','might','shall','can','need','dare','ought','used',
  'it','its','this','that','these','those','he','she','they','we','you','i','me','him',
  'her','them','us','my','your','his','our','their','what','which','who','how','when',
  'where','why','all','each','every','both','few','more','most','other','some','such',
  'no','not','only','own','same','so','than','too','very','just','also','about','into',
  'through','during','before','after','above','below','between','out','off','over','under',
  'up','down','again','then','once','here','there','new','get','make','use','go','see',
  'one','two','three','first','last','like','know','take','come','give','think','look',
  'well','back','even','still','way','want','look','much','many','time','year','good',
  'day','work','any','now','our','long','great','little','own','right','big','high',
  'if','per',
]);

const AUTHORITY_DOMAINS = [
  'wikipedia.org','github.com','stackoverflow.com','medium.com','techcrunch.com',
  'forbes.com','harvard.edu','stanford.edu','mit.edu','w3.org','mdn.io','developer.mozilla.org',
  '.gov','bbc.com','reuters.com','nytimes.com','wsj.com','wired.com','arstechnica.com',
];

// ── Keyword extraction ───────────────────────────────────────────────────────
function extractKeywords(text: string): Array<{ word: string; count: number; density: number }> {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  if (words.length === 0) return [];

  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);

  const total = words.length;
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count, density: Math.round((count / total) * 1000) / 10 }));
}

// ── Flesch-Kincaid readability ───────────────────────────────────────────────
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  // Remove silent trailing e
  const cleaned = w.replace(/e$/, '');
  const vowelGroups = cleaned.match(/[aeiouy]+/g);
  return Math.max(1, vowelGroups ? vowelGroups.length : 1);
}

function computeReadability(text: string): number {
  // Split into sentences (. ! ?)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
  if (sentences.length === 0) return 50;

  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 10) return 50;

  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const wordsPerSentence = words.length / Math.max(1, sentences.length);
  const syllablesPerWord = totalSyllables / words.length;

  // Flesch Reading Ease formula
  const score = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Image format analysis ────────────────────────────────────────────────────
function extractImageFormats($full: ReturnType<typeof load>): PageMetrics['imageFormats'] {
  let webp = 0, avif = 0, jpeg = 0, png = 0, svg = 0, lazy = 0, withSrcset = 0;

  $full('img').each((_, el) => {
    const src = ($full(el).attr('src') ?? '').toLowerCase();
    const srcset = $full(el).attr('srcset') ?? '';
    const loading = $full(el).attr('loading') ?? '';
    const type = $full(el).attr('type') ?? '';

    if (src.includes('.webp') || srcset.includes('.webp') || type.includes('webp')) webp++;
    else if (src.includes('.avif') || srcset.includes('.avif') || type.includes('avif')) avif++;
    else if (src.includes('.jpg') || src.includes('.jpeg')) jpeg++;
    else if (src.includes('.png')) png++;
    else if (src.includes('.svg')) svg++;

    if (loading === 'lazy') lazy++;
    if (srcset) withSrcset++;
  });

  // Also check <picture> / <source>
  $full('source').each((_, el) => {
    const srcset = ($full(el).attr('srcset') ?? '').toLowerCase();
    const type = ($full(el).attr('type') ?? '').toLowerCase();
    if (srcset.includes('.webp') || type.includes('webp')) webp++;
    else if (srcset.includes('.avif') || type.includes('avif')) avif++;
  });

  const total = webp + avif + jpeg + png + svg;
  return { webp, avif, jpeg, png, svg, total, lazy, withSrcset };
}

// ── Content freshness ────────────────────────────────────────────────────────
function extractContentFreshness($full: ReturnType<typeof load>): PageMetrics['contentFreshness'] {
  let datePublished: string | null = null;
  let dateModified: string | null = null;

  // Check JSON-LD for datePublished / dateModified
  $full('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($full(el).html() ?? '') as Record<string, unknown>;
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (!datePublished && typeof item['datePublished'] === 'string') {
          datePublished = item['datePublished'] as string;
        }
        if (!dateModified && typeof item['dateModified'] === 'string') {
          dateModified = item['dateModified'] as string;
        }
      }
    } catch { /* skip */ }
  });

  // Check Open Graph / meta tags
  if (!datePublished) {
    datePublished =
      $full('meta[property="article:published_time"]').attr('content') ??
      $full('meta[name="date"]').attr('content') ??
      null;
  }
  if (!dateModified) {
    dateModified =
      $full('meta[property="article:modified_time"]').attr('content') ??
      $full('meta[name="last-modified"]').attr('content') ??
      null;
  }

  const timeElementsCount = $full('time[datetime]').length;

  return { datePublished: datePublished ?? null, dateModified: dateModified ?? null, timeElementsCount };
}

// ── Contact info detection ───────────────────────────────────────────────────
function extractContactInfo(text: string): PageMetrics['contactInfo'] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]\d{1,4}[-.\s]\d{2,4}[-.\s]\d{2,4}/g;

  const hasEmail = emailRegex.test(text);
  const hasPhone = phoneRegex.test(text);

  return { hasEmail, hasPhone };
}

// ── Above-the-fold CTA detection ─────────────────────────────────────────────
function detectAboveFoldCTA($full: ReturnType<typeof load>): boolean {
  // Check first <section>, <header>, <hero>, or first <div> in <main>
  const heroSelectors = [
    'header', 'section:first-of-type', '[class*="hero"]', '[id*="hero"]',
    '[class*="banner"]', 'main > div:first-child', 'main > section:first-child',
  ];

  for (const sel of heroSelectors) {
    const el = $full(sel).first();
    if (el.length === 0) continue;
    const text = el.text();
    if (CTA_PATTERN.test(text)) return true;
    // Also check for links/buttons with action-oriented text in those elements
    const hasCtaEl = el.find('a, button').toArray().some(a => CTA_PATTERN.test($full(a).text()));
    if (hasCtaEl) return true;
  }
  return false;
}

// ── External link quality ────────────────────────────────────────────────────
function extractExternalLinks($full: ReturnType<typeof load>, baseUrl: URL): PageMetrics['externalLinks'] {
  let count = 0;
  let nofollowCount = 0;
  const authoritySet = new Set<string>();

  $full('a[href]').each((_, el) => {
    const href = ($full(el).attr('href') ?? '').toLowerCase();
    if (!href.startsWith('http') || href.includes(baseUrl.hostname)) return;

    count++;
    const rel = ($full(el).attr('rel') ?? '').toLowerCase();
    if (rel.includes('nofollow') || rel.includes('ugc') || rel.includes('sponsored')) {
      nofollowCount++;
    }

    for (const authDomain of AUTHORITY_DOMAINS) {
      if (href.includes(authDomain)) {
        authoritySet.add(authDomain);
        break;
      }
    }
  });

  return { count, nofollowCount, authorityDomains: [...authoritySet] };
}

// Multilingual CTA patterns (EN + ES + FR + DE + PT)
const CTA_PATTERN =
  /\b(buy now|start free|get started|sign up|book a demo|request demo|start trial|free trial|contact us|get a quote|learn more|try free|install now|download|subscribe|join now|apply now|register|order now|shop now|add to cart|checkout|get started free|empezar|registrarse|contactar|essayer|commencer|s'inscrire|jetzt starten|kostenlos|anmelden|começar|cadastrar|experimente)\b/i;

// Multilingual trust signals
const TRUST_PATTERN =
  /\b(guarantee|money.back|secure|trusted|certified|award|verified|ssl|reviews?|testimonials?|years? experience|clients?|customers?|compliance|iso|soc.?2|gdpr|privacy|garantie|seguro|certifié|zertifiziert|garantia|avaliações|confiável|trusted|award.winning|5.star|estrella|étoile)\b/i;

// Multilingual benefit keywords
const BENEFIT_PATTERN =
  /\b(save|increase|boost|improve|grow|reduce|automate|simplify|accelerate|optimize|maximize|streamline|scale|transform|results?|roi|revenue|profit|ahorrar|mejorar|aumentar|économiser|améliorer|sparen|verbessern|economizar|melhorar|aumentar)\b/i;

const CMS_PATTERNS: [RegExp, CmsType][] = [
  [/wp-content|wp-includes|wp-json|wordpress/i, 'WordPress'],
  [/cdn\.shopify\.com|shopify\.com\/s\/files/i, 'Shopify'],
  [/webflow\.com|\.webflow\.io/i, 'Webflow'],
  [/static\.squarespace\.com|squarespace\.com/i, 'Squarespace'],
  [/wixstatic\.com|wix\.com/i, 'Wix'],
  [/hs-scripts\.com|hubspot\.com\/hs\//i, 'HubSpot'],
  [/drupal\.js|Drupal\.settings/i, 'Drupal'],
  [/ghost\.io|ghost-sdk/i, 'Ghost'],
  [/framer\.com|framerusercontent\.com/i, 'Framer'],
];

const TRACKER_PATTERNS: [RegExp, TrackerType][] = [
  [/googletagmanager\.com\/gtm\.js/i, 'Google Tag Manager'],
  [/google-analytics\.com|googletagmanager\.com\/gtag/i, 'Google Analytics'],
  [/connect\.facebook\.net.*fbevents/i, 'Meta Pixel'],
  [/analytics\.tiktok\.com/i, 'TikTok Pixel'],
  [/static\.hotjar\.com/i, 'Hotjar'],
  [/widget\.intercom\.io|intercomcdn\.com/i, 'Intercom'],
  [/js\.drift\.com/i, 'Drift'],
  [/cdn\.mxpnl\.com|mixpanel\.com/i, 'Mixpanel'],
  [/cdn\.segment\.com|segment\.io/i, 'Segment'],
  [/cdn\.heapanalytics\.com/i, 'Heap'],
  [/clarity\.ms/i, 'Microsoft Clarity'],
  [/crisp\.chat/i, 'Crisp'],
  [/js\.hs-scripts\.com|hscollectedforms/i, 'HubSpot Analytics'],
];

const FRAMEWORK_PATTERNS: [RegExp, FrameworkType][] = [
  [/\/_next\/static\//i, 'Next.js'],
  [/gatsby-|\/static\/gatsby/i, 'Gatsby'],
  [/nuxt|_nuxt\//i, 'Nuxt'],
  [/ng-version|angular\.js/i, 'Angular'],
  [/vue\.js|vue\.global/i, 'Vue'],
  [/svelte/i, 'Svelte'],
  [/react\.production\.min|react-dom/i, 'React'],
];

const CDN_PATTERNS: [RegExp, string][] = [
  [/cloudflare\.com|cdnjs\.cloudflare/i, 'Cloudflare'],
  [/fastly\.net/i, 'Fastly'],
  [/akamai/i, 'Akamai'],
  [/amazonaws\.com|cloudfront\.net/i, 'AWS CloudFront'],
];

function extractAccessibility($full: ReturnType<typeof load>): AccessibilityMetrics {
  let imagesWithAlt = 0;
  let imagesWithoutAlt = 0;
  $full('img').each((_, el) => {
    const alt = $full(el).attr('alt');
    if (alt !== undefined && alt.trim() !== '') {
      imagesWithAlt++;
    } else {
      imagesWithoutAlt++;
    }
  });

  // Check heading order (h1→h2→h3, no skipping)
  let headingOrderIssues = 0;
  let prevLevel = 0;
  $full('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = parseInt(el.name.slice(1), 10);
    if (prevLevel > 0 && level > prevLevel + 1) {
      headingOrderIssues++;
    }
    prevLevel = level;
  });

  const ariaLabels = $full('[aria-label], [aria-labelledby], [role]').length;
  const missingLangAttr = !$full('html').attr('lang');
  // Heuristic: many inline styles with small font sizes → possible contrast issue
  const styleContent = $full('[style]').toArray().map((el) => $full(el).attr('style') ?? '').join(' ');
  const contrastIssuesSuspected = /font-size:\s*(0?\.[0-9]+|[0-9](\.[0-9]+)?)rem|font-size:\s*[0-9]{1,2}px/i.test(styleContent);

  return { imagesWithAlt, imagesWithoutAlt, headingOrderIssues, ariaLabels, missingLangAttr, contrastIssuesSuspected };
}

export function extractPageMetrics(page: FetchedPage, baseUrl: URL): PageMetrics {
  const emptyA11y: AccessibilityMetrics = {
    imagesWithAlt: 0, imagesWithoutAlt: 0, headingOrderIssues: 0,
    ariaLabels: 0, missingLangAttr: true, contrastIssuesSuspected: false,
  };

  const emptyOG: OGTags = { title: null, description: null, image: null, type: null };

  if (!page.html || page.error) {
    return {
      url: page.url, title: null, metaDescription: null, canonical: null,
      h1: [], h2: [], h3: [], wordCount: 0, internalLinks: [], externalLinksCount: 0,
      formsCount: 0, inputTypes: [], ctaCandidates: [], scriptSrcs: [], imageCount: 0,
      statusCode: page.statusCode, loadError: page.error, accessibility: emptyA11y,
      hasViewportMeta: false, ogTags: emptyOG, twitterCard: null,
    };
  }

  const $full = load(page.html);
  const accessibility = extractAccessibility($full);

  const $ = load(page.html);
  $('script, style, noscript').each((_, el) => { if (el.type === 'tag') $(el).remove(); });

  const title = $('title').first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null;
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() || null;

  const h1: string[] = [];
  $('h1').each((_, el) => { const t = $(el).text().trim(); if (t) h1.push(t); });
  const h2: string[] = [];
  $('h2').each((_, el) => { const t = $(el).text().trim(); if (t) h2.push(t); });
  const h3: string[] = [];
  $('h3').each((_, el) => { const t = $(el).text().trim(); if (t) h3.push(t); });

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText.split(' ').filter((w) => w.length > 1).length;

  const internalLinks: string[] = [];
  let externalLinksCount = 0;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const normalized = normalizeLink(baseUrl, href);
    if (!normalized) return;
    if (isSameOrigin(baseUrl, normalized)) {
      internalLinks.push(normalized);
    } else {
      externalLinksCount++;
    }
  });

  const formsCount = $('form').length;
  const inputTypes: string[] = [];
  $('input').each((_, el) => { inputTypes.push($(el).attr('type')?.toLowerCase() ?? 'text'); });

  const ctaCandidates: string[] = [];
  $('a, button').each((_, el) => {
    const text = $(el).text().trim();
    if (text && CTA_PATTERN.test(text)) ctaCandidates.push(text.slice(0, 60));
  });

  const scriptSrcs: string[] = [];
  $full('script[src]').each((_, el) => { const src = $full(el).attr('src'); if (src) scriptSrcs.push(src); });

  const imageCount = $('img').length;

  const hasViewportMeta = $('meta[name="viewport"]').length > 0;
  const ogTags: OGTags = {
    title: $('meta[property="og:title"]').attr('content')?.trim() ?? null,
    description: $('meta[property="og:description"]').attr('content')?.trim() ?? null,
    image: $('meta[property="og:image"]').attr('content')?.trim() ?? null,
    type: $('meta[property="og:type"]').attr('content')?.trim() ?? null,
  };
  const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() ?? null;

  // ── Advanced signals ─────────────────────────────────────────────────────

  // JSON-LD structured data types
  const schemaTypes: string[] = [];
  $full('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $full(el).html() ?? '';
      const json = JSON.parse(raw) as Record<string, unknown> | Array<Record<string, unknown>>;
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        const types = Array.isArray(item['@type'])
          ? (item['@type'] as string[])
          : item['@type'] ? [item['@type'] as string] : [];
        schemaTypes.push(...types);
      }
    } catch { /* ignore invalid JSON-LD */ }
  });

  // Video presence (YouTube, Vimeo, Wistia, Loom, HTML5)
  const hasVideo =
    $full('iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="vimeo"], iframe[src*="wistia"], iframe[src*="loom"], video').length > 0 ||
    $full('[class*="video-"], [class*="-video"], [id*="video"]').filter((_, el) => $full(el).find('iframe, video').length > 0).length > 0;

  // FAQ section detection
  const hasFAQHeading = $('h1, h2, h3, h4').toArray().some(el => /faq|frequently asked/i.test($(el).text()));
  const hasFAQ =
    hasFAQHeading ||
    $full('[itemtype*="FAQPage"], [class*="faq"], [id*="faq"], details > summary').length > 0 ||
    schemaTypes.includes('FAQPage');

  // Social media links
  const SOCIAL_MAP: [string, string][] = [
    ['twitter.com', 'Twitter'], ['x.com', 'Twitter'], ['linkedin.com', 'LinkedIn'],
    ['instagram.com', 'Instagram'], ['facebook.com', 'Facebook'],
    ['youtube.com', 'YouTube'], ['tiktok.com', 'TikTok'], ['pinterest.com', 'Pinterest'],
  ];
  const socialLinks: string[] = [];
  $full('a[href]').each((_, el) => {
    const href = ($full(el).attr('href') ?? '').toLowerCase();
    for (const [domain, name] of SOCIAL_MAP) {
      if (href.includes(domain) && !socialLinks.includes(name)) socialLinks.push(name);
    }
  });

  // Testimonial / review blocks
  const testimonialCount =
    $full('[class*="testimonial"], [class*="review"], [id*="testimonial"], [id*="review"], [class*="customer"], [class*="quote-card"]').length +
    Math.min($full('blockquote').filter((_, el) => $full(el).text().trim().length > 30).length, 8);

  // Hreflang (multi-language)
  const hreflang: string[] = [];
  $full('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $full(el).attr('hreflang');
    if (lang && lang !== 'x-default' && !hreflang.includes(lang)) hreflang.push(lang);
  });

  // Newsletter signup form
  const hasNewsletterSignup =
    $full('[class*="newsletter"], [id*="newsletter"], [class*="subscribe-form"], [id*="subscribe"]').length > 0 ||
    $full('form').toArray().some(form => {
      const html = ($full(form).html() ?? '').toLowerCase();
      const hasEmail = html.includes('email');
      const isNewsletter = /newsletter|subscribe|mailing|stay.in.touch|email.updates|notify.me/i.test(html);
      return hasEmail && isNewsletter;
    });

  // ── Deep analysis signals ─────────────────────────────────────────────────
  const topKeywords = extractKeywords(bodyText);
  const readabilityScore = computeReadability(bodyText);
  const imageFormats = extractImageFormats($full);
  const contentFreshness = extractContentFreshness($full);
  const contactInfo = extractContactInfo(bodyText);
  const aboveFoldCTA = detectAboveFoldCTA($full);
  const externalLinks = extractExternalLinks($full, baseUrl);
  const pageDepth = new URL(page.url).pathname.split('/').filter(Boolean).length;

  return {
    url: page.url, title, metaDescription, canonical, h1, h2, h3, wordCount,
    internalLinks: [...new Set(internalLinks)], externalLinksCount, formsCount, inputTypes,
    ctaCandidates: [...new Set(ctaCandidates)].slice(0, 10), scriptSrcs, imageCount,
    statusCode: page.statusCode, accessibility,
    hasViewportMeta, ogTags, twitterCard,
    schemaTypes: [...new Set(schemaTypes)],
    hasVideo,
    hasFAQ,
    socialLinks,
    testimonialCount,
    hreflang,
    hasNewsletterSignup,
    topKeywords,
    readabilityScore,
    imageFormats,
    contentFreshness,
    contactInfo,
    aboveFoldCTA,
    externalLinks,
    pageDepth,
  };
}

export function detectTechStack(pages: PageMetrics[], rawHtmls: string[]): TechDetection {
  const allScripts = pages.flatMap((p) => p.scriptSrcs);
  const allHtml = rawHtmls.join('\n');
  const combined = allScripts.join('\n') + '\n' + allHtml;

  const cms = new Set<CmsType>();
  const trackers = new Set<TrackerType>();
  const frameworks = new Set<FrameworkType>();
  const cdns = new Set<string>();
  const chatWidgets = new Set<string>();

  for (const [p, n] of CMS_PATTERNS) if (p.test(combined)) cms.add(n);
  for (const [p, n] of TRACKER_PATTERNS) if (p.test(combined)) trackers.add(n);
  for (const [p, n] of FRAMEWORK_PATTERNS) if (p.test(combined)) frameworks.add(n);
  for (const [p, n] of CDN_PATTERNS) if (p.test(combined)) cdns.add(n);

  if (/intercom|drift|crisp|freshchat|zendesk|tidio|olark/i.test(combined)) {
    const matches = combined.match(/intercom|drift|crisp|freshchat|zendesk|tidio|olark/gi) ?? [];
    for (const m of [...new Set(matches)]) chatWidgets.add(m);
  }

  return { cms: [...cms], trackers: [...trackers], frameworks: [...frameworks], cdns: [...cdns], chatWidgets: [...chatWidgets] };
}

export function hasTrustSignals(pages: PageMetrics[]): boolean {
  const allText = pages.flatMap((p) => [...p.h1, ...p.h2, ...p.ctaCandidates]).join(' ');
  return TRUST_PATTERN.test(allText);
}

export function hasBenefitKeywords(pages: PageMetrics[]): boolean {
  const allText = pages.flatMap((p) => [...p.h1, ...p.h2]).join(' ');
  return BENEFIT_PATTERN.test(allText);
}

export function computeAccessibilityScore(pages: PageMetrics[]): number {
  if (pages.length === 0) return 50;
  let score = 100;
  const home = pages[0];
  const a11y = home.accessibility;

  // Alt text coverage
  const totalImages = a11y.imagesWithAlt + a11y.imagesWithoutAlt;
  if (totalImages > 0) {
    const altRatio = a11y.imagesWithAlt / totalImages;
    if (altRatio < 0.5) score -= 25;
    else if (altRatio < 0.8) score -= 10;
  }

  // Heading order
  if (a11y.headingOrderIssues > 2) score -= 15;
  else if (a11y.headingOrderIssues > 0) score -= 8;

  // ARIA usage (reward, not penalize)
  if (a11y.ariaLabels < 3) score -= 10;

  // lang attribute
  if (a11y.missingLangAttr) score -= 15;

  // Aggregate across pages
  const avgImagesWithoutAlt = pages.reduce((s, p) => s + p.accessibility.imagesWithoutAlt, 0) / pages.length;
  if (avgImagesWithoutAlt > 5) score -= 10;

  const totalHeadingIssues = pages.reduce((s, p) => s + p.accessibility.headingOrderIssues, 0);
  if (totalHeadingIssues > 5) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}
