// Five-entry section registry per docs/03_UX_ARCHITECTURE.MD's five-section table
// (the entries are now stacked scroll sections, not router routes -- see `hash`).
// Renames the old 4-entry registry's `certifications` PageId to `distinction`
// (matching the mockup's own `screen: 'distinction'` naming) and adds the
// `home` entry the old registry didn't need (Home was an implicit base
// layer under the old overlay shell; it's a real peer section now).
//
// Structural only (design `sdd/profile-acrostic-i18n`, Phase 2): the pill-nav
// label, the section `aria-label`/live-announcement text, and Home's own
// numbered-list label all used to live here as `navLabel`/`labelEn`/`labelEs`.
// They now live in the central dictionary (`src/i18n/{en,es}.ts`, `t.nav.pill`
// and `t.nav.homeList`), keyed by `pageId` -- an English label read in an es
// screen-reader voice was an a11y failure. This registry stays the single
// source of truth for the section LIST and its order, not for copy.
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
}

export const routes: RouteEntry[] = [
  { hash: '#home', pageId: 'home' },
  { hash: '#profile', pageId: 'profile' },
  { hash: '#distinctions', pageId: 'distinction' },
  { hash: '#projects', pageId: 'projects' },
  { hash: '#contact', pageId: 'contact' },
];
