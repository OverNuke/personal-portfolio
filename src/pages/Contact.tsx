import backgroundPhoto from '../assets/contact/background.jpg';
import Dock from './contact/Dock';
import './contact/contact.css';

// Real Contact screen (Phase 8). Layout, copy, and effect math verified
// against docs/_decoded/contact-section-v2-standalone/template.html in full
// -- see src/pages/contact/channels.ts and useMagneticDock.ts for the
// per-value citations. Heading level is h2 per docs/02's typography table
// ("Reach out" H2, 92px); `data-screen-heading` is Shell.tsx's
// focus-management contract (src/shell/Shell.tsx), carried over from the
// Phase 7 stub as-is.
function Contact() {
  return (
    <main data-testid="screen-contact" className="contact-screen">
      {/* Background photo + gradients + dot grid -- fully decorative, one
          aria-hidden subtree per docs/05_ACCESSIBILITY.MD. */}
      <div className="contact-bg" aria-hidden="true">
        <div className="contact-bg__photo" style={{ backgroundImage: `url(${backgroundPhoto})` }} />
        <div className="contact-bg__gradient-vertical" />
        <div className="contact-bg__gradient-radial" />
        <div className="contact-bg__dots" />
      </div>

      <div className="contact-header">
        <span className="contact-rule" aria-hidden="true" />
        <h2 data-screen-heading tabIndex={-1} className="contact-headline">
          Reach out
        </h2>
      </div>

      {/* "Open to work" -- the pulsing dot is decorative, the label text is
          real content and stays reachable (docs/05). */}
      <div className="contact-status">
        <span className="contact-status__dot" aria-hidden="true" />
        <span className="contact-status__label">open to work</span>
      </div>

      <Dock />

      <p className="contact-quote">Even an hundred of years isn't enough to appreciate what life is mean to be.</p>

      <div className="contact-footer-rule" aria-hidden="true">
        <span className="contact-rule" />
      </div>
    </main>
  );
}

export default Contact;
