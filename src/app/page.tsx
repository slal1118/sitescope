'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Globe, TrendingUp, Zap, Shield, Code2, BarChart3,
  ArrowRight, ChevronRight, Layers, Eye, AlertCircle, Loader2, Clock,
  Building2, Megaphone, Users, BarChart2, Mail, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const FEATURES = [
  { icon: <TrendingUp className="w-5 h-5 text-blue-500" />, title: 'Messaging & Positioning', desc: 'Headline clarity, value prop strength, and target audience analysis.' },
  { icon: <BarChart3 className="w-5 h-5 text-emerald-500" />, title: 'CRO Checklist', desc: 'CTAs, trust signals, forms, and conversion friction points.' },
  { icon: <Globe className="w-5 h-5 text-purple-500" />, title: 'SEO Fundamentals', desc: 'Title/meta/H1 structure, indexability, sitemap, and internal linking.' },
  { icon: <Code2 className="w-5 h-5 text-amber-500" />, title: 'Tech Stack Detection', desc: 'CMS, analytics tools, trackers, frameworks — all without guessing.' },
  { icon: <Zap className="w-5 h-5 text-red-500" />, title: 'Real Performance Data', desc: 'PageSpeed Insights LCP, FCP, CLS — actual Core Web Vitals.' },
  { icon: <Layers className="w-5 h-5 text-indigo-500" />, title: 'Accessibility Check', desc: 'Alt text, heading order, ARIA labels, and lang attribute coverage.' },
];

const PERSONAS = [
  {
    icon: <Building2 className="w-5 h-5 text-blue-500" />,
    title: 'SaaS Founders',
    desc: 'Diagnose exactly why visitors aren\'t converting — missing CTAs, weak positioning, high form friction.',
  },
  {
    icon: <Megaphone className="w-5 h-5 text-emerald-500" />,
    title: 'Marketing Managers',
    desc: 'Audit any competitor or client site in 60 seconds. Get shareable reports instantly.',
  },
  {
    icon: <Users className="w-5 h-5 text-purple-500" />,
    title: 'Agencies',
    desc: 'Generate instant audit reports for new business prospects — before the discovery call.',
  },
  {
    icon: <BarChart2 className="w-5 h-5 text-amber-500" />,
    title: 'SEO Consultants',
    desc: 'Spot title tag issues, missing sitemaps, broken links, and OG tags in one scan.',
  },
];

const EXPIRY_OPTIONS = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'never', label: 'Never expires' },
];

interface JobState {
  status: 'pending' | 'running' | 'done' | 'error';
  stage?: string;
  message?: string;
  pagesFound?: number;
  reportId?: string;
  error?: string;
}

const STAGE_LABELS: Record<string, string> = {
  validating: 'Validating URL',
  robots: 'Checking robots.txt',
  sitemap: 'Parsing sitemap',
  crawling: 'Crawling pages',
  extracting: 'Extracting data',
  scoring: 'Computing scores',
  performance: 'Fetching performance data',
  ai: 'Generating AI insights',
  saving: 'Saving report',
  done: 'Complete',
};

