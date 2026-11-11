import { route, bad, forbidden } from '@/lib/server/http';
import { apiUser } from '@/lib/server/auth';
import { getFile, MAX_BYTES } from '@/lib/server/files';
import { objectSize, removeObject } from '@/lib/server/storage';
import { query } from '@/lib/server/db';

/** The browser calls this after uploading. We check the file really arrived before marking it ready. */
export const POST = route<{ id: string }>(async (_req, { params }) => {
  const user = await apiUser();
  const f = await getFile((await params).id);
  if (f.owner_id !== user.id) throw forbidden();
  const size = await objectSize(f.storage_key);
  if (size === null) throw bad('The upload did not arrive. Please try again.');
  if (size > MAX_BYTES) { await removeObject(f.storage_key); await query('delete from files where id = $1', [f.id]); throw bad('That file is too large.'); }
  await query(`update files set status = 'ready', size_bytes = $2 where id = $1`, [f.id, size]);
  return { ok: true, id: f.id, name: f.original_name, size };
});
