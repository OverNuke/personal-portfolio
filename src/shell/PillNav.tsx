import { routes } from '../routes/registry';
import type { PageId } from '../routes/registry';
import { useLang } from './LangContext';

interface PillNavProps {
  /** The section currently under the viewport midline (scroll-driven). */
  activeId: PageId;
  /** Explicit activation: the shell scrolls to the section, focuses its heading, announces it. */
  onNavigate: (pageId: PageId) => void;
}

/**
 * Persistent floating pill chrome -- docs/14 calls the nav "the real
 * continuity anchor": it renders once, outside the scrolling stage (in
 * Shell.tsx, `position: fixed` -- now on the `.pill-chrome` wrapper below), so
 * it never remounts, loses hover/focus state, or drops out of the tab order
 * while the page scrolls. Two landmarks live in the chrome:
 *  - `<nav>`: five buttons, one per section (docs/03's NAV table), labels
 *    from `t.nav.pill` -- translated (design `sdd/profile-acrostic-i18n`:
 *    the pill used to be English-only regardless of locale; an English
 *    label read in an es screen-reader voice is an a11y failure).
 *  - a sibling `role="group"` EN/ES toggle, reusing the SAME `.pill-nav__button`
 *    styling (no new contrast pair) -- the site-wide counterpart to Home's
 *    own toggle, which decision #522 keeps.
 *
 * Stateless w.r.t. navigation: activation scrolls to the section instead of
 * routing to a per-screen URL, and the active highlight comes from the scroll
 * position (Shell's IntersectionObserver), not from a location. Both live in
 * Shell. `lang`/`setLang`/`t` come straight from `useLang()` -- no props
 * needed for the toggle, unlike `activeId`/`onNavigate` which Shell owns.
 *
 * Real <button> elements (not <a>/<NavLink>) to match docs/05's keyboard
 * contract verbatim: "Tab to reach a button, Enter/Space to activate" --
 * native links only activate on Enter, not Space, so this needs button
 * semantics, matching the decoded template's own `<button>` markup.
 */
function PillNav({ activeId, onNavigate }: PillNavProps) {
  const { lang, setLang, t } = useLang();

  return (
    <div className="pill-chrome">
      <nav className="pill-nav" aria-label={t.shell.screens}>
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
              {t.nav.pill[route.pageId]}
            </button>
          );
        })}
      </nav>
      <div className="pill-lang-toggle" role="group" aria-label={t.shell.language}>
        <button
          type="button"
          className="pill-nav__button"
          aria-pressed={lang === 'en'}
          data-active={lang === 'en' || undefined}
          onClick={() => setLang('en')}
        >
          EN
        </button>
        <button
          type="button"
          className="pill-nav__button"
          aria-pressed={lang === 'es'}
          data-active={lang === 'es' || undefined}
          onClick={() => setLang('es')}
        >
          ES
        </button>
      </div>
    </div>
  );
}

export default PillNav;
