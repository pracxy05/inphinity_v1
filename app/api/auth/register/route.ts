import { randomBytes } from 'node:crypto';
import { route, readJson, bad, conflict, clientIp } from '@/lib/server/http';
import { registerBody } from '@/lib/server/validators';
import { hashPassword, startSession, ageFromIso, initialsOf, homeFor } from '@/lib/server/auth';
import { one, tx } from '@/lib/server/db';
import { rateLimit } from '@/lib/server/ratelimit';
import { audit } from '@/lib/server/audit';

const slugify = (s: string) => s.toLowerCase().replace(/^(dr|prof)\.?\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'mentor';

export const POST = route(async (req) => {
  await rateLimit(`register:${clientIp(req)}`, 10, 3600);
  const b = await readJson(req, registerBody);
  if (ageFromIso(b.dob) < 18) throw bad('You must be 18 or over to use InΦnity.');
  if (await one('select 1 from users where lower(email) = $1', [b.email])) throw conflict('An account with this email already exists. Try signing in.');

  const hash = await hashPassword(b.password);
  const user = await tx(async (c) => {
    const u = (await c.query<{ id: string }>(
      'insert into users (email, password_hash, name, role, dob) values ($1,$2,$3,$4,$5) returning id',
      [b.email, hash, b.name, b.role, b.dob],
    )).rows[0];
    if (b.role === 'mentor') {
      await c.query(
        'insert into mentor_profiles (user_id, slug, name, initials) values ($1,$2,$3,$4)',
        [u.id, `${slugify(b.name)}-${randomBytes(2).toString('hex')}`, b.name, initialsOf(b.name)],
      );
    }
    return u;
  });
  await startSession(user.id);
  await audit({ id: user.id, email: b.email, name: b.name, role: b.role, adminRole: null, dob: b.dob }, 'Account created');
  return { ok: true, redirect: b.role === 'mentor' ? '/mentor/apply' : homeFor(b.role) };
});
