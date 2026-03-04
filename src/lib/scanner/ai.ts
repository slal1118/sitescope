import OpenAI from 'openai';
import type { PageMetrics, SiteMetrics, Scores, AIInsights, Recommendation, SiteType } from '../types';

function detectSiteType(metrics: SiteMetrics, home: PageMetrics): SiteType {
  const tech = metrics.techStack;
  if (tech.cms.includes('Shopify') || tech.cms.includes('Wix') || /shop|store|cart|product|buy/i.test(home.url)) return 'ecommerce';
  if (tech.cms.includes('WordPress') || tech.cms.includes('Ghost') || metrics.hasBlogPage) return 'blog';
  if (metrics.hasPricingPage && (tech.frameworks.length > 0 || tech.cms.includes('Webflow'))) return 'saas';
  if (/agency|studio|creative|design|marketing/i.test([...home.h1, ...home.h2].join(' '))) return 'agency';
  if (metrics.hasPricingPage) return 'saas';
  if (tech.cms.length === 0 && tech.frameworks.length === 0 && metrics.pagesCount < 5) return 'portfolio';
  return 'unknown';
}

function siteTypeContext(siteType: SiteType): string {
  switch (siteType) {
    case 'saas': return 'This is a SaaS product website. Focus on trial/demo conversion, product clarity, pricing transparency, and reducing signup friction.';
    case 'ecommerce': return 'This is an ecommerce store. Focus on product discovery, trust signals, checkout friction reduction, and cart abandonment prevention.';
    case 'blog': return 'This is a content/blog site. Focus on content quality, email capture, internal linking for SEO, readability, and audience engagement signals.';
    case 'agency': return 'This is a digital agency or services site. Focus on portfolio/case studies, credibility signals, clear service descriptions, and lead generation forms.';
    case 'portfolio': return 'This is a portfolio or personal site. Focus on work samples visibility, clear contact CTA, personal brand clarity, and target audience identification.';
    case 'news': return 'This is a news or media site. Focus on content freshness signals, category navigation, subscription/newsletter CTAs, and ad performance considerations.';
    default: return 'Analyze this website holistically across all dimensions.';
  }
}

