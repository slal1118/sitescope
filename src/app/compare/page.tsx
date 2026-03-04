'use client';

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Search, Loader2, CheckCircle2, XCircle, AlertCircle,
  Globe, Zap, Eye, BookOpen, Code2, ShieldCheck, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Report } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScanState {
  url: string;
  jobId: string | null;
  reportId: string | null;
  status: 'idle' | 'pending' | 'running' | 'done' | 'error';
  stage: string;
  message: string;
  report: Report | null;
  cached: boolean;
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-600';
  if (s >= 60) return 'text-amber-600';
  return 'text-red-500';
}
function scoreBg(s: number) {
  if (s >= 80) return 'bg-emerald-50 border-emerald-200';
  if (s >= 60) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}
function diffColor(a: number, b: number) {
  if (a > b) return 'text-emerald-600 font-bold';
  if (a < b) return 'text-red-500 font-bold';
  return 'text-slate-600';
}

// ── Comparison row components ──────────────────────────────────────────────────

function ScoreCompare({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <div className="py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-slate-500">{label}</span>
        <div className="flex items-center gap-6">
          <span className={`text-sm w-8 text-right ${diffColor(a, b)}`}>{a}</span>
          <span className={`text-sm w-8 text-right ${diffColor(b, a)}`}>{b}</span>
        </div>
      </div>
      <div className="flex gap-1 items-center">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${a > b ? 'bg-emerald-500' : a === b ? 'bg-blue-400' : 'bg-amber-500'}`} style={{ width: `${a}%` }} />
        </div>
        <div className="w-2" />
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${b > a ? 'bg-emerald-500' : b === a ? 'bg-blue-400' : 'bg-amber-500'}`} style={{ width: `${b}%` }} />
        </div>
      </div>
    </div>
  );
}

