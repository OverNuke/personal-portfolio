# 03. UX Architecture

> Rewritten 2026-09-21 from the decoded mockup (`docs/_decoded/index/template.html`)
> and cross-checked against the quarantined routing/shell infrastructure
> (`_quarantine/src/shell/Shell.tsx`, `_quarantine/src/shell/usePageTurn.ts`,
> `_quarantine/src/routes/registry.ts`) that the approved reset plan says to
> **keep and extend**, not discard. Every navigation behavior below —
> the pill-nav layout, the keyboard mapping, the old focus/live-region
> mechanism — was read from source, not inferred. See `00_PROJECT_VISION.MD`
> for the fixed 1440×900 stage decision this doc assumes throughout.

## The stage, restated

One fixed 1440×900 stage shows exactly one of five screens at a time. There is
no page scroll inside a screen and no responsive breakpoint logic for the
screens themselves (see `00_PROJECT_VISION.MD`). This doc only owns *how you
get from one screen to another* — layout and visual detail per screen belongs
to `01_ART_DIRECTION.MD` / `04_COMPONENT_RULES.MD`.

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
entire navigation model. The active button gets a solid accent (`#6f7f45`
default) background with `#14150f` text; inactive buttons are transparent
with `#f3f2ef` text. **Corrected 2026-09-21:** the active button's
background is `#8b9c56`, not the default `#6f7f45` — the as-decoded pairing
computed to ≈4.20:1, under AA's 4.5:1 for this 11px text; see
`02_DESIGN_SYSTEM.MD`'s Corrected Contrast Pairings (Fix 2) and
`05_ACCESSIBILITY.MD` for the full rationale. Labels are `JetBrains Mono`, 11px, uppercase,
`letter-spacing:.1em`.

**This pill nav is persistent chrome, not part of any one screen.** It must
sit outside whatever renders the routed screen content (mirroring how
`NavModule`/`SystemHeader` sat outside `PageLayer` in the old shell — see
below) so it never remounts, loses hover/focus state, or gets removed from
the tab order across a navigation.

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
`componentWillUnmount`:

- **ArrowRight or ArrowDown** → `move(+1)`
- **ArrowLeft or ArrowUp** → `move(-1)`

`move(d)` advances a `state.focus` index into `ORDER` with wraparound
(`(focus + d + ORDER.length) % ORDER.length`). Both arrow presses call
`e.preventDefault()`.

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

## Reconciling with react-router-dom and the old focus/live-region pattern

The mockup's own navigation is bare local component state
(`this.state.screen`, swapped with `setState`). The approved plan is explicit:
keep `react-router-dom` for URL-addressability, and reuse the old shell's
accessibility infrastructure rather than reverting to that bare state model.
Here is what that infrastructure concretely does, and how it maps onto the
new five-screen model.

### What the old `Shell.tsx` / `usePageTurn.ts` pattern actually did

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

### What does and doesn't carry forward

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

## The five-route table

Extends the old four-entry `_quarantine/src/routes/registry.ts` (which had no
`/` entry because Home was implicit) to five real entries, and renames
`/certifications` to `/distinction` to match the mockup's own naming
(`docs/_decoded/index/template.html`'s `screen: 'distinction'` / `isDistinction`):

| Path | Screen | Pill-nav label (`navLabel`, EN only) | Home-list `labelEn` | Home-list `labelEs` |
|---|---|---|---|---|
| `/` | Home | `Home` | *(n/a — Home doesn't list itself)* | *(n/a)* |
| `/profile` | Profile | `Profile` | `Who me?` | `¿Yo?` |
| `/distinction` | Distinctions | `Distinctions` | `Distinction` | `Distinción` |
| `/projects` | Projects | `Projects` | `Projects` | `Proyectos` |
| `/contact` | Contact | `Contact` | `Reach out` | `Contacto` |

The registry needs a `navLabel` field alongside the existing `labelEn`/
`labelEs` shape to carry both dictionaries without collapsing them. The old
`PageId` union (`'profile' | 'certifications' | 'projects' | 'contact'`)
becomes a five-member union including `'home'`, and every `certifications`
occurrence is renamed to `distinction` throughout the registry and any
pages/tests that import it.

## Where language state lives

Both the decoded script (`state.lang` on the shell-level `Component`) and the
old `_quarantine/src/shell/Shell.tsx` (`useState<'en' | 'es'>('en')` at the
shell level, passed down as a prop) hold the EN/ES toggle **above** any
individual screen, not inside one. This must carry forward the same way:
`lang` lives in shell-level state beside `<Routes>`, not inside `Home.tsx` or
any other page component, so toggling it on Home and then navigating to
Profile doesn't reset it back to English. It's passed down to whichever
screen renders lang-dependent copy (Home's own list via `COPY` above, and any
other screen with bilingual copy).

## What this doc is not

This doc owns the navigation/routing model only. It does not own the visual
design of the pill nav or Home's list (`01_ART_DIRECTION.MD`), the internal
contract of any custom effect (`04_COMPONENT_RULES.MD`), the actual transition
animation between screens (`07_ANIMATION_GUIDELINES.md` / `14_REFORM_MOTION.md`),
or the accessibility rules that resolve the two flagged gaps above
(`05_ACCESSIBILITY.MD`).
