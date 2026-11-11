'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, type UploadedFile } from '@/lib/client';
import FileUploader from './FileUploader';

export function AcceptProposal({ missionId, proposalId }: { missionId: string; proposalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    try { await api(`/api/missions/${missionId}/accept`, 'POST', { proposalId }); router.refresh(); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <span className="row" style={{ ['--gap' as string]: '8px' }}>
      <button type="button" className="btn btn--primary btn--sm" onClick={go} disabled={busy}>{busy ? 'Working…' : 'Choose this mentor'}</button>
      {err && <span className="hint" style={{ color: 'var(--crit)' }}>{err}</span>}
    </span>
  );
}

export function MissionTracker({ missionId, progress, nextStep }: { missionId: string; progress: number; nextStep: string }) {
  const router = useRouter();
  const [p, setP] = useState(progress);
  const [next, setNext] = useState(nextStep);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const save = async (extra: Record<string, unknown> = {}) => {
    setBusy(true); setMsg('');
    try { await api(`/api/missions/${missionId}`, 'PATCH', { progress: p, nextStep: next, ...extra }); setMsg('Saved'); router.refresh(); }
    catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  return (
    <details className="stack" style={{ ['--gap' as string]: '12px' }}>
      <summary className="small link" style={{ cursor: 'pointer' }}>Update progress</summary>
      <div className="stack" style={{ ['--gap' as string]: '12px', marginTop: 12 }}>
        <div className="field"><label className="label" htmlFor={`p-${missionId}`}>Progress: {p}%</label><input className="range" id={`p-${missionId}`} type="range" min={0} max={100} value={p} onChange={(e) => setP(Number(e.target.value))} /></div>
        <div className="field"><label className="label" htmlFor={`n-${missionId}`}>Next step</label><input className="input" id={`n-${missionId}`} value={next} maxLength={200} onChange={(e) => setNext(e.target.value)} /></div>
        <div className="row" style={{ ['--gap' as string]: '8px' }}>
          <button type="button" className="btn btn--primary btn--sm" disabled={busy || !next.trim()} onClick={() => save()}>Save</button>
          <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => save({ status: 'At risk' })}>Mark at risk</button>
          <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => save({ status: 'On track' })}>Mark on track</button>
          <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => save({ status: 'Completed' })}>Mark completed</button>
          {msg && <span className="small muted" role="status">{msg}</span>}
        </div>
      </div>
    </details>
  );
}

export function AddMissionFiles({ missionId }: { missionId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  return (
    <FileUploader
      target={{ purpose: 'mission_attachment', missionId }}
      value={files}
      label="Add files"
      onChange={(f) => { setFiles(f); router.refresh(); }}
    />
  );
}
