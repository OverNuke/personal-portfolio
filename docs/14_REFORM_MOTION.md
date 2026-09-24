# 14. REFORM Motion — Screen/Route Transition Contract (SUPERSEDED 2026-09-23)

> **SUPERSEDED 2026-09-23** — the REFORM/ENTER route crossfade no longer
> exists; see "Current contract" below. Title kept so existing references to
> `14_REFORM_MOTION.md` still resolve.

> Written 2026-09-21 (Phase 6). Companion to `07_ANIMATION_GUIDELINES.md`:
> that doc owns per-effect motion timing, this doc owns the one motion
> question `03_UX_ARCHITECTURE.MD` explicitly deferred — **what happens
> visually when the active screen changes** (pill-nav click, Home's numbered
> list, or Home's arrow-key cycling followed by a real activation). Resolved
> here, not left open.

## Current contract (2026-09-23) — READ THIS FIRST

> **SUPERSEDED 2026-09-23 (`continuous-scroll-and-doodles`, spec
> `screen-transitions`, task 8.1).** Everything below this section — the
> REFORM (exit) / ENTER (enter) opacity crossfade between routed screens —
> **no longer exists in the code.** Reason: the five screens are stacked
> sections of one scrolling page and nothing mounts or unmounts on navigation
> (`03_UX_ARCHITECTURE.MD`), so there is no outgoing or incoming screen to
> fade. Phase 8.1 deleted the `.screen-layer--enter` / `.screen-layer--reform`
> rules, both `@keyframes` and their reduced-motion override from
> `src/shell/shell.css`. The sections below are kept as history and for the
> reasoning that still applies (no shared-element morph, house ease, "motion
> never gates function"); do not implement them.

**What remains, verified against `src/shell/shell.css`:**

| What | Value |
|---|---|
| Only transition in the shell | The pill nav's active-state swap: `.pill-nav__button` `transition: background 120ms var(--ease-house), color 120ms var(--ease-house)` |
| Easing | `--ease-house` = `cubic-bezier(.2,.85,.2,1)` (defined in `src/styles/index.css`; the shell.css fallback repeats the literal) |
| Properties | `background` and `color` only — no transform, no scale, no opacity, no blur |
| `prefers-reduced-motion: reduce` | `.pill-nav__button { transition: none }` — the swap is instant |

- The **120ms** (REFORM) figure carried over onto the pill. The **140ms**
  (ENTER) figure is **unused**: the pill's active swap has a single direction
  (one button loses the active state as another gains it), so there is no
  separate "enter" phase to give 140ms to. This is a deliberate reading of the
  spec's "120ms/140ms carry over"; if a second-direction transition is ever
  added, 140ms is the value to reuse.
- **It never gates function.** The transition is purely visual. Scrolling,
  focus movement and the `aria-live` announcement on explicit activation all
  fire in the same tick as the scroll starts (`03_UX_ARCHITECTURE.MD`),
  regardless of whether the indicator has finished swapping — this is the
  "motion never gates function" rule from the section below, which still
  holds unchanged.
- The pill's transition previously was the mockup's plain `background .2s
  ease, color .2s ease`; that decoded value was deliberately replaced by the
  house-ease 120ms (see `07_ANIMATION_GUIDELINES.md`'s dated correction).
- Guarded by an e2e computed-style test (`e2e/layout.spec.ts`, "pill nav
  crossfade": `transition-duration` / `-timing-function` with motion, `0s`
  under `prefers-reduced-motion: reduce`). It has only run against a Vite dev
  server, not yet against a real `pnpm e2e` build (see
  `09_IMPLEMENTATION_ROADMAP.md`).
- **Scroll motion itself** is the browser's native `scrollIntoView`:
  `behavior: 'smooth'` for animated pill/link navigation, `'auto'` under
  reduced motion, `'instant'` for a page-load deep link. It is not authored
  motion and has no timing value in this project.

## History (SUPERSEDED): what the source actually does — verified, not assumed

`docs/_decoded/index/template.html` renders all five screens as sibling
`<sc-if>` blocks inside one `position:relative` stage div (lines 489–542).
Switching `state.screen` swaps which `<sc-if>` block is truthy. There is
**no CSS transition, no `@keyframes` rule, no shared-element animation, and
no timing of any kind** attached to this swap in the decoded source — it is
an instantaneous hard cut. Grepping every decoded template for
`prefers-reduced-motion` and for any transition/animation rule scoped to the
outer per-screen wrapper divs (`data-screen-label="Home"` etc.) confirms
this: those wrappers carry no transition-related CSS at all. **A "page-turn"
effect does not exist anywhere in this mockup.** Do not build one under the
assumption it's a recovered mockup behavior — it would be invented, not
ported.

This matters because the project's *quarantined* old shell
(`_quarantine/src/shell/Shell.tsx`, cited in `03_UX_ARCHITECTURE.MD`) did
have a named transition system (`Crease`/`PageLayer`, referenced historically
in this repo's docs as "REFORM/ENTER"). That system doesn't carry forward
as-is for two independent reasons: (1) it animated an *overlay page opening
on top of a persistent Home layer*, a structural model `03_UX_ARCHITECTURE.MD`
already rejected in favor of five peer routes with no persistent base layer
to stay put, and (2) it has no source in the actual mockup this rebuild is
porting — its own animation values were never verified against decoded
content and would be pure invention if copied forward literally. This doc
keeps the **name** (REFORM = exit, ENTER = enter — a clear before/after
vocabulary worth preserving) but defines new, minimal content for it,
grounded in what does exist: `03_UX_ARCHITECTURE.MD`'s routing decisions and
`07_ANIMATION_GUIDELINES.md`'s house ease.

## The decision (SUPERSEDED 2026-09-23, history): a minimal, mechanical crossfade — not a shared-element morph

**No shared-element (FLIP-style) morph between screens.** Considered and
rejected, for a concrete reason: a shared-element move needs a matching
element on both sides of the transition to interpolate between, and no two
of the five screens share one. Each screen's layout, type scale, and content
are entirely different (Home's right-aligned wordmark+list has no analog on
Profile's diagonal-gradient hinge, which has no analog on Distinctions'
Voronoi field, and so on). The **one** persistent element across every
transition is the pill-nav chrome itself — and per `03_UX_ARCHITECTURE.MD`,
that chrome deliberately renders once outside `<Routes>` and never
remounts, so it has nothing to "move" between states; its permanence *is*
the continuity cue, not a thing this doc needs to animate.

**What ships instead — REFORM/ENTER as a plain opacity crossfade:**

| Phase | What | Duration | Easing |
|---|---|---|---|
| REFORM (exit) | Outgoing screen's root fades `opacity: 1 → 0` | 120ms | `cubic-bezier(.2,.85,.2,1)` (the house ease, `07_ANIMATION_GUIDELINES.md`) |
| ENTER (enter) | Incoming screen's root fades `opacity: 0 → 1` | 140ms | `cubic-bezier(.2,.85,.2,1)` |
| Both | No transform, no scale, no blur, no shared element — opacity only | — | — |

This is deliberately the smallest addition beyond the mockup's literal hard
cut, not a design flourish: a genuinely instantaneous full-screen content
replacement reads as a flash/flicker in a real browser at 1440×900 in a way
it doesn't in whatever internal preview tool the mockup bundler renders
inside — the crossfade exists to prevent that flash, not to add
personality. Keeping it opacity-only, sub-150ms, and on the already-
established house ease keeps it consistent with this project's "mechanical,
not playful" motion character (`07_ANIMATION_GUIDELINES.md`) rather than
introducing a new, springier signature move.

**Implementation shape, consistent with "no animation library"
(`06_FRONTEND_STACK.MD`):** a CSS class (e.g. `.screen-enter` /
`.screen-enter-active`) toggled via a `useEffect` keyed on
`location.pathname`, or a plain CSS `transition: opacity 140ms
cubic-bezier(.2,.85,.2,1)` on the routed outlet wrapper with the opacity
value flipped on mount — either is a native-CSS-transition implementation,
not a JS animation library, matching every other effect in this doc set.

## `prefers-reduced-motion` (history; the current equivalent is in "Current contract")

Under `prefers-reduced-motion: reduce`, the crossfade is skipped entirely —
`opacity` jumps directly to its end state with `0ms` duration. This is not
a special case invented for accessibility; it's the mockup's own literal
default behavior (instant hard cut), so reduced-motion users see exactly
what the source mockup does. No screen's content, layout, or functionality
depends on the crossfade completing — it is presentation only.

## Focus and live-region sequencing — reconciled with `03_UX_ARCHITECTURE.MD` (history; the principle still holds)

> **Updated 2026-09-23.** The steps below describe the route-change
> sequence. Their principle — focus and the announcement fire immediately,
> never gated behind a visual transition — is unchanged and is what the
> scroll shell does on explicit activation. The route/mount specifics
> ("the new screen's component mounts", React Router unmounting the outgoing
> screen) are obsolete; see `03_UX_ARCHITECTURE.MD`'s "Navigation model".

`03_UX_ARCHITECTURE.MD` already decided *that* focus moves to the new
screen's primary heading/landmark on every route change, and *that* a
shared `aria-live="polite"` region announces the destination screen by
name. This doc adds the missing piece: **when**, relative to the crossfade.

1. Route changes; the new screen's component mounts immediately (React
   Router doesn't wait on any animation to swap route elements).
2. Focus moves to the new screen's primary heading (`tabIndex={-1}` +
   `.focus()`) **immediately on mount** — not gated behind the crossfade's
   140ms, whether or not reduced motion is active. A decorative or
   presentational transition must never be the thing standing between a
   keyboard/AT user and real focus, per the same principle
   `05_ACCESSIBILITY.MD` applies to every other effect in this doc set
   (motion never gates function).
3. The `aria-live="polite"` announcement fires at the same moment as the
   focus move — same tick, not delayed to "wait for the fade to look
   finished."
4. The crossfade itself runs independently, purely visually, on whatever
   screens happen to be present in the DOM during the swap (React Router
   unmounts the outgoing screen once its own REFORM fade finishes, or
   immediately if reduced motion is active).

This means a keyboard/AT user experiences **zero added latency** from this
doc's addition — the crossfade is a sighted-user visual smoothing layer
laid on top of an accessibility contract that already resolves instantly,
exactly as `03_UX_ARCHITECTURE.MD` specified it before this doc existed.

## What this doc is not

This doc owns the screen/route transition only — the REFORM/ENTER crossfade,
its timing, and its sequencing relative to focus/live-region behavior. It
does not own per-effect ambient/hover motion (`07_ANIMATION_GUIDELINES.md`),
routing/focus architecture itself (`03_UX_ARCHITECTURE.MD`), or any
accessibility contract beyond the sequencing rule above
(`05_ACCESSIBILITY.MD`).
