import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!email || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const sb = getServerSupabase();
    const { error } = await sb.from('leads').insert({
      email: email.trim().toLowerCase(),
      source: 'homepage',
    });

    if (error) {
      // Unique constraint violation = already subscribed
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Already subscribed' }, { status: 409 });
      }
      console.error('[leads]', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Subscribed' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
