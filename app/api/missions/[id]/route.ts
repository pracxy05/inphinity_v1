import { route, readJson, forbidden, notFound } from '@/lib/server/http';
import { missionUpdateBody } from '@/lib/server/validators';
import { apiRole } from '@/lib/server/auth';
import { one } from '@/lib/server/db';

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await apiRole('student');
  const id = (await params).id;
  const b = await readJson(req, missionUpdateBody);
  const m = await one<{ student_id: string; mentor_id: string | null }>('select student_id, mentor_id from missions where id = $1', [id]);
  if (!m) throw notFound();
  if (m.student_id !== user.id) throw forbidden();
  const status = b.status === 'Completed' ? 'Completed' : b.status;
  const progress = b.status === 'Completed' ? 100 : b.progress;
  await one(
    `update missions set progress = coalesce($2, progress), next_step = coalesce($3, next_step), status = coalesce($4, status), updated_at = now() where id = $1 returning id`,
    [id, progress ?? null, b.nextStep ?? null, status ?? null],
  );
  return { ok: true };
});
