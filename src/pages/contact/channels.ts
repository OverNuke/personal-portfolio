// Real Contact channel content, verified against
// docs/_decoded/contact-section-v2-standalone/template.html lines 407-516.
// All five channels are now real, live destinations. Email/GitHub/LinkedIn
// were migrated on 2026-09-26 from the owner's local metadata file (visible
// handles are unchanged). WhatsApp's `wa.me/qr/...` link and Book-a-call's
// Cal.com (free-plan) 30-minute event link were supplied by the owner on
// 2026-09-27, replacing the mockup's own placeholder hrefs.
import whatsappQr from '../../assets/contact/Whatsapp_contact.jpeg';

export interface ContactChannel {
  id: string;
  /** Card position label, e.g. "01" -- rendered as "(01)". */
  index: string;
  /** Instrument Serif italic headline (font size varies per card in source). */
  label: string;
  headlineSize: number;
  href: string;
  external: boolean;
  /** Future-proofing per docs/04_COMPONENT_RULES.MD: an unavailable channel
   *  renders as a real disabled <button>, never a styled-to-look-disabled
   *  link. No channel is disabled in the decoded template today. */
  disabled?: boolean;
  /** GitHub only -- the card's own background *is* the accent color (fixed
   *  to `--color-contact-github-bg` rather than the raw accent, per
   *  02_DESIGN_SYSTEM.MD Fix 3 -- the raw accent fails AA for the card's
   *  11px metadata text). */
  accentBg?: boolean;
  detailLines?: string[];
  /** WhatsApp only -- the mockup has an `<image-slot>` placeholder here with
   *  no real QR asset in the decoded manifest (docs/13_ASSET_SPEC.md doesn't
   *  list one). Rendered as an empty, aria-hidden placeholder box for any
   *  channel that sets this without a `qrImage`. */
  qrPlaceholder?: boolean;
  /** WhatsApp only -- a real QR code image, decorative (aria-hidden) since
   *  the card's own `href` already provides the same destination; scanning
   *  it is a same-info shortcut for a second device, per docs/13_ASSET_SPEC.md. */
  qrImage?: string;
  ctaLabel: string;
}

export const channels: ContactChannel[] = [
  {
    id: 'email',
    index: '01',
    label: 'Email',
    headlineSize: 34,
    href: 'mailto:ksfgarcia24@gmail.com',
    external: false,
    detailLines: ['ksfgarcia24@gmail.com'],
    ctaLabel: 'send message',
  },
  {
    id: 'github',
    index: '02',
    label: 'GitHub',
    headlineSize: 34,
    href: 'https://github.com/OverNuke',
    external: true,
    accentBg: true,
    detailLines: ['@overnuke', 'repositories'],
    ctaLabel: 'source',
  },
  {
    id: 'whatsapp',
    index: '03',
    label: 'WhatsApp',
    headlineSize: 30,
    href: 'https://wa.me/qr/PKLHNEL4XMKDG1',
    external: true,
    qrImage: whatsappQr,
    ctaLabel: 'scan · direct chat',
  },
  {
    id: 'linkedin',
    index: '04',
    label: 'LinkedIn',
    headlineSize: 32,
    href: 'https://www.linkedin.com/in/keffwontwakeup/',
    external: true,
    detailLines: ['/keffwontwakeup', 'network · profile'],
    ctaLabel: 'connect',
  },
  {
    id: 'book-a-call',
    index: '05',
    label: 'Book a call',
    headlineSize: 30,
    href: 'https://cal.com/d/wSQggcU1aGAVd3nJRwkAgq/30min',
    external: true,
    ctaLabel: '30 min · gmt-6',
  },
];
