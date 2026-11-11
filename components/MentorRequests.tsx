'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import TrlScale from '@/components/TrlScale';
import { api } from '@/lib/client';
import { domainName, fmtDate, type DomainId } from '@/lib/data';

export type RequestItem = {
  id: string; code: string; title: string; domain: DomainId; trl: number; team: number; pdc: string; needs: string[];
  summary: string; match: number; proposalId: string | null; requestedYou: boolean;
};

const tabs = ['Recommended', 'New', 'Applied'] as const;

export default function MentorRequests({ items }: { items: RequestItem[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]>('Recommended');
  const [open, setOpen] = useState<string | null>(null);
  const [compose, setCompose] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const list = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.match - a.match);
    if (tab === 'Applied') return sorted.filter((r) => r.proposalId);
    if (tab === 'New') return sorted.filter((r) => !r.proposalId);
    return sorted.filter((r) => !r.proposalId && (r.match >= 80 || r.requestedYou));
  }, [items, tab]);

  const send = async (missionId: string) => {
    setBusy(true); setError('');
    try { await api('/api/proposals', 'POST', { missionId, message }); setCompose(null); setMessage(''); router.refresh(); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  const withdraw = async (proposalId: string) => {
    setBusy(true); setError('');
    try { await api(`/api/proposals/${proposalId}`, 'DELETE'); router.refresh(); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  return (
    <section className="card">
      <div className="card__head">
        <h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--sans)' }}>Mission requests</h2>
        <div className="seg" role="group" aria-label="Request filter">
          {tabs.map((t) => <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}
        </div>
      </div>
      {error && <div className="card__body"><span className="hint" style={{ color: 'var(--crit)' }} role="alert">{error}</span></div>}
      <div>
        {list.length === 0 && <div className="card__body"><p className="small muted">{tab === 'Applied' ? 'You have not sent any proposals yet.' : 'No open requests match your domains right now. New ones appear here as students publish them.'}</p></div>}
        {list.map((r, i) => (
          <div key={r.id} className="card__body stack" style={{ ['--gap' as string]: '14px', borderTop: i ? '1px solid var(--line)' : 0 }}>
            <div className="row row--between row--top">
              <div className="stack" style={{ ['--gap' as string]: '4px', minWidth: 0 }}>
                <span className="mono xsmall muted">{r.code}{r.requestedYou ? ' · asked for you' : ''}</span>
                <h3 style={{ fontSize: '1.1rem' }}>{r.title}</h3>
                <span className="small muted">{domainName(r.domain)} · team of {r.team} · <abbr title="Planned date of completion">PDC</abbr> {fmtDate(r.pdc)}</span>
              </div>
              <span className="pill pill--ok">{r.match}% fit</span>
            </div>
            <div className="grid grid--2" style={{ ['--gap' as string]: '20px' }}>
              <div className="stack" style={{ ['--gap' as string]: '6px' }}>
                <span className="xsmall muted">Readiness: TRL {r.trl}</span>
                <TrlScale value={r.trl} compact />
              </div>
              <div className="stack" style={{ ['--gap' as string]: '2px' }}>
                <span className="xsmall muted">Help wanted</span>
                <span className="small">{r.needs.join(', ')}</span>
              </div>
            </div>
            {open === r.id && <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{r.summary}</p>}
            {compose === r.id && (
              <div className="field">
                <label className="label" htmlFor={`m-${r.id}`}>Your note to the team (optional)</label>
                <textarea className="textarea" id={`m-${r.id}`} value={message} maxLength={1500} onChange={(e) => setMessage(e.target.value)} placeholder="How you would help, and what you would want to see first." />
                <div className="row" style={{ ['--gap' as string]: '8px' }}>
                  <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => send(r.id)}>{busy ? 'Sending…' : 'Send proposal'}</button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCompose(null)}>Cancel</button>
                </div>
              </div>
            )}
            <div className="row" style={{ ['--gap' as string]: '8px' }}>
              {r.proposalId ? (
                <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => withdraw(r.proposalId!)}>Withdraw proposal</button>
              ) : compose !== r.id && (
                <button type="button" className="btn btn--primary btn--sm" onClick={() => { setCompose(r.id); setMessage(''); }}>Send proposal</button>
              )}
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide details' : 'View details'}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
