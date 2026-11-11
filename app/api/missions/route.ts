import { route, readJson, bad } from '@/lib/server/http';
import { missionBody } from '@/lib/server/validators';
import { apiRole } from '@/lib/server/auth';
import { one, tx } from '@/lib/server/db';
import { audit } from '@/lib/server/audit';
import { daysUntil } from '@/lib/data';

export const POST = route(async (req) => {
  const user = await apiRole('student');
  const b = await readJson(req, missionBody);
  const isDefence = b.domain === 'defence';
  if (isDefence && !b.declarations.defence) throw bad('Defence projects need the compliance acknowledgement.');
  if (daysUntil(b.pdc) < -1) throw bad('The planned completion date is in the past.');

  const preferred = b.preferredMentor ? await one<{ id: string }>(`select id from mentor_profiles where slug = $1 and status = 'approved'`, [b.preferredMentor]) : null;

  const m = await tx(async (c) => {
    const row = (await c.query<{ id: string; code: string }>(
      `insert into missions (student_id, title, domain, summary, trl, team_size, pdc, needs, formats, language, compliance_status, preferred_mentor_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id, code`,
      [user.id, b.title, b.domain, b.summary, b.trl, b.teamSize, b.pdc, b.needs, b.formats, b.language, isDefence ? 'held' : 'not_required', preferred?.id ?? null],
    )).rows[0];
    if (b.attachmentIds.length) {
      await c.query(
        `update files set mission_id = $1 where id = any($2::uuid[]) and owner_id = $3 and purpose = 'mission_attachment' and status = 'ready' and mission_id is null`,
        [row.id, b.attachmentIds, user.id],
      );
    }
    return row;
  });
  await audit(user, isDefence ? 'Defence project screening' : 'Mission request published', isDefence ? { result: 'Held for review', tone: 'warn', detail: { mission: m.code } } : { detail: { mission: m.code } });
  return { ok: true, id: m.id, code: m.code, held: isDefence };
});
