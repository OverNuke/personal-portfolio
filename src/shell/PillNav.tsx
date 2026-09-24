import { routes } from '../routes/registry';
import type { PageId } from '../routes/registry';

interface PillNavProps {
  /** The section currently under the viewport midline (scroll-driven). */
  activeId: PageId;
  /** Explicit activation: the shell scrolls to the section, focuses its heading, announces it. */
  onNavigate: (pageId: PageId) => void;
}

/**
 * Persistent floating pill nav -- docs/14 calls this "the real continuity
 * anchor": it renders once, outside the scrolling stage (in Shell.tsx,
 * `position: fixed`), so it never remounts, loses hover/focus state, or drops
 * out of the tab order while the page scrolls. Five buttons, one per section,
 * including Home itself (docs/03's NAV table) -- English-only labels, a
 * deliberate reading of the mockup's own NAV dictionary, which has no Spanish
 * strings.
 *
 * Stateless: activation scrolls to the section instead of routing to a
 * per-screen URL, and the active highlight comes from the scroll position
 * (Shell's IntersectionObserver), not from a location. Both live in Shell.
 *
 * Real <button> elements (not <a>/<NavLink>) to match docs/05's keyboard
 * contract verbatim: "Tab to reach a button, Enter/Space to activate" --
 * native links only activate on Enter, not Space, so this needs button
 * semantics, matching the decoded template's own `<button>` markup.
 */
function PillNav({ activeId, onNavigate }: PillNavProps) {
  return (
    <nav className="pill-nav" aria-label="Screens">
      {routes.map((route) => {
        const isActive = activeId === route.pageId;
        return (
          <button
            key={route.pageId}
            type="button"
            className="pill-nav__button"
            aria-current={isActive ? 'page' : undefined}
            data-active={isActive || undefined}
            onClick={() => onNavigate(route.pageId)}
          >
            {route.navLabel}
          </button>
        );
      })}
    </nav>
  );
}

export default PillNav;
