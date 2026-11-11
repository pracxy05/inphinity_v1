import { route, readJson, forbidden, notFound } from '@/lib/server/http';
import { messageBody } from '@/lib/server/validators';
import { apiUser } from '@/lib/server/auth';
import { query, one } from '@/lib/server/db';
import { getSession, canAccessSession } from '@/lib/server/queries';

async function load(id: string, userId: string) {
  const s = await getSession(id);
  if (!s) throw notFound();
  if (!canAccessSession(userId, s)) throw forbidden();
  return s;
}

/** Poll with ?after=<last message id> to get only new messages. */
export const GET = route<{ id: string }>(async (req, { params }) => {
  const user = await apiUser();
  const s = await load((await params).id, user.id);
  const after = Number(new URL(req.url).searchParams.get('after') ?? 0) || 0;
  const rows = await query<{ id: string; user_id: string; body: string; created_at: Date }>(
    'select id, user_id, body, created_at from session_messages where session_id = $1 and id > $2 order by id limit 200', [s.id, after]);
  return { messages: rows.map((r) => ({ id: Number(r.id), me: r.user_id === user.id, body: r.body, at: r.created_at })) };
});

export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await apiUser();
  const s = await load((await params).id, user.id);
  const { body } = await readJson(req, messageBody);
  const r = await one<{ id: string }>('insert into session_messages (session_id, user_id, body) values ($1,$2,$3) returning id', [s.id, user.id, body]);
  return { ok: true, id: Number(r!.id) };
});
