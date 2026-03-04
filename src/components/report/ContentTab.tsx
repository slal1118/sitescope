'use client';

import {
  BookOpen, Tag, ImageIcon, Calendar, Mail, Phone, MousePointerClick,
  ExternalLink, CheckCircle2, XCircle, AlertCircle, TrendingUp, Link2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { scoreColor, scoreBg, cn } from '@/lib/utils';
import type { Report } from '@/lib/types';

function ReadabilityLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'Very Easy', color: 'text-emerald-600' };
  if (score >= 60) return { label: 'Easy', color: 'text-emerald-500' };
  if (score >= 50) return { label: 'Standard', color: 'text-blue-600' };
  if (score >= 40) return { label: 'Fairly Difficult', color: 'text-amber-600' };
  if (score >= 30) return { label: 'Difficult', color: 'text-orange-600' };
  return { label: 'Very Difficult', color: 'text-red-500' };
}

function ReadabilityBar({ score }: { score: number }) {
  const { label, color } = ReadabilityLabel(score);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className={`text-xs font-medium ${color}`}>{label}</span>
        <span className="text-xs text-slate-400">{score}/100</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${score >= 50 ? 'bg-emerald-400' : score >= 35 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function ContentTab({ report }: { report: Report }) {
  const { siteMetrics: m } = report;
  const home = m.crawledPages[0];
  const allPages = m.crawledPages;

  if (!home) return null;

  // Aggregate image format stats
  const totalWebp = allPages.reduce((s, p) => s + (p.imageFormats?.webp ?? 0), 0);
  const totalAvif = allPages.reduce((s, p) => s + (p.imageFormats?.avif ?? 0), 0);
  const totalJpeg = allPages.reduce((s, p) => s + (p.imageFormats?.jpeg ?? 0), 0);
  const totalPng = allPages.reduce((s, p) => s + (p.imageFormats?.png ?? 0), 0);
  const totalSvg = allPages.reduce((s, p) => s + (p.imageFormats?.svg ?? 0), 0);
  const totalImgs = allPages.reduce((s, p) => s + (p.imageFormats?.total ?? 0), 0);
  const totalLazy = allPages.reduce((s, p) => s + (p.imageFormats?.lazy ?? 0), 0);
  const totalSrcset = allPages.reduce((s, p) => s + (p.imageFormats?.withSrcset ?? 0), 0);
  const modernPct = totalImgs > 0 ? Math.round(((totalWebp + totalAvif) / totalImgs) * 100) : 0;
  const lazyPct = totalImgs > 0 ? Math.round((totalLazy / totalImgs) * 100) : 0;
  const srcsetPct = totalImgs > 0 ? Math.round((totalSrcset / totalImgs) * 100) : 0;

  // Freshness
  const freshPages = allPages.filter(p => p.contentFreshness?.datePublished || p.contentFreshness?.dateModified);
  const totalTimeEls = allPages.reduce((s, p) => s + (p.contentFreshness?.timeElementsCount ?? 0), 0);

  // Contact
  const pagesWithEmail = allPages.filter(p => p.contactInfo?.hasEmail).length;
  const pagesWithPhone = allPages.filter(p => p.contactInfo?.hasPhone).length;

  // External links
  const totalExternal = allPages.reduce((s, p) => s + (p.externalLinks?.count ?? 0), 0);
  const totalNofollow = allPages.reduce((s, p) => s + (p.externalLinks?.nofollowCount ?? 0), 0);
  const allAuthorityDomains = [...new Set(allPages.flatMap(p => p.externalLinks?.authorityDomains ?? []))];

  // Keywords
  const siteKeywords = m.siteKeywords ?? [];
  const maxKwCount = siteKeywords[0]?.count ?? 1;

  // Readability
  const avgReadability = m.avgReadabilityScore;

  // Above-fold CTA
  const aboveFoldPages = allPages.filter(p => p.aboveFoldCTA).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Score banner */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Content Intelligence</p>
            <p className="text-2xl font-bold text-indigo-700">Deep Analysis</p>
            <p className="text-xs text-slate-500 mt-1">
              {allPages.length} page{allPages.length !== 1 ? 's' : ''} analyzed
              {totalImgs > 0 && ` · ${totalImgs} images`}
              {siteKeywords.length > 0 && ` · ${siteKeywords.length} keywords`}
            </p>
          </div>
          <BookOpen className="w-10 h-10 text-indigo-200" />
        </div>
      </div>

      {/* Site Keywords */}
      {siteKeywords.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" />
              Top Site Keywords
            </CardTitle>
            <CardDescription>Most frequent meaningful terms across all crawled pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {siteKeywords.slice(0, 12).map(({ word, count }) => (
                <div key={word} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-700 w-28 shrink-0 capitalize">{word}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${Math.max(4, (count / maxKwCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-8 text-right shrink-0">{count}×</span>
                </div>
              ))}
            </div>
            {home.topKeywords && home.topKeywords.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-50">
                <p className="text-xs font-medium text-slate-500 mb-2">Homepage keyword density</p>
                <div className="flex flex-wrap gap-1.5">
                  {home.topKeywords.map(kw => (
                    <Badge key={kw.word} variant="secondary" className="text-xs font-mono">
                      {kw.word}
                      <span className="ml-1 text-slate-400">{kw.density}%</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Readability */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            Content Readability
            {avgReadability !== undefined && (
              <Badge
                variant="secondary"
                className={`ml-auto text-xs ${avgReadability >= 50 ? 'bg-emerald-100 text-emerald-700' : avgReadability >= 35 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}
              >
                Avg: {avgReadability}/100
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Flesch-Kincaid Reading Ease · 60–70 is ideal for marketing copy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {avgReadability !== undefined && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 mb-2">Site average</p>
                <ReadabilityBar score={avgReadability} />
                <p className="text-xs text-slate-400 mt-2">
                  {avgReadability >= 60
                    ? 'Content is easy to read — great for broad audience reach.'
                    : avgReadability >= 45
                    ? 'Content is moderately complex. Consider simplifying for better conversion.'
                    : 'Content is difficult to read. Shorter sentences and simpler words will improve engagement.'}
                </p>
              </div>
            )}
            {allPages.filter(p => p.readabilityScore !== undefined).map(page => {
              const score = page.readabilityScore!;
              const { label, color } = ReadabilityLabel(score);
              return (
                <div key={page.url} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-500 truncate">
                      /{new URL(page.url).pathname.slice(1) || '(home)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-20">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${score >= 50 ? 'bg-emerald-400' : score >= 35 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs font-medium w-8 text-right ${color}`}>{score}</span>
                    <span className="text-[10px] text-slate-400 w-20 hidden sm:block">{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Image Optimization */}
      {totalImgs > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-400" />
              Image Optimization
              <Badge
                variant="secondary"
                className={`ml-auto text-xs ${modernPct >= 70 ? 'bg-emerald-100 text-emerald-700' : modernPct >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}
              >
                {modernPct}% modern format
              </Badge>
            </CardTitle>
            <CardDescription>{totalImgs} images detected across {allPages.length} pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-2xl font-bold text-emerald-600">{totalWebp + totalAvif}</p>
                <p className="text-xs text-slate-500 mt-0.5">Modern (WebP/AVIF)</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-2xl font-bold text-slate-600">{totalJpeg}</p>
                <p className="text-xs text-slate-500 mt-0.5">JPEG (legacy)</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-2xl font-bold text-slate-600">{totalPng}</p>
                <p className="text-xs text-slate-500 mt-0.5">PNG (legacy)</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-2xl font-bold text-slate-600">{totalSvg}</p>
                <p className="text-xs text-slate-500 mt-0.5">SVG (vector)</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Modern formats (WebP/AVIF)</span>
                  <span className={modernPct >= 70 ? 'text-emerald-600 font-medium' : modernPct >= 30 ? 'text-amber-600' : 'text-red-500 font-medium'}>{modernPct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${modernPct >= 70 ? 'bg-emerald-400' : modernPct >= 30 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${modernPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Lazy loaded</span>
                  <span className={lazyPct >= 60 ? 'text-emerald-600 font-medium' : 'text-slate-500'}>{lazyPct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${lazyPct >= 60 ? 'bg-emerald-400' : 'bg-slate-300'}`} style={{ width: `${lazyPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Responsive (srcset)</span>
                  <span className={srcsetPct >= 60 ? 'text-emerald-600 font-medium' : 'text-slate-500'}>{srcsetPct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${srcsetPct >= 60 ? 'bg-emerald-400' : 'bg-slate-300'}`} style={{ width: `${srcsetPct}%` }} />
                </div>
              </div>
            </div>
            {modernPct < 30 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-xs text-amber-700 font-medium">Optimization opportunity</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Converting {totalJpeg + totalPng} JPEG/PNG images to WebP would reduce file sizes by ~35% and improve Core Web Vitals (LCP).
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content Freshness */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            Content Freshness
            <Badge
              variant="secondary"
              className={`ml-auto text-xs ${freshPages.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
            >
              {freshPages.length}/{allPages.length} pages with dates
            </Badge>
          </CardTitle>
          <CardDescription>Date signals help search engines understand content recency</CardDescription>
        </CardHeader>
        <CardContent>
          {freshPages.length === 0 ? (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">No publication dates detected</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Add <code className="bg-amber-100 px-1 rounded">datePublished</code> / <code className="bg-amber-100 px-1 rounded">dateModified</code> in JSON-LD schema markup.
                  Content freshness is a ranking factor, especially for &ldquo;best&rdquo; and &ldquo;latest&rdquo; queries.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {freshPages.map(page => (
                <div key={page.url} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-600 truncate">
                      /{new URL(page.url).pathname.slice(1) || '(home)'}
                    </p>
                    <div className="flex gap-3 mt-0.5">
                      {page.contentFreshness?.datePublished && (
                        <span className="text-[10px] text-slate-400">
                          Published: {new Date(page.contentFreshness.datePublished).toLocaleDateString()}
                        </span>
                      )}
                      {page.contentFreshness?.dateModified && (
                        <span className="text-[10px] text-slate-400">
                          Modified: {new Date(page.contentFreshness.dateModified).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {totalTimeEls > 0 && (
                <p className="text-xs text-slate-400 pt-1">
                  {totalTimeEls} <code>&lt;time&gt;</code> element{totalTimeEls !== 1 ? 's' : ''} found across all pages
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact & CTA Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              Contact Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-700">Email detected</span>
              </div>
              {pagesWithEmail > 0
                ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">{pagesWithEmail} page{pagesWithEmail > 1 ? 's' : ''}</Badge>
                : <Badge variant="secondary" className="text-xs text-slate-400">None found</Badge>
              }
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-700">Phone detected</span>
              </div>
              {pagesWithPhone > 0
                ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">{pagesWithPhone} page{pagesWithPhone > 1 ? 's' : ''}</Badge>
                : <Badge variant="secondary" className="text-xs text-slate-400">None found</Badge>
              }
            </div>
            {pagesWithEmail === 0 && pagesWithPhone === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                No contact info found. Visible email/phone builds trust and increases direct inquiries by up to 30%.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-slate-400" />
              Above-Fold CTA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-2">
              <p className={`text-3xl font-bold ${aboveFoldPages > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {aboveFoldPages}/{allPages.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">pages with CTA above the fold</p>
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center">
              {aboveFoldPages === 0
                ? 'No above-fold CTAs detected. Move primary CTAs into the hero section — visitors who scroll to find them convert at significantly lower rates.'
                : aboveFoldPages === allPages.length
                ? 'Great — all pages have CTAs visible without scrolling.'
                : `${allPages.length - aboveFoldPages} page${allPages.length - aboveFoldPages > 1 ? 's' : ''} missing above-fold CTA.`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* External Links */}
      {totalExternal > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-slate-400" />
              External Link Profile
            </CardTitle>
            <CardDescription>Outbound links signal to search engines what you cite as credible sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-700">{totalExternal}</p>
                <p className="text-xs text-slate-400 mt-1">Total external links</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${totalNofollow / totalExternal > 0.7 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {Math.round((totalNofollow / totalExternal) * 100)}%
                </p>
                <p className="text-xs text-slate-400 mt-1">Nofollow</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${allAuthorityDomains.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {allAuthorityDomains.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">Authority domains</p>
              </div>
            </div>
            {allAuthorityDomains.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Authority sources linked</p>
                <div className="flex flex-wrap gap-1.5">
                  {allAuthorityDomains.map(d => (
                    <Badge key={d} variant="secondary" className="text-xs font-mono">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Per-page Content Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            Per-Page Content Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-slate-400 font-medium pr-3">Page</th>
                  <th className="text-right py-2 text-slate-400 font-medium px-2">Words</th>
                  <th className="text-right py-2 text-slate-400 font-medium px-2">Read.</th>
                  <th className="text-right py-2 text-slate-400 font-medium px-2">Images</th>
                  <th className="text-center py-2 text-slate-400 font-medium px-2">Date</th>
                  <th className="text-center py-2 text-slate-400 font-medium px-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {allPages.map(page => {
                  const readability = page.readabilityScore;
                  const { color } = readability !== undefined ? ReadabilityLabel(readability) : { color: 'text-slate-400' };
                  return (
                    <tr key={page.url} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-3">
                        <p className="font-mono text-slate-600 truncate max-w-[120px]">
                          /{new URL(page.url).pathname.slice(1) || '(home)'}
                        </p>
                      </td>
                      <td className="text-right py-2 px-2 text-slate-600">{page.wordCount.toLocaleString()}</td>
                      <td className={`text-right py-2 px-2 font-medium ${color}`}>
                        {readability !== undefined ? readability : '—'}
                      </td>
                      <td className="text-right py-2 px-2 text-slate-600">{page.imageFormats?.total ?? page.imageCount}</td>
                      <td className="text-center py-2 px-2">
                        {(page.contentFreshness?.datePublished || page.contentFreshness?.dateModified)
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                          : <XCircle className="w-3.5 h-3.5 text-slate-200 mx-auto" />}
                      </td>
                      <td className="text-center py-2 px-2">
                        {page.contactInfo?.hasEmail
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                          : <XCircle className="w-3.5 h-3.5 text-slate-200 mx-auto" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
