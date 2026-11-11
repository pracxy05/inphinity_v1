import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StatusPill from '@/components/StatusPill';
import { Icon } from '@/components/Icons';
import MentorRequests, { type RequestItem } from '@/components/MentorRequests';
import { pageUser } from '@/lib/server/auth';
import { getMentorProfileByUser, missionsForMentor, requestsForMentor, sessionsForUser, effectiveStatus } from '@/lib/server/queries';
import { domainName, fmtDate } from '@/lib/data';
import { fmtToday, fmtTime, fmtDayShort } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_COPY: Record<string, { pill: string; tone: 'ok' | 'warn' | 'info' | 'crit'; text: string }> = {
  draft: { pill: 'Application not submitted', tone: 'warn', text: 'Finish your application so our reviewers can start. Your profile stays hidden until all four checks are complete.' },
  submitted: { pill: 'Application received', tone: 'info', text: 'Our verification team has your application. We will email you when the review starts.' },
  in_review: { pill: 'In review', tone: 'info', text: 'A reviewer is checking your application. You can follow each stage here.' },
  needs_info: { pill: 'More information needed', tone: 'warn', text: 'A reviewer asked for more information. Read their note below, update your application and resubmit.' },
  rejected: { pill: 'Not approved', tone: 'crit', text: 'Your application was not approved. If you think this is a mistake, contact us.' },
};

