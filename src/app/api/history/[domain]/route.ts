import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export interface HistoryEntry {
  id: string;
  createdAt: string;
  scores: { overall: number; seo: number; cro: number; messaging: number; accessibility: number };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 });

  try {
    const sb = getServerSupabase();
    const { data, error } = await sb
      .from('reports')
      .select('id, created_at, report_json')
      .ilike('domain', domain.replace(/^www\./, ''))
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const history: HistoryEntry[] = (data ?? []).map((row) => {
      const r = row.report_json as { scores?: HistoryEntry['scores'] };
      return {
        id: row.id,
        createdAt: row.created_at,
        scores: r?.scores ?? { overall: 0, seo: 0, cro: 0, messaging: 0, accessibility: 0 },
      };
    });

    return NextResponse.json({ history });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
