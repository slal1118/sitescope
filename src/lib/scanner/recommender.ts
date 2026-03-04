import type { PageMetrics, SiteMetrics, Recommendation, Scores } from '../types';
import { hasTrustSignals } from './extractor';

let idCounter = 0;
function nextId() { return `rec-${++idCounter}`; }

export function generateRecommendations(
  home: PageMetrics,
  allPages: PageMetrics[],
  metrics: SiteMetrics,
  scores: Scores
): Recommendation[] {
  idCounter = 0;
  const recs: Recommendation[] = [];

  // ── SEO ──────────────────────────────────────────────────────────────
  if (!home.title) {
    recs.push({ id: nextId(), category: 'SEO', title: 'Add a descriptive page title',
      description: 'The homepage is missing a <title> tag. Titles are the single most important on-page SEO factor. Aim for 50–70 characters including your brand and primary keyword.',
      impact: 'High', effort: 'Low', priority: 1 });
  } else if (home.title.length < 30 || home.title.length > 70) {
    recs.push({ id: nextId(), category: 'SEO', title: `Optimize title tag length (${home.title.length} chars)`,
      description: 'Title tags should be 50–70 characters. Too short misses keyword opportunities; too long gets truncated in search results.',
      impact: 'Medium', effort: 'Low', priority: 4 });
  }

  if (!home.metaDescription) {
    recs.push({ id: nextId(), category: 'SEO', title: 'Add a meta description',
      description: 'A compelling 120–160 character meta description acts as ad copy in search results and directly affects click-through rates.',
      impact: 'High', effort: 'Low', priority: 2 });
  }

  if (home.h1.length === 0) {
    recs.push({ id: nextId(), category: 'SEO', title: 'Add an H1 heading',
      description: 'Every page should have exactly one H1 that clearly states what the page is about. It signals topic relevance to search engines.',
      impact: 'High', effort: 'Low', priority: 3 });
  } else if (home.h1.length > 1) {
    recs.push({ id: nextId(), category: 'SEO', title: `Reduce to one H1 tag (found ${home.h1.length})`,
      description: 'Multiple H1 tags dilute heading hierarchy. Keep one H1 and use H2–H6 for subsections.',
      impact: 'Medium', effort: 'Low', priority: 5 });
  }

  if (!metrics.hasSitemap) {
    recs.push({ id: nextId(), category: 'SEO', title: 'Create and submit an XML sitemap',
      description: 'No sitemap.xml found. A sitemap helps search engines discover all your pages — especially important for new sites.',
      impact: 'High', effort: 'Low', priority: 3 });
  }

  if (!home.canonical) {
    recs.push({ id: nextId(), category: 'Technical', title: 'Add canonical tags to prevent duplicate content',
      description: 'Without canonical URLs, search engines may index multiple versions of the same page (www vs non-www, trailing slash), splitting your SEO authority.',
      impact: 'Medium', effort: 'Low', priority: 6 });
  }

  const avgInternalLinks = allPages.length > 0
    ? allPages.reduce((s, p) => s + p.internalLinks.length, 0) / allPages.length : 0;
  if (avgInternalLinks < 5) {
    recs.push({ id: nextId(), category: 'SEO', title: 'Improve internal linking structure',
      description: 'Pages average fewer than 5 internal links. Add contextual links between related pages and ensure navigation covers key sections.',
      impact: 'Medium', effort: 'Medium', priority: 7 });
  }

  // ── CRO ──────────────────────────────────────────────────────────────
  if (home.ctaCandidates.length === 0) {
    recs.push({ id: nextId(), category: 'CRO', title: 'Add a clear call-to-action on the homepage',
      description: 'No CTAs detected. Add a prominent primary CTA: "Start Free Trial," "Book a Demo," or "Get a Quote." Every page needs a clear next step.',
      impact: 'High', effort: 'Low', priority: 1 });
  }

  if (!hasTrustSignals(allPages)) {
    recs.push({ id: nextId(), category: 'CRO', title: 'Add trust signals and social proof',
      description: 'No trust signals detected (testimonials, reviews, certifications). Trust signals reduce purchase anxiety and are highest-ROI CRO improvements.',
      impact: 'High', effort: 'Medium', priority: 2 });
  }

  if (!metrics.hasPricingPage) {
    recs.push({ id: nextId(), category: 'CRO', title: 'Create a dedicated pricing page',
      description: 'No pricing page found. Pricing pages help visitors self-qualify and reduce unnecessary sales calls.',
      impact: 'High', effort: 'Medium', priority: 3 });
  }

  if (!metrics.hasContactPage) {
    recs.push({ id: nextId(), category: 'CRO', title: 'Add a contact page',
      description: 'No contact page detected. Visitors who cannot easily reach you often leave. A clear contact page with form, email, or phone reduces friction for high-intent buyers.',
      impact: 'Medium', effort: 'Low', priority: 4 });
  }

  const maxInputCount = Math.max(...allPages.map((p) => p.inputTypes.length), 0);
  if (maxInputCount > 5) {
    recs.push({ id: nextId(), category: 'CRO', title: `Simplify forms — ${maxInputCount} fields detected`,
      description: 'Long forms have much lower completion rates. For top-of-funnel forms, ask only for name + email. Use progressive profiling to gather more data over time.',
      impact: 'High', effort: 'Medium', priority: 5 });
  }

  // ── Content ───────────────────────────────────────────────────────────
  if (home.wordCount < 200) {
    recs.push({ id: nextId(), category: 'Content', title: 'Add more content to the homepage',
      description: `Homepage has only ~${home.wordCount} words. Thin pages rank poorly and give visitors insufficient information. Aim for 300–600 words of benefit-focused copy.`,
      impact: 'Medium', effort: 'Medium', priority: 6 });
  }

  if (!metrics.hasBlogPage) {
    recs.push({ id: nextId(), category: 'Content', title: 'Start a blog or resource section',
      description: 'No blog found. Content marketing drives compounding organic traffic and builds topical authority.',
      impact: 'High', effort: 'High', priority: 8 });
  }

  // ── Accessibility ─────────────────────────────────────────────────────
  const homeA11y = home.accessibility;
  const totalImages = homeA11y.imagesWithAlt + homeA11y.imagesWithoutAlt;
  if (totalImages > 0 && homeA11y.imagesWithoutAlt > 0) {
    const pct = Math.round((homeA11y.imagesWithoutAlt / totalImages) * 100);
    recs.push({ id: nextId(), category: 'Accessibility', title: `Add alt text to images (${pct}% missing)`,
      description: `${homeA11y.imagesWithoutAlt} images lack alt text. Alt text is required for screen readers and also helps SEO. Add descriptive alt attributes to all meaningful images.`,
      impact: homeA11y.imagesWithoutAlt > 5 ? 'High' : 'Medium', effort: 'Low', priority: 3 });
  }

  if (homeA11y.missingLangAttr) {
    recs.push({ id: nextId(), category: 'Accessibility', title: 'Add lang attribute to <html>',
      description: 'The page is missing a lang attribute on the <html> element. Screen readers use this to determine the correct language for text-to-speech synthesis.',
      impact: 'Medium', effort: 'Low', priority: 4 });
  }

  if (homeA11y.headingOrderIssues > 0) {
    recs.push({ id: nextId(), category: 'Accessibility', title: 'Fix heading hierarchy order',
      description: `${homeA11y.headingOrderIssues} heading level skip(s) detected (e.g., H1 → H3). Proper heading order helps screen reader users navigate content. Use H1 → H2 → H3 in sequence.`,
      impact: 'Medium', effort: 'Low', priority: 5 });
  }

  // ── Advanced SEO ──────────────────────────────────────────────────────
  const allSchemaTypes = [...new Set(allPages.flatMap(p => p.schemaTypes ?? []))];
  if (allSchemaTypes.length === 0) {
    recs.push({ id: nextId(), category: 'SEO', title: 'Add structured data markup (JSON-LD)',
      description: 'No schema markup detected. Adding Organization, Product, FAQ, or BreadcrumbList schema enables rich results in Google — star ratings, FAQs, sitelinks — which can increase click-through rate by 20–30%.',
      impact: 'High', effort: 'Low', priority: 1 });
  }

  if (!home.ogTags?.image) {
    recs.push({ id: nextId(), category: 'SEO', title: 'Add Open Graph image for social sharing',
      description: 'No Open Graph image set. Links shared on LinkedIn, Twitter/X, and Facebook without a custom 1200×630px image receive significantly fewer clicks and look unpolished. This is a 30-minute fix with outsized impact.',
      impact: 'Medium', effort: 'Low', priority: 5 });
  }

  if ((metrics.duplicateTitles ?? []).length > 0) {
    recs.push({ id: nextId(), category: 'Technical', title: `Fix ${metrics.duplicateTitles!.length} duplicate page title(s)`,
      description: `${metrics.duplicateTitles!.length} page title(s) appear on multiple pages. Duplicate titles confuse search engines about which page to rank for a given query and reduce SEO authority for all affected pages.`,
      impact: 'Medium', effort: 'Low', priority: 4 });
  }

  if ((metrics.duplicateMetas ?? []).length > 0) {
    recs.push({ id: nextId(), category: 'Technical', title: `Fix ${metrics.duplicateMetas!.length} duplicate meta description(s)`,
      description: `${metrics.duplicateMetas!.length} meta description(s) are shared across multiple pages. Each page needs a unique description to maximize click-through rates. Generic or copied descriptions signal low content quality to search engines.`,
      impact: 'Medium', effort: 'Low', priority: 5 });
  }

  if ((metrics.brokenLinks ?? []).length > 0) {
    const bl = metrics.brokenLinks!.length;
    recs.push({ id: nextId(), category: 'Technical', title: `Fix ${bl} broken internal link${bl > 1 ? 's' : ''}`,
      description: `${bl} broken internal link(s) detected. Broken links frustrate visitors, waste search engine crawl budget, and signal poor site maintenance. Fix or redirect affected URLs immediately.`,
      impact: bl > 3 ? 'High' : 'Medium', effort: 'Low', priority: bl > 3 ? 2 : 5 });
  }

  // ── Advanced CRO ──────────────────────────────────────────────────────
  const totalTestimonials = allPages.reduce((s, p) => s + (p.testimonialCount ?? 0), 0);
  if (totalTestimonials < 3) {
    recs.push({ id: nextId(), category: 'CRO', title: 'Add customer testimonials and social proof',
      description: `Only ${totalTestimonials} testimonial block(s) detected. Sites with 10+ testimonials, case study snippets, or review counts see 15–30% higher conversion rates. Include name, company, photo, and a specific measurable outcome for maximum credibility.`,
      impact: 'High', effort: 'Medium', priority: 2 });
  }

  const hasAnyVideo = home.hasVideo || allPages.some(p => p.hasVideo);
  if (!hasAnyVideo) {
    recs.push({ id: nextId(), category: 'CRO', title: 'Add explainer or demo video',
      description: 'No video content detected. Product explainer and demo videos increase homepage conversions by 20–80% on average. A 60–90 second video communicates value faster than any amount of text, especially for complex products.',
      impact: 'High', effort: 'Medium', priority: 2 });
  }

  const hasFAQAnywhere = home.hasFAQ || allPages.some(p => p.hasFAQ);
  if (!hasFAQAnywhere) {
    recs.push({ id: nextId(), category: 'CRO', title: 'Add FAQ section with FAQ schema',
      description: 'No FAQ section detected. FAQs directly address buyer objections before they become blockers, reduce pre-sales support volume by 20–40%, and when marked up with FAQPage schema, appear as expandable rich results in Google search.',
      impact: 'Medium', effort: 'Low', priority: 4 });
  }

  if (!(metrics.hasNewsletterCapture ?? false)) {
    recs.push({ id: nextId(), category: 'CRO', title: 'Add email newsletter or lead capture',
      description: 'No email capture found. Email lists consistently deliver the highest ROI of any marketing channel (~$42 per $1 spent). A simple signup form with a lead magnet (checklist, guide, discount) can add thousands of subscribers per year.',
      impact: 'Medium', effort: 'Low', priority: 5 });
  }

  if (!(metrics.hasCaseStudiesPage ?? false) && (metrics.siteType === 'saas' || metrics.siteType === 'agency')) {
    recs.push({ id: nextId(), category: 'Content', title: 'Create customer case studies',
      description: 'No case studies page found. For B2B and SaaS, case studies are the highest-converting content type — 73% of B2B buyers say case studies influenced their purchase decision. One detailed case study with specific ROI figures outperforms dozens of feature pages.',
      impact: 'High', effort: 'High', priority: 3 });
  }

  if (!(metrics.hasAboutPage ?? false)) {
    recs.push({ id: nextId(), category: 'CRO', title: 'Add About / Team page',
      description: 'No About or Team page detected. About pages are often the 2nd or 3rd most-visited page on B2B sites. Founder stories, team photos, and company mission build trust with buyers who are evaluating vendors.',
      impact: 'Medium', effort: 'Low', priority: 6 });
  }

  // ── Performance ───────────────────────────────────────────────────────
  if (metrics.totalScripts > 15) {
    recs.push({ id: nextId(), category: 'Performance', title: `Reduce JavaScript load (${metrics.totalScripts} scripts)`,
      description: 'Excessive third-party scripts increase load time and affect Core Web Vitals. Audit your tag manager for unused scripts. Each 100ms of delay reduces conversions ~1%.',
      impact: 'High', effort: 'Medium', priority: 4 });
  }

  if (metrics.totalImages > 50) {
    recs.push({ id: nextId(), category: 'Performance', title: `Optimize images (${metrics.totalImages} detected)`,
      description: 'Many images detected. Use modern formats (WebP/AVIF), appropriate sizing, and lazy loading. Images are typically the #1 source of unnecessary page weight.',
      impact: 'Medium', effort: 'Medium', priority: 5 });
  }

  if (metrics.isJsRendered) {
    recs.push({ id: nextId(), category: 'Technical', title: 'Add server-side rendering or static generation',
      description: 'This site appears to be JavaScript-rendered (thin HTML, heavy scripts). Search engines and users on slow connections may see a blank page. Consider SSR or SSG for critical content.',
      impact: 'High', effort: 'High', priority: 2 });
  }

  if (metrics.performance.source === 'pagespeed' && metrics.performance.performanceScore !== undefined) {
    const perf = metrics.performance.performanceScore;
    if (perf < 50) {
      recs.push({ id: nextId(), category: 'Performance', title: `Critical performance issues (PageSpeed: ${perf}/100)`,
        description: `PageSpeed score of ${perf}/100 is critically low. Focus on LCP (${metrics.performance.lcp ? (metrics.performance.lcp / 1000).toFixed(1) + 's' : 'unknown'}) and eliminating render-blocking resources. Every 100ms of load time delay reduces conversions by ~1%.`,
        impact: 'High', effort: 'High', priority: 1 });
    } else if (perf < 75) {
      recs.push({ id: nextId(), category: 'Performance', title: `Improve page speed score (${perf}/100)`,
        description: `PageSpeed score of ${perf}/100 has room for improvement. LCP of ${metrics.performance.lcp ? (metrics.performance.lcp / 1000).toFixed(1) + 's' : '?'} and CLS of ${metrics.performance.cls ?? '?'} affect Core Web Vitals rankings. Optimizing images, deferring non-critical JS, and enabling compression are common quick wins.`,
        impact: 'Medium', effort: 'Medium', priority: 5 });
    }
  }

  // ── Deep Analysis Recommendations ─────────────────────────────────────────

  // Image format optimization
  const totalImgFormats = allPages.reduce((s, p) => s + (p.imageFormats?.total ?? 0), 0);
  const modernImgs = allPages.reduce((s, p) => s + (p.imageFormats?.webp ?? 0) + (p.imageFormats?.avif ?? 0), 0);
  if (totalImgFormats > 5 && modernImgs / totalImgFormats < 0.3) {
    const pct = Math.round((modernImgs / totalImgFormats) * 100);
    recs.push({ id: nextId(), category: 'Performance', title: `Convert images to WebP/AVIF (only ${pct}% modern format)`,
      description: `Only ${pct}% of images use modern formats (WebP/AVIF). Converting from JPEG/PNG reduces image size by 25–50% with no visual quality loss. This directly improves Core Web Vitals (LCP) and reduces page load time — especially on mobile. Tools: Squoosh, Sharp (Node.js), or build pipeline plugins.`,
      impact: 'High', effort: 'Medium', priority: 3 });
  }

  // Lazy loading
  const totalImgs = allPages.reduce((s, p) => s + (p.imageFormats?.total ?? 0), 0);
  const lazyImgs = allPages.reduce((s, p) => s + (p.imageFormats?.lazy ?? 0), 0);
  if (totalImgs > 10 && lazyImgs / totalImgs < 0.5) {
    recs.push({ id: nextId(), category: 'Performance', title: 'Add lazy loading to images',
      description: `Only ${Math.round((lazyImgs / Math.max(1, totalImgs)) * 100)}% of images use lazy loading (\`loading="lazy"\`). Adding this attribute defers off-screen images until needed, reducing initial page load time and bandwidth. Takes 30 minutes to implement and improves LCP scores for content-heavy pages.`,
      impact: 'Medium', effort: 'Low', priority: 4 });
  }

  // Readability
  const avgReadability = metrics.avgReadabilityScore;
  if (avgReadability !== undefined) {
    if (avgReadability < 30) {
      recs.push({ id: nextId(), category: 'Content', title: 'Simplify content for broader audience reach',
        description: `Average readability score is ${avgReadability}/100 (very difficult — college graduate level). Marketing copy should target 50–70 on the Flesch Reading Ease scale. Shorter sentences, simpler words, and clear benefits rather than technical jargon will significantly improve conversion rates and time-on-page.`,
        impact: 'High', effort: 'Medium', priority: 3 });
    } else if (avgReadability < 45) {
      recs.push({ id: nextId(), category: 'Content', title: 'Improve content readability and clarity',
        description: `Content readability score of ${avgReadability}/100 is below optimal. Complex language reduces comprehension for ~40% of readers and increases bounce rates. Aim for a score of 50–70: shorter sentences (max 20 words), active voice, and concrete benefit statements instead of abstract feature descriptions.`,
        impact: 'Medium', effort: 'Medium', priority: 5 });
    }
  }

  // Orphan pages
  const orphans = metrics.orphanPages ?? [];
  if (orphans.length > 0) {
    recs.push({ id: nextId(), category: 'SEO', title: `Fix ${orphans.length} orphan page${orphans.length > 1 ? 's' : ''} (no internal links)`,
      description: `${orphans.length} page(s) have no internal links pointing to them: orphan pages receive no "link equity" from your site and are unlikely to rank. Add contextual links from relevant pages or your navigation. Common cause: blog posts, landing pages, or old content that was never linked from anywhere.`,
      impact: orphans.length > 2 ? 'High' : 'Medium', effort: 'Low', priority: orphans.length > 2 ? 2 : 5 });
  }

  // Contact info
  const hasAnyContactInfo = allPages.some(p => p.contactInfo?.hasEmail || p.contactInfo?.hasPhone);
  if (!hasAnyContactInfo) {
    recs.push({ id: nextId(), category: 'CRO', title: 'Add visible email address or phone number',
      description: 'No email address or phone number detected across the site. Visible contact details build trust and reduce friction for high-intent buyers, especially in B2B. Even a simple email in the footer or header can meaningfully increase demo requests and direct inquiries. Sites with visible contact info see up to 30% higher trust scores.',
      impact: 'Medium', effort: 'Low', priority: 4 });
  }

  // Content freshness
  const freshPages = allPages.filter(p => p.contentFreshness?.datePublished || p.contentFreshness?.dateModified).length;
  if (allPages.length >= 3 && freshPages === 0) {
    recs.push({ id: nextId(), category: 'SEO', title: 'Add publication dates to content pages',
      description: 'No publication or modification dates detected on any pages. Adding datePublished/dateModified in JSON-LD schema and <time> elements signals content freshness to search engines. Google uses content freshness as a ranking factor — especially for queries with "recent" or "best" intent. Also improves CTR by showing publication dates in search snippets.',
      impact: 'Medium', effort: 'Low', priority: 6 });
  }

  // Above-the-fold CTA
  if (!home.aboveFoldCTA && home.ctaCandidates.length > 0) {
    recs.push({ id: nextId(), category: 'CRO', title: 'Move primary CTA above the fold',
      description: 'CTAs exist on the page but none appear in the hero/above-the-fold area. The first visible section is the highest-converting real estate on your site — visitors who have to scroll to find a CTA convert at significantly lower rates. Place your primary CTA (button or form) within the first 600px of page height.',
      impact: 'High', effort: 'Low', priority: 2 });
  }

  // Responsive images / srcset
  const withSrcset = allPages.reduce((s, p) => s + (p.imageFormats?.withSrcset ?? 0), 0);
  if (totalImgs > 10 && withSrcset / totalImgs < 0.4) {
    recs.push({ id: nextId(), category: 'Performance', title: 'Add responsive images with srcset',
      description: `Only ${Math.round((withSrcset / Math.max(1, totalImgs)) * 100)}% of images use srcset for responsive serving. Without srcset, mobile users download desktop-sized images — wasting bandwidth and hurting load times. Add srcset with 2–3 size variants (e.g., 400w, 800w, 1200w). Especially critical for hero and product images.`,
      impact: 'Medium', effort: 'Medium', priority: 6 });
  }

  return recs
    .sort((a, b) => {
      const iW = { High: 3, Medium: 2, Low: 1 };
      const eW = { Low: 3, Medium: 2, High: 1 };
      return (iW[b.impact] * 2 + eW[b.effort]) - (iW[a.impact] * 2 + eW[a.effort]);
    })
    .slice(0, 15)
    .map((r, i) => ({ ...r, priority: i + 1 }));
}