function buildPrompt(url: string, home: PageMetrics, allPages: PageMetrics[], metrics: SiteMetrics, scores: Scores): string {
  const siteType = detectSiteType(metrics, home);
  const context = siteTypeContext(siteType);

  const homeSummary = {
    url,
    title: home.title,
    metaDescription: home.metaDescription,
    h1: home.h1.slice(0, 3),
    h2: home.h2.slice(0, 8),
    h3: home.h3.slice(0, 5),
    ctaCandidates: home.ctaCandidates.slice(0, 8),
    wordCount: home.wordCount,
    formsCount: home.formsCount,
    schemaTypes: home.schemaTypes ?? [],
    hasVideo: home.hasVideo ?? false,
    hasFAQ: home.hasFAQ ?? false,
    testimonialCount: home.testimonialCount ?? 0,
    socialLinks: home.socialLinks ?? [],
    hreflang: home.hreflang ?? [],
    hasNewsletterSignup: home.hasNewsletterSignup ?? false,
    ogImageSet: !!(home.ogTags?.image),
    twitterCard: home.twitterCard ?? null,
  };

  const pagesSummary = allPages.slice(0, 12).map(p => ({
    url: p.url,
    title: p.title,
    wordCount: p.wordCount,
    ctaCount: p.ctaCandidates.length,
    schemaTypes: p.schemaTypes ?? [],
    hasVideo: p.hasVideo ?? false,
    hasFAQ: p.hasFAQ ?? false,
    testimonialCount: p.testimonialCount ?? 0,
    readabilityScore: p.readabilityScore,
    topKeywords: (p.topKeywords ?? []).slice(0, 5).map(k => k.word),
    hasDatePublished: !!p.contentFreshness?.datePublished,
    aboveFoldCTA: p.aboveFoldCTA ?? false,
    imageFormats: p.imageFormats ? {
      modernPct: p.imageFormats.total > 0
        ? Math.round(((p.imageFormats.webp + p.imageFormats.avif) / p.imageFormats.total) * 100)
        : null,
      total: p.imageFormats.total,
      lazyPct: p.imageFormats.total > 0
        ? Math.round((p.imageFormats.lazy / p.imageFormats.total) * 100)
        : null,
    } : null,
  }));

  const siteInfo = {
    siteType,
    totalPages: metrics.pagesCount,
    hasSitemap: metrics.hasSitemap,
    hasPricingPage: metrics.hasPricingPage,
    hasContactPage: metrics.hasContactPage,
    hasBlogPage: metrics.hasBlogPage,
    hasAboutPage: metrics.hasAboutPage ?? false,
    hasCaseStudiesPage: metrics.hasCaseStudiesPage ?? false,
    hasNewsletterCapture: metrics.hasNewsletterCapture ?? false,
    isJsRendered: metrics.isJsRendered,
    techStack: metrics.techStack,
    totalWords: metrics.totalWords,
    securityHeaders: metrics.securityHeaders ?? null,
    brokenLinksCount: (metrics.brokenLinks ?? []).length,
    duplicateTitles: (metrics.duplicateTitles ?? []).length,
    duplicateMetas: (metrics.duplicateMetas ?? []).length,
    performance: metrics.performance?.performanceScore != null
      ? { score: metrics.performance.performanceScore, lcp: metrics.performance.lcp, cls: metrics.performance.cls }
      : 'unavailable',
    scores,
    accessibilityIssues: {
      imagesWithoutAlt: home.accessibility.imagesWithoutAlt,
      missingLangAttr: home.accessibility.missingLangAttr,
      headingOrderIssues: home.accessibility.headingOrderIssues,
      ariaLabels: home.accessibility.ariaLabels,
    },
    // Deep analysis data
    siteKeywords: (metrics.siteKeywords ?? []).slice(0, 10),
    avgReadabilityScore: metrics.avgReadabilityScore,
    imageOptimizationScore: metrics.imageOptimizationScore,
    orphanPagesCount: (metrics.orphanPages ?? []).length,
    contactPageHasInfo: metrics.contactPageHasInfo ?? false,
    homeReadabilityScore: home.readabilityScore,
    homeAboveFoldCTA: home.aboveFoldCTA ?? false,
    homeContentFreshness: home.contentFreshness ?? null,
    externalLinkAuthority: home.externalLinks?.authorityDomains ?? [],
  };

  return `You are an expert digital marketing strategist and CRO specialist with 15+ years advising high-growth companies. You have deep expertise across SEO, conversion rate optimization, content strategy, brand positioning, UX, and marketing analytics.

SITE CONTEXT: ${context}

ANALYSIS TARGET: ${url}

HOMEPAGE DATA:
${JSON.stringify(homeSummary, null, 2)}

ALL CRAWLED PAGES (${allPages.length} pages):
${JSON.stringify(pagesSummary, null, 2)}

SITE-LEVEL METRICS:
${JSON.stringify(siteInfo, null, 2)}

Provide a rigorous, expert-level analysis. Even for well-optimized sites, identify advanced opportunities that separate good sites from exceptional ones. Look for:
- Conversion funnel gaps (where do visitors drop off before converting?)
- Content strategy opportunities (what content would capture more demand?)
- Competitive differentiation (what's missing that market leaders have?)
- Technical SEO opportunities beyond basics
- Trust and credibility signals that could be stronger
- Audience segmentation and personalization opportunities

Respond ONLY with a valid JSON object:
{
  "executiveSummary": "3-4 sentence summary: what the site does, who it serves, its current strengths, and the single most important strategic opportunity",
  "messagingAnalysis": "3-4 sentence analysis covering: value proposition clarity, headline effectiveness, emotional resonance, competitive positioning, and whether messaging aligns with target audience intent",
  "targetAudience": "2-3 sentence description of primary + secondary audience segments, their buying motivations, and their stage in the buyer journey",
  "topFindings": ["string", "string", "string", "string", "string"],
  "aiRecommendations": [
    {
      "id": "ai-1",
      "category": "SEO|CRO|Performance|Technical|Content|Messaging|Accessibility",
      "title": "Specific actionable title (max 8 words)",
      "description": "3-4 sentence description: exactly what to implement, why it matters for this specific site, expected impact with benchmark data or industry statistics where applicable",
      "impact": "High|Medium|Low",
      "effort": "High|Medium|Low",
      "priority": 1
    }
  ]
}

topFindings: exactly 5 findings — prioritize strategic insights beyond basic SEO/CRO. Include competitive context, conversion funnel analysis, content gaps, positioning opportunities, and advanced growth levers.
aiRecommendations: exactly 5 recommendations. Focus on high-ROI opportunities that go beyond basic fixes. Tailor specifically to a ${siteType} site. Do NOT repeat recommendations already obvious from the scores (e.g., if scores show missing basics, focus on advanced opportunities).
Be direct, specific, and data-informed. Cite industry benchmarks where relevant.`;
}

export async function generateAIInsights(
  url: string, home: PageMetrics, allPages: PageMetrics[], metrics: SiteMetrics, scores: Scores
): Promise<AIInsights | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: buildPrompt(url, home, allPages, metrics, scores) }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      executiveSummary?: string;
      messagingAnalysis?: string;
      targetAudience?: string;
      topFindings?: string[];
      aiRecommendations?: Recommendation[];
    };

    return {
      executiveSummary: parsed.executiveSummary ?? '',
      messagingAnalysis: parsed.messagingAnalysis ?? '',
      targetAudience: parsed.targetAudience ?? '',
      topFindings: parsed.topFindings ?? [],
      aiRecommendations: (parsed.aiRecommendations ?? []).slice(0, 5),
    };
  } catch (err) {
    console.error('[AI] Groq failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
