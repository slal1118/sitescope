import { getServerSupabase } from '@/lib/supabase';
import { Eye, ExternalLink, Clock, Globe } from 'lucide-react';
import Link from 'next/link';

interface ReportRow {
  id: string;
  url: string;
  domain: string;
  created_at: string;
  expires_at: string | null;
  ai_enabled: boolean;
  scan_duration_ms: number | null;
}

export const revalidate = 60; // ISR: revalidate every 60s

async function getRecentReports(): Promise<ReportRow[]> {
  try {
    const sb = getServerSupabase();
    const { data } = await sb
      .from('reports')
      .select('id, url, domain, created_at, expires_at, ai_enabled, scan_duration_ms')
      .order('created_at', { ascending: false })
      .limit(50);
    return (data ?? []) as ReportRow[];
  } catch {
    return [];
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function expiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return 'Never expires';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return 'Expired';
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24) return `Expires in ${hrs}h`;
  return `Expires in ${Math.floor(hrs / 24)}d`;
}

export default async function ReportsPage() {
  const reports = await getRecentReports();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-100 bg-white px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <Eye className="w-5 h-5 text-blue-600" />
          SiteScope
        </Link>
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
          ← New scan
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Recent Reports</h1>
          <p className="text-slate-500 text-sm">
            {reports.length > 0 ? `${reports.length} public scans — sorted by newest first` : 'No reports yet. Be the first to scan a site.'}
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Globe className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No scans yet.</p>
            <Link href="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
              Scan your first site →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const isExpired = r.expires_at && new Date(r.expires_at) < new Date();
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-xl border p-4 flex items-center gap-4 hover:border-slate-300 hover:shadow-sm transition-all ${isExpired ? 'opacity-60' : 'border-slate-200'}`}
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${r.domain}&sz=32`}
                    alt=""
                    className="w-8 h-8 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 text-sm truncate">{r.domain}</span>
                      {r.ai_enabled && (
                        <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                      )}
                      {isExpired && (
                        <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-medium">Expired</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{r.url}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {timeAgo(r.created_at)}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{expiryLabel(r.expires_at)}</p>
                    </div>
                    {!isExpired && (
                      <Link
                        href={`/report/${r.id}`}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
