'use client';

import { useEffect, useState } from 'react';
import {
  FileText, Globe, Image, Code2, Link2, BookOpen, Sparkles, CheckCircle2,
  Clock, AlertTriangle, Zap, Eye, ShieldCheck, ShieldAlert, Type, Tag, TrendingUp, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Report } from '@/lib/types';
import type { HistoryEntry } from '@/app/api/history/[domain]/route';

function StatRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">{icon}</div>
      <span className="text-sm text-slate-600 flex-1">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-slate-900">{value}</span>
        {sub && <span className="text-xs text-slate-400 ml-1">{sub}</span>}
      </div>
    </div>
  );
}

function CheckRow({ label, passed, warn }: { label: string; passed: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${passed ? 'bg-emerald-100' : warn ? 'bg-amber-100' : 'bg-red-100'}`}>
        {passed ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className={`w-1.5 h-1.5 rounded-full ${warn ? 'bg-amber-500' : 'bg-red-400'}`} />}
      </div>
      <span className={`text-sm ${passed ? 'text-slate-700' : warn ? 'text-amber-700' : 'text-slate-400 line-through'}`}>{label}</span>
    </div>
  );
}

function fmtMs(ms?: number) {
  if (!ms) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function perfColor(score?: number) {
  if (!score) return 'text-slate-400';
  if (score >= 90) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-500';
}

function ScoreTrend({ history, currentId }: { history: HistoryEntry[]; currentId: string }) {
  if (history.length < 2) return null;

  // Oldest → newest, exclude current report from trend line
  const entries = [...history].reverse();
  const scores = entries.map(e => e.scores.overall);
  const min = Math.max(0, Math.min(...scores) - 5);
  const max = Math.min(100, Math.max(...scores) + 5);
  const range = max - min || 1;

  const W = 200, H = 48, PAD = 4;
  const pts = scores.map((s, i) => {
    const x = PAD + (i / (scores.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((s - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });

  const first = scores[0];
  const last = scores[scores.length - 1];
  const delta = last - first;
  const trendColor = delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#94a3b8';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          Score History
          <Badge variant="secondary" className="text-xs ml-auto">
            {history.length} scan{history.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 48 }}>
              <polyline
                points={pts.join(' ')}
                fill="none"
                stroke={trendColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {scores.map((s, i) => {
                const x = PAD + (i / (scores.length - 1)) * (W - PAD * 2);
                const y = H - PAD - ((s - min) / range) * (H - PAD * 2);
                const isCurrent = entries[i].id === currentId;
                return (
                  <circle key={i} cx={x} cy={y} r={isCurrent ? 4 : 2.5}
                    fill={isCurrent ? trendColor : '#fff'}
                    stroke={trendColor} strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-2xl font-bold ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-500'}`}>
              {delta > 0 ? '+' : ''}{delta}
            </p>
            <p className="text-xs text-slate-400">vs first scan</p>
          </div>
        </div>
        <div className="flex justify-between mt-2">
          {entries.map((e, i) => (
            <div key={e.id} className={`text-center ${i === entries.length - 1 ? '' : ''}`}>
              <p className={`text-xs font-medium ${e.id === currentId ? 'text-blue-600' : 'text-slate-500'}`}>{e.scores.overall}</p>
              <p className="text-[10px] text-slate-300">{new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ReportQuality {
  score: number;
  label: string;
  colorClass: string;
  barColor: string;
  reasons: Array<{ text: string; positive: boolean }>;
}

function computeReportQuality(report: Report): ReportQuality {
  const m = report.siteMetrics;
  let score = 0;
  const reasons: Array<{ text: string; positive: boolean }> = [];

  // Pages crawled — up to 40 pts
  const pages = m.pagesCount;
  if (pages >= 50) { score += 40; reasons.push({ text: `${pages} pages crawled`, positive: true }); }
  else if (pages >= 20) { score += 30; reasons.push({ text: `${pages} pages crawled`, positive: true }); }
  else if (pages >= 10) { score += 22; reasons.push({ text: `${pages} pages crawled`, positive: true }); }
  else if (pages >= 3)  { score += 15; reasons.push({ text: `Only ${pages} pages crawled`, positive: false }); }
  else                  { score += 8;  reasons.push({ text: 'Only homepage crawled', positive: false }); }

  // JS rendering — up to 20 pts
  if (m.isJsRendered) {
    if (m.jinaEnriched) { score += 20; reasons.push({ text: 'JS content fully rendered', positive: true }); }
    else                { reasons.push({ text: 'JS site — limited content extraction', positive: false }); }
  } else {
    score += 20;
    reasons.push({ text: 'Static/SSR site — full content extraction', positive: true });
  }

  // Performance data — up to 20 pts
  if (m.performance?.source === 'pagespeed') {
    score += 20;
    reasons.push({ text: 'Real PageSpeed Insights data', positive: true });
  } else {
    score += 5;
    reasons.push({ text: 'Estimated performance (no PSI key)', positive: false });
  }

  // Sitemap — 10 pts
  if (m.hasSitemap) { score += 10; reasons.push({ text: 'Sitemap found', positive: true }); }
  else              { reasons.push({ text: 'No sitemap detected', positive: false }); }

  // Robots.txt — 5 pts
  if (m.hasRobotsTxt) { score += 5; reasons.push({ text: 'robots.txt accessible', positive: true }); }

  // Security headers — 5 pts
  if (m.securityHeaders) { score += 5; }

  score = Math.min(100, score);

  let label: string;
  let colorClass: string;
  let barColor: string;
  if (score >= 90)      { label = 'Excellent'; colorClass = 'text-emerald-700'; barColor = 'bg-emerald-500'; }
  else if (score >= 75) { label = 'Good';      colorClass = 'text-blue-700';    barColor = 'bg-blue-500'; }
  else if (score >= 55) { label = 'Fair';      colorClass = 'text-amber-700';   barColor = 'bg-amber-500'; }
  else                  { label = 'Limited';   colorClass = 'text-red-600';     barColor = 'bg-red-400'; }

  return { score, label, colorClass, barColor, reasons };
}

export function OverviewTab({ report }: { report: Report }) {
  const { siteMetrics: m, aiInsights, scores } = report;
  const home = m.crawledPages[0];
  const perf = m.performance;
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    fetch(`/api/history/${encodeURIComponent(report.domain)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.history?.length > 1) setHistory(d.history); })
      .catch(() => {});
  }, [report.domain]);

  const quality = computeReportQuality(report);

  return (
    <div className="space-y-5">
      {/* JS-rendered warning / enrichment notice */}
      {m.isJsRendered && (
        <div className={`flex items-start gap-3 rounded-xl p-4 border ${m.jinaEnriched ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
          {m.jinaEnriched
            ? <Zap className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            : <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />}
          <div>
            <p className={`text-sm font-medium ${m.jinaEnriched ? 'text-blue-800' : 'text-amber-800'}`}>
              {m.jinaEnriched ? 'JavaScript app — content rendered for analysis' : 'JavaScript-rendered site detected'}
            </p>
            <p className={`text-sm mt-0.5 ${m.jinaEnriched ? 'text-blue-700' : 'text-amber-700'}`}>
              {m.jinaEnriched
                ? 'This is a client-rendered app. We fetched the fully rendered page content to accurately extract CTAs, links, images, and text. SEO metadata scores are based on the rendered HTML.'
                : 'This site renders content via JavaScript. Our crawler captured limited HTML. Scores may be lower than actual — consider server-side rendering (SSR) for better SEO.'}
            </p>
          </div>
        </div>
      )}

      {/* Report Data Quality */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            Report Accuracy
            <span className={`ml-auto text-base font-bold ${quality.colorClass}`}>{quality.score}%</span>
            <Badge variant="secondary" className={`text-xs ${quality.colorClass}`}>{quality.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
            <div className={`h-2 rounded-full transition-all ${quality.barColor}`} style={{ width: `${quality.score}%` }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {quality.reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${r.positive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {r.positive
                    ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    : <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                </div>
                <span className={`text-xs ${r.positive ? 'text-slate-700' : 'text-slate-400'}`}>{r.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Trend */}
      {history.length > 1 && <ScoreTrend history={history} currentId={report.id} />}

      {/* AI Summary */}
      {aiInsights ? (
        <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              AI Executive Summary
              {m.siteType !== 'unknown' && (
                <Badge variant="secondary" className="text-xs capitalize ml-auto">{m.siteType}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">{aiInsights.executiveSummary}</p>
            {aiInsights.targetAudience && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Target Audience</p>
                <p className="text-sm text-slate-600">{aiInsights.targetAudience}</p>
              </div>
            )}
            {aiInsights.topFindings.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Key Findings</p>
                <ul className="space-y-1.5">
                  {aiInsights.topFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-600 text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-100 bg-amber-50">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Lite Mode — AI insights disabled</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Add <code className="bg-amber-100 px-1 rounded text-xs">GROQ_API_KEY</code> to enable AI-powered summaries.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Site Stats */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Site Overview</CardTitle></CardHeader>
          <CardContent>
            <StatRow icon={<FileText className="w-3.5 h-3.5" />} label="Pages crawled" value={m.pagesCount} />
            <StatRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Total words" value={m.totalWords.toLocaleString()} />
            <StatRow icon={<Image className="w-3.5 h-3.5" />} label="Images detected" value={m.totalImages} />
            <StatRow icon={<Code2 className="w-3.5 h-3.5" />} label="Scripts loaded" value={m.totalScripts} />
            <StatRow icon={<Link2 className="w-3.5 h-3.5" />} label="Internal links" value={m.uniqueInternalLinks} />
            <StatRow icon={<Clock className="w-3.5 h-3.5" />} label="Crawl duration" value={`${(m.crawlDurationMs / 1000).toFixed(1)}s`} />
          </CardContent>
        </Card>

        {/* Health Checklist */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Site Health Checklist</CardTitle></CardHeader>
          <CardContent>
            <CheckRow label="Sitemap.xml present" passed={m.hasSitemap} />
            <CheckRow label="Robots.txt accessible" passed={m.hasRobotsTxt} />
            <CheckRow label="Homepage has H1" passed={(home?.h1.length ?? 0) > 0} />
            <CheckRow label="Homepage has title tag" passed={!!home?.title} />
            <CheckRow label="Meta description set" passed={!!home?.metaDescription} />
            <CheckRow label="Canonical tag present" passed={!!home?.canonical} />
            <CheckRow label="CTA on homepage" passed={(home?.ctaCandidates.length ?? 0) > 0} />
            <CheckRow label="Pricing page found" passed={m.hasPricingPage} />
            <CheckRow label="Images have alt text" passed={(home?.accessibility.imagesWithoutAlt ?? 1) === 0} warn={(home?.accessibility.imagesWithoutAlt ?? 0) > 0 && (home?.accessibility.imagesWithoutAlt ?? 0) < 5} />
            <CheckRow label="HTML lang attribute" passed={!(home?.accessibility.missingLangAttr ?? true)} />
          </CardContent>
        </Card>
      </div>

      {/* Content Intelligence Summary */}
      {(m.avgReadabilityScore !== undefined || (m.siteKeywords?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {m.avgReadabilityScore !== undefined && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Type className="w-4 h-4 text-blue-500" />
                  Content Readability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`text-4xl font-bold ${m.avgReadabilityScore >= 60 ? 'text-emerald-600' : m.avgReadabilityScore >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                    {m.avgReadabilityScore}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {m.avgReadabilityScore >= 70 ? 'Very Easy' : m.avgReadabilityScore >= 60 ? 'Easy' : m.avgReadabilityScore >= 50 ? 'Fairly Easy' : m.avgReadabilityScore >= 40 ? 'Standard' : m.avgReadabilityScore >= 30 ? 'Fairly Difficult' : 'Difficult'}
                    </p>
                    <p className="text-xs text-slate-400">Flesch-Kincaid avg across {m.pagesCount} pages</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.avgReadabilityScore >= 60 ? 'bg-emerald-500' : m.avgReadabilityScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(m.avgReadabilityScore, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {m.avgReadabilityScore >= 60 ? 'Great for general audiences.' : m.avgReadabilityScore >= 40 ? 'Suitable for educated readers. Aim for 60+ for broader reach.' : 'Content may be too complex. Simplify sentences and reduce jargon.'}
                </p>
              </CardContent>
            </Card>
          )}

          {(m.siteKeywords?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-500" />
                  Top Site Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {m.siteKeywords!.slice(0, 12).map((kw, i) => (
                    <Badge
                      key={kw.word}
                      variant="secondary"
                      className={`text-xs ${i < 3 ? 'bg-purple-100 text-purple-700 border-purple-200' : i < 6 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {kw.word}
                      <span className="ml-1 opacity-60 text-[10px]">{kw.count}</span>
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Most frequent words across all crawled pages (stopwords removed)</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Performance Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Performance
            <Badge variant="secondary" className="text-xs ml-auto">
              {perf.source === 'pagespeed' ? 'PageSpeed Insights' : 'Estimated'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {perf.performanceScore !== undefined ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${perfColor(perf.performanceScore)}`}>{perf.performanceScore}</p>
                  <p className="text-xs text-slate-400 mt-1">Score</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${perf.lcp && perf.lcp < 2500 ? 'text-emerald-600' : perf.lcp && perf.lcp < 4000 ? 'text-amber-600' : 'text-red-500'}`}>{fmtMs(perf.lcp)}</p>
                  <p className="text-xs text-slate-400 mt-1">LCP</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${perf.fcp && perf.fcp < 1800 ? 'text-emerald-600' : perf.fcp && perf.fcp < 3000 ? 'text-amber-600' : 'text-red-500'}`}>{fmtMs(perf.fcp)}</p>
                  <p className="text-xs text-slate-400 mt-1">FCP</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${perf.cls !== undefined && perf.cls < 0.1 ? 'text-emerald-600' : perf.cls !== undefined && perf.cls < 0.25 ? 'text-amber-600' : 'text-red-500'}`}>
                    {perf.cls !== undefined ? perf.cls.toFixed(3) : '—'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">CLS</p>
                </div>
              </div>
              {perf.source === 'estimated' && (
                <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Estimated from HTML analysis</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Scores are derived from render-blocking resources, compression, CDN, and lazy loading signals.
                      Add <code className="bg-white border border-slate-200 px-1 rounded font-mono">PAGESPEED_API_KEY</code> to your environment for lab-measured Core Web Vitals from Google.
                    </p>
                  </div>
                </div>
              )}
              {perf.source === 'pagespeed' && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Real data from Google PageSpeed Insights
                </p>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <StatRow icon={<Code2 className="w-3.5 h-3.5" />} label="Scripts loaded" value={perf.estimatedScripts} sub="est." />
              <StatRow icon={<Image className="w-3.5 h-3.5" />} label="Images" value={perf.estimatedImages} sub="est." />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accessibility Summary */}
      {home && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-500" />
              Accessibility Snapshot
              <span className={`ml-auto text-sm font-bold ${scores.accessibility >= 80 ? 'text-emerald-600' : scores.accessibility >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {scores.accessibility}/100
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{home.accessibility.imagesWithAlt}</p>
                <p className="text-xs text-slate-400 mt-1">Images with alt</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${home.accessibility.imagesWithoutAlt > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {home.accessibility.imagesWithoutAlt}
                </p>
                <p className="text-xs text-slate-400 mt-1">Missing alt text</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${home.accessibility.headingOrderIssues > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {home.accessibility.headingOrderIssues}
                </p>
                <p className="text-xs text-slate-400 mt-1">Heading order issues</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-700">{home.accessibility.ariaLabels}</p>
                <p className="text-xs text-slate-400 mt-1">ARIA elements</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${home.accessibility.missingLangAttr ? 'text-red-500' : 'text-emerald-600'}`}>
                  {home.accessibility.missingLangAttr ? 'No' : 'Yes'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Lang attribute</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Headers */}
      {m.securityHeaders && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              Security Headers
              <Badge variant="secondary" className="text-xs ml-auto">
                {[m.securityHeaders.https, m.securityHeaders.hsts, m.securityHeaders.csp, !!m.securityHeaders.xFrameOptions, m.securityHeaders.xContentTypeOptions, !!m.securityHeaders.referrerPolicy].filter(Boolean).length}/6 passed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {[
                { label: 'HTTPS', passed: m.securityHeaders.https, detail: m.securityHeaders.https ? 'Site uses HTTPS encryption.' : 'Site is not served over HTTPS — critical security issue.' },
                { label: 'HSTS', passed: m.securityHeaders.hsts, detail: m.securityHeaders.hsts ? 'Strict-Transport-Security header is set.' : 'Missing HSTS header. Browsers may allow HTTP connections.' },
                { label: 'Content Security Policy', passed: m.securityHeaders.csp, detail: m.securityHeaders.csp ? 'CSP header is set — helps prevent XSS attacks.' : 'No CSP header. Consider adding one to restrict resource origins.' },
                { label: 'X-Frame-Options', passed: !!m.securityHeaders.xFrameOptions, detail: m.securityHeaders.xFrameOptions ? `Set to: ${m.securityHeaders.xFrameOptions}` : 'Missing. Site may be vulnerable to clickjacking.' },
                { label: 'X-Content-Type-Options', passed: m.securityHeaders.xContentTypeOptions, detail: m.securityHeaders.xContentTypeOptions ? 'nosniff is set — prevents MIME-type sniffing.' : 'Missing. Add X-Content-Type-Options: nosniff.' },
                { label: 'Referrer-Policy', passed: !!m.securityHeaders.referrerPolicy, detail: m.securityHeaders.referrerPolicy ? `Set to: ${m.securityHeaders.referrerPolicy}` : 'No Referrer-Policy set. Consider adding one to control referrer info.' },
              ].map(({ label, passed, detail }) => (
                <div key={label} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${passed ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {passed
                      ? <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                      : <ShieldAlert className="w-2.5 h-2.5 text-red-500" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${passed ? 'text-slate-800' : 'text-slate-500'}`}>{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Homepage snapshot */}
      {home && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Homepage Snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {home.h1.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">H1 Headline</p>
                <p className="text-sm font-medium text-slate-800 bg-slate-50 rounded-lg p-3 border border-slate-100 italic">&ldquo;{home.h1[0]}&rdquo;</p>
              </div>
            )}
            {home.metaDescription && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Meta Description</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">{home.metaDescription}</p>
              </div>
            )}
            {home.ctaCandidates.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">CTAs Detected ({home.ctaCandidates.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {home.ctaCandidates.map((cta, i) => <Badge key={i} variant="secondary" className="text-xs">{cta}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
