'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import FileUploader from '@/components/FileUploader';
import { Icon } from '@/components/Icons';
import { api, type UploadedFile } from '@/lib/client';
import { domains, trlLevels, formatOptions, type DomainId } from '@/lib/data';

const stages = ['Your details', 'Identity', 'Credentials', 'Review call', 'Submit'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PARTS = ['Morning', 'Afternoon', 'Evening'];
const LANGS = ['English', 'Hindi', 'Telugu', 'Marathi', 'Kannada', 'Malayalam', 'Tamil', 'Gujarati', 'Urdu'];

type Initial = {
  phone: string; employer: string; jobRole: string; title: string; years: number; domains: string[]; trlLo: number; trlHi: number;
  bio: string; background: string; topics: string[]; languages: string[]; formats: string[]; grid: boolean[][]; defenceOptIn: boolean;
};

export default function MentorApplyForm({ name, email, initial, slots, idFiles, evidenceFiles }: {
  name: string; email: string; initial: Initial; slots: string[]; idFiles: UploadedFile[]; evidenceFiles: UploadedFile[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [phone, setPhone] = useState(initial.phone);
  const [ids, setIds] = useState<UploadedFile[]>(idFiles);
  const [employer, setEmployer] = useState(initial.employer);
  const [jobRole, setJobRole] = useState(initial.jobRole);
  const [title, setTitle] = useState(initial.title);
  const [years, setYears] = useState(initial.years);
  const [picked, setPicked] = useState<string[]>(initial.domains);
  const [lo, setLo] = useState(initial.trlLo);
  const [hi, setHi] = useState(initial.trlHi);
  const [bio, setBio] = useState(initial.bio);
  const [background, setBackground] = useState(initial.background);
  const [topics, setTopics] = useState(initial.topics.join(', '));
  const [langs, setLangs] = useState<string[]>(initial.languages);
  const [evidence, setEvidence] = useState<UploadedFile[]>(evidenceFiles);
  const [grid, setGrid] = useState<boolean[][]>(initial.grid);
  const [formats, setFormats] = useState<string[]>(initial.formats);
  const [slot, setSlot] = useState('');
  const [defence, setDefence] = useState(initial.defenceOptIn);
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);

  const topicList = useMemo(() => topics.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10), [topics]);
  const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const valid = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return ids.length > 0;
    if (step === 2) return employer.trim().length > 1 && jobRole.trim().length > 1 && title.trim().length > 2 && picked.length > 0 && lo <= hi && bio.trim().length >= 20 && background.trim().length >= 10 && topicList.length > 0 && langs.length > 0;
    if (step === 3) return slot !== '' && formats.length > 0;
    return agree1 && agree2;
  }, [step, ids, employer, jobRole, title, picked, lo, hi, bio, background, topicList, langs, slot, formats, agree1, agree2]);

  const submit = async () => {
    setBusy(true); setError('');
    try {
      await api('/api/mentor/application', 'POST', {
        phone, employer, jobRole, title, years, domains: picked, trlLo: lo, trlHi: hi, bio, background, topics: topicList,
        languages: langs, formats, grid, reviewSlot: slot, defenceOptIn: defence, agree: true,
        idDocumentIds: ids.map((f) => f.id), evidenceIds: evidence.map((f) => f.id),
      });
      router.refresh();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  return (
    <>
      <ol className="stepper" aria-label="Application progress">
        {stages.map((s, i) => <li key={s} className={i < step ? 'is-done' : i === step ? 'is-current' : ''} aria-current={i === step ? 'step' : undefined}><span>{s}</span></li>)}
      </ol>

      <div className="card" style={{ maxWidth: 820 }}>
        <div className="card__body stack" style={{ ['--gap' as string]: '22px' }}>
          {step === 0 && (
            <>
              <h2 style={{ fontSize: '1.4rem' }}>Your details</h2>
              <dl className="kv"><dt>Name</dt><dd>{name}</dd><dt>Email</dt><dd>{email}</dd></dl>
              <div className="field" style={{ maxWidth: 360 }}>
                <label className="label" htmlFor="phone">Mobile number (optional)</label>
                <input className="input" id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <span className="hint">Reviewers may use it to arrange your review call.</span>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 style={{ fontSize: '1.4rem' }}>Verify your identity</h2>
              <p className="muted">Upload a clear photo or scan of a government photo ID (passport, Aadhaar or driving licence). Our verification staff check it by hand, and each time a staff member opens it, it is logged. Cover any number you do not want us to see.</p>
              <div className="stack upload" style={{ ['--gap' as string]: '10px' }}>
                <Icon name="user" />
                <span className="semibold small">Government photo ID</span>
                <FileUploader target={{ purpose: 'mentor_id_document' }} value={ids} onChange={setIds} label="Upload ID" accept=".pdf,.png,.jpg,.jpeg,.webp" />
              </div>
              <div className="notice"><Icon name="lock" /><span>Your ID is stored privately. Only you and the reviewing staff can open it.</span></div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ fontSize: '1.4rem' }}>Your professional background</h2>
              <div className="grid grid--2" style={{ ['--gap' as string]: '20px' }}>
                <div className="field"><label className="label" htmlFor="employer">Current or most recent organisation</label><input className="input" id="employer" value={employer} onChange={(e) => setEmployer(e.target.value)} /></div>
                <div className="field"><label className="label" htmlFor="role">Role</label><input className="input" id="role" value={jobRole} onChange={(e) => setJobRole(e.target.value)} /></div>
                <div className="field"><label className="label" htmlFor="headline">Profile headline</label><input className="input" id="headline" value={title} maxLength={150} placeholder="For example: RF and telemetry engineer" onChange={(e) => setTitle(e.target.value)} /></div>
                <div className="field"><label className="label" htmlFor="years">Years in the field</label><input className="input" id="years" type="number" min={0} max={60} value={years} onChange={(e) => setYears(Number(e.target.value))} /></div>
              </div>
              <div className="field">
                <span className="label" id="dom">Domains you can mentor in</span>
                <div className="chips" role="group" aria-labelledby="dom">
                  {domains.map((d) => <button key={d.id} type="button" className={`chip ${picked.includes(d.id) ? 'chip--on' : ''}`} aria-pressed={picked.includes(d.id)} onClick={() => setPicked(toggle(picked, d.id as DomainId))}>{d.name}</button>)}
                </div>
                <span className="hint">You are reviewed only in the domains you pick.</span>
              </div>
              <div className="grid grid--2" style={{ ['--gap' as string]: '20px' }}>
                <div className="field">
                  <label className="label" htmlFor="lo">Lowest readiness level you mentor</label>
                  <select className="select" id="lo" value={lo} onChange={(e) => setLo(Number(e.target.value))}>{trlLevels.map((l) => <option key={l.n} value={l.n}>TRL {l.n}: {l.short}</option>)}</select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="hi">Highest readiness level you mentor</label>
                  <select className="select" id="hi" value={hi} onChange={(e) => setHi(Number(e.target.value))}>{trlLevels.map((l) => <option key={l.n} value={l.n}>TRL {l.n}: {l.short}</option>)}</select>
                  {lo > hi && <span className="hint" style={{ color: 'var(--crit)' }} role="alert">The highest level must not be lower than the lowest.</span>}
                </div>
              </div>
              <div className="field"><label className="label" htmlFor="bio">How you help teams</label><textarea className="textarea" id="bio" value={bio} maxLength={1500} onChange={(e) => setBio(e.target.value)} /><span className="hint">Shown on your public profile once approved. At least 20 characters.</span></div>
              <div className="field"><label className="label" htmlFor="bg">Background summary</label><textarea className="textarea" id="bg" value={background} maxLength={600} onChange={(e) => setBackground(e.target.value)} style={{ minHeight: 90 }} /></div>
              <div className="field"><label className="label" htmlFor="topics">Topics you cover</label><input className="input" id="topics" value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Link budgets, Antenna selection, Ground station build" /><span className="hint">Separate with commas.</span></div>
              <div className="field">
                <span className="label" id="lang">Languages</span>
                <div className="chips" role="group" aria-labelledby="lang">{LANGS.map((l) => <button key={l} type="button" className={`chip ${langs.includes(l) ? 'chip--on' : ''}`} aria-pressed={langs.includes(l)} onClick={() => setLangs(toggle(langs, l))}>{l}</button>)}</div>
              </div>
              <div className="stack upload" style={{ ['--gap' as string]: '8px' }}>
                <Icon name="upload" />
                <span className="semibold small">Evidence of experience</span>
                <span className="xsmall muted">Employment letter, degree certificate, publications or flight records. Do not upload classified or export-controlled material.</span>
                <FileUploader target={{ purpose: 'mentor_evidence' }} value={evidence} onChange={setEvidence} label="Upload evidence" />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ fontSize: '1.4rem' }}>Availability and review call</h2>
              <div className="field">
                <span className="label">Typical weekly availability (India time)</span>
                <div className="avail" style={{ minWidth: 420, overflowX: 'auto' }} role="group" aria-label="Weekly availability">
                  <div />
                  {DAYS.map((d) => <div key={d} className="h">{d}</div>)}
                  {PARTS.map((p, r) => (
                    <div key={p} style={{ display: 'contents' }}>
                      <div className="r">{p}</div>
                      {DAYS.map((d, c) => (
                        <button key={d} type="button" className={grid[r][c] ? 'on' : 'off'} aria-pressed={grid[r][c]} aria-label={`${d} ${p.toLowerCase()}`} style={{ border: 0, cursor: 'pointer', minHeight: 30, borderRadius: 3 }}
                          onClick={() => setGrid(grid.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? !v : v))))} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label" id="fmt">Engagement formats you offer</span>
                <div className="stack" style={{ ['--gap' as string]: '10px' }} role="group" aria-labelledby="fmt">
                  {formatOptions.map((f) => <label key={f} className="check"><input type="checkbox" checked={formats.includes(f)} onChange={() => setFormats(toggle(formats, f))} /><span>{f}</span></label>)}
                </div>
              </div>
              <p className="muted">A reviewer in your field holds a 30-minute technical conversation. It is how we confirm what your profile says. Pick the time you prefer and we will confirm it by email.</p>
              <div className="field" style={{ maxWidth: 360 }}>
                <label className="label" htmlFor="slot">Preferred time</label>
                <select className="select" id="slot" value={slot} onChange={(e) => setSlot(e.target.value)}>
                  <option value="">Choose a slot</option>
                  {slots.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <label className="check"><input type="checkbox" checked={defence} onChange={(e) => setDefence(e.target.checked)} /><span>I am willing to be considered for defence-related projects. This adds a compliance review to my application.</span></label>
            </>
          )}

          {step === 4 && (
            <>
              <h2 style={{ fontSize: '1.4rem' }}>Review and submit</h2>
              <dl className="kv">
                <dt>Name</dt><dd>{name}</dd>
                <dt>Email</dt><dd>{email}</dd>
                <dt>Organisation</dt><dd>{employer}, {jobRole}</dd>
                <dt>Headline</dt><dd>{title}</dd>
                <dt>Experience</dt><dd>{years} years</dd>
                <dt>Domains</dt><dd>{picked.map((d) => domains.find((x) => x.id === d)?.name).join(', ')}</dd>
                <dt>Readiness</dt><dd>TRL {lo} to {hi}</dd>
                <dt>Files</dt><dd>{ids.length} ID, {evidence.length} evidence</dd>
                <dt>Review call</dt><dd>{slot}</dd>
                <dt>Defence projects</dt><dd>{defence ? 'Yes, compliance review added' : 'No'}</dd>
              </dl>
              <div className="stack" style={{ ['--gap' as string]: '12px' }}>
                <label className="check"><input type="checkbox" checked={agree1} onChange={(e) => setAgree1(e.target.checked)} /><span>Everything above is accurate and I can provide evidence for it.</span></label>
                <label className="check"><input type="checkbox" checked={agree2} onChange={(e) => setAgree2(e.target.checked)} /><span>I will guide and review student work. I will not do assessed work for students, and I will respect each team&apos;s ownership of its project.</span></label>
              </div>
              {error && <div className="notice notice--warn" role="alert"><Icon name="alert" /><span>{error}</span></div>}
            </>
          )}

          <hr className="rule" />
          <div className="row row--between">
            <button type="button" className="btn btn--secondary" onClick={() => setStep(step - 1)} disabled={step === 0}>Back</button>
            {step < 4 ? (
              <button type="button" className="btn btn--primary" onClick={() => setStep(step + 1)} disabled={!valid}>Continue</button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={submit} disabled={!valid || busy}>{busy ? 'Submitting…' : 'Submit application'}</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
