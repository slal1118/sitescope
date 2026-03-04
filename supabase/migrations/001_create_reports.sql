-- SiteScope: Reports table
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

CREATE TABLE IF NOT EXISTS public.reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url           TEXT NOT NULL,
  domain        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  report_json   JSONB NOT NULL,
  ai_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  scan_duration_ms INTEGER,
  CONSTRAINT url_scheme CHECK (url LIKE 'http%')
);

-- Index for cache lookup (most common query)
CREATE INDEX IF NOT EXISTS reports_url_created_idx
  ON public.reports (url, created_at DESC);

CREATE INDEX IF NOT EXISTS reports_domain_idx
  ON public.reports (domain);

CREATE INDEX IF NOT EXISTS reports_created_at_idx
  ON public.reports (created_at DESC);

-- Row Level Security: reports are public (read-only via anon key)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read reports (for share links)
CREATE POLICY "Reports are publicly readable"
  ON public.reports
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete (server-side only)
CREATE POLICY "Only service role can write"
  ON public.reports
  FOR ALL
  USING (auth.role() = 'service_role');

-- Optional: auto-expire old reports (requires pg_cron extension)
-- SELECT cron.schedule('delete-expired-reports', '0 2 * * *', $$
--   DELETE FROM public.reports WHERE expires_at < NOW();
-- $$);
