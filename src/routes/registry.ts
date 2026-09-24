// Five-entry section registry per docs/03_UX_ARCHITECTURE.MD's five-section table
// (the entries are now stacked scroll sections, not router routes -- see `hash`).
// Renames the old 4-entry registry's `certifications` PageId to `distinction`
// (matching the mockup's own `screen: 'distinction'` naming) and adds the
// `home` entry the old registry didn't need (Home was an implicit base
// layer under the old overlay shell; it's a real peer section now).
export type PageId = 'home' | 'profile' | 'distinction' | 'projects' | 'contact';

export interface RouteEntry {
  /**
   * The section's deep-link URL hash (`#profile`). There are no per-screen
   * paths any more: the site is one static, scrolling page (GitHub Pages can't
   * rewrite `/profile` to the SPA), so a section is addressed by hash and
   * `src/shell/sectionHash.ts` maps it to/from `pageId`.
   */
  hash: string;
  pageId: PageId;
  /**
   * Pill-nav label -- English only. The decoded mockup's `NAV` dictionary
   * has no Spanish strings at all; the pill nav renders these labels
   * regardless of the EN/ES toggle. Do not conflate with `labelEn`/`labelEs`
   * below, which is a *different*, bilingual dictionary for Home's own
   * numbered list (see docs/03's "Two label sets" section).
   */
  navLabel: string;
  /** Home's numbered-list label (English). Home has no self-referential entry. */
  labelEn?: string;
  /** Home's numbered-list label (Spanish). Home has no self-referential entry. */
  labelEs?: string;
}

export const routes: RouteEntry[] = [
  { hash: '#home', pageId: 'home', navLabel: 'Home' },
  { hash: '#profile', pageId: 'profile', navLabel: 'Profile', labelEn: 'Who me?', labelEs: '¿Yo?' },
  {
    hash: '#distinctions',
    pageId: 'distinction',
    navLabel: 'Distinctions',
    labelEn: 'Distinction',
    labelEs: 'Distinción',
  },
  { hash: '#projects', pageId: 'projects', navLabel: 'Projects', labelEn: 'Projects', labelEs: 'Proyectos' },
  { hash: '#contact', pageId: 'contact', navLabel: 'Contact', labelEn: 'Reach out', labelEs: 'Contacto' },
];
