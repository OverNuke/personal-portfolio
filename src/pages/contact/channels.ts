// Real Contact channel content, verified against
// docs/_decoded/contact-section-v2-standalone/template.html lines 407-516.
// All five channels are now real, live destinations. Email/GitHub/LinkedIn
// were migrated on 2026-09-26 from the owner's local metadata file (visible
// handles are unchanged). WhatsApp's `wa.me/qr/...` link and Book-a-call's
// Cal.com (free-plan) 30-minute event link were supplied by the owner on
// 2026-09-27, replacing the mockup's own placeholder hrefs.
import type { Localized } from '../../i18n/types';
import whatsappQr from '../../assets/contact/Whatsapp_contact.jpeg';

export interface ContactChannel {
  id: string;
  /** Card position label, e.g. "01" -- rendered as "(01)". */
  index: string;
  /** Instrument Serif italic headline (font size varies per card in source).
   *  Phase 4.4: `Localized<string>`. Email/GitHub/WhatsApp/LinkedIn are
   *  brand names, kept byte-identical across locales; "Book a call" is NOT
   *  a proper noun and gets a real translation. */
  label: Localized<string>;
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
  /** Phase 4.4: `Localized<string[]>` (same length both locales). Handles/
   *  emails are proper nouns kept identical; generic English words
   *  ("repositories", "network · profile") get a real translation. */
  detailLines?: Localized<string[]>;
  /** WhatsApp only -- the mockup has an `<image-slot>` placeholder here with
   *  no real QR asset in the decoded manifest (docs/13_ASSET_SPEC.md doesn't
   *  list one). Rendered as an empty, aria-hidden placeholder box for any
   *  channel that sets this without a `qrImage`. */
  qrPlaceholder?: boolean;
  /** WhatsApp only -- a real QR code image, decorative (aria-hidden) since
   *  the card's own `href` already provides the same destination; scanning
   *  it is a same-info shortcut for a second device, per docs/13_ASSET_SPEC.md. */
  qrImage?: string;
  ctaLabel: Localized<string>;
}

export const channels: ContactChannel[] = [
  {
    id: 'email',
    index: '01',
    label: { en: 'Email', es: 'Email' },
    headlineSize: 34,
    href: 'mailto:ksfgarcia24@gmail.com',
    external: false,
    detailLines: { en: ['ksfgarcia24@gmail.com'], es: ['ksfgarcia24@gmail.com'] },
    ctaLabel: { en: 'send message', es: 'enviar mensaje' },
  },
  {
    id: 'github',
    index: '02',
    label: { en: 'GitHub', es: 'GitHub' },
    headlineSize: 34,
    href: 'https://github.com/OverNuke',
    external: true,
    accentBg: true,
    detailLines: { en: ['@overnuke', 'repositories'], es: ['@overnuke', 'repositorios'] },
    ctaLabel: { en: 'source', es: 'código fuente' },
  },
  {
    id: 'whatsapp',
    index: '03',
    label: { en: 'WhatsApp', es: 'WhatsApp' },
    headlineSize: 30,
    href: 'https://wa.me/qr/PKLHNEL4XMKDG1',
    external: true,
    qrImage: whatsappQr,
    ctaLabel: { en: 'scan · direct chat', es: 'escanea · chat directo' },
  },
  {
    id: 'linkedin',
    index: '04',
    label: { en: 'LinkedIn', es: 'LinkedIn' },
    headlineSize: 32,
    href: 'https://www.linkedin.com/in/keffwontwakeup/',
    external: true,
    detailLines: {
      en: ['/keffwontwakeup', 'network · profile'],
      es: ['/keffwontwakeup', 'red · perfil'],
    },
    ctaLabel: { en: 'connect', es: 'conectar' },
  },
  {
    id: 'book-a-call',
    index: '05',
    label: { en: 'Book a call', es: 'Agenda una llamada' },
    headlineSize: 30,
    href: 'https://cal.com/d/wSQggcU1aGAVd3nJRwkAgq/30min',
    external: true,
    // Locale-neutral time/timezone notation -- no English word to
    // translate here, kept identical on purpose (same reasoning as
    // distinctionsData.ts's acronym+year metas).
    ctaLabel: { en: '30 min · gmt-6', es: '30 min · gmt-6' },
  },
];