export default async function MentorHome() {
  const user = await pageUser('mentor');
  const profile = await getMentorProfileByUser(user.id);
  const first = user.name.replace(/^(dr|prof)\.?\s+/i, '').split(' ')[0];

  if (!profile || profile.status !== 'approved') {
    const st = STATUS_COPY[profile?.status ?? 'draft'];
    return (
      <AppShell role="mentor" title="Mentor workspace / Overview">
        <div className="page-head">
          <div className="stack" style={{ ['--gap' as string]: '6px' }}><h1>Welcome, {first}</h1><p className="muted">{fmtToday()}</p></div>
          <span className={`pill pill--${st.tone}`}>{st.pill}</span>
        </div>
        <div className="card" style={{ maxWidth: 760 }}>
          <div className="card__body stack" style={{ ['--gap' as string]: '16px' }}>
            <p>{st.text}</p>
            {profile?.review_note && <div className="notice notice--warn"><Icon name="info" /><span><b>Reviewer note:</b> {profile.review_note}</span></div>}
            {(profile?.status === 'draft' || profile?.status === 'needs_info' || profile?.status === 'rejected') && (
              <Link href="/mentor/apply" className="btn btn--primary" style={{ alignSelf: 'flex-start' }}>{profile?.status === 'draft' ? 'Complete your application' : 'Update and resubmit'}</Link>
            )}
            {profile && profile.status !== 'draft' && (
              <div className="stack" style={{ ['--gap' as string]: '10px' }}>
                {([['identity', 'Identity'], ['credentials', 'Credentials'], ['domainReview', 'Domain review'], ['background', 'Background and conflict check']] as const).map(([k, label]) => (
                  <div key={k} className="row row--between"><span className="small">{label}</span><StatusPill status={profile.verified[k] ? 'Verified' : 'Pending'} /></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  const [requests, engagements, sessions] = await Promise.all([
    requestsForMentor(profile),
    missionsForMentor(profile.id),
    sessionsForUser(user.id, 'mentor'),
  ]);
  const items: RequestItem[] = requests.map((r) => ({
    id: r.id, code: r.code, title: r.title, domain: r.domain, trl: r.trl, team: r.team_size, pdc: r.pdc, needs: r.needs,
    summary: r.summary, match: r.match, proposalId: r.proposal_id, requestedYou: r.requested_you,
  }));
  const upcoming = sessions.find((s) => s.status === 'scheduled' && s.starts_at.getTime() > Date.now() - 3600_000);

  return (
    <AppShell role="mentor" title="Mentor workspace / Overview">
      <div className="page-head">
        <div className="stack" style={{ ['--gap' as string]: '6px' }}>
          <h1>Welcome back, {first}</h1>
          <p className="muted">{fmtToday()}</p>
        </div>
        <span className="pill pill--ok">Verified mentor</span>
      </div>

      <div className="card">
        <div className="grid grid--3" style={{ ['--gap' as string]: '0' }}>
          <div className="stat" style={{ borderRight: '1px solid var(--line)' }}>
            <span className="stat__v">{requests.filter((r) => !r.proposal_id).length}</span>
            <span className="stat__l">Requests matching your domains</span>
          </div>
          <div className="stat" style={{ borderRight: '1px solid var(--line)' }}>
            <span className="stat__v">{engagements.filter((e) => e.status !== 'Completed').length}</span>
            <span className="stat__l">Active engagements</span>
          </div>
          <div className="stat">
            <span className="stat__v">{upcoming ? fmtTime(upcoming.starts_at) : 'None'}</span>
            <span className="stat__l">{upcoming ? `Next session, ${fmtDayShort(upcoming.starts_at)}` : 'No session booked'}</span>
          </div>
        </div>
      </div>

      <div className="dash">
        <div className="stack" style={{ ['--gap' as string]: '24px' }}>
          <MentorRequests items={items} />

          <section className="card">
            <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Active engagements</h2></div>
            {engagements.length === 0 ? <div className="card__body"><p className="small muted">When a student chooses you, the engagement appears here.</p></div> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Mission</th><th>Domain</th><th>Status</th><th><abbr title="Planned date of completion">PDC</abbr></th><th /></tr></thead>
                  <tbody>
                    {engagements.map((p) => (
                      <tr key={p.id}>
                        <td><div className="semibold">{p.title}</div><div className="mono xsmall muted">{p.code} · {p.student_name}</div></td>
                        <td className="small">{domainName(p.domain)}</td>
                        <td><StatusPill status={effectiveStatus(p)} /></td>
                        <td className="mono small">{fmtDate(p.pdc)}</td>
                        <td><Link href={`/sessions?mission=${p.id}`} className="btn btn--secondary btn--sm">Schedule</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="stack" style={{ ['--gap' as string]: '24px' }}>
          <section className="card">
            <div className="card__head"><h2 style={{ fontSize: '1.05rem', fontFamily: 'var(--sans)' }}>Your verification</h2></div>
            <div className="card__body stack" style={{ ['--gap' as string]: '12px' }}>
              {([['identity', 'Identity'], ['credentials', 'Credentials'], ['domainReview', 'Domain review'], ['background', 'Background and conflict check']] as const).map(([k, label]) => (
                <div key={k} className="row row--between"><span className="small">{label}</span><StatusPill status={profile.verified[k] ? 'Verified' : 'Pending'} /></div>
              ))}
              {profile.defence_opt_in && <div className="row row--between"><span className="small">Defence clearance</span><StatusPill status={profile.defence_cleared ? 'Verified' : 'Pending'} /></div>}
              <Link href={`/mentors/${profile.slug}`} className="link small">View your public profile</Link>
            </div>
          </section>

          <section className="card">
            <div className="card__head"><h2 style={{ fontSize: '1.05rem', fontFamily: 'var(--sans)' }}>Earnings and payouts</h2></div>
            <div className="card__body stack" style={{ ['--gap' as string]: '12px' }}>
              <p className="small muted">Rates follow the InΦnity rate card. Payments are not switched on yet; earnings and payouts will appear here once they are.</p>
              <div className="notice"><Icon name="info" /><span>You will be able to add and verify a payout account before your first paid engagement starts.</span></div>
            </div>
          </section>

          <section className="card">
            <div className="card__head"><h2 style={{ fontSize: '1.05rem', fontFamily: 'var(--sans)' }}>Engagement formats</h2></div>
            <div className="card__body stack" style={{ ['--gap' as string]: '8px' }}>
              <div className="tags">{profile.formats.map((f) => <span key={f} className="tag">{f}</span>)}</div>
              <p className="xsmall muted">Rate card tier {profile.tier} applies to all formats.</p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
