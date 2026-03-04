import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { runScan } from '@/lib/scanner';
import { getServerSupabase } from '@/lib/supabase';
import { validateAndNormalizeUrl } from '@/lib/security';
import type { ScanRequest, ScanProgressEvent } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ── Simple in-memory rate limiter (per IP, resets across cold starts) ──────────
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 3; // max 3 scans per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= RATE_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ── Job helpers ────────────────────────────────────────────────────────────────
async function createJob(url: string, domain: string, expiresIn: string): Promise<string> {
  const sb = getServerSupabase();
  const { data } = await sb.from('scan_jobs').insert({
    url, domain, status: 'pending', expires_in: expiresIn
  }).select('id').single();
  return data?.id as string;
}

async function updateJob(jobId: string, patch: Record<string, unknown>) {
  const sb = getServerSupabase();
  await sb.from('scan_jobs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', jobId);
}

// ── SSE helper ─────────────────────────────────────────────────────────────────
function makeSSE(onStart: (send: (e: ScanProgressEvent) => void, close: () => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ScanProgressEvent) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); } catch { /* disconnected */ }
      };
      const close = () => { try { controller.close(); } catch { /* already closed */ } };
      await onStart(send, close);
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ── POST /api/scan ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  let body: ScanRequest;
  try { body = (await req.json()) as ScanRequest; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { url: rawUrl, forceRescan = false, expiresIn = '7d' } = body;
  if (!rawUrl) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

  const validation = validateAndNormalizeUrl(rawUrl);
  if (!validation.valid || !validation.url) {
    return NextResponse.json({ error: validation.error ?? 'Invalid URL' }, { status: 422 });
  }

  const normalizedUrl = validation.url.href;
  const domain = validation.url.hostname.replace('www.', '');

  // Check cache
  if (!forceRescan) {
    try {
      const sb = getServerSupabase();
      const { data: existing } = await sb
        .from('reports')
        .select('id, expires_at')
        .eq('url', normalizedUrl)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (existing && (!existing.expires_at || new Date(existing.expires_at) > new Date())) {
        return NextResponse.json({ jobId: null, reportId: existing.id, cached: true });
      }
    } catch { /* no cache — continue */ }
  }

  // Create job record
  let jobId: string;
  try {
    jobId = await createJob(normalizedUrl, domain, expiresIn);
  } catch {
    // Fallback: SSE streaming if DB not available
    return makeSSE(async (send, close) => {
      try {
        await updateJob('', { status: 'running' }).catch(() => {});
        const report = await runScan(rawUrl, send, expiresIn as '24h' | '7d' | '30d' | 'never');
        send({ stage: 'done', message: 'Scan complete', reportId: report.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Scan failed';
        send({ stage: 'done', message: msg, error: msg });
      } finally {
        close();
      }
    });
  }

  // Schedule background scan after response is sent
  after(async () => {
    try {
      await updateJob(jobId, { status: 'running', stage: 'validating', message: 'Starting scan…' });

      const report = await runScan(rawUrl, async (event) => {
        await updateJob(jobId, {
          stage: event.stage,
          message: event.message,
          pages_found: event.pagesFound ?? null,
        });
      }, expiresIn as '24h' | '7d' | '30d' | 'never');

      // Save report to DB
      const sb = getServerSupabase();
      const { error: insertError } = await sb.from('reports').insert({
        id: report.id,
        url: normalizedUrl,
        domain,
        created_at: report.createdAt,
        expires_at: report.expiresAt,
        report_json: report as unknown as Record<string, unknown>,
        ai_enabled: report.aiEnabled,
        scan_duration_ms: null,
      });
      if (insertError) throw new Error(`Failed to save report: ${insertError.message}`);

      await updateJob(jobId, { status: 'done', report_id: report.id, message: 'Scan complete', stage: 'done' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scan failed';
      await updateJob(jobId, { status: 'error', error: msg, stage: 'done', message: msg }).catch(() => {});
    }
  });

  return NextResponse.json({ jobId, reportId: null, cached: false });
}
