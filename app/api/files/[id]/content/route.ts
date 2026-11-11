import { route, bad, forbidden, HttpError } from '@/lib/server/http';
import { apiUser } from '@/lib/server/auth';
import { getFile, MAX_BYTES } from '@/lib/server/files';
import { driver, localWrite } from '@/lib/server/storage';
import { env } from '@/lib/server/env';

/** Local-disk upload target. Only exists for running on your own computer; production uses signed bucket links. */
export const PUT = route<{ id: string }>(async (req, { params }) => {
  if (driver !== 'local' || env.isProd) throw new HttpError(404, 'Not found.');
  const user = await apiUser();
  const f = await getFile((await params).id);
  if (f.owner_id !== user.id || f.status !== 'pending') throw forbidden();
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0 || buf.length > MAX_BYTES) throw bad('Bad file size.');
  await localWrite(f.storage_key, buf);
  return { ok: true };
});
