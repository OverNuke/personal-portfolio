import { useLocation, useNavigate } from 'react-router-dom';
import { routes } from '../routes/registry';

/**
 * Persistent floating pill nav -- docs/14 calls this "the real continuity
 * anchor": it renders once outside <Routes> (in Shell.tsx, alongside the
 * routed screen layers, not inside any one of them) so it never remounts,
 * loses hover/focus state, or drops out of the tab order across a
 * navigation. Five buttons, one per screen, including Home itself
 * (docs/03's NAV table) -- English-only labels, a deliberate reading of the
 * mockup's own NAV dictionary, which has no Spanish strings.
 *
 * Real <button> elements (not <a>/<NavLink>) to match docs/05's keyboard
 * contract verbatim: "Tab to reach a button, Enter/Space to activate" --
 * native links only activate on Enter, not Space, so this needs button
 * semantics, matching the decoded template's own `<button>` markup.
 */
function PillNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="pill-nav" aria-label="Screens">
      {routes.map((route) => {
        const isActive = location.pathname === route.path;
        return (
          <button
            key={route.pageId}
            type="button"
            className="pill-nav__button"
            aria-current={isActive ? 'page' : undefined}
            data-active={isActive || undefined}
            onClick={() => navigate(route.path)}
          >
            {route.navLabel}
          </button>
        );
      })}
    </nav>
  );
}

export default PillNav;
