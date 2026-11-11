import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StatusPill from '@/components/StatusPill';
import { Icon, type IconName } from '@/components/Icons';
import { ApplicationReview, ComplianceActions, ContactStatus, StaffForm } from '@/components/AdminActions';
import { pageUser, type AdminRole } from '@/lib/server/auth';
import { query, one } from '@/lib/server/db';
import { driver } from '@/lib/server/storage';
import { domainName, domains, type DomainId } from '@/lib/data';
import { ago, maskEmail } from '@/lib/format';
import type { MentorRow } from '@/lib/server/queries';

export const dynamic = 'force-dynamic';

type Section = 'Overview' | 'Verification' | 'Finance' | 'Security' | 'Support' | 'Staff';

const sections: { id: Section; icon: IconName }[] = [
  { id: 'Overview', icon: 'chart' }, { id: 'Verification', icon: 'defence' }, { id: 'Finance', icon: 'list' },
  { id: 'Security', icon: 'lock' }, { id: 'Support', icon: 'message' }, { id: 'Staff', icon: 'user' },
];

const access: Record<AdminRole, Section[]> = {
  Owner: ['Overview', 'Verification', 'Finance', 'Security', 'Support', 'Staff'],
  'Operations lead': ['Overview', 'Support'],
  'Verification admin': ['Overview', 'Verification'],
  'Finance admin': ['Overview', 'Finance'],
  'Security admin': ['Overview', 'Security', 'Verification'],
  'Support agent': ['Overview', 'Support'],
};

const roleNote: Record<AdminRole, string> = {
  Owner: 'Sees everything and manages staff roles.',
  'Operations lead': 'Sees marketplace health and support cases. Cannot open verification documents or payment detail.',
  'Verification admin': 'Sees identity and credential records. Cannot see payment history.',
  'Finance admin': 'Sees amounts, fees and payouts. Cannot open identity documents.',
  'Security admin': 'Sees security events and verification audit trails. Cannot change payouts.',
  'Support agent': 'Sees cases with personal details masked. Cannot see documents or payments.',
};

const statusLabel: Record<string, { text: string; tone: 'ok' | 'warn' | 'crit' | 'info' | 'neutral' }> = {
  submitted: { text: 'New', tone: 'info' }, in_review: { text: 'In progress', tone: 'info' }, needs_info: { text: 'Waiting on applicant', tone: 'warn' },
};

