import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '@/components/AppShell';
import SessionRoom from '@/components/SessionRoom';
import { pageUser } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { getSession, canAccessSession } from '@/lib/server/queries';
import { fmtDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await pageUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await getSession(id);
  if (!s || !canAccessSession(user.id, s)) notFound();

  const [msgs, items, files] = await Promise.all([
    query<{ id: string; user_id: string; body: string; created_at: Date }>('select id, user_id, body, created_at from session_messages where session_id = $1 order by id limit 200', [s.id]),
    query<{ id: string; text: string; done: boolean }>('select id, text, done from action_items where session_id = $1 order by created_at', [s.id]),
    query<{ id: string; original_name: string; size_bytes: string }>(`select id, original_name, size_bytes from files where session_id = $1 and status = 'ready' order by created_at`, [s.id]),
  ]);
  const role = user.role === 'mentor' ? 'mentor' : 'student';
  const other = role === 'student' ? s.mentor_name : s.student_name;

  return (
    <AppShell role={role} title={`${role === 'student' ? 'Student' : 'Mentor'} workspace / Session room`}>
      <div className="page-head">
        <div className="stack" style={{ ['--gap' as string]: '6px' }}>
          <span className="mono xsmall muted">{s.mission_code ?? 'Intro call'}</span>
          <h1>{s.title}</h1>
          <p className="muted">With {other} · {fmtDateTime(s.starts_at)}</p>
        </div>
        <Link href="/sessions" className="btn btn--secondary">All sessions</Link>
      </div>
      <SessionRoom
        sessionId={s.id}
        videoUrl={`https://meet.jit.si/inphinity-${s.room_key}`}
        startsLabel={fmtDateTime(s.starts_at)}
        initialNotes={s.notes}
        initialItems={items}
        initialMessages={msgs.map((m) => ({ id: Number(m.id), me: m.user_id === user.id, body: m.body, at: m.created_at.toISOString() }))}
        files={files.map((f) => ({ id: f.id, name: f.original_name, size: Number(f.size_bytes) }))}
      />
    </AppShell>
  );
}
