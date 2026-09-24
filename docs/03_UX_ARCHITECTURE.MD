# 03. UX Architecture

> Rewritten 2026-09-21 from the decoded mockup (`docs/_decoded/index/template.html`)
> and cross-checked against the quarantined routing/shell infrastructure
> (`_quarantine/src/shell/Shell.tsx`, `_quarantine/src/shell/usePageTurn.ts`,
> `_quarantine/src/routes/registry.ts`) that the approved reset plan says to
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
`00_PROJECT_VISION.MD`). This doc only owns *how you get from one screen to
another* — layout and visual detail per screen belongs to
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
click *scrolls to that section* instead of swapping a screen (see "Navigation
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
viewport midline. **Observation (not changed by this task, flagged for a
decision):** `<PillNav>` is rendered *after* the `<main>` in DOM order, so
Tab reaches it only after the focusable content of all five sections; it is
visually first, but not first in the tab order.

## Home's keyboard arrow-key nav-focus cycling

This is a **second**, Home-only navigation affordance, distinct from the pill
nav above and easy to conflate with it. Read directly from the decoded
script's `Component` class:

```js
const ORDER = [
  { key: 'about',       screen: 'profile' },
  { key: 'distinction', screen: 'distinction' },
  { key: 'projects',    screen: 'projects' },
  { key: 'contact',     screen: 'contact' }
];
```

`ORDER` deliberately **excludes Home itself** — it's the four *other* screens,
rendered as Home's own right-aligned numbered list (`01 Who me? →`,
`02 Distinction →`, etc.). While Home is mounted, a `window`-level `keydown`
listener is attached in `componentDidMount` and removed in
`componentWillUnmount` (**Updated 2026-09-23:** in the scroll shell Home is
*always* mounted, so this is now scoped to "while Home is the **active
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
plainly:** while Home *is* the active section, ArrowUp/ArrowDown are
swallowed by the cycling and do **not** scroll the page (PageUp/PageDown,
Space, Home/End and the pill nav still do); this is inherited from the
mockup's own `preventDefault()` and is an accessibility trade-off, recorded in
`05_ACCESSIBILITY.MD`, not a resolved issue.

**What "cycling nav focus" actually changes — verified, not assumed:**
`state.focus` drives three purely visual properties on the corresponding list
item and nothing else:

| Property | Not focused | Focused |
|---|---|---|
| Text/number color | `#14150f` (ink) | accent (`#6f7f45` default) |
| Horizontal position | `translateX(0)` | `translateX(10px)` |
| Trailing arrow (`→`) opacity | `0` | `1` |

**Load-bearing nuance for the accessibility phase:** this is a *simulated*
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
> change; the router was removed. The old pattern's *intent* — a keyboard/AT
> user is never left on a stale or invisible element, and every explicit
> navigation is announced — is preserved and re-scoped below. The retired
> route-model reasoning is kept further down as history.

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

| Trigger | Scrolls | Focus moves to section heading | Live region announces | URL hash |
|---|---|---|---|---|
| Pill click / Enter / Space | smooth (`auto` if reduced motion) | yes | yes | `pushState` |
| Home's numbered list link, Profile's "Get in touch" CTA (`goToSection`, via `SectionNavContext`) | same | yes | yes | `pushState` |
| Page load with a valid hash | `instant` | yes | yes | unchanged |
| Back / Forward, hand-edited hash | animated | yes | yes | unchanged (already changed by the browser) |
| Scrolling by wheel / touch / keyboard | native | **no** | **no** | **unchanged** |
| Page load with no / empty / unknown hash | none (stays at Home) | **no** | **no** | unchanged |

Scroll-driven changes only move the pill's visual active state, driven by an
`IntersectionObserver` (`src/shell/useActiveSection.ts`) on a 1px band at the
viewport's vertical midline (`rootMargin: -50% 0 -50% 0`), so exactly one
section is active at a time and it stays correct for any section height.

### Hash deep links

Deep links are URL hashes: `#home`, `#profile`, `#distinctions`, `#projects`,
`#contact`. `src/routes/registry.ts`'s `routes[].hash` is the single source
(the field replaced the old `path`); `src/shell/sectionHash.ts` maps
hash ⇄ `PageId` (`pageIdFromHash` is an exact, case-insensitive match on the
registry hash — no prefix/query tolerance, no `#section-*`, no legacy path
support; anything else returns `null`, treated as Home).
`src/shell/useHashNavigation.ts` decides *when* to call `navigateToSection`:

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
user chose to accept the clamp: Contact's *bottom* aligns to the viewport
bottom, the whole section is visible, and its top lands below the viewport
top (about 360px at 864×900). **No trailing spacer or padding is added** to
the document. 16:9 and 16:10 windows (aspect ≥ 1.6:1) are unaffected: all five
sections land at the viewport top within ±2px (measured 0.00px at 864×540,
1152×720, 1440×900). This is accepted behavior, not a defect.

### Always-mounted screens: what that means for accessibility structure

All five sections are real, always-mounted document content, reachable by
Tab and assistive technology at all times. That is intended for a scrolling
page, and it is why no `inert`/`aria-hidden` is applied to "inactive"
sections (see the retired decision 6 below). Each screen keeps its own single
`[data-screen-heading]` (`tabIndex={-1}`); each `<section>` carries an
`aria-label` from `navLabel`.

### History: what the old `Shell.tsx` / `usePageTurn.ts` pattern actually did

> Retained for provenance only — this described the quarantined route/overlay
> shell and does not describe the shipped app. `05_ACCESSIBILITY.MD`'s
> lightbox focus-restoration note still cites it as the origin of the
> "restore focus on close" intent.

Read from `_quarantine/src/shell/Shell.tsx` and
`_quarantine/src/shell/usePageTurn.ts`. The old routing model was **not**
five peer screens — it was one persistent Home layer with four other routes
opening as an overlay "page" on top of it:

- `usePageTurn()` wraps `useLocation()`/`useNavigate()`. `isOpen` was simply
  `location.pathname !== '/'` — any non-root path meant "a page is open over
  Home."
- `openFrom(triggerEl, path)` captured the exact DOM element that was clicked
  (`triggerRef.current = triggerEl`) *before* calling `navigate(path)`. A
  `busyRef` guard rejected a second `navigate()` fired in the same tick (e.g.
  a double-click), cleared once `location.pathname` actually changed — not
  gated on any animation finishing.
- On close (`handleExited`, called once the page's exit transition finished),
  focus was returned programmatically to that captured trigger element
  (`triggerRef.current?.focus()`) — so a keyboard user who opened "Projects"
  from a specific link lands back on that exact link, not at the top of the
  document. **This restoration is one-directional — it only fires on close.**
  Nothing in `Shell.tsx` moves focus anywhere on *open*; a keyboard user
  navigating into Profile keeps whatever focus they already had (typically
  still on the link they just activated) until they navigate back out. The
  old a11y infra is thinner here than "focus management on every
  transition" might suggest — it's specifically "restore focus when an
  overlay page closes," not a general open-and-close focus contract.
- A single `aria-live="polite"` region (`liveMessage` state, rendered as a
  `.sr-only` div) announced every transition in plain text: `"{LABEL} module
  opened."` on open, `"{LABEL} closed. Home."` on close.
- While a page was open, the underlying Home layer (`.shell-gate`) was given
  both `inert` **and** `aria-hidden` simultaneously, so keyboard and
  assistive-tech users genuinely could not reach it — not just visually
  hidden.
- The persistent chrome (`SystemHeader`, `NavModule`) lived inside
  `.shell-gate` alongside Home, outside the routed `PageLayer` overlay, so it
  never remounted when a page opened or closed.

### What does and doesn't carry forward — SUPERSEDED 2026-09-23

> **SUPERSEDED 2026-09-23.** The six numbered decisions below were the
> route-model resolution. Their current status, item by item: (1) React
> Router as source of truth — **replaced**: the scroll position (pill
> highlight) plus the URL hash; no router exists. (2) pill and Home list call
> `navigate(path)` — **replaced** by `goToSection` (scroll + focus + announce
> + `pushState`). (3) focus moves to the destination heading "on every route
> change" — **kept, re-scoped** to explicit activation and hash-driven
> navigation; scroll-driven changes never move focus (table above). (4) the
> `aria-live` announcement by destination name — **kept**, same scoping.
> (5) persistent chrome outside the route switch — **kept**: the pill nav
> renders once outside the stage. (6) no `inert`/`aria-hidden` needed because
> non-active screens aren't mounted — **the premise is now false**: all five
> sections *are* mounted at once, and the conclusion (no `inert`) holds for a
> different reason — they are all real, reachable page content. The original
> text is kept below unedited as history.

The mockup's five screens are **peers** — Home is just another pill-nav
destination and another full-screen replacement, not a permanent base layer
with things opening on top of it. That means the overlay half of the old
pattern (`Crease`/`PageLayer`'s open/close "page-turn" animation, and Home
specifically being the thing that goes `inert` while something else is
"open") does not map onto this model as-is. **That visual-transition
question is explicitly out of scope for this doc** — it belongs to
`07_ANIMATION_GUIDELINES.md` / `14_REFORM_MOTION.md` in a later phase.

What *is* decided here, because it's an architecture/UX call and not a motion
one:

1. **React Router stays the single source of truth for which screen is
   active.** The route (`useLocation`, or simply which route element is
   rendered) replaces `state.screen` outright — no bare local state duplicating
   what the URL already says.
2. **The pill nav and Home's list are the two direct-navigation triggers**,
   and both call `navigate(path)` under the hood instead of the mockup's
   `setState({ screen })`.
3. **Focus management is a new rule here, not a literal carry-forward —
   the old pattern only ever restored focus on close, never moved it on
   open** (see above). Since the new model has no persistent Home layer to
   restore focus to (any of five peer screens can be the "previous" one,
   and there's no overlay-close event to hang a restoration on), this doc
   extends the old pattern's *intent* — a keyboard/AT user should never be
   left with focus on a now-invisible or unrelated element — into a new,
   symmetric rule: on every route change, move focus to the new screen's
   primary heading/landmark (e.g. an `h1`/`h2` with a stable `tabIndex={-1}`
   + `.focus()` on mount). Treat this as new architecture decided in this
   doc, not as something recovered from the old shell.
4. **The `aria-live="polite"` announcement region is kept, reworded for a
   peer-screen model.** Instead of "module opened" / "closed. Home.", each
   route change announces the destination screen by name (e.g. `"Profile."`,
   `"Home."`). One shared live region, rendered once outside the routed
   switch, same as the old `Shell.tsx`.
5. **Persistent chrome stays outside the route switch.** The pill nav (and
   any future system-header equivalent) renders once, alongside the
   `<Routes>` element, not inside any individual page component — this is
   the same structural decision the old Shell made by keeping
   `SystemHeader`/`NavModule` inside `.shell-gate` rather than inside
   `PageLayer`.
6. **`inert`/`aria-hidden` on a non-active screen is not needed under the new
   model**, because non-active screens are not simultaneously mounted the way
   Home was under the old overlay model — routing only mounts the active
   screen. This simplifies rather than loses the old protection.

## Two label sets — don't conflate them

The decoded script defines **two separate label dictionaries**, and they
disagree with each other, so the registry needs two label fields, not one:

```js
NAV  = [ Home, Profile, Distinctions, Projects, Contact ]   // pill nav — English only, no ES strings exist
COPY = { EN: { about: 'Who me?', distinction: 'Distinction', projects: 'Projects', contact: 'Reach out' },
          ES: { about: '¿Yo?',   distinction: 'Distinción',  projects: 'Proyectos', contact: 'Contacto' } }
                                                              // Home's own numbered list — localized
```

Two things a build agent must not miss: `NAV` says **"Distinctions"**
(plural) while `COPY.distinction` says **"Distinction"** (singular) — these
are two different display strings for the same screen, not a typo. And
`NAV` has **no Spanish strings at all** — the pill nav renders `Home /
Profile / Distinctions / Projects / Contact` regardless of the EN/ES toggle
in the decoded mockup. Carrying that forward as-is (English-only pill nav)
is a legitimate reading of the source; localizing the pill nav too would be
a deliberate *addition* beyond the mockup, not a faithful port — pick one
explicitly rather than leaving it ambiguous.

## The five-section table (was: the five-route table)

> **Rewritten 2026-09-23.** This was "The five-route table" (columns `Path`
> = `/`, `/profile`, `/distinction`, `/projects`, `/contact`; screens swapped
> by `react-router-dom`). **SUPERSEDED** — there are no routes or paths. The
> registry (`src/routes/registry.ts`, still the single source of truth for
> the section list, order and labels) now carries a `hash` per entry instead
> of a `path`. It extends the old four-entry `_quarantine` registry (which
> had no Home entry because Home was implicit) to five real entries and
> renames `certifications` to `distinction` to match the mockup's own naming
> (`docs/_decoded/index/template.html`'s `screen: 'distinction'`).

| Hash (`routes[].hash`) | `pageId` / section DOM id | Screen | Pill-nav label (`navLabel`, EN only) | Home-list `labelEn` | Home-list `labelEs` |
|---|---|---|---|---|---|
| `#home` | `home` / `section-home` | Home | `Home` | *(n/a — Home doesn't list itself)* | *(n/a)* |
| `#profile` | `profile` / `section-profile` | Profile | `Profile` | `Who me?` | `¿Yo?` |
| `#distinctions` | `distinction` / `section-distinction` | Distinctions | `Distinctions` | `Distinction` | `Distinción` |
| `#projects` | `projects` / `section-projects` | Projects | `Projects` | `Projects` | `Proyectos` |
| `#contact` | `contact` / `section-contact` | Contact | `Contact` | `Reach out` | `Contacto` |

The registry carries a `navLabel` field alongside `labelEn`/`labelEs` to hold
both label dictionaries without collapsing them. The `PageId` union
(`'home' | 'profile' | 'distinction' | 'projects' | 'contact'`) is
five-member; note the hash is plural (`#distinctions`) while the `PageId` and
section DOM id are singular (`distinction`, `section-distinction`). The old
path URLs are unsupported (see "Hash deep links" above).

## Where language state lives

Both the decoded script (`state.lang` on the shell-level `Component`) and the
old `_quarantine/src/shell/Shell.tsx` (`useState<'en' | 'es'>('en')` at the
shell level, passed down as a prop) hold the EN/ES toggle **above** any
individual screen, not inside one. This carries forward: `lang` lives in
shell-level state, not inside `Home.tsx` or any other page component, so
toggling it on Home and then navigating to Profile doesn't reset it back to
English. **Updated 2026-09-23:** it lives in `src/App.tsx`
(`useState<Lang>('en')`), which wraps `<Shell/>` in
`LangContext.Provider` (`src/shell/LangContext.tsx`); the five pages read it
with `useLang()` (React context rather than props, because the shell renders
the pages as opaque components). The pages are never unmounted any more, so
it survives navigation trivially. Home's own list uses it via `COPY` above,
and any other screen with bilingual copy reads the same context. (Before this
change it sat "beside `<Routes>`"; there is no `<Routes>` now, so the
position is "above `<Shell/>`".)

## What this doc is not

This doc owns the navigation model only (pill-nav scroll, hash deep links,
focus/live-region behavior; there is no routing). It does not own the visual
design of the pill nav or Home's list (`01_ART_DIRECTION.MD`), the internal
contract of any custom effect (`04_COMPONENT_RULES.MD`), the pill's
active-state transition (`07_ANIMATION_GUIDELINES.md` / `14_REFORM_MOTION.md`;
there is no screen-to-screen transition any more),
or the accessibility rules that resolve the two flagged gaps above
(`05_ACCESSIBILITY.MD`).
