import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { MOCK_REPORT } from '@/lib/mock-report';
import type { Report } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Special demo report
  if (id === 'demo') {
    return NextResponse.json({ report: MOCK_REPORT });
  }

  try {
    const sb = getServerSupabase();
    const { data, error } = await sb
      .from('reports')
      .select('report_json')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ report: data.report_json as unknown as Report });
  } catch (err) {
    console.error('[Report] Fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
