import { route, readJson, forbidden, bad } from '@/lib/server/http';
import { proposalBody } from '@/lib/server/validators';
import { apiRole } from '@/lib/server/auth';
import { one } from '@/lib/server/db';
import { getMentorProfileByUser } from '@/lib/server/queries';

export const POST = route(async (req) => {
  const user = await apiRole('mentor');
  const b = await readJson(req, proposalBody);
  const p = await getMentorProfileByUser(user.id);
  if (!p || p.status !== 'approved') throw forbidden('Your profile must be approved before you can send proposals.');
  const m = await one<{ domain: string; mentor_id: string | null; status: string; compliance_status: string }>('select domain, mentor_id, status, compliance_status from missions where id = $1', [b.missionId]);
  const visible = m && !m.mentor_id && m.status === 'Awaiting mentor' && ['not_required', 'cleared'].includes(m.compliance_status) && p.domains.includes(m.domain) && (m.domain !== 'defence' || p.defence_cleared);
  if (!visible) throw bad('That request is not open to you.');
  await one(
    `insert into proposals (mission_id, mentor_id, message) values ($1,$2,$3)
     on conflict (mission_id, mentor_id) do update set status = 'sent', message = excluded.message returning id`,
    [b.missionId, p.id, b.message],
  );
  return { ok: true };
});