export default async function Admin({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const user = await pageUser('admin');
  const role = user.adminRole!;
  const allowed = access[role];
  const req = (await searchParams).section as Section | undefined;
  const current: Section = req && allowed.includes(req) ? req : 'Overview';
  const can = (s: Section) => allowed.includes(s);

  const t0 = Date.now();
  const stats = await one<{ verified: string; review: string; open: string; cases: string }>(
    `select (select count(*) from mentor_profiles where status = 'approved') as verified,
            (select count(*) from mentor_profiles where status in ('submitted','in_review','needs_info') and is_sample = false) as review,
            (select count(*) from missions where status = 'Awaiting mentor' and mentor_id is null) as open,
            (select count(*) from contact_messages where status <> 'Resolved') as cases`);
  const dbMs = Date.now() - t0;

  return (
    <AppShell role="admin" title="Admin console / Operations">
      <div className="page-head">
        <div className="stack" style={{ ['--gap' as string]: '6px' }}>
          <h1>Operations console</h1>
          <p className="muted measure">Signed in as <b>{role}</b>. {roleNote[role]}</p>
        </div>
      </div>

      <div className="card">
        <div className="grid grid--4" style={{ ['--gap' as string]: '0' }}>
          <div className="stat" style={{ borderRight: '1px solid var(--line)' }}><span className="stat__v">{stats?.verified}</span><span className="stat__l">Verified mentors</span></div>
          <div className="stat" style={{ borderRight: '1px solid var(--line)' }}><span className="stat__v">{stats?.review}</span><span className="stat__l">Applications in review</span></div>
          <div className="stat" style={{ borderRight: '1px solid var(--line)' }}><span className="stat__v">{stats?.open}</span><span className="stat__l">Open mission requests</span></div>
          <div className="stat"><span className="stat__v">{stats?.cases}</span><span className="stat__l">Open support cases</span></div>
        </div>
      </div>

      <div className="admin">
        <nav className="stack" style={{ ['--gap' as string]: '6px' }} aria-label="Console sections">
          {sections.filter((s) => s.id !== 'Staff' || role === 'Owner').map((s) => {
            const ok = can(s.id);
            const on = current === s.id;
            const style = { width: '100%', background: on ? 'var(--ink)' : 'var(--paper)', color: on ? '#fff' : ok ? 'var(--ink)' : 'var(--steel)', border: '1px solid var(--line)', justifyContent: 'space-between', pointerEvents: ok ? 'auto' : 'none' } as const;
            return (
              <Link key={s.id} href={`/admin?section=${s.id}`} className="app__link" aria-current={on ? 'page' : undefined} aria-disabled={!ok} style={style}>
                <span className="row" style={{ ['--gap' as string]: '12px', flexWrap: 'nowrap' }}><Icon name={s.icon} />{s.id}</span>
                {!ok && <span className="xsmall">No access</span>}
              </Link>
            );
          })}
        </nav>

        <div className="stack" style={{ ['--gap' as string]: '24px', minWidth: 0 }}>
          {current === 'Overview' && <Overview dbMs={dbMs} />}
          {current === 'Verification' && <Verification />}
          {current === 'Finance' && (
            <section className="card">
              <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Transactions</h2></div>
              <div className="card__body stack" style={{ ['--gap' as string]: '10px' }}>
                <span className="pill pill--neutral" style={{ alignSelf: 'flex-start' }}>Payments not enabled</span>
                <p className="small muted">No money moves through InΦnity yet. When the rate card and commission are decided, transactions, payouts and refunds appear here.</p>
              </div>
            </section>
          )}
          {current === 'Security' && <Security />}
          {current === 'Support' && <Support mask={role === 'Support agent'} />}
          {current === 'Staff' && role === 'Owner' && <Staff selfId={user.id} />}
        </div>
      </div>
    </AppShell>
  );
}

async function Overview({ dbMs }: { dbMs: number }) {
  const rows = await query<{ domain: DomainId; n: string }>(`select domain, count(*) as n from missions where status = 'Awaiting mentor' and mentor_id is null group by domain`);
  const by = new Map(rows.map((r) => [r.domain, Number(r.n)]));
  const list = domains.map((d) => ({ id: d.id, open: by.get(d.id) ?? 0 }));
  const max = Math.max(1, ...list.map((d) => d.open));
  return (
    <>
      <section className="card">
        <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Open requests by domain</h2></div>
        <div className="card__body stack" style={{ ['--gap' as string]: '12px' }}>
          {list.map((d) => (
            <div key={d.id} className="barrow">
              <span className="small">{domainName(d.id)}</span>
              <div className="bar" aria-hidden="true"><div className="bar__fill" style={{ width: `${(d.open / max) * 100}%` }} /></div>
              <span className="mono small">{d.open}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Platform health</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Service</th><th>Measure</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td className="semibold">Web and API</td><td className="mono small">Responding</td><td><span className="pill pill--ok">Healthy</span></td></tr>
              <tr><td className="semibold">Database</td><td className="mono small">Query took {dbMs} ms</td><td><span className={`pill ${dbMs < 1500 ? 'pill--ok' : 'pill--warn'}`}>{dbMs < 1500 ? 'Healthy' : 'Slow'}</span></td></tr>
              <tr><td className="semibold">File storage</td><td className="mono small">{driver === 's3' ? 'Private bucket' : 'Local disk (development only)'}</td><td><span className={`pill ${driver === 's3' ? 'pill--ok' : 'pill--warn'}`}>{driver === 's3' ? 'Connected' : 'Not configured'}</span></td></tr>
              <tr><td className="semibold">Video</td><td className="mono small">Private Jitsi room per session</td><td><span className="pill pill--ok">Available</span></td></tr>
              <tr><td className="semibold">Payments</td><td className="mono small">Not enabled</td><td><span className="pill pill--neutral">Off</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

async function Verification() {
  const apps = await query<MentorRow & { email: string; files: { id: string; original_name: string; purpose: string }[] }>(
    `select p.*, u.email,
       coalesce((select json_agg(json_build_object('id', f.id, 'original_name', f.original_name, 'purpose', f.purpose) order by f.created_at)
                 from files f where f.owner_id = p.user_id and f.status = 'ready' and f.purpose in ('mentor_id_document','mentor_evidence')), '[]') as files
     from mentor_profiles p join users u on u.id = p.user_id
     where p.status in ('submitted','in_review','needs_info') order by p.submitted_at nulls last`);
  const held = await query<{ id: string; code: string; title: string; summary: string; student: string; files: { id: string; original_name: string }[] }>(
    `select m.id, m.code, m.title, m.summary, u.name as student,
       coalesce((select json_agg(json_build_object('id', f.id, 'original_name', f.original_name)) from files f where f.mission_id = m.id and f.status = 'ready'), '[]') as files
     from missions m join users u on u.id = m.student_id where m.compliance_status = 'held' order by m.created_at`);

  return (
    <>
      <section className="card">
        <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Mentor verification queue</h2><span className="small muted">Oldest first</span></div>
        {apps.length === 0 ? <div className="card__body"><p className="small muted">No applications are waiting.</p></div> : apps.map((a, i) => {
          const st = statusLabel[a.status];
          return (
            <details key={a.id} style={{ borderTop: i ? '1px solid var(--line)' : 0 }}>
              <summary className="card__body row row--between" style={{ cursor: 'pointer' }}>
                <span><b>Applicant {String(a.applicant_no).padStart(4, '0')}</b> <span className="small muted">· {a.name} · {a.domains.map((d) => domainName(d as DomainId)).join(', ')}</span></span>
                <span className="row" style={{ ['--gap' as string]: '10px' }}><span className="small muted">{a.submitted_at ? `Submitted ${ago(a.submitted_at)}` : ''}</span><StatusPill status={st.text} tone={st.tone} /></span>
              </summary>
              <div className="card__body stack" style={{ ['--gap' as string]: '18px', background: 'var(--fog)' }}>
                <dl className="kv small">
                  <dt>Email</dt><dd>{a.email}</dd>
                  <dt>Organisation</dt><dd>{a.employer}, {a.job_role}</dd>
                  <dt>Headline</dt><dd>{a.title}</dd>
                  <dt>Experience</dt><dd>{a.years} years · TRL {a.trl_lo} to {a.trl_hi}</dd>
                  <dt>Review call</dt><dd>{a.review_slot}</dd>
                  <dt>Defence</dt><dd>{a.defence_opt_in ? 'Willing, compliance review needed' : 'No'}</dd>
                </dl>
                <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{a.bio}</p>
                <div className="stack" style={{ ['--gap' as string]: '6px' }}>
                  <span className="small semibold">Documents (opening one is logged)</span>
                  {a.files.length === 0 ? <span className="small muted">None uploaded</span> : a.files.map((f) => (
                    <a key={f.id} className="link small" href={`/api/files/${f.id}`}><span className="mono">{f.original_name}</span> <span className="muted">· {f.purpose === 'mentor_id_document' ? 'ID' : 'Evidence'}</span></a>
                  ))}
                </div>
                <ApplicationReview id={a.id} status={a.status} verified={a.verified} tier={a.tier} defenceOptIn={a.defence_opt_in} defenceCleared={a.defence_cleared} note={a.review_note ?? ''} />
              </div>
            </details>
          );
        })}
        <div className="card__foot small muted">Defence and dual-use applicants also pass a compliance review before approval.</div>
      </section>

      <section className="card">
        <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Defence projects held for review</h2></div>
        {held.length === 0 ? <div className="card__body"><p className="small muted">Nothing is held.</p></div> : held.map((m, i) => (
          <div key={m.id} className="card__body stack" style={{ ['--gap' as string]: '10px', borderTop: i ? '1px solid var(--line)' : 0 }}>
            <div className="row row--between row--top">
              <div className="stack" style={{ ['--gap' as string]: '4px' }}><span className="mono xsmall muted">{m.code} · {m.student}</span><h3 style={{ fontSize: '1.05rem' }}>{m.title}</h3></div>
              <ComplianceActions id={m.id} />
            </div>
            <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{m.summary}</p>
            {m.files.map((f) => <a key={f.id} className="link small mono" href={`/api/files/${f.id}`}>{f.original_name}</a>)}
          </div>
        ))}
      </section>
    </>
  );
}

async function Security() {
  const events = await query<{ event: string; actor_label: string; result: string; tone: 'ok' | 'warn' | 'crit'; at: Date }>('select event, actor_label, result, tone, at from audit_log order by at desc limit 60');
  return (
    <section className="card">
      <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Security and audit events</h2><span className="small muted">Latest 60</span></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Event</th><th>Who</th><th>When</th><th>Result</th></tr></thead>
          <tbody>
            {events.map((e, i) => <tr key={i}><td className="semibold">{e.event}</td><td className="small">{e.actor_label}</td><td className="small muted">{ago(e.at)}</td><td><StatusPill status={e.result} tone={e.tone} /></td></tr>)}
            {events.length === 0 && <tr><td colSpan={4} className="small muted">No events yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function Support({ mask }: { mask: boolean }) {
  const cases = await query<{ id: string; ref: string; name: string; email: string; subject: string; message: string; status: string; created_at: Date }>(
    `select id, ref, name, email, subject, message, status, created_at from contact_messages order by (status = 'Resolved'), created_at desc limit 100`);
  return (
    <section className="card">
      <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Support cases</h2>{mask && <span className="small muted">Personal details masked</span>}</div>
      {cases.length === 0 ? <div className="card__body"><p className="small muted">No messages yet.</p></div> : cases.map((c, i) => (
        <details key={c.id} style={{ borderTop: i ? '1px solid var(--line)' : 0 }}>
          <summary className="card__body row row--between" style={{ cursor: 'pointer' }}>
            <span><b>{c.subject}</b> <span className="mono xsmall muted">· {c.ref} · {ago(c.created_at)}</span></span><StatusPill status={c.status} />
          </summary>
          <div className="card__body stack" style={{ ['--gap' as string]: '12px', background: 'var(--fog)' }}>
            <span className="small">{mask ? 'Hidden' : c.name} · {mask ? maskEmail(c.email) : <a className="link" href={`mailto:${c.email}`}>{c.email}</a>}</span>
            <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{c.message}</p>
            <div className="row" style={{ ['--gap' as string]: '8px' }}><span className="small muted">Status</span><ContactStatus id={c.id} status={c.status} /></div>
          </div>
        </details>
      ))}
    </section>
  );
}

async function Staff({ selfId }: { selfId: string }) {
  const staff = await query<{ id: string; name: string; email: string; admin_role: string }>(`select id, name, email, admin_role from users where role = 'admin' order by created_at`);
  return (
    <>
      <section className="card">
        <div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Staff</h2></div>
        <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
          <tbody>{staff.map((s) => <tr key={s.id}><td className="semibold">{s.name}{s.id === selfId ? ' (you)' : ''}</td><td className="small">{s.email}</td><td><StatusPill status={s.admin_role} tone="info" /></td></tr>)}</tbody></table></div>
      </section>
      <section className="card"><div className="card__head"><h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Add or change a staff role</h2></div><div className="card__body"><StaffForm /></div></section>
    </>
  );
}
