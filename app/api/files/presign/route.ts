import { route, readJson, bad, forbidden, HttpError } from '@/lib/server/http';
import { presignBody } from '@/lib/server/validators';
import { apiUser } from '@/lib/server/auth';
import { one } from '@/lib/server/db';
import { ALLOWED, MAX_BYTES, extOf, newKey } from '@/lib/server/files';
import { signedUploadUrl, driver } from '@/lib/server/storage';
import { env } from '@/lib/server/env';
import { getSession, canAccessSession } from '@/lib/server/queries';

const USER_QUOTA = 500 * 1024 * 1024;

export const POST = route(async (req) => {
  const user = await apiUser();
  const b = await readJson(req, presignBody);

  if (driver === 'local' && env.isProd) throw new HttpError(503, 'File storage is not configured on this server yet.');
  if (b.size > MAX_BYTES) throw bad(`Files can be up to ${MAX_BYTES / 1024 / 1024} MB.`);
  const ext = extOf(b.name);
  const allowed = ALLOWED[ext];
  if (!allowed) throw bad(`.${ext || '?'} files are not accepted. Allowed: ${Object.keys(ALLOWED).join(', ')}.`);
  const contentType = allowed.includes(b.type) ? b.type : allowed[0];

  // who may attach what, where
  let missionId: string | null = null;
  let sessionId: string | null = null;
  if (b.purpose === 'mission_attachment') {
    if (user.role !== 'student') throw forbidden();
    if (b.missionId) {
      if (!(await one('select 1 from missions where id = $1 and student_id = $2', [b.missionId, user.id]))) throw forbidden();
      missionId = b.missionId;
    }
  } else if (b.purpose === 'mentor_evidence' || b.purpose === 'mentor_id_document') {
    if (user.role !== 'mentor') throw forbidden();
  } else {
    if (!b.sessionId) throw bad('sessionId is required.');
    const s = await getSession(b.sessionId);
    if (!s || !canAccessSession(user.id, s)) throw forbidden();
    sessionId = s.id;
    missionId = s.mission_id;
  }

  const used = await one<{ total: string }>(`select coalesce(sum(size_bytes),0) as total from files where owner_id = $1`, [user.id]);
  if (Number(used?.total ?? 0) + b.size > USER_QUOTA) throw bad('You have reached your storage limit.');

  const key = newKey(user.id, b.name);
  const row = await one<{ id: string }>(
    `insert into files (owner_id, purpose, mission_id, session_id, original_name, content_type, size_bytes, storage_key)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    [user.id, b.purpose, missionId, sessionId, b.name.slice(0, 200), contentType, b.size, key],
  );
  const url = (await signedUploadUrl(key, contentType)) ?? `/api/files/${row!.id}/content`;
  return { id: row!.id, uploadUrl: url, method: 'PUT', headers: { 'Content-Type': contentType } };
});
