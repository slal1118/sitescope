import { CheckCircle2, XCircle, AlertCircle, Globe, Link2, FileSearch, Map, Share2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { scoreColor, scoreBg, cn } from '@/lib/utils';
import type { Report } from '@/lib/types';

function StatusIcon({ passed, warning }: { passed: boolean; warning?: boolean }) {
  if (passed) return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (warning) return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
}

function SeoCheck({
  label,
  value,
  passed,
  warning,
  hint,
}: {
  label: string;
  value?: string | null;
  passed: boolean;
  warning?: boolean;
  hint: string;
}) {
  return (
    <div className="py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-start gap-3">
        <StatusIcon passed={passed} warning={warning} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{label}</p>
          {value && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              <span className="font-mono bg-slate-50 px-1 rounded text-slate-600">{value}</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function titleLengthVariant(len: number | null): 'success' | 'warning' | 'destructive' {
  if (len === null) return 'destructive';
  if (len >= 30 && len <= 70) return 'success';
  if (len > 0) return 'warning';
  return 'destructive';
}

export function SEOTab({ report }: { report: Report }) {
  const { siteMetrics: m, scores } = report;
  const home = m.crawledPages[0];

  if (!home) return null;

  const titleLen = home.title?.length ?? 0;
  const descLen = home.metaDescription?.length ?? 0;
  const avgInternalLinks =
    m.crawledPages.length > 0
      ? Math.round(m.crawledPages.reduce((s, p) => s + p.internalLinks.length, 0) / m.crawledPages.length)
      : 0;

  const checks = [
    {
      label: 'Title tag',
      value: home.title ? `"${home.title}" (${titleLen} chars)` : undefined,
      passed: !!home.title && titleLen >= 30 && titleLen <= 70,
      warning: !!home.title && (titleLen < 30 || titleLen > 70),
      hint:
        titleLen === 0
          ? 'No title tag found — critical SEO issue.'
          : titleLen < 30
          ? 'Title is too short. Aim for 50–70 characters.'
          : titleLen > 70
          ? 'Title may be truncated in SERPs. Keep under 70 chars.'
          : 'Title length is optimal (50–70 chars).',
    },
    {
      label: 'Meta description',
      value: home.metaDescription ? `"${home.metaDescription.slice(0, 80)}…" (${descLen} chars)` : undefined,
      passed: !!home.metaDescription && descLen >= 100 && descLen <= 160,
      warning: !!home.metaDescription && (descLen < 100 || descLen > 160),
      hint:
        descLen === 0
          ? 'No meta description — search engines will auto-generate one, often poorly.'
          : descLen < 100
          ? 'Description is short. Add more context (120–160 chars).'
          : descLen > 160
          ? 'Description may be truncated. Keep under 160 chars.'
          : 'Meta description length is optimal.',
    },
    {
      label: 'H1 tag',
      value: home.h1[0] ? `"${home.h1[0].slice(0, 60)}"` : undefined,
      passed: home.h1.length === 1,
      warning: home.h1.length > 1,
      hint:
        home.h1.length === 0
          ? 'No H1 found. Every page needs exactly one H1.'
          : home.h1.length > 1
          ? `${home.h1.length} H1 tags found. Use only one.`
          : 'H1 is present and unique.',
    },
    {
      label: 'Canonical URL',
      value: home.canonical ?? undefined,
      passed: !!home.canonical,
      hint: home.canonical
        ? 'Canonical tag is set, preventing duplicate content issues.'
        : 'Missing canonical tag — risk of duplicate content for URLs with query params.',
    },
    {
      label: 'Mobile viewport tag',
      passed: home.hasViewportMeta ?? false,
      hint: home.hasViewportMeta
        ? 'Viewport meta tag found — pages are mobile-responsive.'
        : 'No viewport meta tag. Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile.',
    },
    {
      label: 'XML Sitemap',
      passed: m.hasSitemap,
      hint: m.hasSitemap
        ? 'Sitemap.xml found — helps search engines discover all pages.'
        : 'No sitemap.xml found. Create one and submit to Google Search Console.',
    },
    {
      label: 'Robots.txt',
      passed: m.hasRobotsTxt,
      hint: m.hasRobotsTxt
        ? 'Robots.txt is accessible.'
        : 'No robots.txt found. Create one to control search engine crawling.',
    },
    {
      label: 'Internal linking',
      value: `~${avgInternalLinks} links/page avg`,
      passed: avgInternalLinks >= 8,
      warning: avgInternalLinks >= 3 && avgInternalLinks < 8,
      hint:
        avgInternalLinks < 3
          ? 'Very few internal links. Add contextual links between pages to distribute authority.'
          : avgInternalLinks < 8
          ? 'Internal linking could be stronger. Aim for 8+ per page.'
          : 'Good internal link density.',
    },
  ];

  const ogChecks = [
    {
      label: 'OG Title',
      value: home.ogTags?.title ?? undefined,
      passed: !!home.ogTags?.title,
      hint: home.ogTags?.title
        ? 'og:title is set — controls how the page appears when shared.'
        : 'Missing og:title. Add <meta property="og:title"> for social sharing.',
    },
    {
      label: 'OG Description',
      value: home.ogTags?.description ? `"${home.ogTags.description.slice(0, 80)}…"` : undefined,
      passed: !!home.ogTags?.description,
      hint: home.ogTags?.description
        ? 'og:description is set.'
        : 'Missing og:description. Add one for better social previews.',
    },
    {
      label: 'OG Image',
      value: home.ogTags?.image ? 'Image URL set' : undefined,
      passed: !!home.ogTags?.image,
      hint: home.ogTags?.image
        ? 'og:image is set — pages shared on social media will show a preview image.'
        : 'Missing og:image. Without it, social platforms show a blank or default thumbnail.',
    },
    {
      label: 'Twitter Card',
      passed: !!home.twitterCard,
      value: home.twitterCard ?? undefined,
      hint: home.twitterCard
        ? `Twitter card type: ${home.twitterCard}.`
        : 'No twitter:card meta tag. Add one for rich Twitter/X previews.',
    },
  ];

  const hasDuplicateTitles = (m.duplicateTitles?.length ?? 0) > 0;
  const hasDuplicateMetas = (m.duplicateMetas?.length ?? 0) > 0;
  const hasBrokenLinks = (m.brokenLinks?.length ?? 0) > 0;
  const hasOrphanPages = (m.orphanPages?.length ?? 0) > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Score summary */}
      <div className={cn('rounded-xl border p-5', scoreBg(scores.seo))}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">SEO Score</p>
            <p className={cn('text-4xl font-bold', scoreColor(scores.seo))}>{scores.seo}</p>
          </div>
          <Globe className={cn('w-10 h-10 opacity-20', scoreColor(scores.seo))} />
        </div>
      </div>

      {/* SEO checks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-slate-400" />
            On-Page SEO Analysis
          </CardTitle>
          <CardDescription>Based on crawl of {m.pagesCount} page{m.pagesCount !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {checks.map((c) => (
            <SeoCheck key={c.label} {...c} />
          ))}
        </CardContent>
      </Card>

      {/* Social / OG Tags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Share2 className="w-4 h-4 text-slate-400" />
            Social & Open Graph Tags
          </CardTitle>
          <CardDescription>Controls how pages appear when shared on social media</CardDescription>
        </CardHeader>
        <CardContent>
          {ogChecks.map((c) => (
            <SeoCheck key={c.label} {...c} />
          ))}
        </CardContent>
      </Card>

      {/* Duplicate titles / metas */}
      {(hasDuplicateTitles || hasDuplicateMetas) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Duplicate Content Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasDuplicateTitles && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Duplicate page titles ({m.duplicateTitles!.length})</p>
                <div className="space-y-1">
                  {m.duplicateTitles!.slice(0, 5).map((t, i) => (
                    <p key={i} className="text-xs font-mono bg-white border border-amber-100 rounded px-2 py-1 text-slate-600 truncate">
                      &ldquo;{t}&rdquo;
                    </p>
                  ))}
                </div>
              </div>
            )}
            {hasDuplicateMetas && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Duplicate meta descriptions ({m.duplicateMetas!.length})</p>
                <div className="space-y-1">
                  {m.duplicateMetas!.slice(0, 3).map((t, i) => (
                    <p key={i} className="text-xs font-mono bg-white border border-amber-100 rounded px-2 py-1 text-slate-600 truncate">
                      &ldquo;{t}&rdquo;
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Broken links */}
      {hasBrokenLinks && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              Broken Links ({m.brokenLinks!.length})
            </CardTitle>
            <CardDescription>Internal links that returned errors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {m.brokenLinks!.map((link, i) => (
                <div key={i} className="py-2 border-b border-red-50 last:border-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="destructive" className="text-[10px] h-4 shrink-0">
                      {link.statusCode === 0 ? 'Error' : link.statusCode}
                    </Badge>
                    <p className="text-xs font-mono text-slate-600 truncate">{link.url.replace(/https?:\/\/[^/]+/, '')}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 ml-0">Found on: <span className="font-mono">{link.foundOn.replace(/https?:\/\/[^/]+/, '') || '/'}</span></p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orphan pages */}
      {hasOrphanPages && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Orphan Pages ({m.orphanPages!.length})
            </CardTitle>
            <CardDescription>Pages with no incoming internal links — harder for search engines to discover</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {m.orphanPages!.slice(0, 8).map((url, i) => (
                <p key={i} className="text-xs font-mono bg-white border border-amber-100 rounded px-2 py-1 text-slate-600 truncate">
                  {url.replace(/https?:\/\/[^/]+/, '') || '/'}
                </p>
              ))}
              {m.orphanPages!.length > 8 && (
                <p className="text-xs text-slate-400 mt-1">+{m.orphanPages!.length - 8} more</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pages crawled */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Map className="w-4 h-4 text-slate-400" />
            Crawled Pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {m.crawledPages.map((page) => {
              const tLen = page.title?.length ?? null;
              return (
                <div key={page.url} className="flex items-start gap-3 text-xs py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-blue-600 hover:underline truncate block"
                    >
                      {page.url.replace(/https?:\/\//, '')}
                    </a>
                    {page.title && (
                      <p className="text-slate-500 mt-0.5 truncate">{page.title}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    <Badge variant={page.title ? 'success' : 'destructive'} className="text-[10px] h-4">
                      {page.title ? 'Title ✓' : 'No title'}
                    </Badge>
                    {tLen !== null && (
                      <Badge variant={titleLengthVariant(tLen)} className="text-[10px] h-4">
                        {tLen} chars
                      </Badge>
                    )}
                    <Badge variant={page.h1.length === 1 ? 'success' : 'warning'} className="text-[10px] h-4">
                      {page.h1.length === 1 ? 'H1 ✓' : `H1: ${page.h1.length}`}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Internal link map */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-400" />
            Internal Link Counts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {m.crawledPages.map((page) => (
              <div key={page.url} className="flex items-center gap-3">
                <p className="text-xs font-mono text-slate-500 flex-1 truncate">
                  /{new URL(page.url).pathname.slice(1) || '(home)'}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className="h-1.5 rounded-full bg-blue-200"
                    style={{ width: `${Math.min((page.internalLinks.length / 30) * 80, 80)}px` }}
                  />
                  <span className="text-xs text-slate-400 w-6 text-right">{page.internalLinks.length}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
