'use client';

import { useEffect, useRef, useState } from 'react';
import FileUploader from '@/components/FileUploader';
import { Icon } from '@/components/Icons';
import { api, prettySize, type UploadedFile } from '@/lib/client';

const tabs = ['Notes', 'Data', 'Chat'] as const;
type Msg = { id: number; me: boolean; body: string; at: string };
type Item = { id: string; text: string; done: boolean };
type FileLite = { id: string; name: string; size: number };

export default function SessionRoom({ sessionId, videoUrl, initialNotes, initialItems, initialMessages, files, startsLabel }: {
  sessionId: string; videoUrl: string; initialNotes: string; initialItems: Item[]; initialMessages: Msg[]; files: FileLite[]; startsLabel: string;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Notes');
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState<'' | 'Saving…' | 'Saved'>('');
  const [items, setItems] = useState<Item[]>(initialItems);
  const [newItem, setNewItem] = useState('');
  const [chat, setChat] = useState<Msg[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [shared, setShared] = useState<UploadedFile[]>([]);
  const [error, setError] = useState('');
  const last = useRef(initialMessages.at(-1)?.id ?? 0);
  const firstRender = useRef(true);
  const chatEnd = useRef<HTMLDivElement>(null);

  // Autosave notes one second after the last keystroke.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setSaved('Saving…');
    const t = setTimeout(async () => {
      try { await api(`/api/sessions/${sessionId}/notes`, 'PUT', { notes }); setSaved('Saved'); } catch { setSaved(''); setError('Could not save notes. Check your connection.'); }
    }, 1000);
    return () => clearTimeout(t);
  }, [notes, sessionId]);

  // Poll for new chat messages every 3 seconds while the tab is open.
  useEffect(() => {
    const t = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await api<{ messages: Msg[] }>(`/api/sessions/${sessionId}/messages?after=${last.current}`, 'GET');
        if (r.messages.length) { last.current = r.messages.at(-1)!.id; setChat((c) => [...c, ...r.messages.filter((m) => !c.some((x) => x.id === m.id))]); }
      } catch { /* try again next tick */ }
    }, 3000);
    return () => clearInterval(t);
  }, [sessionId]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest' }); }, [chat, tab]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      const r = await api<{ id: number }>(`/api/sessions/${sessionId}/messages`, 'POST', { body });
      last.current = Math.max(last.current, r.id);
      setChat((c) => (c.some((x) => x.id === r.id) ? c : [...c, { id: r.id, me: true, body, at: new Date().toISOString() }]));
    } catch (e) { setError((e as Error).message); setDraft(body); }
  };

  const addItem = async () => {
    const text = newItem.trim();
    if (!text) return;
    try { const r = await api<{ id: string }>(`/api/sessions/${sessionId}/items`, 'POST', { text }); setItems([...items, { id: r.id, text, done: false }]); setNewItem(''); }
    catch (e) { setError((e as Error).message); }
  };
  const toggleItem = async (it: Item) => {
    setItems(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)));
    try { await api(`/api/sessions/${sessionId}/items/${it.id}`, 'PATCH', { done: !it.done }); }
    catch (e) { setError((e as Error).message); setItems(items); }
  };

  return (
    <div className="room">
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        <div className="video" role="region" aria-label="Video call">
          <div className="stack" style={{ ['--gap' as string]: '14px', alignItems: 'center', textAlign: 'center', padding: 24 }}>
            <Icon name="video" />
            <span className="small">Video calls open in their own tab, so they keep working while you take notes here.</span>
            <a className="btn btn--invert" href={videoUrl} target="_blank" rel="noopener noreferrer"><Icon name="video" /> Join video call</a>
            <span className="xsmall" style={{ color: '#a3abb3' }}>Scheduled for {startsLabel}. Allow camera and microphone when your browser asks. The call link is private to this session.</span>
          </div>
        </div>
      </div>

      <section className="card" aria-label="Session tools" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="card__head">
          <div className="seg" role="group" aria-label="Session panel">
            {tabs.map((t) => <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}
          </div>
        </div>
        {error && <div className="card__body"><span className="hint" style={{ color: 'var(--crit)' }} role="alert">{error}</span></div>}

        {tab === 'Notes' && (
          <div className="card__body stack" style={{ ['--gap' as string]: '16px' }}>
            <div className="field">
              <label className="label" htmlFor="notes">Session notes <span className="xsmall muted">{saved}</span></label>
              <textarea className="textarea" id="notes" value={notes} maxLength={20000} onChange={(e) => setNotes(e.target.value)} placeholder={'Agenda\n1. \n2. '} />
              <span className="hint">Both of you can edit these notes. They are saved automatically.</span>
            </div>
            <div className="stack" style={{ ['--gap' as string]: '10px' }}>
              <span className="label">Action items</span>
              {items.map((it) => (
                <label key={it.id} className="check">
                  <input type="checkbox" checked={it.done} onChange={() => toggleItem(it)} />
                  <span style={{ textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'var(--slate)' : 'inherit' }}>{it.text}</span>
                </label>
              ))}
              <div className="row" style={{ ['--gap' as string]: '8px', flexWrap: 'nowrap' }}>
                <input className="input" aria-label="New action item" value={newItem} maxLength={300} placeholder="Add an action item" onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }} />
                <button type="button" className="btn btn--secondary" onClick={addItem}>Add</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'Data' && (
          <div className="card__body stack" style={{ ['--gap' as string]: '16px' }}>
            <span className="label">Shared files</span>
            {files.length === 0 && shared.length === 0 && <p className="small muted">Share logs, plots or documents with each other here. They stay with the mission after the session ends.</p>}
            <ul className="stack" style={{ ['--gap' as string]: '6px', listStyle: 'none', padding: 0, margin: 0 }}>
              {[...files, ...shared].map((f) => (
                <li key={f.id} className="row row--between small"><a className="link mono" href={`/api/files/${f.id}`}>{f.name}</a><span className="xsmall muted">{prettySize(f.size)}</span></li>
              ))}
            </ul>
            <FileUploader target={{ purpose: 'session_data', sessionId }} value={[]} onChange={(l) => setShared((s) => [...s, ...l.filter((x) => !s.some((y) => y.id === x.id))])} label="Share a file" />
          </div>
        )}

        {tab === 'Chat' && (
          <>
            <div className="chat grow" aria-live="polite">
              {chat.length === 0 && <p className="small muted">No messages yet.</p>}
              {chat.map((c) => <div key={c.id} className={`msg ${c.me ? 'msg--me' : ''}`}>{c.body}</div>)}
              <div ref={chatEnd} />
            </div>
            <div className="card__foot row" style={{ ['--gap' as string]: '8px', flexWrap: 'nowrap' }}>
              <label className="sr-only" htmlFor="draft">Message</label>
              <input className="input" id="draft" value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="Write a message" />
              <button type="button" className="btn btn--primary" onClick={send}>Send</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
