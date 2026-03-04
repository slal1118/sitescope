import type { PageMetrics, SiteMetrics, Scores } from '../types';
import { hasTrustSignals, hasBenefitKeywords, computeAccessibilityScore } from './extractor';

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function scoreMessaging(home: PageMetrics, allPages: PageMetrics[]): number {
  let score = 0;
  if (home.h1.length > 0 && home.h1[0].length > 10) score += 20;
  else if (home.h1.length > 0) score += 8;
  if (hasBenefitKeywords(allPages)) score += 15;
  if (home.ctaCandidates.length >= 2) score += 20;
  else if (home.ctaCandidates.length === 1) score += 10;
  else if (allPages.some((p) => p.ctaCandidates.length > 0)) score += 5;
  if (home.metaDescription && home.metaDescription.length >= 100 && home.metaDescription.length <= 160) score += 12;
  else if (home.metaDescription && home.metaDescription.length > 50) score += 8;
  else if (home.metaDescription) score += 4;
  if (home.wordCount > 500) score += 10;
  else if (home.wordCount > 300) score += 7;
  else if (home.wordCount > 100) score += 3;
  if (hasTrustSignals(allPages)) score += 10;
  // Advanced: video storytelling
  if (home.hasVideo || allPages.some(p => p.hasVideo)) score += 7;
  // Advanced: rich social proof (actual testimonial blocks)
  const totalTestimonials = allPages.reduce((s, p) => s + (p.testimonialCount ?? 0), 0);
  if (totalTestimonials >= 5) score += 6;
  else if (totalTestimonials >= 2) score += 3;
  // Deep: readability — reward accessible, clear content (Flesch 40-80 is ideal for marketing)
  const readability = home.readabilityScore ?? 50;
  if (readability >= 50 && readability <= 80) score += 6;
  else if (readability >= 35) score += 3;
  // Deep: above-the-fold CTA
  if (home.aboveFoldCTA) score += 5;
  return clamp(score);
}

function scoreSeo(home: PageMetrics, allPages: PageMetrics[], metrics: SiteMetrics): number {
  let score = 0;
  if (home.title) {
    const len = home.title.length;
    if (len >= 30 && len <= 70) score += 18;
    else if (len > 0) score += 10;
  }
  if (home.metaDescription) {
    const len = home.metaDescription.length;
    if (len >= 100 && len <= 160) score += 14;
    else if (len > 0) score += 7;
  }
  if (home.h1.length === 1) score += 12;
  else if (home.h1.length > 1) score += 6;
  if (home.canonical) score += 8;
  if (metrics.hasSitemap) score += 10;
  if (metrics.hasRobotsTxt) score += 6;
  const avgInternal = allPages.length > 0
    ? allPages.reduce((s, p) => s + p.internalLinks.length, 0) / allPages.length : 0;
  if (avgInternal >= 10) score += 10;
  else if (avgInternal >= 5) score += 7;
  else if (avgInternal >= 1) score += 3;
  // Advanced: structured data / schema markup
  const allSchemaTypes = [...new Set(allPages.flatMap(p => p.schemaTypes ?? []))];
  if (allSchemaTypes.length >= 3) score += 10;
  else if (allSchemaTypes.length >= 1) score += 5;
  // Advanced: OG image
  if (home.ogTags?.image) score += 5;
  // Advanced: no duplicate titles / metas
  if ((metrics.duplicateTitles ?? []).length === 0 && allPages.length > 2) score += 5;
  // Advanced: hreflang (multi-language)
  if ((home.hreflang ?? []).length > 0) score += 3;
  // Advanced: no broken links
  if ((metrics.brokenLinks ?? []).length === 0 && allPages.length > 2) score += 4;
  // Deep: content freshness (dates signal active site maintenance)
  const pagesWithDates = allPages.filter(p => p.contentFreshness?.datePublished || p.contentFreshness?.dateModified).length;
  if (pagesWithDates >= 3) score += 4;
  else if (pagesWithDates >= 1) score += 2;
  // Deep: orphan pages penalty
  if ((metrics.orphanPages ?? []).length > 0) score -= Math.min(8, (metrics.orphanPages ?? []).length * 2);
  return clamp(score);
}

function scoreCro(home: PageMetrics, allPages: PageMetrics[], metrics: SiteMetrics): number {
  let score = 0;
  if (home.ctaCandidates.length >= 2) score += 20;
  else if (home.ctaCandidates.length === 1) score += 12;
  const allCtaCount = allPages.reduce((s, p) => s + p.ctaCandidates.length, 0);
  if (allCtaCount > 5) score += 8;
  if (allPages.some((p) => p.formsCount > 0)) score += 10;
  if (metrics.hasPricingPage) score += 10;
  if (metrics.hasContactPage) score += 6;
  if (hasTrustSignals(allPages)) score += 10;
  const maxInputs = Math.max(...allPages.map((p) => p.inputTypes.length), 0);
  if (maxInputs > 6) score -= 8;
  // Advanced: testimonials/reviews (actual DOM blocks)
  const totalTestimonials = allPages.reduce((s, p) => s + (p.testimonialCount ?? 0), 0);
  if (totalTestimonials >= 5) score += 10;
  else if (totalTestimonials >= 2) score += 6;
  else if (totalTestimonials >= 1) score += 3;
  // Advanced: video content (major conversion driver)
  if (home.hasVideo) score += 8;
  else if (allPages.some(p => p.hasVideo)) score += 4;
  // Advanced: FAQ section (reduces purchase friction)
  if (home.hasFAQ || allPages.some(p => p.hasFAQ)) score += 5;
  // Advanced: newsletter / email capture
  if (metrics.hasNewsletterCapture) score += 5;
  // Advanced: case studies page
  if (metrics.hasCaseStudiesPage) score += 5;
  // Advanced: about page
  if (metrics.hasAboutPage) score += 3;
  // Deep: contact info on pages (email or phone detected)
  if (allPages.some(p => p.contactInfo?.hasEmail || p.contactInfo?.hasPhone)) score += 4;
  // Deep: image optimization (using WebP/AVIF)
  const imgOptScore = metrics.imageOptimizationScore ?? 0;
  if (imgOptScore >= 70) score += 5;
  else if (imgOptScore >= 40) score += 2;
  return clamp(score);
}

export function computeScores(home: PageMetrics, allPages: PageMetrics[], metrics: SiteMetrics): Scores {
  const messaging = scoreMessaging(home, allPages);
  const seo = scoreSeo(home, allPages, metrics);
  const cro = scoreCro(home, allPages, metrics);
  const accessibility = computeAccessibilityScore(allPages);
  const overall = clamp(Math.round((messaging + seo + cro + accessibility) / 4));
  return { messaging, seo, cro, accessibility, overall };
}
