# 03. UX Architecture

> Rewritten 2026-09-21 from the decoded mockup (`docs/_decoded/index/template.html`)
> and cross-checked against the pre-reset routing/shell infrastructure
> (its `Shell.tsx`, `usePageTurn.ts` and `routes/registry.ts`, since deleted)
> that the approved reset plan said to
> **keep and extend**, not discard. Every navigation behavior below —
> the pill-nav layout, the keyboard mapping, the old focus/live-region
> mechanism — was read from source, not inferred. See `00_PROJECT_VISION.MD`
> for the fixed 1440px stage-width decision this doc assumes throughout.
>
> **Updated 2026-09-23 (`continuous-scroll-and-doodles`, spec `nav-model`,
> user-approved).** The route-per-screen model this doc originally specified
> (`react-router-dom`, a 5-route table, `navigate(path)`, per-screen URLs like
> `/profile`, focus moved on "every route change") is **SUPERSEDED**. Reason:
> the five screens are now stacked sections of one scrolling page, so nothing
> mounts, unmounts or routes on navigation; `react-router-dom` was removed
> from `package.json`. The pill nav scrolls, and deep links are URL **hashes**.
> Sections below are annotated in place; verified against `src/shell/*`,
> `src/routes/registry.ts` and `src/App.tsx`. The mockup-derived facts (pill
> layout, arrow-cycling behavior, label dictionaries) are unchanged.

## The stage, restated

> **Updated 2026-09-23.** The original text here read "One fixed 1440×900
> stage shows exactly one of five screens at a time. There is no page scroll
> inside a screen…" — **SUPERSEDED** (see `00_PROJECT_VISION.MD`'s dated
> decision).

The five screens are stacked, in registry order, as five `<section>`s inside
one `<main class="stage">`: a fixed 1440px-wide, natural-height column scaled
uniformly by viewport width alone, whose document scrolls. Every section is
mounted at all times and has a 900px design floor (`min-height: 900px`).
There is no responsive breakpoint logic for the screens themselves (see
`00_PROJECT_VISION.MD`). This doc only owns _how you get from one screen to
another_ — layout and visual detail per screen belongs to
`01_ART_DIRECTION.MD` / `04_COMPONENT_RULES.MD`.

## The floating pill nav

Read directly from `docs/_decoded/index/template.html` (lines ~544–548):
a single chrome element, positioned `absolute; left:20px; top:20px`, `z-index:9000`
(always on top of whichever screen is showing), rendered as a pill
(`border-radius:20px`, translucent dark background with `backdrop-filter:blur(6px)`).
It holds **five buttons, one per screen — including Home itself**:

```
NAV = [home, profile, distinction, projects, contact]
```

Each button's own click handler (`go(key)` in the decoded script) swaps
`state.screen` directly — there is no separate "close" affordance; clicking
any pill button, including the one for the screen you're already on, is the
entire navigation model. **Updated 2026-09-23:** in the shipped app a pill
click _scrolls to that section_ instead of swapping a screen (see "Navigation
model" below); still one click, still no close affordance, and the button for
the section you're already on is still a valid target. The active button gets a solid accent (`#6f7f45`
default) background with `#14150f` text; inactive buttons are transparent
with `#f3f2ef` text. **Corrected 2026-09-21:** the active button's
background is `#8b9c56`, not the default `#6f7f45` — the as-decoded pairing
computed to ≈4.20:1, under AA's 4.5:1 for this 11px text; see
`02_DESIGN_SYSTEM.MD`'s Corrected Contrast Pairings (Fix 2) and
`05_ACCESSIBILITY.MD` for the full rationale. Labels are `JetBrains Mono`, 11px, uppercase,
`letter-spacing:.1em`.

**This pill nav is persistent chrome, not part of any one screen.** It must
sit outside whatever renders the screen content so it never remounts, loses
hover/focus state, or gets removed from the tab order across a navigation.

