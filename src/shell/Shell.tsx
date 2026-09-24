import { useCallback, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { routes } from '../routes/registry';
import type { PageId } from '../routes/registry';
import PillNav from './PillNav';
import { SectionNavContext, pageIdFromDomId, sectionDomId } from './SectionNavContext';
import { useActiveSection } from './useActiveSection';
import { pushSectionHash, useHashNavigation } from './useHashNavigation';
import type { HashNavMode } from './useHashNavigation';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { useStageScale } from './useStageScale';
import './shell.css';

// Module constant so `useActiveSection`'s observer isn't rebuilt every render.
const SECTION_IDS = routes.map((route) => sectionDomId(route.pageId));

interface ShellProps {
  /** The five screens, keyed by the registry's `pageId`. Injected (App.tsx owns the map) so the shell stays testable without the real, effect-heavy screens. */
  pages: Record<PageId, ComponentType>;
}

/**
 * The continuous-scroll shell (spec `continuous-scroll-layout`, docs/00,
 * docs/03): all 5 screens are mounted at once and stacked vertically inside one
 * 1440px-wide, natural-height `.stage`, which `useStageScale` scales to the
 * viewport width alone. The page scrolls; nothing mounts or unmounts on
 * navigation any more, so there is no route-change swap, no exiting layer and
 * no per-screen URL.
 *
 * Navigation model (spec `nav-model`):
 *  - Explicit activation (pill click/Enter/Space, or an in-page link via
 *    `SectionNavContext.goToSection`) scrolls the section's top edge to the
 *    viewport top, moves focus to that section's own heading, and announces
 *    the section name in the aria-live region. Focus and the announcement fire
 *    immediately, in the same tick as the scroll starts -- docs/14's "motion
 *    never gates function" rule -- with `preventScroll` so focusing doesn't
 *    fight the (possibly smooth) scroll.
 *  - Scrolling by hand only ever changes the pill's visual active state, via
 *    the IntersectionObserver in `useActiveSection`. Focus, the live region and
 *    the URL hash are untouched.
 *  - Deep links (`#profile`, see `useHashNavigation`): explicit activation also
 *    pushes the section's hash; loading with a hash, Back/Forward and a
 *    hand-edited hash navigate to that section through the same function
 *    (never pushing again). There is no router, so this is the only URL state.
 *
 * `scrollIntoView` (rather than computing a `scrollTo` offset) is deliberate:
 * the browser resolves the element's real, transform-scaled position itself,
 * so the landing edge is exact at any stage scale.
 *
 * The pill nav renders outside `.stage`: a `position: fixed` element inside a
 * transformed ancestor is positioned against that ancestor, not the viewport,
 * so it would scroll away with the page.
 */
function Shell({ pages }: ShellProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { viewportRef, stageRef } = useStageScale();
  const { activeId, lockTo } = useActiveSection(SECTION_IDS);
  const [liveMessage, setLiveMessage] = useState('');
  const activeSection = pageIdFromDomId(activeId);

  // The ONE navigation path: scroll + pill lock + focus + announce. Explicit
  // activation (`goToSection`, below) and hash-driven navigation (deep link on
  // load, Back/Forward, a hand-edited hash) both go through it.
  const navigateToSection = useCallback(
    (pageId: PageId, mode: HashNavMode): boolean => {
      const domId = sectionDomId(pageId);
      const section = document.getElementById(domId);
      if (!section) return false;

      lockTo(domId);
      const behavior = mode === 'instant' ? 'instant' : reducedMotion ? 'auto' : 'smooth';
      section.scrollIntoView({ block: 'start', behavior });
      // Scoped to THIS section's heading -- each of the 5 screens carries its own `[data-screen-heading]`.
      section.querySelector<HTMLElement>('[data-screen-heading]')?.focus({ preventScroll: true });
      const route = routes.find((r) => r.pageId === pageId);
      setLiveMessage(route ? `${route.navLabel}.` : '');
      return true;
    },
    [lockTo, reducedMotion],
  );

  // Explicit activation additionally records the section in the URL hash.
  const goToSection = useCallback(
    (pageId: PageId) => {
      if (navigateToSection(pageId, 'animated')) pushSectionHash(pageId);
    },
    [navigateToSection],
  );

  useHashNavigation(navigateToSection);

  const navValue = useMemo(() => ({ activeSection, goToSection }), [activeSection, goToSection]);

  return (
    <SectionNavContext.Provider value={navValue}>
      <div className="stage-viewport" ref={viewportRef}>
        <div className="stage-scaler">
          <main className="stage" ref={stageRef}>
            {routes.map((route) => {
              const Page = pages[route.pageId];
              return (
                <section
                  key={route.pageId}
                  id={sectionDomId(route.pageId)}
                  className="screen-section"
                  aria-label={route.navLabel}
                >
                  <Page />
                </section>
              );
            })}
          </main>
        </div>
        <PillNav activeId={activeSection} onNavigate={goToSection} />
        <div aria-live="polite" className="sr-only">
          {liveMessage}
        </div>
      </div>
    </SectionNavContext.Provider>
  );
}

export default Shell;
