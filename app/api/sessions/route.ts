import { route, readJson, bad, forbidden, notFound } from '@/lib/server/http';
import { sessionBody } from '@/lib/server/validators';
import { apiUser } from '@/lib/server/auth';
import { one } from '@/lib/server/db';
import { audit } from '@/lib/server/audit';

export const POST = route(async (req) => {
  const user = await apiUser();
  if (user.role === 'admin') throw forbidden();
  const b = await readJson(req, sessionBody);
  const when = new Date(b.startsAt);
  if (when.getTime() < Date.now() - 5 * 60_000) throw bad('Pick a time in the future.');
  if (when.getTime() > Date.now() + 365 * 86400_000) throw bad('That is too far ahead.');

  let missionId: string | null = null, mentorId: string, studentId: string;
  if (b.kind === 'intro') {
    if (user.role !== 'student') throw forbidden('Only students book intro calls.');
    const p = await one<{ id: string }>(`select id from mentor_profiles where slug = $1 and status = 'approved' and is_sample = false`, [b.mentorSlug ?? '']);
    if (!p) throw notFound('Mentor not found.');
    mentorId = p.id; studentId = user.id;
  } else {
    if (!b.missionId) throw bad('Choose a mission.');
    const m = await one<{ id: string; student_id: string; mentor_id: string | null; user_id: string | null }>(
      `select m.id, m.student_id, m.mentor_id, p.user_id from missions m left join mentor_profiles p on p.id = m.mentor_id where m.id = $1`, [b.missionId]);
    if (!m || !m.mentor_id) throw bad('This mission has no mentor yet.');
    if (m.student_id !== user.id && m.user_id !== user.id) throw forbidden();
    missionId = m.id; mentorId = m.mentor_id; studentId = m.student_id;
  }
  const row = await one<{ id: string }>(
    `insert into sessions (mission_id, mentor_id, student_id, kind, title, starts_at, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [missionId, mentorId, studentId, b.kind, b.title, when.toISOString(), user.id],
  );
  await audit(user, b.kind === 'intro' ? 'Intro call booked' : 'Session scheduled');
  return { ok: true, id: row!.id };
});
