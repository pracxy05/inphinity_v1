import { NextResponse } from 'next/server';
import { route } from '@/lib/server/http';
import { apiUser } from '@/lib/server/auth';
import { assertCanRead, getFile } from '@/lib/server/files';
import { signedDownloadUrl, localRead, removeObject } from '@/lib/server/storage';
import { query } from '@/lib/server/db';
import { audit } from '@/lib/server/audit';
import { forbidden, notFound } from '@/lib/server/http';

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const user = await apiUser();
  const f = await getFile((await params).id);
  if (f.status !== 'ready') throw notFound('File not found.');
  await assertCanRead(user, f);
  if (f.owner_id !== user.id && user.role === 'admin') {
    await audit(user, 'Document opened', { detail: { file: f.id, purpose: f.purpose } });
  }
  const url = await signedDownloadUrl(f.storage_key, f.original_name, f.content_type);
  if (url) return NextResponse.redirect(url, 302);
  const data = await localRead(f.storage_key);
  const safe = f.original_name.replace(/[^\w.\- ]/g, '_');
  return new Response(new Uint8Array(data), { headers: { 'Content-Type': f.content_type, 'Content-Disposition': `attachment; filename="${safe}"`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' } });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await apiUser();
  const f = await getFile((await params).id);
  if (f.owner_id !== user.id) throw forbidden();
  await removeObject(f.storage_key);
  await query('delete from files where id = $1', [f.id]);
  return { ok: true };
});
