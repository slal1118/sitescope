export interface AccessibilityMetrics {
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  headingOrderIssues: number; // e.g. h1 → h3 (skipping h2)
  ariaLabels: number;
  missingLangAttr: boolean;
  contrastIssuesSuspected: boolean; // heuristic: small text + light colors
}

export interface PerformanceMetrics {
  // PageSpeed Insights data (optional — only if API available)
  lcp?: number;       // Largest Contentful Paint (ms)
  fcp?: number;       // First Contentful Paint (ms)
  cls?: number;       // Cumulative Layout Shift
  tti?: number;       // Time to Interactive (ms)
  performanceScore?: number; // 0–100
  source: 'pagespeed' | 'estimated';
  // Estimated from page structure
  estimatedScripts: number;
  estimatedImages: number;
}

export type SiteType = 'saas' | 'ecommerce' | 'blog' | 'agency' | 'portfolio' | 'news' | 'unknown';

export interface OGTags {
  title: string | null;
  description: string | null;
  image: string | null;
  type: string | null;
}

export interface PageMetrics {
  url: string;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  wordCount: number;
  internalLinks: string[];
  externalLinksCount: number;
  formsCount: number;
  inputTypes: string[];
  ctaCandidates: string[];
  scriptSrcs: string[];
  imageCount: number;
  statusCode: number;
  loadError?: string;
  // Accessibility
  accessibility: AccessibilityMetrics;
  // New fields (optional for backward compat)
  hasViewportMeta?: boolean;
  ogTags?: OGTags;
  twitterCard?: string | null;
  // Advanced signals
  schemaTypes?: string[];          // JSON-LD @type values found on the page
  hasVideo?: boolean;              // YouTube/Vimeo/HTML5 video detected
  hasFAQ?: boolean;                // FAQ section or FAQPage schema detected
  socialLinks?: string[];          // Social platforms linked: ['Twitter', 'LinkedIn', ...]
  testimonialCount?: number;       // Count of testimonial/review DOM blocks
  hreflang?: string[];             // hreflang language codes found
  hasNewsletterSignup?: boolean;   // Email newsletter capture form detected
  // Deep analysis signals
  topKeywords?: Array<{ word: string; count: number; density: number }>; // Top 10 keywords by frequency
  readabilityScore?: number;       // Flesch-Kincaid Reading Ease (0-100, higher = easier)
  imageFormats?: {
    webp: number; avif: number; jpeg: number; png: number; svg: number;
    total: number; lazy: number; withSrcset: number;
  };
  contentFreshness?: {
    datePublished: string | null;  // ISO date from schema/meta
    dateModified: string | null;   // ISO date from schema/meta
    timeElementsCount: number;     // <time> elements found
  };
  contactInfo?: { hasEmail: boolean; hasPhone: boolean };
  aboveFoldCTA?: boolean;          // CTA detected in first section / hero area
  externalLinks?: { count: number; nofollowCount: number; authorityDomains: string[] };
  pageDepth?: number;              // URL path depth (0 = homepage, 1 = /pricing, etc.)
}

export type CmsType =
  | 'WordPress'
  | 'Shopify'
  | 'Webflow'
  | 'Squarespace'
  | 'Wix'
  | 'HubSpot'
  | 'Drupal'
  | 'Ghost'
  | 'Framer';

export type TrackerType =
  | 'Google Analytics'
  | 'Google Tag Manager'
  | 'Meta Pixel'
  | 'TikTok Pixel'
  | 'Hotjar'
  | 'Intercom'
  | 'Drift'
  | 'Mixpanel'
  | 'Segment'
  | 'Heap'
  | 'Microsoft Clarity'
  | 'Crisp'
  | 'HubSpot Analytics';

export type FrameworkType = 'React' | 'Next.js' | 'Vue' | 'Angular' | 'Nuxt' | 'Gatsby' | 'Svelte';

export interface TechDetection {
  cms: CmsType[];
  trackers: TrackerType[];
  frameworks: FrameworkType[];
  cdns: string[];
  chatWidgets: string[];
}

export interface SecurityHeaders {
  https: boolean;
  hsts: boolean;
  csp: boolean;
  xFrameOptions: string | null;
  xContentTypeOptions: boolean;
  referrerPolicy: string | null;
}

export interface BrokenLink {
  url: string;
  foundOn: string;
  statusCode: number;
}

export interface SiteMetrics {
  crawledPages: PageMetrics[];
  pagesCount: number;
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  robotsAllowed: boolean;
  hasPricingPage: boolean;
  hasContactPage: boolean;
  hasBlogPage: boolean;
  totalImages: number;
  totalScripts: number;
  totalWords: number;
  uniqueInternalLinks: number;
  techStack: TechDetection;
  crawlDurationMs: number;
  crawlError?: string;
  isJsRendered: boolean;
  siteType: SiteType;
  performance: PerformanceMetrics;
  // New fields (optional for backward compat)
  securityHeaders?: SecurityHeaders;
  brokenLinks?: BrokenLink[];
  duplicateTitles?: string[];
  duplicateMetas?: string[];
  // Advanced site-level signals
  hasAboutPage?: boolean;
  hasCaseStudiesPage?: boolean;
  hasNewsletterCapture?: boolean;
  socialLinks?: string[];
  // Deep analysis site-level signals
  orphanPages?: string[];          // Pages with 0 incoming internal links
  avgReadabilityScore?: number;    // Average Flesch-Kincaid across crawled pages
  imageOptimizationScore?: number; // 0-100: % of images using WebP/AVIF
  siteKeywords?: Array<{ word: string; count: number }>; // Top 15 site-wide keywords
  contactPageHasInfo?: boolean;    // Contact page has actual email/phone
  jinaEnriched?: boolean;          // Homepage data was enriched via Jina Reader (SPA sites)
}

export interface Scores {
  messaging: number;
  seo: number;
  cro: number;
  accessibility: number;
  overall: number;
}

export type ImpactLevel = 'High' | 'Medium' | 'Low';
export type EffortLevel = 'High' | 'Medium' | 'Low';
export type ReportCategory = 'SEO' | 'CRO' | 'Performance' | 'Technical' | 'Content' | 'Messaging' | 'Accessibility';

export interface Recommendation {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  impact: ImpactLevel;
  effort: EffortLevel;
  priority: number;
}

export interface AIInsights {
  executiveSummary: string;
  messagingAnalysis: string;
  targetAudience: string;
  topFindings: string[];
  aiRecommendations: Recommendation[];
}

export interface Report {
  id: string;
  url: string;
  domain: string;
  createdAt: string;
  siteMetrics: SiteMetrics;
  scores: Scores;
  recommendations: Recommendation[];
  aiInsights: AIInsights | null;
  aiEnabled: boolean;
  favicon: string | null;
  pageTitle: string | null;
  expiresAt: string | null;
}

export interface ScanRequest {
  url: string;
  forceRescan?: boolean;
  expiresIn?: '24h' | '7d' | '30d' | 'never';
}

export interface ScanResponse {
  reportId: string;
  cached: boolean;
}

export type ScanProgressStage =
  | 'validating'
  | 'robots'
  | 'crawling'
  | 'sitemap'
  | 'extracting'
  | 'scoring'
  | 'performance'
  | 'ai'
  | 'saving'
  | 'done';

export interface ScanProgressEvent {
  stage: ScanProgressStage;
  message: string;
  pagesFound?: number;
  reportId?: string;
  error?: string;
}
