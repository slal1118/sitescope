import { createClient } from '@supabase/supabase-js';

// Lazy browser client — only initialized at call time, not at module load
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// Server-only admin client — never expose to browser
export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase server env vars not configured');
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export type SupabaseReport = {
  id: string;
  url: string;
  domain: string;
  created_at: string;
  expires_at: string | null;
  report_json: Record<string, unknown>;
  ai_enabled: boolean;
  scan_duration_ms: number | null;
};
