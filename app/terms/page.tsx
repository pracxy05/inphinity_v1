import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata = { title: 'Terms of use (draft) | InΦnity' };

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="section" style={{ paddingBlock: 'clamp(32px, 5vw, 64px)' }}>
        <div className="container stack" style={{ ['--gap' as string]: '16px', maxWidth: 760 }}>
          <span className="pill pill--warn" style={{ alignSelf: 'flex-start' }}>Draft</span>
          <h1 style={{ fontSize: 'clamp(2rem, 3.4vw, 2.8rem)' }}>Terms of use</h1>
          <p className="muted">This is a plain-language placeholder while the full text is prepared with legal advice. It is not final.</p>
          <>
            <p>InΦnity connects teams building aerospace and defence-related hardware with verified mentors. You must be 18 or over to use it.</p>
            <p>Mentors give guidance and review. They do not complete assessed work for students. Teams keep ownership of their projects.</p>
            <p>Do not upload classified or export-controlled material. We may hold, remove or refuse projects that raise compliance concerns.</p>
            <p>Be honest in your profile and applications. We may suspend accounts that break these rules.</p>
          </>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
