import { route, readJson, forbidden, bad } from '@/lib/server/http';
import { staffBody } from '@/lib/server/validators';
import { apiRole } from '@/lib/server/auth';
import { one } from '@/lib/server/db';
import { audit } from '@/lib/server/audit';

/** Owner only. Turns an existing, empty student account into a staff account (or changes a staff role). */
export const POST = route(async (req) => {
  const admin = await apiRole('admin');
  if (admin.adminRole !== 'Owner') throw forbidden('Only the Owner can manage staff.');
  const b = await readJson(req, staffBody);
  const u = await one<{ id: string; role: string }>('select id, role from users where lower(email) = $1', [b.email]);
  if (!u) throw bad('No account with that email. Ask the person to register first, then try again.');
  if (u.id === admin.id) throw bad('You cannot change your own role.');
  if (u.role === 'mentor') throw bad('Mentor accounts cannot become staff. Ask for a separate account.');
  if (u.role === 'student' && (await one('select 1 from missions where student_id = $1 limit 1', [u.id]))) throw bad('That account already has missions. Ask for a separate staff account.');
  await one(`update users set role = 'admin', admin_role = $2 where id = $1 returning id`, [u.id, b.adminRole]);
  await audit(admin, 'Staff role changed', { tone: 'warn', detail: { email: b.email, role: b.adminRole } });
  return { ok: true };
});
