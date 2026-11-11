import { route, forbidden, notFound } from '@/lib/server/http';
import { apiRole } from '@/lib/server/auth';
import { one } from '@/lib/server/db';

/** Mentor withdraws their proposal. */
export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await apiRole('mentor');
  const id = (await params).id;
  const p = await one<{ user_id: string }>(`select mp.user_id from proposals pr join mentor_profiles mp on mp.id = pr.mentor_id where pr.id = $1`, [id]);
  if (!p) throw notFound();
  if (p.user_id !== user.id) throw forbidden();
  await one(`update proposals set status = 'withdrawn' where id = $1 and status = 'sent' returning id`, [id]);
  return { ok: true };
});
