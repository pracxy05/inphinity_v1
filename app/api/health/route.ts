import { NextResponse } from 'next/server';
import { one } from '@/lib/server/db';
import { driver } from '@/lib/server/storage';

export const dynamic = 'force-dynamic';

/** Used by uptime pings. Touching the database also keeps a free database awake. */
export async function GET() {
  try {
    await one('select 1');
    return NextResponse.json({ ok: true, storage: driver }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('health check failed', e);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
