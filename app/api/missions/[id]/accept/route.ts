import { z } from 'zod';
import { route, readJson, forbidden, notFound, bad } from '@/lib/server/http';
import { apiRole } from '@/lib/server/auth';
import { one, tx } from '@/lib/server/db';
import { audit } from '@/lib/server/audit';

export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await apiRole('student');
  const id = (await params).id;
  const { proposalId } = await readJson(req, z.object({ proposalId: z.string().uuid() }));
  const m = await one<{ student_id: string; mentor_id: string | null; compliance_status: string; code: string }>('select student_id, mentor_id, compliance_status, code from missions where id = $1', [id]);
  if (!m) throw notFound();
  if (m.student_id !== user.id) throw forbidden();
  if (m.mentor_id) throw bad('This mission already has a mentor.');
  if (m.compliance_status === 'held' || m.compliance_status === 'rejected') throw bad('This mission is waiting for its compliance review.');
  await tx(async (c) => {
    const p = (await c.query<{ mentor_id: string }>(`select mentor_id from proposals where id = $1 and mission_id = $2 and status = 'sent' for update`, [proposalId, id])).rows[0];
    if (!p) throw bad('That proposal is no longer available.');
    await c.query(`update missions set mentor_id = $2, status = 'On track', next_step = 'Schedule your first session', updated_at = now() where id = $1`, [id, p.mentor_id]);
    await c.query(`update proposals set status = case when id = $2 then 'accepted' else 'declined' end where mission_id = $1 and status = 'sent'`, [id, proposalId]);
  });
  await audit(user, 'Mentor engaged', { detail: { mission: m.code } });
  return { ok: true };
});
