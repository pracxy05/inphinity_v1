import { route, readJson, forbidden, notFound } from '@/lib/server/http';
import { itemBody } from '@/lib/server/validators';
import { apiUser } from '@/lib/server/auth';
import { one } from '@/lib/server/db';
import { getSession, canAccessSession } from '@/lib/server/queries';

export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await apiUser();
  const s = await getSession((await params).id);
  if (!s) throw notFound();
  if (!canAccessSession(user.id, s)) throw forbidden();
  const { text } = await readJson(req, itemBody);
  const r = await one<{ id: string }>('insert into action_items (session_id, text, created_by) values ($1,$2,$3) returning id', [s.id, text, user.id]);
  return { ok: true, id: r!.id };
});
