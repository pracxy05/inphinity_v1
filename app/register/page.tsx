import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { RegisterForm } from '@/components/AuthForms';
import { OrbitHero } from '@/components/Art';
import { getUser, homeFor } from '@/lib/server/auth';

export const metadata = { title: 'Create an account | InΦnity' };

export default async function Register({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const user = await getUser();
  if (user) redirect(homeFor(user.role));
  const { role } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="section" style={{ paddingBlock: 'clamp(40px, 6vw, 80px)' }}>
        <div className="container split split--even">
          <div className="card" style={{ maxWidth: 520, width: '100%' }}>
            <RegisterForm initialRole={role === 'mentor' ? 'mentor' : 'student'} />
          </div>
          <figure className="figure ticks" style={{ margin: 0 }}>
            <div className="figure__art" style={{ padding: 12 }}><OrbitHero /></div>
            <figcaption className="figure__cap">
              <h4>Build with people who have done it</h4>
              <span className="figure__spec">Mentors are verified before their profile goes live.</span>
            </figcaption>
          </figure>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
