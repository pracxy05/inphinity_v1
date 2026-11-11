import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata = { title: 'Privacy notice (draft) | InΦnity' };

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main className="section" style={{ paddingBlock: 'clamp(32px, 5vw, 64px)' }}>
        <div className="container stack" style={{ ['--gap' as string]: '16px', maxWidth: 760 }}>
          <span className="pill pill--warn" style={{ alignSelf: 'flex-start' }}>Draft</span>
          <h1 style={{ fontSize: 'clamp(2rem, 3.4vw, 2.8rem)' }}>Privacy notice</h1>
          <p className="muted">This is a plain-language placeholder while the full text is prepared with legal advice. It is not final.</p>
          <>
            <p>We collect what we need to run the service: your name, email, date of birth (to confirm you are 18 or over), the details you put in requests and applications, and the files you upload.</p>
            <p>Mentor applicants upload a photo ID and evidence of experience. Only the applicant and reviewing staff can open these files, and each time staff open one it is recorded.</p>
            <p>Files are stored privately and are shared only through short-lived links. We do not sell your data.</p>
            <p>To ask for a copy of your data or to have your account deleted, use the contact page.</p>
          </>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
