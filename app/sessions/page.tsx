import Link from 'next/link';
import AppShell from '@/components/AppShell';
import ScheduleForm from '@/components/ScheduleForm';
import StatusPill from '@/components/StatusPill';
import { Icon } from '@/components/Icons';
import { pageUser } from '@/lib/server/auth';
import { getApprovedMentor, getMentorProfileByUser, missionsForMentor, missionsForStudent, sessionsForUser } from '@/lib/server/queries';
import { fmtDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Sessions({ searchParams }: { searchParams: Promise<{ intro?: string; mission?: string }> }) {
  const user = await pageUser();
  const role = user.role === 'mentor' ? 'mentor' : 'student';
  const { intro, mission } = await searchParams;

  const profile = role === 'mentor' ? await getMentorProfileByUser(user.id) : null;
  const [sessions, missions, introMentor] = await Promise.all([
    sessionsForUser(user.id, role),
    role === 'student' ? missionsForStudent(user.id) : profile ? missionsForMentor(profile.id) : Promise.resolve([]),
    role === 'student' && intro ? getApprovedMentor(intro) : Promise.resolve(null),
  ]);
  const options = missions.filter((m) => m.mentor_id && m.status !== 'Completed').map((m) => ({ value: m.id, label: `${m.code} · ${m.title}` }));
  const now = Date.now();
  const upcoming = sessions.filter((s) => s.status === 'scheduled' && s.starts_at.getTime() > now - 2 * 3600_000);
  const past = sessions.filter((s) => !upcoming.includes(s)).reverse();

  const Row = ({ s }: { s: (typeof sessions)[number] }) => (
    <tr>
      <td><div className="semibold">{s.title}</div><div className="mono xsmall muted">{s.mission_code ?? 'Intro call'}</div></td>
      <td className="small">{role === 'student' ? s.mentor_name : s.student_name}</td>
      <td className="mono small">{fmtDateTime(s.starts_at)}</td>
      <td><Link href={`/session/${s.id}`} className="btn btn--secondary btn--sm"><Icon name="video" /> Open room</Link></td>
    </tr>
  );

  return (
    <AppShell role={role} title={`${role === 'student' ? 'Student' : 'Mentor'} workspace / Sessions`}>
      <div className="page-head"><div className="stack" style={{ ['--gap' as string]: '6px' }}><h1>Sessions</h1><p className="muted">Schedule a session, then meet in its room: video, notes, files and chat stay with the mission.</p></div></div>

      <section className="card">
        <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Schedule</h2></div>
        <div className="card__body">
          <ScheduleForm missions={options} introSlug={introMentor && !introMentor.isSample ? introMentor.id : undefined} introName={introMentor?.name} defaultMission={mission} />
        </div>
      </section>

      <section className="card">
        <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Upcoming</h2><StatusPill status={`${upcoming.length}`} tone="info" /></div>
        {upcoming.length === 0 ? <div className="card__body"><p className="small muted">Nothing scheduled.</p></div> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Session</th><th>With</th><th>When</th><th /></tr></thead><tbody>{upcoming.map((s) => <Row key={s.id} s={s} />)}</tbody></table></div>
        )}
      </section>

      {past.length > 0 && (
        <section className="card">
          <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Earlier</h2></div>
          <div className="table-wrap"><table className="table"><thead><tr><th>Session</th><th>With</th><th>When</th><th /></tr></thead><tbody>{past.map((s) => <Row key={s.id} s={s} />)}</tbody></table></div>
        </section>
      )}
    </AppShell>
  );
}
