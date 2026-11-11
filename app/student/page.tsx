import Link from 'next/link';
import AppShell from '@/components/AppShell';
import TrlScale from '@/components/TrlScale';
import StatusPill from '@/components/StatusPill';
import { Icon } from '@/components/Icons';
import { AcceptProposal, MissionTracker, AddMissionFiles } from '@/components/StudentActions';
import { pageUser } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { missionsForStudent, sessionsForUser, effectiveStatus } from '@/lib/server/queries';
import { domainName, fmtDate, daysUntil } from '@/lib/data';
import { fmtToday, fmtDateTime, fmtTime, fmtDayShort, ago } from '@/lib/format';

export const dynamic = 'force-dynamic';

function dueText(iso: string) {
  const d = daysUntil(iso);
  if (d < 0) return `${Math.abs(d)} days past`;
  if (d === 0) return 'today';
  return `in ${d} days`;
}

export default async function StudentHome() {
  const user = await pageUser('student');
  const [missions, sessions, proposals, files, activity] = await Promise.all([
    missionsForStudent(user.id),
    sessionsForUser(user.id, 'student'),
    query<{ id: string; mission_id: string; message: string; slug: string; name: string; initials: string; tier: string }>(
      `select pr.id, pr.mission_id, pr.message, p.slug, p.name, p.initials, p.tier from proposals pr
       join missions m on m.id = pr.mission_id join mentor_profiles p on p.id = pr.mentor_id
       where m.student_id = $1 and pr.status = 'sent' order by pr.created_at`, [user.id]),
    query<{ id: string; original_name: string; code: string; mission_id: string }>(
      `select f.id, f.original_name, m.code, f.mission_id from files f join missions m on m.id = f.mission_id
       where f.owner_id = $1 and f.status = 'ready' and f.purpose = 'mission_attachment' order by f.created_at desc limit 8`, [user.id]),
    query<{ event: string; at: Date }>('select event, at from audit_log where actor_id = $1 order by at desc limit 5', [user.id]),
  ]);

  const withMentor = missions.filter((m) => m.mentor_id);
  const nearest = [...missions].filter((m) => m.status !== 'Completed').sort((a, b) => a.pdc.localeCompare(b.pdc))[0];
  const upcoming = sessions.find((s) => s.status === 'scheduled' && s.starts_at.getTime() > Date.now() - 3600_000);

  return (
    <AppShell role="student" title="Student workspace / Overview">
      <div className="page-head">
        <div className="stack" style={{ ['--gap' as string]: '6px' }}>
          <h1>Your missions</h1>
          <p className="muted">{fmtToday()}</p>
        </div>
        <Link href="/student/new" className="btn btn--primary"><Icon name="plus" /> New mission request</Link>
      </div>

      <div className="card">
        <div className="grid grid--3" style={{ ['--gap' as string]: '0' }}>
          <div className="stat" style={{ borderRight: '1px solid var(--line)' }}>
            <span className="stat__v">{withMentor.length}</span>
            <span className="stat__l">Missions with a mentor</span>
          </div>
          <div className="stat" style={{ borderRight: '1px solid var(--line)' }}>
            <span className="stat__v">{nearest ? fmtDate(nearest.pdc) : 'None'}</span>
            <span className="stat__l">{nearest ? <>Nearest <abbr title="Planned date of completion">PDC</abbr>, {dueText(nearest.pdc)}</> : 'No open missions yet'}</span>
          </div>
          <div className="stat">
            <span className="stat__v">{upcoming ? fmtTime(upcoming.starts_at) : 'None'}</span>
            <span className="stat__l">{upcoming ? `Next session, ${fmtDayShort(upcoming.starts_at)}` : 'No session booked'}</span>
          </div>
        </div>
      </div>

      <div className="dash">
        <div className="stack" style={{ ['--gap' as string]: '16px' }}>
          <h2 style={{ fontSize: '1.4rem' }}>Missions</h2>
          {missions.length === 0 && (
            <div className="card"><div className="card__body stack" style={{ ['--gap' as string]: '12px' }}>
              <h3>No missions yet</h3>
              <p className="muted small">Describe what you are building and verified mentors in your domain can offer to help.</p>
              <Link href="/student/new" className="btn btn--primary" style={{ alignSelf: 'flex-start' }}>Request a mentor</Link>
            </div></div>
          )}
          {missions.map((p) => {
            const status = effectiveStatus(p);
            const offers = proposals.filter((x) => x.mission_id === p.id);
            return (
              <article key={p.id} className="card">
                <div className="card__body stack" style={{ ['--gap' as string]: '16px' }}>
                  <div className="row row--between row--top">
                    <div className="stack" style={{ ['--gap' as string]: '6px', minWidth: 0 }}>
                      <span className="mono xsmall muted">{p.code}</span>
                      <h3>{p.title}</h3>
                      <div className="tags"><span className="tag tag--solid">{domainName(p.domain)}</span></div>
                    </div>
                    <StatusPill status={status} />
                  </div>

                  {p.compliance_status === 'held' && <div className="notice notice--warn"><Icon name="defence" /><span>This defence-related project is in compliance review. Mentors cannot see it until it is cleared.</span></div>}
                  {p.compliance_status === 'rejected' && <div className="notice notice--warn"><Icon name="alert" /><span>This project did not pass compliance review. <Link href="/contact" className="link">Contact us</Link> to discuss it.</span></div>}

                  <div className="grid grid--2" style={{ ['--gap' as string]: '20px' }}>
                    <div className="stack" style={{ ['--gap' as string]: '8px' }}>
                      <span className="small semibold">Readiness: TRL {p.trl}</span>
                      <TrlScale value={p.trl} compact />
                    </div>
                    <div className="stack" style={{ ['--gap' as string]: '8px' }}>
                      <span className="small semibold"><abbr title="Planned date of completion">PDC</abbr> {fmtDate(p.pdc)} · {dueText(p.pdc)}</span>
                      <div className="bar" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.progress} percent complete`}>
                        <div className="bar__fill" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  </div>

                  {offers.length > 0 && (
                    <div className="stack" style={{ ['--gap' as string]: '10px' }}>
                      <span className="small semibold">{offers.length} {offers.length === 1 ? 'mentor has' : 'mentors have'} offered to help</span>
                      {offers.map((o) => (
                        <div key={o.id} className="row row--between row--top" style={{ border: '1px solid var(--line)', borderRadius: 4, padding: 12 }}>
                          <div className="row" style={{ ['--gap' as string]: '12px', flexWrap: 'nowrap' }}>
                            <div className="avatar">{o.initials}</div>
                            <div className="stack" style={{ ['--gap' as string]: '2px' }}>
                              <Link href={`/mentors/${o.slug}`} className="link small semibold">{o.name}</Link>
                              {o.message && <span className="small muted" style={{ whiteSpace: 'pre-wrap' }}>{o.message}</span>}
                            </div>
                          </div>
                          {p.compliance_status !== 'held' && <AcceptProposal missionId={p.id} proposalId={o.id} />}
                        </div>
                      ))}
                    </div>
                  )}

                  {p.mentor_id && <MissionTracker missionId={p.id} progress={p.progress} nextStep={p.next_step} />}
                </div>
                <div className="card__foot row row--between">
                  <span className="small"><span className="muted">Next: </span>{p.next_step}</span>
                  {p.mentor_slug ? (
                    <Link href={`/mentors/${p.mentor_slug}`} className="link small">{p.mentor_name}</Link>
                  ) : (
                    <Link href={`/mentors?domain=${p.domain}`} className="btn btn--secondary btn--sm">Browse mentors</Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="stack" style={{ ['--gap' as string]: '20px' }}>
          <div className="card">
            <div className="card__head"><h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--sans)' }}>Next session</h3>{upcoming && <span className="pill pill--info">Booked</span>}</div>
            <div className="card__body stack" style={{ ['--gap' as string]: '12px' }}>
              {upcoming ? (
                <>
                  <div className="row" style={{ ['--gap' as string]: '12px' }}>
                    <div className="avatar">{upcoming.mentor_initials}</div>
                    <div>
                      <div className="semibold small">{upcoming.title}</div>
                      <div className="xsmall muted">with {upcoming.mentor_name}{upcoming.mission_code ? ` · ${upcoming.mission_code}` : ''}</div>
                    </div>
                  </div>
                  <div className="row small" style={{ ['--gap' as string]: '8px' }}><Icon name="calendar" /><span className="mono">{fmtDateTime(upcoming.starts_at)}</span></div>
                  <Link href={`/session/${upcoming.id}`} className="btn btn--primary btn--block"><Icon name="video" /> Open session room</Link>
                </>
              ) : (
                <>
                  <p className="small muted">No session is booked. Once a mentor is on your mission you can schedule one, or book a free 15-minute intro from a mentor&apos;s profile.</p>
                  <Link href="/sessions" className="btn btn--secondary btn--block">Sessions</Link>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__head"><h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--sans)' }}>Mission files</h3></div>
            <div className="card__body stack" style={{ ['--gap' as string]: '10px' }}>
              {files.length === 0 && <p className="small muted">CAD, logs and test data you attach to a mission appear here. Only you and your mentor can open them.</p>}
              {files.map((f) => (
                <div key={f.id} className="row row--between small" style={{ ['--gap' as string]: '8px' }}>
                  <a className="link mono" href={`/api/files/${f.id}`}>{f.original_name}</a><span className="xsmall muted">{f.code}</span>
                </div>
              ))}
              {missions[0] && <AddMissionFiles missionId={missions[0].id} />}
              {missions[0] && <span className="xsmall muted">Adds to {missions[0].code}.</span>}
            </div>
          </div>

          <div className="card">
            <div className="card__head"><h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--sans)' }}>Recent activity</h3></div>
            <div className="card__body">
              {activity.length === 0 ? <p className="small muted">Nothing yet.</p> : (
                <ul className="timeline">
                  {activity.map((a, i) => <li key={i}><div className="small semibold">{a.event}</div><div className="xsmall muted">{ago(a.at)}</div></li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
