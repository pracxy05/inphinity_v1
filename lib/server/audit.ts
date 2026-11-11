import 'server-only';
import { query } from './db';
import type { User } from './auth';

export async function audit(actor: User | null, event: string, opts: { result?: string; tone?: 'ok' | 'warn' | 'crit'; detail?: Record<string, unknown>; label?: string } = {}) {
  try {
    await query(
      'insert into audit_log (actor_id, actor_label, event, result, tone, detail) values ($1,$2,$3,$4,$5,$6)',
      [actor?.id ?? null, opts.label ?? (actor ? (actor.adminRole ?? (actor.role === 'student' ? 'Student account' : 'Mentor account')) : 'Visitor'), event, opts.result ?? 'Allowed', opts.tone ?? 'ok', JSON.stringify(opts.detail ?? {})],
    );
  } catch (e) {
    console.error('audit write failed', e); // never block the user's action because logging failed
  }
}
