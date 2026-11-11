import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import MentorApplyForm from '@/components/MentorApplyForm';
import { pageUser } from '@/lib/server/auth';
import { getMentorProfileByUser } from '@/lib/server/queries';
import { query } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

/** Review-call slots for the next week, at 10:00 and 18:00 India time. */
function slots(): string[] {
  const out: string[] = [];
  const fmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  for (let i = 2; out.length < 8; i++) {
    const d = new Date(Date.now() + i * 86400_000);
    out.push(`${fmt.format(d)}, 10:00 IST`, `${fmt.format(d)}, 18:00 IST`);
  }
  return out;
}

export default async function MentorApply() {
  const user = await pageUser('mentor');
  const p = await getMentorProfileByUser(user.id);
  if (p?.status === 'approved') redirect('/mentor');

  if (p && (p.status === 'submitted' || p.status === 'in_review')) {
    return (
      <AppShell role="mentor" title="Mentor workspace / Verification">
        <div className="card" style={{ maxWidth: 720 }}>
          <div className="card__body stack" style={{ ['--gap' as string]: '16px' }}>
            <span className="pill pill--info">{p.status === 'submitted' ? 'Application received' : 'In review'}</span>
            <h1 style={{ fontSize: '2rem' }}>Thank you, we have your application</h1>
            <p className="muted">Your profile goes live only after all four checks are complete. You can follow each stage from your workspace.</p>
            <ol className="stepper">
              <li className="is-done">Application</li>
              <li className={p.verified.identity ? 'is-done' : 'is-current'}>Identity</li>
              <li className={p.verified.credentials ? 'is-done' : ''}>Credentials</li>
              <li className={p.verified.domainReview ? 'is-done' : ''}>Domain review</li>
              <li>Decision</li>
            </ol>
            <Link href="/mentor" className="btn btn--primary" style={{ alignSelf: 'flex-start' }}>Go to mentor workspace</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const ids = await query<{ id: string; original_name: string; size_bytes: string; purpose: string }>(
    `select id, original_name, size_bytes, purpose from files where owner_id = $1 and status = 'ready' and purpose in ('mentor_id_document','mentor_evidence') order by created_at`, [user.id]);
  const initial = {
    phone: '', employer: p?.employer ?? '', jobRole: p?.job_role ?? '', title: p?.title ?? '', years: p?.years || 5,
    domains: p?.domains ?? [], trlLo: p?.trl_lo ?? 3, trlHi: p?.trl_hi ?? 7, bio: p?.bio ?? '', background: p?.background ?? '',
    topics: p?.topics ?? [], languages: p?.languages?.length ? p.languages : ['English'], formats: p?.formats ?? ['Hourly session', 'Monthly package', 'Fixed-price milestone'],
    grid: p?.grid ?? [Array(7).fill(false), Array(7).fill(false), Array(7).fill(false)], defenceOptIn: p?.defence_opt_in ?? false,
  };
  const toFile = (r: (typeof ids)[number]) => ({ id: r.id, name: r.original_name, size: Number(r.size_bytes) });

  return (
    <AppShell role="mentor" title="Mentor workspace / Verification">
      <div className="page-head">
        <div className="stack" style={{ ['--gap' as string]: '6px' }}>
          <h1>Apply to mentor</h1>
          <p className="muted measure">Not everyone can become a mentor. We check who you are, what you have done, and how well you know your domain. Applicants must be 18 or over.</p>
        </div>
      </div>
      {p?.review_note && <div className="notice notice--warn"><span><b>Reviewer note:</b> {p.review_note}</span></div>}
      <MentorApplyForm
        name={user.name} email={user.email} initial={initial} slots={slots()}
        idFiles={ids.filter((i) => i.purpose === 'mentor_id_document').map(toFile)}
        evidenceFiles={ids.filter((i) => i.purpose === 'mentor_evidence').map(toFile)}
      />
    </AppShell>
  );
}
