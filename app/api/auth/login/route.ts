import { route, readJson, HttpError, clientIp } from '@/lib/server/http';
import { loginBody } from '@/lib/server/validators';
import { checkPassword, startSession, homeFor, hashPassword, type Role } from '@/lib/server/auth';
import { one, query } from '@/lib/server/db';
import { rateLimit } from '@/lib/server/ratelimit';
import { audit } from '@/lib/server/audit';

type U = { id: string; email: string; name: string; role: Role; password_hash: string; failed_logins: number; locked_until: Date | null };
const BAD = 'Email or password is not correct.';
let dummy: Promise<string> | null = null; // so unknown emails take as long as known ones

export const POST = route(async (req) => {
  await rateLimit(`login-ip:${clientIp(req)}`, 40, 600);
  const { email, password } = await readJson(req, loginBody);
  const u = await one<U>('select id, email, name, role, password_hash, failed_logins, locked_until from users where lower(email) = $1', [email]);

  if (!u) {
    await checkPassword(password, await (dummy ??= hashPassword('not-a-real-password')));
    throw new HttpError(401, BAD);
  }
  if (u.locked_until && u.locked_until > new Date()) {
    throw new HttpError(429, 'This account is locked for 15 minutes after repeated failed sign-ins. Try again later.');
  }
  if (!(await checkPassword(password, u.password_hash))) {
    const n = u.failed_logins + 1;
    if (n >= 5) {
      await query(`update users set failed_logins = 0, locked_until = now() + interval '15 minutes' where id = $1`, [u.id]);
      await audit(null, 'Repeated failed sign-ins', { label: u.role === 'student' ? 'Student account' : u.role === 'mentor' ? 'Mentor account' : 'Staff account', result: 'Locked for 15 minutes', tone: 'crit' });
    } else {
      await query('update users set failed_logins = $2 where id = $1', [u.id, n]);
    }
    throw new HttpError(401, BAD);
  }
  await query('update users set failed_logins = 0, locked_until = null, last_login_at = now() where id = $1', [u.id]);
  await startSession(u.id);
  return { ok: true, role: u.role, redirect: homeFor(u.role) };
});
