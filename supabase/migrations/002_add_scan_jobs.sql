-- SiteScope: Scan Jobs table for background processing
-- Run in Supabase SQL Editor after 001_create_reports.sql

CREATE TABLE IF NOT EXISTS public.scan_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url           TEXT NOT NULL,
  domain        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','done','error')),
  stage         TEXT,
  message       TEXT,
  pages_found   INTEGER,
  report_id     UUID,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_in    TEXT DEFAULT '7d'
);

CREATE INDEX IF NOT EXISTS scan_jobs_status_idx ON public.scan_jobs (status, created_at DESC);

-- RLS: jobs are readable by anyone (needed for polling)
ALTER TABLE public.scan_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jobs are publicly readable"
  ON public.scan_jobs FOR SELECT USING (true);

CREATE POLICY "Only service role can write jobs"
  ON public.scan_jobs FOR ALL USING (auth.role() = 'service_role');

-- Auto-cleanup old jobs (optional, requires pg_cron)
-- SELECT cron.schedule('delete-old-jobs', '0 3 * * *', $$
--   DELETE FROM public.scan_jobs WHERE created_at < NOW() - INTERVAL '7 days';
-- $$);
