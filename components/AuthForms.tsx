'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { Icon } from '@/components/Icons';

const safeNext = (n?: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api<{ redirect: string }>('/api/auth/login', 'POST', { email, password });
      router.push(safeNext(next) ?? r.redirect);
      router.refresh();
    } catch (err) { setError((err as Error).message); setBusy(false); }
  };

  return (
    <form className="card__body stack" style={{ ['--gap' as string]: '20px' }} onSubmit={submit}>
      <div className="stack" style={{ ['--gap' as string]: '6px' }}>
        <h1 style={{ fontSize: '2rem' }}>Sign in to InΦnity</h1>
        <p className="muted small">Students, mentors and staff use the same sign-in.</p>
      </div>
      <div className="field">
        <label className="label" htmlFor="email">Email address</label>
        <input className="input" id="email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <div className="notice notice--warn" role="alert"><Icon name="alert" /><span>{error}</span></div>}
      <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <hr className="rule" />
      <p className="small muted">
        New here? <Link href="/register" className="link">Create a student account</Link> or <Link href="/register?role=mentor" className="link">apply to mentor</Link>. You must be 18 or over.
        Forgot your password? <Link href="/contact" className="link">Contact us</Link> and we will reset it.
      </p>
    </form>
  );
}

export function RegisterForm({ initialRole }: { initialRole: 'student' | 'mentor' }) {
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'mentor'>(initialRole);
  const [f, setF] = useState({ name: '', email: '', password: '', dob: '' });
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api<{ redirect: string }>('/api/auth/register', 'POST', { ...f, role, accept });
      router.push(r.redirect);
      router.refresh();
    } catch (err) { setError((err as Error).message); setBusy(false); }
  };

  return (
    <form className="card__body stack" style={{ ['--gap' as string]: '20px' }} onSubmit={submit}>
      <div className="stack" style={{ ['--gap' as string]: '6px' }}>
        <h1 style={{ fontSize: '2rem' }}>Create your account</h1>
        <p className="muted small">It takes a minute. You must be 18 or over.</p>
      </div>
      <div className="seg" role="group" aria-label="Account type">
        <button type="button" aria-pressed={role === 'student'} onClick={() => setRole('student')}>I am building a project</button>
        <button type="button" aria-pressed={role === 'mentor'} onClick={() => setRole('mentor')}>I want to mentor</button>
      </div>
      <div className="field"><label className="label" htmlFor="name">Full name</label><input className="input" id="name" autoComplete="name" value={f.name} onChange={set('name')} required minLength={2} /></div>
      <div className="field"><label className="label" htmlFor="email">Email address</label><input className="input" id="email" type="email" autoComplete="email" value={f.email} onChange={set('email')} required /></div>
      <div className="field">
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} required minLength={10} />
        <span className="hint">At least 10 characters. A few random words is a good password.</span>
      </div>
      <div className="field">
        <label className="label" htmlFor="dob">Date of birth</label>
        <input className="input" id="dob" type="date" autoComplete="bday" value={f.dob} onChange={set('dob')} required />
        <span className="hint">Used only to confirm you are 18 or over.</span>
      </div>
      <label className="check">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
        <span>I accept the <Link href="/terms" className="link">terms of use</Link> and have read the <Link href="/privacy" className="link">privacy notice</Link>.</span>
      </label>
      {error && <div className="notice notice--warn" role="alert"><Icon name="alert" /><span>{error}</span></div>}
      <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy || !accept}>{busy ? 'Creating account…' : role === 'mentor' ? 'Create account and start application' : 'Create account'}</button>
      <p className="small muted">Already registered? <Link href="/sign-in" className="link">Sign in</Link></p>
    </form>
  );
}

export function ContactForm() {
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [ref, setRef] = useState('');
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('busy'); setError('');
    try { const r = await api<{ ref?: string }>('/api/contact', 'POST', f); setRef(r.ref ?? ''); setState('done'); }
    catch (err) { setError((err as Error).message); setState('idle'); }
  };

  if (state === 'done') {
    return (
      <div className="card__body stack" style={{ ['--gap' as string]: '12px' }}>
        <span className="pill pill--ok">Message sent</span>
        <h2 style={{ fontSize: '1.6rem' }}>Thank you, we have your message</h2>
        <p className="muted">{ref ? <>Your reference is <span className="mono">{ref}</span>. </> : null}We will reply to the email address you gave.</p>
      </div>
    );
  }
  return (
    <form className="card__body stack" style={{ ['--gap' as string]: '18px' }} onSubmit={submit}>
      <div className="grid grid--2" style={{ ['--gap' as string]: '18px' }}>
        <div className="field"><label className="label" htmlFor="c-name">Your name</label><input className="input" id="c-name" value={f.name} onChange={set('name')} required minLength={2} /></div>
        <div className="field"><label className="label" htmlFor="c-email">Email address</label><input className="input" id="c-email" type="email" value={f.email} onChange={set('email')} required /></div>
      </div>
      <div className="field"><label className="label" htmlFor="c-subject">Subject</label><input className="input" id="c-subject" value={f.subject} onChange={set('subject')} required minLength={3} /></div>
      <div className="field"><label className="label" htmlFor="c-msg">Message</label><textarea className="textarea" id="c-msg" value={f.message} onChange={set('message')} required minLength={10} /></div>
      {/* Honeypot: real people never see or fill this. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label>
      </div>
      {error && <div className="notice notice--warn" role="alert"><Icon name="alert" /><span>{error}</span></div>}
      <button type="submit" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}