**Updated 2026-09-23 — as shipped** (`src/shell/PillNav.tsx`,
`src/shell/shell.css`): the mockup's `position:absolute; left:20px; top:20px`
became `position: fixed` and, because a fixed element inside a transformed
ancestor is positioned against that ancestor (it would scroll away with the
page), `<PillNav>` is rendered by `<Shell>` **outside** the scaled `.stage`,
carrying its own copy of the stage scale (`left`/`top: calc(20px * scale)`,
`transform: scale(var(--stage-scale)); transform-origin: top left`) so it
keeps its designed size and position. `z-index: 9000` is unchanged. It is a
stateless `<nav aria-label="Screens">` of five real `<button type="button">`s
(Enter and Space both activate — native links would only take Enter);
`aria-current="page"` and `data-active` mark the section currently under the
viewport midline. **Corrected 2026-09-27 (`profile-acrostic-i18n`, Phase 5):**
the earlier text here said `<PillNav>` was rendered _after_ `<main>`, flagging
a decision. Verified directly against the shipped `src/shell/Shell.tsx`: the
pill chrome (now a `<div className="pill-chrome">` wrapping both the
five-button `<nav>` and the EN/ES toggle group, see "Two label sets" below) is
the **first** child of `.stage-viewport`, ahead of `<main className="stage">`.
Because it is `position: fixed` (`z-index: 9000`), DOM order has no visual
effect either way, but it does mean the pill chrome IS the first Tab stop and
the first landmark a screen reader meets — the opposite of what this doc used
to say. No open decision remains; this was a stale doc claim, not a real gap.

## Home's keyboard arrow-key nav-focus cycling

This is a **second**, Home-only navigation affordance, distinct from the pill
nav above and easy to conflate with it. Read directly from the decoded
script's `Component` class:

```js
const ORDER = [
  { key: 'about', screen: 'profile' },
  { key: 'distinction', screen: 'distinction' },
  { key: 'projects', screen: 'projects' },
  { key: 'contact', screen: 'contact' },
];
```

