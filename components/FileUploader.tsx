'use client';

import { useRef, useState } from 'react';
import { api, uploadFile, prettySize, type UploadedFile, type UploadTarget } from '@/lib/client';

export default function FileUploader({
  target, value, onChange, label = 'Choose files', accept, multiple = true,
}: {
  target: UploadTarget;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  label?: string;
  accept?: string;
  multiple?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (list: FileList | null) => {
    if (!list || !list.length) return;
    setBusy(true); setError('');
    let next = value;
    for (const f of Array.from(list)) {
      try { next = [...next, await uploadFile(f, target)]; onChange(next); }
      catch (e) { setError(`${f.name}: ${(e as Error).message}`); }
    }
    setBusy(false);
    if (input.current) input.current.value = '';
  };

  const remove = async (id: string) => {
    onChange(value.filter((f) => f.id !== id));
    try { await api(`/api/files/${id}`, 'DELETE'); } catch { /* already gone */ }
  };

  return (
    <div className="stack" style={{ ['--gap' as string]: '10px' }}>
      <div className="row" style={{ ['--gap' as string]: '12px' }}>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Uploading…' : label}</button>
        <input ref={input} type="file" hidden multiple={multiple} accept={accept} onChange={(e) => pick(e.target.files)} aria-label={label} />
        <span className="xsmall muted">Up to 25 MB each. Private: only the people who need them can open your files.</span>
      </div>
      {error && <span className="hint" style={{ color: 'var(--crit)' }} role="alert">{error}</span>}
      {value.length > 0 && (
        <ul className="stack" style={{ ['--gap' as string]: '6px', listStyle: 'none', padding: 0, margin: 0 }}>
          {value.map((f) => (
            <li key={f.id} className="row row--between small" style={{ ['--gap' as string]: '8px' }}>
              <span><span className="mono">{f.name}</span> <span className="muted">· {prettySize(f.size)}</span></span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(f.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
