'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';

type Verified = { identity: boolean; credentials: boolean; domainReview: boolean; background: boolean };
const LABELS: [keyof Verified, string][] = [['identity', 'Identity'], ['credentials', 'Credentials'], ['domainReview', 'Domain review'], ['background', 'Background and conflict check']];

export function ApplicationReview({ id, status, verified, tier, defenceOptIn, defenceCleared, note }: {
  id: string; status: string; verified: Verified; tier: 'A' | 'B' | 'C'; defenceOptIn: boolean; defenceCleared: boolean; note: string;
}) {
  const router = useRouter();
  const [v, setV] = useState<Verified>(verified);
  const [t, setT] = useState(tier);
  const [dc, setDc] = useState(defenceCleared);
  const [n, setN] = useState(note);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const act = async (action: 'approve' | 'reject' | 'needs_info' | 'in_review') => {
    setBusy(true); setErr('');
    try { await api(`/api/admin/applications/${id}/decision`, 'POST', { action, note: n, verified: v, tier: t, defenceCleared: dc }); router.refresh(); }
    catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="stack" style={{ ['--gap' as string]: '14px' }}>
      <div className="stack" style={{ ['--gap' as string]: '8px' }}>
        <span className="small semibold">Checks completed</span>
        {LABELS.map(([k, label]) => <label key={k} className="check"><input type="checkbox" checked={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.checked })} /><span>{label}</span></label>)}
        {defenceOptIn && <label className="check"><input type="checkbox" checked={dc} onChange={(e) => setDc(e.target.checked)} /><span>Cleared for defence-related projects</span></label>}
      </div>
      <div className="field" style={{ maxWidth: 220 }}>
        <label className="label" htmlFor={`tier-${id}`}>Rate card tier</label>
        <select className="select" id={`tier-${id}`} value={t} onChange={(e) => setT(e.target.value as 'A' | 'B' | 'C')}><option>A</option><option>B</option><option>C</option></select>
      </div>
      <div className="field">
        <label className="label" htmlFor={`note-${id}`}>Note to the applicant (shown to them)</label>
        <textarea className="textarea" id={`note-${id}`} value={n} maxLength={1000} onChange={(e) => setN(e.target.value)} style={{ minHeight: 80 }} />
      </div>
      {err && <span className="hint" style={{ color: 'var(--crit)' }} role="alert">{err}</span>}
      <div className="row" style={{ ['--gap' as string]: '8px' }}>
        {status === 'submitted' && <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => act('in_review')}>Start review</button>}
        <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => act('in_review')}>Save checks</button>
        <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => act('approve')}>Approve</button>
        <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => act('needs_info')}>Ask for more information</button>
        <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => act('reject')}>Reject</button>
      </div>
    </div>
  );
}

export function ComplianceActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const act = async (action: 'clear' | 'reject') => {
    setBusy(true); setErr('');
    try { await api(`/api/admin/missions/${id}/compliance`, 'POST', { action }); router.refresh(); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <span className="row" style={{ ['--gap' as string]: '8px' }}>
      <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => act('clear')}>Clear</button>
      <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => act('reject')}>Reject</button>
      {err && <span className="hint" style={{ color: 'var(--crit)' }}>{err}</span>}
    </span>
  );
}

export function ContactStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const set = async (s: string) => {
    setBusy(true);
    try { await api(`/api/admin/contact/${id}`, 'POST', { status: s }); router.refresh(); } catch { /* shown by refresh */ }
    setBusy(false);
  };
  return (
    <select className="select" aria-label="Case status" style={{ width: 'auto', minHeight: 34 }} value={status} disabled={busy} onChange={(e) => set(e.target.value)}>
      <option>Open</option><option>Escalated</option><option>Resolved</option>
    </select>
  );
}

export function StaffForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Verification admin');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try { await api('/api/admin/users/staff', 'POST', { email, adminRole: role }); setMsg('Done.'); setEmail(''); router.refresh(); }
    catch (err) { setMsg((err as Error).message); }
    setBusy(false);
  };
  return (
    <form className="stack" style={{ ['--gap' as string]: '12px', maxWidth: 520 }} onSubmit={submit}>
      <p className="small muted">Ask the person to register a normal account first (as a student), then give it a staff role here.</p>
      <div className="field"><label className="label" htmlFor="staff-email">Their account email</label><input className="input" id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div className="field">
        <label className="label" htmlFor="staff-role">Staff role</label>
        <select className="select" id="staff-role" value={role} onChange={(e) => setRole(e.target.value)}>
          {['Owner', 'Operations lead', 'Verification admin', 'Finance admin', 'Security admin', 'Support agent'].map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div className="row" style={{ ['--gap' as string]: '12px' }}><button type="submit" className="btn btn--primary btn--sm" disabled={busy}>Save staff role</button>{msg && <span className="small" role="status">{msg}</span>}</div>
    </form>
  );
}
