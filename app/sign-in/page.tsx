import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { SignInForm } from '@/components/AuthForms';
import { OrbitHero } from '@/components/Art';
import { getUser, homeFor } from '@/lib/server/auth';

export const metadata = { title: 'Sign in | InΦnity' };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getUser();
  if (user) redirect(homeFor(user.role));
  const { next } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="section" style={{ paddingBlock: 'clamp(40px, 6vw, 80px)' }}>
        <div className="container split split--even">
          <div className="card" style={{ maxWidth: 520, width: '100%' }}>
            <SignInForm next={next} />
          </div>
          <figure className="figure ticks" style={{ margin: 0 }}>
            <div className="figure__art" style={{ padding: 12 }}><OrbitHero /></div>
            <figcaption className="figure__cap">
              <h4>One account, three workspaces</h4>
              <span className="figure__spec">Students request mentors. Mentors take verified engagements. Staff run the platform.</span>
            </figcaption>
          </figure>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
