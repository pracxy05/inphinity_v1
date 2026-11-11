import Link from 'next/link';
import Logo from './Logo';
import TelemetryClock from './TelemetryClock';
import { getUser, homeFor } from '@/lib/server/auth';

export default async function SiteHeader() {
  const user = await getUser();
  const home = user ? homeFor(user.role) : null;
  return (
    <>
      <div className="utility">
        <div className="container utility__inner">
          <div className="utility__links">
            <Link href="/student/new">For students</Link>
            <Link href="/register?role=mentor">For mentors</Link>
            <Link href="/contact">Contact</Link>
            {home ? <Link href={home}>My workspace</Link> : <Link href="/sign-in">Sign in</Link>}
          </div>
          <TelemetryClock />
        </div>
      </div>
      <header className="site-header">
        <div className="container site-header__inner">
          <Logo />
          <nav className="nav" aria-label="Main">
            <Link href="/#how">How it works</Link>
            <Link href="/#domains">Domains</Link>
            <Link href="/#readiness">Technology readiness</Link>
            <Link href="/mentors">Mentors</Link>
            <Link href="/#security">Security</Link>
          </nav>
          <div className="header-actions">
            {home ? (
              <Link href={home} className="btn btn--primary btn--sm">Open workspace</Link>
            ) : (
              <>
                <Link href="/sign-in" className="btn btn--ghost btn--sm">Sign in</Link>
                <Link href="/register" className="btn btn--primary btn--sm">Create account</Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
