import { useEffect, useRef } from 'react';
import type { PageId } from '../routes/registry';
import { pageIdFromHash, sectionHash } from './sectionHash';

/**
 * How a hash-driven navigation should scroll: `instant` for the page-load deep
 * link (there is nowhere to animate from), `animated` for back/forward and
 * manual hash edits (the caller still downgrades it to no animation under
 * prefers-reduced-motion).
 */
export type HashNavMode = 'instant' | 'animated';

/**
 * Records an explicit activation in the URL: `#profile` etc., as a NEW history
 * entry so the back button returns to where the visitor was. `pushState`
 * never fires `hashchange`/`popstate`, so this can't re-enter the handler in
 * `useHashNavigation`. Skipped when the URL already names the section (a
 * duplicate entry would make Back appear to do nothing).
 */
export function pushSectionHash(pageId: PageId): void {
  const hash = sectionHash(pageId);
  if (!hash || window.location.hash === hash) return;
  window.history.pushState(null, '', hash);
}

/**
 * Deep links + Back/Forward for the one-page scroll shell (there is no router).
 * The shell's single navigation function is passed in as `navigate`; this hook
 * only decides WHEN to call it, so all scroll/focus/announce logic stays in
 * one place:
 *
 *  - On mount, a valid hash navigates `instant`ly. An empty/unknown hash does
 *    nothing: the page already sits on Home, and moving focus or announcing on
 *    an ordinary visit would be noise.
 *  - `popstate` (Back/Forward) and `hashchange` (a hand-edited URL) navigate
 *    `animated` to the hash's section; an empty/unknown hash there goes Home
 *    (Back to the original, hash-less entry). A real Back fires both events,
 *    so they are coalesced within one task. It NEVER pushes history itself.
 *
 * `history.scrollRestoration` is set to `manual` while mounted: otherwise the
 * browser's own restoration races the smooth scroll on Back/Forward and
 * overrides the instant load scroll on reload.
 *
 * `navigate` may change identity between renders (it closes over the
 * reduced-motion preference); a ref keeps the listeners and the one-shot mount
 * navigation from re-running when it does.
 */
export function useHashNavigation(navigate: (pageId: PageId, mode: HashNavMode) => void): void {
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    const target = pageIdFromHash(window.location.hash);
    if (target) navigateRef.current(target, 'instant');
  }, []);

  useEffect(() => {
    const previousRestoration = 'scrollRestoration' in window.history ? window.history.scrollRestoration : null;
    if (previousRestoration) window.history.scrollRestoration = 'manual';

    let handling = false;
    function onHashNavigation() {
      if (handling) return;
      handling = true;
      window.setTimeout(() => {
        handling = false;
      }, 0);
      navigateRef.current(pageIdFromHash(window.location.hash) ?? 'home', 'animated');
    }

    window.addEventListener('popstate', onHashNavigation);
    window.addEventListener('hashchange', onHashNavigation);
    return () => {
      window.removeEventListener('popstate', onHashNavigation);
      window.removeEventListener('hashchange', onHashNavigation);
      if (previousRestoration) window.history.scrollRestoration = previousRestoration;
    };
  }, []);
}
