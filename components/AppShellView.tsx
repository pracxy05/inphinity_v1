'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import Logo from './Logo';
import { Icon, type IconName } from './Icons';

export type Role = 'student' | 'mentor' | 'admin';

const nav: Record<Role, { href: string; label: string; icon: IconName }[]> = {
  student: [
    { href: '/student', label: 'Overview', icon: 'grid' },
    { href: '/student/new', label: 'New mission request', icon: 'plus' },
    { href: '/mentors', label: 'Find mentors', icon: 'search' },
    { href: '/sessions', label: 'Sessions', icon: 'video' },
  ],
  mentor: [
    { href: '/mentor', label: 'Workspace', icon: 'grid' },
    { href: '/mentor/apply', label: 'Verification', icon: 'defence' },
    { href: '/mentors', label: 'Mentor directory', icon: 'user' },
    { href: '/sessions', label: 'Sessions', icon: 'video' },
  ],
  admin: [
    { href: '/admin', label: 'Operations console', icon: 'chart' },
    { href: '/mentors', label: 'Mentor directory', icon: 'user' },
  ],
};

export type Person = { name: string; role: string; initials: string };

export default function AppShellView({ role, title, person, children }: { role: Role; title: string; person: Person; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try { await fetch('/api/auth/logout', { method: 'POST' }); } finally { router.push('/'); router.refresh(); }
  };

  return (
    <div className="app">
      <aside className="app__side">
        <div className="app__brand">
          <Logo href="/" />
          <span className="xsmall muted">{role === 'student' ? 'Student workspace' : role === 'mentor' ? 'Mentor workspace' : 'Admin console'}</span>
        </div>
        <nav className="app__nav" aria-label={`${role} navigation`}>
          {nav[role].map((item) => (
            <Link key={item.href + item.label} href={item.href} className="app__link" aria-current={pathname === item.href ? 'page' : undefined}>
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="app__user">
          <div className="avatar">{person.initials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="small semibold">{person.name}</div>
            <div className="xsmall muted">{person.role}</div>
          </div>
        </div>
      </aside>
      <div className="app__main">
        <div className="app__top">
          <span className="small semibold">{title}</span>
          <div className="row" style={{ ['--gap' as string]: '12px' }}>
            <Link href="/contact" className="btn btn--ghost btn--sm">Contact</Link>
            <button type="button" className="btn btn--ghost btn--sm" onClick={signOut} disabled={busy}>Sign out</button>
          </div>
        </div>
        <div className="app__content">{children}</div>
      </div>
    </div>
  );
}
