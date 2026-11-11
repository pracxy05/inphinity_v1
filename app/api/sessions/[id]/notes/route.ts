import { route, readJson, forbidden, notFound } from '@/lib/server/http';
import { notesBody } from '@/lib/server/validators';
import { apiUser } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { getSession, canAccessSession } from '@/lib/server/queries';

export const PUT = route<{ id: string }>(async (req, { params }) => {
  const user = await apiUser();
  const s = await getSession((await params).id);
  if (!s) throw notFound();
  if (!canAccessSession(user.id, s)) throw forbidden();
  const { notes } = await readJson(req, notesBody);
  await query('update sessions set notes = $2 where id = $1', [s.id, notes]);
  return { ok: true };
});
