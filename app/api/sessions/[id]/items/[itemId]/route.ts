import { route, readJson, forbidden, notFound } from '@/lib/server/http';
import { itemToggleBody } from '@/lib/server/validators';
import { apiUser } from '@/lib/server/auth';
import { one } from '@/lib/server/db';
import { getSession, canAccessSession } from '@/lib/server/queries';

export const PATCH = route<{ id: string; itemId: string }>(async (req, { params }) => {
  const user = await apiUser();
  const { id, itemId } = await params;
  const s = await getSession(id);
  if (!s) throw notFound();
  if (!canAccessSession(user.id, s)) throw forbidden();
  const { done } = await readJson(req, itemToggleBody);
  if (!(await one('update action_items set done = $3 where id = $1 and session_id = $2 returning id', [itemId, s.id, done]))) throw notFound();
  return { ok: true };
});
