import { route, readJson, forbidden, notFound, bad } from '@/lib/server/http';
import { decisionBody } from '@/lib/server/validators';
import { apiRole } from '@/lib/server/auth';
import { one } from '@/lib/server/db';
import { audit } from '@/lib/server/audit';
import type { MentorRow } from '@/lib/server/queries';

const CAN = ['Owner', 'Verification admin', 'Security admin'];

export const POST = route<{ id: string }>(async (req, { params }) => {
  const admin = await apiRole('admin');
  if (!admin.adminRole || !CAN.includes(admin.adminRole)) throw forbidden();
  const id = (await params).id;
  const b = await readJson(req, decisionBody);
  const p = await one<MentorRow>('select * from mentor_profiles where id = $1 and is_sample = false', [id]);
  if (!p) throw notFound();
  if (p.status === 'draft') throw bad('This applicant has not submitted yet.');

  const verified = b.verified ?? p.verified;
  if (b.action === 'approve' && !Object.values(verified).every(Boolean)) throw bad('All four checks must be complete before approval.');
  const status = b.action === 'approve' ? 'approved' : b.action === 'reject' ? 'rejected' : b.action === 'needs_info' ? 'needs_info' : 'in_review';
  const defenceCleared = b.defenceCleared !== undefined ? (p.defence_opt_in && b.defenceCleared) : p.defence_cleared;

  await one(
    `update mentor_profiles set status=$2, verified=$3, tier=coalesce($4,tier), defence_cleared=$5, review_note=$6,
       decided_at = case when $2 in ('approved','rejected') then now() else null end where id=$1 returning id`,
    [id, status, JSON.stringify(verified), b.tier ?? null, defenceCleared, b.note || null],
  );
  const label = { approve: 'Mentor profile approved', reject: 'Mentor profile rejected', needs_info: 'More information requested', in_review: 'Review started' }[b.action];
  await audit(admin, label, { detail: { applicant: p.applicant_no }, tone: b.action === 'reject' ? 'warn' : 'ok' });
  return { ok: true, status };
});