`ORDER` deliberately **excludes Home itself** — it's the four _other_ screens,
rendered as Home's own right-aligned numbered list (`01 Who me? →`,
`02 Distinction →`, etc.). While Home is mounted, a `window`-level `keydown`
listener is attached in `componentDidMount` and removed in
`componentWillUnmount` (**Updated 2026-09-23:** in the scroll shell Home is
_always_ mounted, so this is now scoped to "while Home is the **active
section**" — see the scope note below the keymap):

- **ArrowRight or ArrowDown** → `move(+1)`
- **ArrowLeft or ArrowUp** → `move(-1)`

`move(d)` advances a `state.focus` index into `ORDER` with wraparound
(`(focus + d + ORDER.length) % ORDER.length`). Both arrow presses call
`e.preventDefault()`.

**Scope in the scroll shell (added 2026-09-23; `src/pages/home/useNavFocusCycle.ts`,
`src/pages/Home.tsx`).** `useNavFocusCycle(itemCount, enabled)` only attaches
its `window` listener while `enabled` is true, and Home passes
`enabled = (activeSection === 'home')`, where the active section is the one
under the viewport midline (`SectionNavContext`). Without this, an
always-mounted Home would `preventDefault()` every arrow key on every section
and kill native keyboard scrolling page-wide. **Known limitation, stated
plainly:** while Home _is_ the active section, ArrowUp/ArrowDown are
swallowed by the cycling and do **not** scroll the page (PageUp/PageDown,
Space, Home/End and the pill nav still do); this is inherited from the
mockup's own `preventDefault()` and is an accessibility trade-off, recorded in
`05_ACCESSIBILITY.MD`, not a resolved issue.

**What "cycling nav focus" actually changes — verified, not assumed:**
`state.focus` drives three purely visual properties on the corresponding list
item and nothing else:

| Property                     | Not focused     | Focused                    |
| ---------------------------- | --------------- | -------------------------- |
| Text/number color            | `#14150f` (ink) | accent (`#6f7f45` default) |
| Horizontal position          | `translateX(0)` | `translateX(10px)`         |
| Trailing arrow (`→`) opacity | `0`             | `1`                        |

**Load-bearing nuance for the accessibility phase:** this is a _simulated_
preview highlight, not real DOM/keyboard focus. The listener is bound to
`window`, not to the list or any single link, so pressing arrow keys does not
move `document.activeElement` — it only re-renders which item looks
highlighted. `onMouseEnter` on each item sets the exact same `state.focus`
index, meaning hover and arrow-cycling drive one shared piece of state with
one shared visual treatment. Actually **activating** a screen from the list
still requires a real click, or pressing Enter while an item has genuine
keyboard focus via Tab — which is independent of, and can disagree with,
whichever item currently has the simulated arrow-cycle highlight. Do not port
this as "arrow keys navigate the list" without addressing that gap; flag it
for `05_ACCESSIBILITY.MD` rather than silently fixing or silently copying it.

## Navigation model — pill-nav scroll + hash deep links

> **Rewritten 2026-09-23** (spec `nav-model` + `Hash Deep Links`,
> user-approved). This section was "Reconciling with react-router-dom and the
> old focus/live-region pattern": the approved reset plan had said to keep
> `react-router-dom` for URL-addressability and to make focus + `aria-live`
> fire on every route change. **SUPERSEDED.** Reason: the five screens are
> now stacked sections of one scrolling document, so there is no route to
> change; the router was removed. The old pattern's _intent_ — a keyboard/AT
> user is never left on a stale or invisible element, and every explicit
> navigation is announced — is preserved and re-scoped below (see "Decisions
> carried over from the route model").

### One navigation path

`src/shell/Shell.tsx` renders all five pages (injected by `App.tsx` as a
`PageId → component` map) stacked in registry order. Each is wrapped in
`<section id="section-{pageId}" aria-label={navLabel} class="screen-section">`
inside one `<main class="stage">` (one `<main>`; the page roots are plain
`<div>`s). Note the DOM ids use the `PageId` (`section-distinction`,
singular) while the URL hash is `#distinctions` — the mapping lives in
`routes[].hash` (below), not in string manipulation.

Everything that navigates goes through one function,
`Shell.navigateToSection(pageId, mode)`, which: (1) `lockTo`s the pill's
active state on the target (so the highlight doesn't flicker through the
sections a smooth scroll passes; released when the target is reported or after
1000ms), (2) calls `section.scrollIntoView({ block: 'start', behavior })`,
(3) moves focus to **that section's own** `[data-screen-heading]`
(`focus({ preventScroll: true })`, so focusing never fights the scroll), and
(4) sets the shared live region to `"{navLabel}."` (e.g. `"Profile."`,
`"Home."`). Steps 3 and 4 fire **in the same tick as the scroll starts**, not
after it finishes (`14_REFORM_MOTION.md`: motion never gates function).
`scrollIntoView` is deliberate: the browser resolves the element's real,
transform-scaled position, so the landing is exact at any stage scale
(measured 0.00px at scale 0.6 / 0.8 / 1.0).

- `behavior` is `smooth` for animated navigation, `auto` (no animation) under
  `prefers-reduced-motion: reduce`, and `instant` for the page-load deep link.

### Explicit activation vs. scroll-driven change

| Trigger                                                                                          | Scrolls                           | Focus moves to section heading | Live region announces | URL hash                                   |
| ------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------------ | --------------------- | ------------------------------------------ |
| Pill click / Enter / Space                                                                       | smooth (`auto` if reduced motion) | yes                            | yes                   | `pushState`                                |
| Home's numbered list link, Profile's "Get in touch" CTA (`goToSection`, via `SectionNavContext`) | same                              | yes                            | yes                   | `pushState`                                |
| Page load with a valid hash                                                                      | `instant`                         | yes                            | yes                   | unchanged                                  |
| Back / Forward, hand-edited hash                                                                 | animated                          | yes                            | yes                   | unchanged (already changed by the browser) |
| Scrolling by wheel / touch / keyboard                                                            | native                            | **no**                         | **no**                | **unchanged**                              |
| Page load with no / empty / unknown hash                                                         | none (stays at Home)              | **no**                         | **no**                | unchanged                                  |

Scroll-driven changes only move the pill's visual active state, driven by an
`IntersectionObserver` (`src/shell/useActiveSection.ts`) on a 1px band at the
viewport's vertical midline (`rootMargin: -50% 0 -50% 0`), so exactly one
section is active at a time and it stays correct for any section height.

> **Two signals, not one (added 2026-09-26, `mobile-visibility-scanmodal`).**
> `activeSection` (the single midline band above — drives the pill highlight
> and Home's arrow-key scope) is **not** the same thing as a section's
> _visibility_ (any overlap with the viewport, slightly negative root margin —
> drives pausing continuous effects, owned by `07_ANIMATION_GUIDELINES.md`
> "Off-screen pause"). They are two separate observers, must not be unified,
> and neither changes when the other does (pinned by `Shell.test.tsx`).
> The **phone case** is why: at a 390px viewport the stage scale is ~0.27, so
> the whole five-section stack is only ~1220px tall against an ~844px viewport
> — four or five sections overlap the viewport at once (measured at 390×844:
> four at the top and bottom of the ~375px scroll range, five around
> `scrollY` ≈ 200; a real phone's shorter viewport under browser chrome shows
> fewer) while exactly one is active. "Active" says nothing about which
> sections are visible.

### Hash deep links

Deep links are URL hashes: `#home`, `#profile`, `#distinctions`, `#projects`,
`#contact`. `src/routes/registry.ts`'s `routes[].hash` is the single source
(the field replaced the old `path`); `src/shell/sectionHash.ts` maps
hash ⇄ `PageId` (`pageIdFromHash` is an exact, case-insensitive match on the
registry hash — no prefix/query tolerance, no `#section-*`, no legacy path
support; anything else returns `null`, treated as Home).
`src/shell/useHashNavigation.ts` decides _when_ to call `navigateToSection`:

- **On load:** a valid hash navigates `instant`ly. An empty/unknown hash does
  nothing (the page already sits on Home; moving focus or announcing on an
  ordinary visit would be noise).
- **`popstate` (Back/Forward) and `hashchange` (hand-edited URL):** navigate
  (animated) to the hash's section, or to Home for an empty/unknown hash.
  A real Back fires both events in Chromium, so they are coalesced within one
  task (one `scrollIntoView`). This hook never pushes history itself.
- **Explicit activation** additionally records the section with
  `history.pushState(null, '', '#profile')` (`pushSectionHash`; skipped when
  the URL already names the section, so Back never appears to do nothing).
  `pushState` fires neither event, so this can't loop the handler.
- While mounted, the hook sets **`history.scrollRestoration = 'manual'`**,
  otherwise the browser's own restoration races the smooth scroll on
  Back/Forward and overrides the instant load scroll. Side effect: a
  hash-less reload after scrolling lands at the top.
- Home's list anchors and Profile's CTA are real `<a href="#profile">` etc.
  (open-in-new-tab / copy-link work) whose click is `preventDefault()`ed and
  routed through `goToSection`. **Constraint for future work:** any new
  in-page anchor (e.g. a `#main` skip link) would be treated as an unknown
  hash by the `hashchange` handler and sent to Home; it needs an explicit
  exception.
- **Path URLs (`/profile`, `/distinction`, …) are not supported.** The site is
  static on GitHub Pages, which cannot rewrite paths to the SPA. The build
  copies `dist/index.html` to `dist/404.html` (`scripts/copy-404.mjs`, run by
  `pnpm build`), so Pages serves the app shell for an unmatched path (with a
  404 status) and it renders Home. That last sentence is inferred from the
  build script + the deploy workflow; it has **not** been verified against a
  live Pages deployment. A `404.html` that redirected `/profile → /#profile`
  would be new scope (a user decision), not implemented.

### The last-section clamp (accepted, 2026-09-23)

Native scroll clamps at the bottom of the document. When the target is the
**last** section (Contact) and the viewport is taller than a scaled section
(window aspect ratio below 1.6:1, i.e. viewport height > `900 × width/1440`),
Contact's top cannot reach the viewport top without adding dead space. The
user chose to accept the clamp: Contact's _bottom_ aligns to the viewport
bottom, the whole section is visible, and its top lands below the viewport
top (about 360px at 864×900). **No trailing spacer or padding is added** to
the document. 16:9 and 16:10 windows (aspect ≥ 1.6:1) are unaffected: all five
sections land at the viewport top within ±2px (measured 0.00px at 864×540,
1152×720, 1440×900). This is accepted behavior, not a defect.

### Always-mounted screens: what that means for accessibility structure

All five sections are real, always-mounted document content, reachable by
Tab and assistive technology at all times. That is intended for a scrolling
page, and it is why no `inert`/`aria-hidden` is applied to "inactive"
sections (see decision 6 below). Each screen keeps its own single
`[data-screen-heading]` (`tabIndex={-1}`); each `<section>` carries an
`aria-label` from `navLabel`.

### Decisions carried over from the route model

The pre-scroll route model resolved six numbered decisions. Their status in
the shipped scroll shell, item by item:

1. **React Router as the source of truth for the active screen — replaced.**
   The scroll position (pill highlight) plus the URL hash; no router exists.
2. **The pill and Home list call `navigate(path)` — replaced** by
   `goToSection` (scroll + focus + announce + `pushState`).
3. **Focus moves to the destination heading — kept, re-scoped** to explicit
   activation and hash-driven navigation; scroll-driven changes never move
   focus (table above).
4. **The `aria-live` announcement by destination name — kept**, same scoping.
5. **Persistent chrome outside the switch — kept:** the pill nav renders once,
   outside the stage.
6. **No `inert`/`aria-hidden` on non-active screens — kept, for a different
   reason:** all five sections are mounted at once and are all real,
   reachable page content.

## Two label sets — resolved 2026-09-27 (`profile-acrostic-i18n`)

The decoded script defines **two separate label dictionaries**, and they used
to disagree with each other:

```js
NAV = [Home, Profile, Distinctions, Projects, Contact]; // pill nav — as decoded, English only, no ES strings exist
COPY = {
  EN: { about: 'Who me?', distinction: 'Distinction', projects: 'Projects', contact: 'Reach out' },
  ES: { about: '¿Yo?', distinction: 'Distinción', projects: 'Proyectos', contact: 'Contacto' },
};
// Home's own numbered list — localized
```

The open question this doc left ("pick one explicitly rather than leaving it
ambiguous") is **resolved: the pill nav is now localized too**, not carried
forward as English-only. Rationale (design `sdd/profile-acrostic-i18n`): an
English pill label read in an `es`-locale screen-reader voice is an
accessibility failure, and this project's non-negotiable conflict order ranks
Accessibility above Project Vision/mockup fidelity (root `CLAUDE.md`).

Both label sets moved out of the registry entirely and now live in the
central UI dictionary, keyed by `pageId`:

- **Pill nav** — `t.nav.pill: Record<PageId, string>` (`src/i18n/{en,es}.ts`).
  `NAV`'s **"Distinctions"** (plural) is preserved as the `distinction` key's
  value (`t.nav.pill.distinction === 'Distinctions'`) — the plural/singular
  distinction from `COPY.distinction`'s **"Distinction"** (singular) is
  likewise preserved as `t.nav.homeList.distinction`. These remain two
  different display strings for the same screen, not a typo, exactly as
  originally documented — only their storage location changed.
- **Home's numbered list** — `t.nav.homeList: Record<Exclude<PageId, 'home'>, string>`,
  same as before, still excluding Home itself.

`src/routes/registry.ts` is now structural only (`{ hash, pageId }` per
entry) — it lost `navLabel`, `labelEn` and `labelEs` entirely, not just had
the two sets merged into one. See `src/shell/PillNav.tsx` (reads
`t.nav.pill[route.pageId]`) and `src/pages/Home.tsx` (reads
`t.nav.homeList[route.pageId]`).

## The five-section table (was: the five-route table)

> **Rewritten 2026-09-23.** This was "The five-route table" (columns `Path`
> = `/`, `/profile`, `/distinction`, `/projects`, `/contact`; screens swapped
> by `react-router-dom`). **SUPERSEDED** — there are no routes or paths. The
> registry (`src/routes/registry.ts`, still the single source of truth for
> the section list, order and labels) now carries a `hash` per entry instead
> of a `path`. It extends the old pre-reset four-entry registry (which
> had no Home entry because Home was implicit) to five real entries and
> renames `certifications` to `distinction` to match the mockup's own naming
> (`docs/_decoded/index/template.html`'s `screen: 'distinction'`).

| Hash (`routes[].hash`) | `pageId` / section DOM id             | Screen       | Pill-nav label (`t.nav.pill[pageId]`) | Home-list `t.nav.homeList[pageId]` EN | Home-list ES |
| ---------------------- | ------------------------------------- | ------------ | -------------------------------------- | --------------------------------------- | ------------------- |
| `#home`                | `home` / `section-home`               | Home         | `Home`                                  | _(n/a — Home doesn't list itself)_      | _(n/a)_             |
| `#profile`             | `profile` / `section-profile`         | Profile      | `Profile`                               | `Who me?`                               | `¿Yo?`              |
| `#distinctions`        | `distinction` / `section-distinction` | Distinctions | `Distinctions`                          | `Distinction`                           | `Distinción`        |
| `#projects`            | `projects` / `section-projects`       | Projects     | `Projects`                              | `Projects`                              | `Proyectos`         |
| `#contact`             | `contact` / `section-contact`         | Contact      | `Contact`                               | `Reach out`                             | `Contacto`          |

**Corrected 2026-09-27 (`profile-acrostic-i18n`, Phase 5):** this table used
to cite registry fields `navLabel`/`labelEn`/`labelEs`. Those fields no
longer exist — see "Two label sets" above. `src/routes/registry.ts` now
carries only `hash` and `pageId` per entry; both label columns above are read
live from `src/i18n/{en,es}.ts` at render time, keyed by `pageId`. The
`PageId` union (`'home' | 'profile' | 'distinction' | 'projects' | 'contact'`) is
five-member; note the hash is plural (`#distinctions`) while the `PageId` and
section DOM id are singular (`distinction`, `section-distinction`). The old
path URLs are unsupported (see "Hash deep links" above).

## Where language state lives

Both the decoded script (`state.lang` on the shell-level `Component`) and the
pre-reset `Shell.tsx` (`useState<'en' | 'es'>('en')` at the
shell level, passed down as a prop) hold the EN/ES toggle **above** any
individual screen, not inside one. This carries forward: `lang` lives in
shell-level state, not inside `Home.tsx` or any other page component, so
toggling it on Home and then navigating to Profile doesn't reset it back to
English. **Updated 2026-09-23, corrected 2026-09-27
(`profile-acrostic-i18n`, Phase 5):** it lives in `src/shell/LangContext.tsx`'s
`LangProvider` component (`useState<Lang>('en')` inside `LangProvider`, not in
`App.tsx` itself — the earlier text here was imprecise about which file owns
the `useState`). `src/App.tsx` only mounts `<LangProvider><Shell .../></LangProvider>`;
it doesn't hold any state of its own. `LangProvider` also owns the
`<html lang>` sync (`useEffect(() => { document.documentElement.lang = lang },
[lang])`) — one owner, so `index.html` only needs to be correct for first
paint (`lang="en"`). The five pages read the locale with `useLang()` (React
context rather than props, because the shell renders the pages as opaque
components), which now returns `{ lang, setLang, t }` — `t` is the active
locale's dictionary (`src/i18n/{en,es}.ts`), not a `toggleLang` function (that
binary toggle was replaced by `setLang(lang)` in Phase 1 of
`sdd/profile-acrostic-i18n`, so any page or test still calling `toggleLang`
is stale). The pages are never unmounted any more, so the locale survives
navigation trivially. Home's own list and the pill nav's own toggle both call
the same `setLang` (decision #522 keeps both toggles; see "Two label sets"
above for where the label dictionaries themselves live). (Before the
scroll-shell reset this state sat "beside `<Routes>`"; there is no `<Routes>`
now, so the position is "above `<Shell/>`", inside `LangProvider`.)

## What this doc is not

This doc owns the navigation model only (pill-nav scroll, hash deep links,
focus/live-region behavior; there is no routing). It does not own the visual
design of the pill nav or Home's list (`01_ART_DIRECTION.MD`), the internal
contract of any custom effect (`04_COMPONENT_RULES.MD`), the pill's
active-state transition (`07_ANIMATION_GUIDELINES.md` / `14_REFORM_MOTION.md`;
there is no screen-to-screen transition any more),
or the accessibility rules that resolve the two flagged gaps above
(`05_ACCESSIBILITY.MD`).
