import { createContext, useContext } from 'react';
import type { PageId } from '../routes/registry';

/** DOM id prefix of each stacked section; `#section-profile` etc. */
export const SECTION_ID_PREFIX = 'section-';

export function sectionDomId(pageId: PageId): string {
  return `${SECTION_ID_PREFIX}${pageId}`;
}

export function pageIdFromDomId(domId: string): PageId {
  return domId.slice(SECTION_ID_PREFIX.length) as PageId;
}

interface SectionNavContextValue {
  /** The section currently under the viewport's midline (scroll-driven). */
  activeSection: PageId;
  /**
   * Explicit activation -- scroll the section to the viewport top, move focus
   * to its heading and announce it via the shell's aria-live region. Used by
   * the pill nav and by in-page links (Home's list, Profile's CTA). Scroll-
   * driven changes never go through this.
   */
  goToSection: (pageId: PageId) => void;
}

// Held by <Shell/>, which owns the scroll container, the IntersectionObserver
// and the live region. Context (not props) because the five screens are
// rendered by the shell as opaque components, same reasoning as LangContext.
// The default is inert so a screen rendered outside the shell (a test, a
// story) doesn't crash -- it just doesn't navigate.
export const SectionNavContext = createContext<SectionNavContextValue>({
  activeSection: 'home',
  goToSection: () => {},
});

export function useSectionNav(): SectionNavContextValue {
  return useContext(SectionNavContext);
}
