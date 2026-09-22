// Five-entry route registry per docs/03_UX_ARCHITECTURE.MD's route table.
// Renames the old 4-entry registry's `certifications` PageId to `distinction`
// (matching the mockup's own `screen: 'distinction'` naming) and adds the
// `home` entry the old registry didn't need (Home was an implicit base
// layer under the old overlay shell; it's a real peer route now).
export type PageId = 'home' | 'profile' | 'distinction' | 'projects' | 'contact';

export interface RouteEntry {
  path: string;
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
  { path: '/', pageId: 'home', navLabel: 'Home' },
  { path: '/profile', pageId: 'profile', navLabel: 'Profile', labelEn: 'Who me?', labelEs: '¿Yo?' },
  {
    path: '/distinction',
    pageId: 'distinction',
    navLabel: 'Distinctions',
    labelEn: 'Distinction',
    labelEs: 'Distinción',
  },
  { path: '/projects', pageId: 'projects', navLabel: 'Projects', labelEn: 'Projects', labelEs: 'Proyectos' },
  { path: '/contact', pageId: 'contact', navLabel: 'Contact', labelEn: 'Reach out', labelEs: 'Contacto' },
];