const STAGE_ORDER = ['validating','robots','sitemap','crawling','extracting','scoring','performance','ai','saving','done'];

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<string>('7d');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailStatus('loading');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok || res.status === 409) {
        setEmailStatus('success');
      } else {
        setEmailStatus('error');
      }
    } catch {
      setEmailStatus('error');
    }
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setScanning(true);
    setError(null);
    setJob({ status: 'pending', message: 'Starting scan…' });

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, expiresIn }),
      });

      if (res.status === 429) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Rate limit exceeded. Please wait a moment.');
      }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json() as { jobId: string | null; reportId: string | null; cached: boolean };

      // Cached result → go directly
      if (data.cached && data.reportId) {
        router.push(`/report/${data.reportId}`);
        return;
      }

      // No job (shouldn't happen) → error
      if (!data.jobId) {
        throw new Error('Failed to create scan job');
      }

      const jobId = data.jobId;

      // Poll for job status
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/jobs/${jobId}`);
          if (!pollRes.ok) return;
          const { job: jobData } = await pollRes.json() as {
            job: { status: string; stage?: string; message?: string; pages_found?: number; report_id?: string; error?: string }
          };

          setJob({
            status: jobData.status as JobState['status'],
            stage: jobData.stage,
            message: jobData.message,
            pagesFound: jobData.pages_found,
            reportId: jobData.report_id,
            error: jobData.error,
          });

          if (jobData.status === 'done' && jobData.report_id) {
            stopPolling();
            router.push(`/report/${jobData.report_id}`);
          } else if (jobData.status === 'error') {
            stopPolling();
            setError(jobData.error ?? 'Scan failed');
            setScanning(false);
          }
        } catch { /* poll failed, retry next tick */ }
      }, 2000);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scan failed';
      setError(msg);
      toast.error(msg);
      setScanning(false);
      stopPolling();
    }
  }

  const stageIdx = STAGE_ORDER.indexOf(job?.stage ?? '');
  const progressPct = Math.max(8, ((stageIdx + 1) / STAGE_ORDER.length) * 100);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Eye className="w-5 h-5 text-blue-600" />
          <span>SiteScope</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/reports" className="text-sm text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1">
            Recent reports <ChevronRight className="w-3 h-3" />
          </a>
          <a href="/compare" className="text-sm text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1">
            Compare <ChevronRight className="w-3 h-3" />
          </a>
          <a href="/report/demo" className="text-sm text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1">
            Demo <ChevronRight className="w-3 h-3" />
          </a>
          <Badge variant="secondary" className="text-xs">Free</Badge>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Badge className="mb-6 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50">
            Free — No login required
          </Badge>
          <h1 className="text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
            Website Intelligence,<br />
            <span className="text-blue-600">in seconds.</span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed mb-12 max-w-2xl mx-auto">
            Paste any URL. Get a complete report on SEO, messaging, conversion optimization,
            accessibility, real performance data, and prioritized fixes.
          </p>

          <form onSubmit={handleScan} className="max-w-2xl mx-auto">
            <div className="flex gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 flex-1 bg-white rounded-lg border border-slate-200 px-3">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <Input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={scanning}
                  className="border-0 shadow-none focus-visible:ring-0 bg-transparent pl-0 text-base"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={scanning || !url.trim()}
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shrink-0"
              >
                {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</> : <>Analyze Site <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </div>

            {/* Expiry selector */}
            {!scanning && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400">Report expires:</span>
                <div className="flex gap-1">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExpiresIn(opt.value)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        expiresIn === opt.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'text-slate-500 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Progress */}
            {scanning && job && (
              <div className="mt-4 text-left bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                  <span className="text-sm font-medium text-slate-700">
                    {job.stage ? (STAGE_LABELS[job.stage] ?? job.message) : job.message}
                  </span>
                  {job.pagesFound !== undefined && job.pagesFound > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">{job.pagesFound} pages</Badge>
                  )}
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">Typically takes 20–40 seconds. Running in background.</p>
              </div>
            )}

            {/* Error */}
            {error && !scanning && (
              <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">Scan failed</p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}
          </form>

          <p className="text-xs text-slate-400 mt-4">
            Public pages only. Up to 300 pages per scan. Respects robots.txt.
          </p>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">What we analyze</h2>
            <p className="text-slate-500">Six dimensions of website intelligence extracted from every scan.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">{f.icon}</div>
                  <h3 className="font-medium text-slate-900 text-sm">{f.title}</h3>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who this is for */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Who is this for?</h2>
            <p className="text-slate-500">SiteScope is built for anyone who needs quick, actionable website intelligence.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PERSONAS.map((p) => (
              <div key={p.title} className="rounded-xl p-5 border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 mb-3">
                  {p.icon}
                </div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{p.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Email capture */}
      <section className="py-16 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-5">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Stay in the loop</h2>
          <p className="text-slate-500 mb-8">
            Get notified when we add new checks, integrations, and features to SiteScope.
          </p>
          {emailStatus === 'success' ? (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">You&rsquo;re on the list!</span>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="flex gap-2 max-w-sm mx-auto">
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={emailStatus === 'loading'}
                className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button
                type="submit"
                disabled={emailStatus === 'loading'}
                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                {emailStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Notify me'}
              </Button>
            </form>
          )}
          {emailStatus === 'error' && (
            <p className="text-sm text-red-500 mt-3">Something went wrong. Please try again.</p>
          )}
          <p className="text-xs text-slate-400 mt-4">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* Demo CTA */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-slate-900 rounded-2xl p-10 text-white">
            <h2 className="text-2xl font-bold mb-3">See a sample report first</h2>
            <p className="text-slate-400 mb-8">View a full demo report for Stripe.com — no URL needed.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="/report/demo">
                <Button variant="secondary" size="lg" className="gap-2">
                  <Eye className="w-4 h-4" />
                  View Demo Report
                </Button>
              </a>
              <a href="/reports">
                <Button variant="outline" size="lg" className="gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-slate-400">
                  Recent Reports
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Ethics */}
      <section className="py-10 px-6 border-t border-slate-100 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1 text-sm">Ethical crawling, always</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                SiteScope respects <code className="bg-slate-100 px-1 rounded text-xs">robots.txt</code> rules (including Allow: directives and wildcards),
                limits crawls to 300 pages, uses a clearly identified bot user-agent, and never stores raw page content.
                Rate limited to 3 scans per minute per IP.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-slate-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Eye className="w-4 h-4 text-blue-600" />
            SiteScope
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Free forever</span><span>·</span>
            <span>No login</span><span>·</span>
            <span>No tracking</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
