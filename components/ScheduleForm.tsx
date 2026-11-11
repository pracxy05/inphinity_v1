'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { Icon } from '@/components/Icons';

export type Option = { value: string; label: string };

export default function ScheduleForm({ missions, introSlug, introName, defaultMission }: {
  missions: Option[]; introSlug?: string; introName?: string; defaultMission?: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<'session' | 'intro'>(introSlug ? 'intro' : 'session');
  const [mission, setMission] = useState(defaultMission && missions.some((m) => m.value === defaultMission) ? defaultMission : missions[0]?.value ?? '');
  const [title, setTitle] = useState(introSlug ? `15-minute intro with ${introName}` : '');
  const [when, setWhen] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canSession = missions.length > 0;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api<{ id: string }>('/api/sessions', 'POST', {
        kind, title, startsAt: new Date(when).toISOString(),
        ...(kind === 'intro' ? { mentorSlug: introSlug } : { missionId: mission }),
      });
      router.push(`/session/${r.id}`);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  };

  if (!canSession && !introSlug) {
    return <p className="small muted">You can schedule sessions once a mentor is working on one of your missions. You can also book a free 15-minute intro from a mentor&apos;s profile.</p>;
  }

  return (
    <form className="stack" style={{ ['--gap' as string]: '16px' }} onSubmit={submit}>
      {introSlug && (
        <div className="seg" role="group" aria-label="Session type">
          <button type="button" aria-pressed={kind === 'intro'} onClick={() => setKind('intro')}>Intro with {introName}</button>
          {canSession && <button type="button" aria-pressed={kind === 'session'} onClick={() => setKind('session')}>Mission session</button>}
        </div>
      )}
      {kind === 'session' && (
        <div className="field" style={{ maxWidth: 480 }}>
          <label className="label" htmlFor="mission">Mission</label>
          <select className="select" id="mission" value={mission} onChange={(e) => setMission(e.target.value)}>{missions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
        </div>
      )}
      <div className="grid grid--2" style={{ ['--gap' as string]: '16px', maxWidth: 720 }}>
        <div className="field"><label className="label" htmlFor="title">What is it about?</label><input className="input" id="title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} placeholder="Estimator design review" required minLength={3} /></div>
        <div className="field"><label className="label" htmlFor="when">Date and time (your computer&apos;s time zone)</label><input className="input" id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required /></div>
      </div>
      {error && <div className="notice notice--warn" role="alert"><Icon name="alert" /><span>{error}</span></div>}
      <button type="submit" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} disabled={busy || !when || title.trim().length < 3}>{busy ? 'Scheduling…' : 'Schedule session'}</button>
    </form>
  );
}
