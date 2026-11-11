/** Small browser-side helpers for talking to our own API. */

export async function api<T = { ok: true }>(url: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET', body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? `Request failed (${res.status}).`);
  return data as T;
}

export type UploadedFile = { id: string; name: string; size: number };

export type UploadTarget = {
  purpose: 'mission_attachment' | 'mentor_evidence' | 'mentor_id_document' | 'session_data';
  missionId?: string;
  sessionId?: string;
};

/** Asks the server for a one-time upload link, sends the file straight to storage, then confirms it. */
export async function uploadFile(file: File, target: UploadTarget): Promise<UploadedFile> {
  const p = await api<{ id: string; uploadUrl: string; method: string; headers: Record<string, string> }>('/api/files/presign', 'POST', {
    ...target, name: file.name, size: file.size, type: file.type || 'application/octet-stream',
  });
  const put = await fetch(p.uploadUrl, { method: p.method, headers: p.headers, body: file });
  if (!put.ok) throw new Error('The upload to storage failed. Please try again.');
  const done = await api<{ id: string; name: string; size: number }>(`/api/files/${p.id}/complete`, 'POST', {});
  return { id: done.id, name: done.name, size: done.size };
}

export function prettySize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
