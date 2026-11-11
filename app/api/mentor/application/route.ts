import { route, readJson, bad, forbidden } from '@/lib/server/http';
import { applicationBody } from '@/lib/server/validators';
import { apiRole } from '@/lib/server/auth';
import { one } from '@/lib/server/db';
import { audit } from '@/lib/server/audit';
import { getMentorProfileByUser } from '@/lib/server/queries';

export const POST = route(async (req) => {
  const user = await apiRole('mentor');
  const b = await readJson(req, applicationBody);
  const p = await getMentorProfileByUser(user.id);
  if (!p) throw forbidden();
  if (!['draft', 'needs_info', 'rejected'].includes(p.status)) throw bad('Your application is already with our reviewers.');

  const mine = await one<{ n: string }>(
    `select count(*) as n from files where owner_id = $1 and status = 'ready' and purpose = 'mentor_id_document'`, [user.id]);
  if (Number(mine?.n ?? 0) < 1) throw bad('Upload a photo ID so our reviewers can verify your identity.');

  const availability = describeAvailability(b.grid);
  await one(
    `update mentor_profiles set employer=$2, job_role=$3, title=$4, years=$5, domains=$6, trl_lo=$7, trl_hi=$8, bio=$9, background=$10,
       topics=$11, languages=$12, formats=$13, grid=$14, availability=$15, review_slot=$16, defence_opt_in=$17,
       status='submitted', review_note=null, submitted_at=now(), verified='{"identity":false,"credentials":false,"domainReview":false,"background":false}'
     where id = $1 returning id`,
    [p.id, b.employer, b.jobRole, b.title, b.years, b.domains, b.trlLo, b.trlHi, b.bio, b.background, b.topics, b.languages, b.formats, JSON.stringify(b.grid), availability, b.reviewSlot, b.defenceOptIn],
  );
  if (b.phone) await one('update users set phone = $2 where id = $1 returning id', [user.id, b.phone]);
  await audit(user, 'Mentor application submitted');
  return { ok: true };
});

function describeAvailability(grid: boolean[][]) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const part = ['mornings', 'afternoons', 'evenings'];
  const out: string[] = [];
  grid.forEach((row, r) => {
    const d = days.filter((_, c) => row[c]);
    if (d.length) out.push(`${d.join(', ')} ${part[r]}`);
  });
  return out.join('; ') || 'By arrangement';
}