function CheckCompare({ label, a, b }: { label: string; a: boolean; b: boolean }) {
  return (
    <div className="flex items-center py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500 flex-1">{label}</span>
      <div className="flex items-center gap-8">
        <div className="w-8 flex justify-center">{a ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-400" />}</div>
        <div className="w-8 flex justify-center">{b ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-400" />}</div>
      </div>
    </div>
  );
}

function NumCompare({ label, a, b, unit }: { label: string; a: number | string; b: number | string; unit?: string }) {
  const na = typeof a === 'number' ? a : null;
  const nb = typeof b === 'number' ? b : null;
  return (
    <div className="flex items-center py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500 flex-1">{label}</span>
      <div className="flex items-center gap-4">
        <span className={`text-sm w-16 text-right ${na !== null && nb !== null ? diffColor(na, nb) : 'text-slate-600'}`}>
          {a}{unit && <span className="text-xs text-slate-400 ml-0.5">{unit}</span>}
        </span>
        <span className={`text-sm w-16 text-right ${na !== null && nb !== null ? diffColor(nb, na) : 'text-slate-600'}`}>
          {b}{unit && <span className="text-xs text-slate-400 ml-0.5">{unit}</span>}
        </span>
      </div>
    </div>
  );
}

// ── Column header — shows loading OR report summary ──────────────────────────

function SiteColumn({ state, label }: { state: ScanState; label: string }) {
  const report = state.report;
  if (report) {
    return (
      <div className={`rounded-xl border p-4 ${scoreBg(report.scores.overall)}`}>
        <div className="flex items-start gap-3">
          {report.favicon && (
            <img src={report.favicon} alt="" className="w-8 h-8 rounded object-contain bg-white p-0.5 border border-slate-200" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{report.domain}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-slate-500 truncate">{report.url}</p>
              {state.cached && <Badge variant="secondary" className="text-[10px] shrink-0">Cached</Badge>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-3xl font-bold ${scoreColor(report.scores.overall)}`}>{report.scores.overall}</p>
            <p className="text-xs text-slate-400">overall</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 min-h-[80px] flex flex-col justify-between">
      <div>
        <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
        <p className="text-sm text-slate-600 truncate">{state.url || '—'}</p>
      </div>
      {(state.status === 'pending' || state.status === 'running') && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">{state.message || 'Scanning…'}</span>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full animate-pulse" style={{ width: '65%' }} />
          </div>
        </div>
      )}
      {state.status === 'error' && (
        <div className="mt-2 flex items-center gap-1.5 text-red-500">
          <XCircle className="w-3.5 h-3.5" />
          <span className="text-xs">Scan failed — {state.message}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const router = useRouter();
  const [urlA, setUrlA] = useState('');
  const [urlB, setUrlB] = useState('');
  const [scanning, setScanning] = useState(false);
  const [stateA, setStateA] = useState<ScanState>({ url: '', jobId: null, reportId: null, status: 'idle', stage: '', message: '', report: null, cached: false });
  const [stateB, setStateB] = useState<ScanState>({ url: '', jobId: null, reportId: null, status: 'idle', stage: '', message: '', report: null, cached: false });

  const startScan = async (url: string, set: Dispatch<SetStateAction<ScanState>>) => {
    set(prev => ({ ...prev, url, status: 'pending', message: 'Starting scan…' }));
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, forceRescan: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Scan failed');
      if (data.cached && data.reportId) {
        set(prev => ({ ...prev, reportId: data.reportId, status: 'running', message: 'Loading cached report…', cached: true }));
      } else {
        set(prev => ({ ...prev, jobId: data.jobId, status: 'running', message: 'Queued…' }));
      }
    } catch (err) {
      set(prev => ({ ...prev, status: 'error', message: err instanceof Error ? err.message : 'Scan failed' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlA || !urlB) return;
    setScanning(true);
    await Promise.all([startScan(urlA, setStateA), startScan(urlB, setStateB)]);
  };

  const pollJob = useCallback(async (state: ScanState, set: Dispatch<SetStateAction<ScanState>>) => {
    if (state.status === 'done' || state.status === 'error') return;

    if (state.reportId && !state.report) {
      try {
        const res = await fetch(`/api/report/${state.reportId}`);
        if (res.ok) {
          const { report } = await res.json();
          set(prev => ({ ...prev, report, status: 'done', message: 'Done' }));
        }
      } catch { /* retry */ }
      return;
    }

    if (state.jobId) {
      try {
        const res = await fetch(`/api/jobs/${state.jobId}`);
        const { job } = await res.json();
        if (!job) return;
        set(prev => ({ ...prev, stage: job.stage, message: job.message ?? '' }));
        if (job.status === 'done' && job.report_id) {
          set(prev => ({ ...prev, reportId: job.report_id, message: 'Loading report…' }));
          const rRes = await fetch(`/api/report/${job.report_id}`);
          if (rRes.ok) {
            const { report } = await rRes.json();
            set(prev => ({ ...prev, report, status: 'done', message: 'Done' }));
          }
        } else if (job.status === 'error') {
          set(prev => ({ ...prev, status: 'error', message: job.error ?? 'Scan failed' }));
        }
      } catch { /* retry */ }
    }
  }, []);

  useEffect(() => {
    if (!scanning) return;
    if (stateA.status === 'done' && stateB.status === 'done') return;
    if (stateA.status === 'error' && stateB.status === 'error') return;
    const timer = setInterval(() => {
      if (stateA.status !== 'done' && stateA.status !== 'error') pollJob(stateA, setStateA);
      if (stateB.status !== 'done' && stateB.status !== 'error') pollJob(stateB, setStateB);
    }, 2000);
    return () => clearInterval(timer);
  }, [scanning, stateA, stateB, pollJob]);

  const bothDone = !!(stateA.report && stateB.report);
  const anyError = stateA.status === 'error' || stateB.status === 'error';

  // ── Entry form ────────────────────────────────────────────────────────────

  if (!scanning) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div>
              <h1 className="text-base font-semibold text-slate-900">Compare Sites</h1>
              <p className="text-xs text-slate-400">Side-by-side analysis of two websites</p>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-6 py-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Competitor Analysis</h2>
            <p className="text-slate-500 text-sm">Enter two URLs for a detailed side-by-side comparison of SEO, CRO, performance, and more.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Site A</label>
                <input type="text" value={urlA} onChange={e => setUrlA(e.target.value)} placeholder="https://yoursite.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" required />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" /><span className="text-xs text-slate-400 font-medium">vs</span><div className="flex-1 h-px bg-slate-200" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Site B</label>
                <input type="text" value={urlB} onChange={e => setUrlB(e.target.value)} placeholder="https://competitor.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" required />
              </div>
            </div>
            <button type="submit" disabled={!urlA || !urlB}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
              <Search className="w-4 h-4" /> Compare Sites
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Results layout (progressive — always shown once scanning starts) ──────

  const a = stateA.report;
  const b = stateB.report;
  const homeA = a?.siteMetrics.crawledPages[0];
  const homeB = b?.siteMetrics.crawledPages[0];

  const overallWinner = a && b
    ? a.scores.overall > b.scores.overall ? 'A' : b.scores.overall > a.scores.overall ? 'B' : 'tie'
    : null;

  // Column labels for comparison sections — use domain if available
  const labelA = a?.domain ?? stateA.url;
  const labelB = b?.domain ?? stateB.url;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => { setScanning(false); setStateA(p => ({ ...p, status: 'idle', report: null })); setStateB(p => ({ ...p, status: 'idle', report: null })); }}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" /> New comparison
          </button>
          <h1 className="text-base font-semibold text-slate-900">Site Comparison</h1>
          <div className="text-xs text-slate-400">
            {bothDone ? 'Complete' : `Scanning${stateA.status === 'done' ? ` — ${a?.domain} done` : ''}…`}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {anyError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">One or more scans failed. Check that both URLs are valid and publicly accessible.</p>
          </div>
        )}

        {/* Winner banner — only when both done */}
        {bothDone && overallWinner && overallWinner !== 'tie' && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-5 text-white text-center">
            <p className="text-sm font-medium opacity-80 mb-1">Overall Winner</p>
            <p className="text-xl font-bold">{overallWinner === 'A' ? a!.domain : b!.domain}</p>
            <p className="text-sm opacity-80 mt-1">
              Score: {overallWinner === 'A' ? a!.scores.overall : b!.scores.overall} vs {overallWinner === 'A' ? b!.scores.overall : a!.scores.overall}
            </p>
          </div>
        )}

        {/* Column headers — show immediately with loading states */}
        <div className="grid grid-cols-2 gap-4">
          <SiteColumn state={stateA} label="Site A" />
          <SiteColumn state={stateB} label="Site B" />
        </div>

        {/* Score Breakdown — both done */}
        {bothDone && a && b && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  Score Breakdown
                  <div className="ml-auto flex items-center gap-6 text-xs">
                    <span className="font-semibold text-slate-700 w-8 text-right">{labelA.slice(0, 14)}</span>
                    <span className="font-semibold text-slate-700 w-8 text-right">{labelB.slice(0, 14)}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreCompare label="Overall" a={a.scores.overall} b={b.scores.overall} />
                <ScoreCompare label="SEO" a={a.scores.seo} b={b.scores.seo} />
                <ScoreCompare label="CRO" a={a.scores.cro} b={b.scores.cro} />
                <ScoreCompare label="Messaging" a={a.scores.messaging} b={b.scores.messaging} />
                <ScoreCompare label="Accessibility" a={a.scores.accessibility} b={b.scores.accessibility} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SEO Signals */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" />SEO Signals</CardTitle>
                </CardHeader>
                <CardContent>
                  <CheckCompare label="Title tag" a={!!homeA?.title} b={!!homeB?.title} />
                  <CheckCompare label="Meta description" a={!!homeA?.metaDescription} b={!!homeB?.metaDescription} />
                  <CheckCompare label="H1 tag" a={(homeA?.h1.length ?? 0) === 1} b={(homeB?.h1.length ?? 0) === 1} />
                  <CheckCompare label="Canonical URL" a={!!homeA?.canonical} b={!!homeB?.canonical} />
                  <CheckCompare label="Mobile viewport" a={homeA?.hasViewportMeta ?? false} b={homeB?.hasViewportMeta ?? false} />
                  <CheckCompare label="XML Sitemap" a={a.siteMetrics.hasSitemap} b={b.siteMetrics.hasSitemap} />
                  <CheckCompare label="Robots.txt" a={a.siteMetrics.hasRobotsTxt} b={b.siteMetrics.hasRobotsTxt} />
                  <CheckCompare label="OG Image" a={!!homeA?.ogTags?.image} b={!!homeB?.ogTags?.image} />
                </CardContent>
              </Card>

              {/* Site Metrics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-slate-400" />Site Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <NumCompare label="Pages crawled" a={a.siteMetrics.pagesCount} b={b.siteMetrics.pagesCount} />
                  <NumCompare label="Total words" a={a.siteMetrics.totalWords.toLocaleString()} b={b.siteMetrics.totalWords.toLocaleString()} />
                  <NumCompare label="Images" a={a.siteMetrics.totalImages} b={b.siteMetrics.totalImages} />
                  <NumCompare label="Scripts" a={a.siteMetrics.totalScripts} b={b.siteMetrics.totalScripts} />
                  <NumCompare label="Internal links" a={a.siteMetrics.uniqueInternalLinks} b={b.siteMetrics.uniqueInternalLinks} />
                  {a.siteMetrics.avgReadabilityScore !== undefined && b.siteMetrics.avgReadabilityScore !== undefined && (
                    <NumCompare label="Readability" a={a.siteMetrics.avgReadabilityScore} b={b.siteMetrics.avgReadabilityScore} unit="/100" />
                  )}
                  {a.siteMetrics.imageOptimizationScore !== undefined && b.siteMetrics.imageOptimizationScore !== undefined && (
                    <NumCompare label="Image optimization" a={a.siteMetrics.imageOptimizationScore} b={b.siteMetrics.imageOptimizationScore} unit="%" />
                  )}
                  {a.siteMetrics.performance.performanceScore !== undefined && b.siteMetrics.performance.performanceScore !== undefined && (
                    <NumCompare label="Performance score" a={a.siteMetrics.performance.performanceScore} b={b.siteMetrics.performance.performanceScore} unit="/100" />
                  )}
                </CardContent>
              </Card>

              {/* CRO Signals */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" />CRO Signals</CardTitle>
                </CardHeader>
                <CardContent>
                  <CheckCompare label="CTA on homepage" a={(homeA?.ctaCandidates.length ?? 0) > 0} b={(homeB?.ctaCandidates.length ?? 0) > 0} />
                  <CheckCompare label="Above-fold CTA" a={homeA?.aboveFoldCTA ?? false} b={homeB?.aboveFoldCTA ?? false} />
                  <CheckCompare label="Pricing page" a={a.siteMetrics.hasPricingPage} b={b.siteMetrics.hasPricingPage} />
                  <CheckCompare label="Contact page" a={a.siteMetrics.hasContactPage} b={b.siteMetrics.hasContactPage} />
                  <CheckCompare label="Blog / content" a={a.siteMetrics.hasBlogPage} b={b.siteMetrics.hasBlogPage} />
                  <CheckCompare label="Newsletter signup" a={a.siteMetrics.hasNewsletterCapture ?? false} b={b.siteMetrics.hasNewsletterCapture ?? false} />
                  <CheckCompare label="Testimonials" a={(homeA?.testimonialCount ?? 0) > 0} b={(homeB?.testimonialCount ?? 0) > 0} />
                  <CheckCompare label="Contact info" a={(homeA?.contactInfo?.hasEmail || homeA?.contactInfo?.hasPhone) ?? false} b={(homeB?.contactInfo?.hasEmail || homeB?.contactInfo?.hasPhone) ?? false} />
                </CardContent>
              </Card>

              {/* Tech Stack */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Code2 className="w-4 h-4 text-slate-400" />Tech Stack</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(['CMS', 'Framework', 'Analytics', 'Chat'] as const).map((type) => {
                      const getItems = (r: Report) => {
                        if (type === 'CMS') return r.siteMetrics.techStack.cms;
                        if (type === 'Framework') return r.siteMetrics.techStack.frameworks;
                        if (type === 'Analytics') return r.siteMetrics.techStack.trackers;
                        return r.siteMetrics.techStack.chatWidgets;
                      };
                      const itemsA = getItems(a), itemsB = getItems(b);
                      if (!itemsA.length && !itemsB.length) return null;
                      return (
                        <div key={type}>
                          <p className="text-xs text-slate-400 mb-1">{type}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-wrap gap-1">
                              {itemsA.length ? itemsA.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>) : <span className="text-xs text-slate-300">—</span>}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {itemsB.length ? itemsB.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>) : <span className="text-xs text-slate-300">—</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Accessibility */}
            {homeA && homeB && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-indigo-500" />Accessibility</CardTitle>
                </CardHeader>
                <CardContent>
                  <NumCompare label="Images with alt text" a={homeA.accessibility.imagesWithAlt} b={homeB.accessibility.imagesWithAlt} />
                  <NumCompare label="Images missing alt" a={homeA.accessibility.imagesWithoutAlt} b={homeB.accessibility.imagesWithoutAlt} />
                  <NumCompare label="Heading order issues" a={homeA.accessibility.headingOrderIssues} b={homeB.accessibility.headingOrderIssues} />
                  <NumCompare label="ARIA elements" a={homeA.accessibility.ariaLabels} b={homeB.accessibility.ariaLabels} />
                  <CheckCompare label="HTML lang attribute" a={!homeA.accessibility.missingLangAttr} b={!homeB.accessibility.missingLangAttr} />
                </CardContent>
              </Card>
            )}

            {/* Security */}
            {a.siteMetrics.securityHeaders && b.siteMetrics.securityHeaders && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-500" />Security Headers</CardTitle>
                </CardHeader>
                <CardContent>
                  <CheckCompare label="HTTPS" a={a.siteMetrics.securityHeaders.https} b={b.siteMetrics.securityHeaders.https} />
                  <CheckCompare label="HSTS" a={a.siteMetrics.securityHeaders.hsts} b={b.siteMetrics.securityHeaders.hsts} />
                  <CheckCompare label="CSP" a={a.siteMetrics.securityHeaders.csp} b={b.siteMetrics.securityHeaders.csp} />
                  <CheckCompare label="X-Frame-Options" a={!!a.siteMetrics.securityHeaders.xFrameOptions} b={!!b.siteMetrics.securityHeaders.xFrameOptions} />
                  <CheckCompare label="X-Content-Type-Options" a={a.siteMetrics.securityHeaders.xContentTypeOptions} b={b.siteMetrics.securityHeaders.xContentTypeOptions} />
                  <CheckCompare label="Referrer-Policy" a={!!a.siteMetrics.securityHeaders.referrerPolicy} b={!!b.siteMetrics.securityHeaders.referrerPolicy} />
                </CardContent>
              </Card>
            )}

            {/* View full reports */}
            <div className="grid grid-cols-2 gap-4">
              {[a, b].map(report => (
                <a key={report.id} href={`/report/${report.id}`}
                  className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-center">
                  <p className="text-sm font-medium text-blue-600">View full report →</p>
                  <p className="text-xs text-slate-400 mt-0.5">{report.domain}</p>
                </a>
              ))}
            </div>
          </>
        )}

        {/* Partial result hint — one done, one still running */}
        {!bothDone && (stateA.status === 'done' || stateB.status === 'done') && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
            <p className="text-sm text-blue-700">
              {stateA.status === 'done' ? a?.domain : b?.domain} is ready — waiting for the other scan to complete before showing the comparison.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
