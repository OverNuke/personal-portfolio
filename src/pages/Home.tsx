import { routes } from '../routes/registry';
import type { PageId, RouteEntry } from '../routes/registry';
import { useLang } from '../shell/LangContext';
import { useSectionNav } from '../shell/SectionNavContext';
import { sectionHash } from '../shell/sectionHash';
import InkFlowBackground from './home/InkFlowBackground';
import { useNavFocusCycle } from './home/useNavFocusCycle';
import './home/home.css';

// `accentInk` default per docs/11_HANDOFF_HOME.md / docs/02_DESIGN_SYSTEM.MD
// (options: #14150f, #0c0d0a, #3a3f2a, #6f7f45 -- confirmed against the
// decoded data-props block's own "default":"#6f7f45"). Colors both the "."
// in "Kevin." and the Ink Flow Background, matching the decoded source's
// "one prop, two usages" note.
const ACCENT_INK = '#6f7f45';

/** The 4 pageIds `t.nav.homeList` has a label for -- every route but Home itself. */
type HomeListId = Exclude<PageId, 'home'>;

// Home's own 4-item numbered list (docs/11's ORDER / docs/03's ORDER,
// deliberately excluding Home itself). The route registry's iteration order
// (home, profile, distinction, projects, contact) already matches ORDER
// exactly once "home" is filtered out. Labels come from `t.nav.homeList`
// (`src/i18n`), keyed by `pageId` -- the registry itself is structural only
// (design `sdd/profile-acrostic-i18n`, Phase 2). The type predicate narrows
// `pageId` to `HomeListId` so `t.nav.homeList[route.pageId]` typechecks
// without a cast (a plain `!== 'home'` filter doesn't narrow the union).
const NAV_ITEMS = routes.filter(
  (route): route is RouteEntry & { pageId: HomeListId } => route.pageId !== 'home',
);

// Real Home screen (Phase 8, last of the five). Layout/copy/interaction
// verified against docs/_decoded/index/template.html lines 489-505,
// 554-632 in full -- see docs/11_HANDOFF_HOME.md for the per-value
// citations and src/pages/home/InkFlowBackground.tsx /
// useNavFocusCycle.ts for the two extracted effect/interaction pieces.
// `data-screen-heading` (the heading Shell.tsx focuses on explicit section activation) lives on
// the real "Kevin." <h1> -- the only heading on this screen, matching this
// repo's one-real-heading-per-screen precedent (Profile/Distinctions/
// Projects/Contact). Home's own arrow-key focus cycling only ever touches
// `home-nav-item[data-focused]`, a plain data attribute unrelated to
// `tabIndex`/`document.activeElement`, so it cannot fight Shell's
// `section.querySelector('[data-screen-heading]')?.focus()` call, which runs
// on explicit activation of this section (not on mount).
function Home() {
  const { lang, setLang, t } = useLang();
  const { activeSection, goToSection } = useSectionNav();
  // Arrow-key cycling is scoped to Home being the section on screen: Home is
  // now always mounted, and an ungated listener would swallow the arrow keys
  // (and native scrolling) on every other section.
  const [focusIndex, setFocusIndex] = useNavFocusCycle(NAV_ITEMS.length, activeSection === 'home');

  // Guarded so clicking the already-active cell is a no-op, exactly like the
  // decoded source's own `setState({ lang: e.currentTarget.dataset.lang })`
  // (setting lang to its current value is a no-op re-render there too).
  //
  // Pulled forward from Phase 2 task 2.3 (toggleLang -> setLang): Phase 1's
  // LangProvider (src/shell/LangContext.tsx) dropped the old binary
  // `toggleLang` in favor of `setLang(l)`, so this call site had to move in
  // the same batch to keep `pnpm typecheck` green. Home's toggle itself
  // stays (decision #522); 2.3's remaining scope is wiring its labels to
  // `t.nav.homeList` once the registry is stripped in 2.2.
  function handleSetLang(target: 'en' | 'es') {
    if (lang !== target) setLang(target);
  }

  return (
    <div data-testid="screen-home" className="home-screen">
      <InkFlowBackground ink={ACCENT_INK} speed={1.3} ringGap={7} />

      <div className="home-content">
        <div className="home-header-row">
          <h1 data-screen-heading tabIndex={-1} className="home-wordmark">
            Kevin
            <span style={{ color: ACCENT_INK }}>.</span>
          </h1>

          {/* Real <button> elements, not the decoded source's role="button"
              divs with no tabindex (docs/11's flagged source defect -- a
              role="button" div with no tabindex is mouse-only). Natively
              focusable and Enter/Space-activatable, no manual tabIndex or
              onKeyDown bookkeeping needed. */}
          <div className="home-lang-toggle" role="group" aria-label={t.shell.language}>
            <button
              type="button"
              className="home-lang-toggle__cell"
              data-active={lang === 'en' || undefined}
              aria-pressed={lang === 'en'}
              onClick={() => handleSetLang('en')}
            >
              EN
            </button>
            <span className="home-lang-toggle__divider" aria-hidden="true" />
            <button
              type="button"
              className="home-lang-toggle__cell"
              data-active={lang === 'es' || undefined}
              aria-pressed={lang === 'es'}
              onClick={() => handleSetLang('es')}
            >
              ES
            </button>
          </div>
        </div>

        <nav className="home-nav-list" aria-label={t.shell.sections}>
          {NAV_ITEMS.map((route, index) => (
            <a
              key={route.pageId}
              // Real anchor carrying the section's deep-link hash (open in
              // new tab / copy link land on that section), but activation
              // scrolls + focuses + announces + pushes the hash through the
              // shell instead of jumping natively.
              href={sectionHash(route.pageId)}
              onClick={(event) => {
                event.preventDefault();
                goToSection(route.pageId);
              }}
              className="home-nav-item"
              data-focused={index === focusIndex || undefined}
              // Hover and arrow-key cycling drive the exact same
              // `state.focus` in the decoded source (docs/11/docs/03) --
              // this is that same shared piece of state, not a second
              // mechanism.
              onMouseEnter={() => setFocusIndex(index)}
            >
              <span className="home-nav-item__number">{String(index + 1).padStart(2, '0')}</span>
              <span className="home-nav-item__label">{t.nav.homeList[route.pageId]}</span>
              <span className="home-nav-item__arrow" aria-hidden="true">
                →
              </span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default Home;
