import { route, readJson, clientIp } from '@/lib/server/http';
import { contactBody } from '@/lib/server/validators';
import { one } from '@/lib/server/db';
import { rateLimit } from '@/lib/server/ratelimit';
import { audit } from '@/lib/server/audit';

export const POST = route(async (req) => {
  await rateLimit(`contact:${clientIp(req)}`, 5, 3600);
  const b = await readJson(req, contactBody);
  if (b.website) return { ok: true }; // honeypot filled in: a bot. Pretend it worked.
  const row = await one<{ ref: string }>('insert into contact_messages (name, email, subject, message) values ($1,$2,$3,$4) returning ref', [b.name, b.email, b.subject, b.message]);
  await audit(null, 'Contact message received', { label: 'Visitor', detail: { ref: row?.ref } });
  return { ok: true, ref: row?.ref };
});
