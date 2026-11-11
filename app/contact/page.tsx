import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { ContactForm } from '@/components/AuthForms';

export const metadata = { title: 'Contact | InΦnity' };

export default function Contact() {
  return (
    <>
      <SiteHeader />
      <main className="section section--fog" style={{ paddingBlock: 'clamp(32px, 5vw, 64px)' }}>
        <div className="container stack" style={{ ['--gap' as string]: '24px', maxWidth: 760 }}>
          <div className="stack" style={{ ['--gap' as string]: '10px' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 3.4vw, 2.8rem)' }}>Contact us</h1>
            <p className="lede">Questions, feedback, a locked account or a problem with an upload? Write to us and a person will reply.</p>
          </div>
          <div className="card"><ContactForm /></div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
