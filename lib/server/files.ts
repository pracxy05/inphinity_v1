import 'server-only';
import { randomUUID } from 'node:crypto';
import { one } from './db';
import { forbidden, notFound } from './http';
import type { User } from './auth';

export const MAX_BYTES = 25 * 1024 * 1024;

/** Allowed types. Executables and scripts are refused outright. */
export const ALLOWED: Record<string, string[]> = {
  pdf: ['application/pdf'],
  png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], webp: ['image/webp'],
  txt: ['text/plain'], md: ['text/markdown', 'text/plain'], csv: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  json: ['application/json', 'text/plain'], log: ['text/plain'],
  doc: ['application/msword'], docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'], xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  step: ['application/octet-stream', 'model/step'], stp: ['application/octet-stream', 'model/step'],
  stl: ['application/octet-stream', 'model/stl', 'application/sla'], dxf: ['application/octet-stream', 'image/vnd.dxf'],
};

export function extOf(name: string) { return name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''; }

export function newKey(userId: string, name: string) {
  const ext = extOf(name);
  return `u/${userId}/${randomUUID()}${ext ? '.' + ext : ''}`;
}

export type FileRow = {
  id: string; owner_id: string; purpose: string; mission_id: string | null; session_id: string | null;
  original_name: string; content_type: string; size_bytes: string; storage_key: string; status: string; created_at: Date;
};

const REVIEW_ROLES = ['Owner', 'Verification admin', 'Security admin'];

/** Who may open a file. Mentor evidence and ID documents are only for the owner and reviewing staff. */
export async function assertCanRead(user: User, f: FileRow) {
  if (f.owner_id === user.id) return;
  if (user.role === 'admin') {
    if (f.purpose === 'mentor_evidence' || f.purpose === 'mentor_id_document') {
      if (user.adminRole && REVIEW_ROLES.includes(user.adminRole)) return;
      throw forbidden();
    }
    if (f.purpose === 'mission_attachment' && user.adminRole && REVIEW_ROLES.includes(user.adminRole)) return; // compliance review
    throw forbidden();
  }
  if (user.role === 'mentor' && f.mission_id && (f.purpose === 'mission_attachment' || f.purpose === 'session_data')) {
    const ok = await one(
      `select 1 from missions m join mentor_profiles p on p.id = m.mentor_id
       where m.id = $1 and p.user_id = $2 and m.compliance_status in ('not_required','cleared')`,
      [f.mission_id, user.id],
    );
    if (ok) return;
  }
  throw forbidden();
}

export async function getFile(id: string): Promise<FileRow> {
  const f = await one<FileRow>('select * from files where id = $1', [id]);
  if (!f) throw notFound('File not found.');
  return f;
}
