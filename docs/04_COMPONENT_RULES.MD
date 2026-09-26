# 04. Component Rules

> Rewritten 2026-09-21 from the decoded mockup and the pre-reset reference
> implementations the approved reset plan said to reuse as precedent
> (since ported into `src/pages/**`). Every contract below cites the specific
> decoded template line/behavior or shipped file it's derived from —
> this doc does not invent new component boundaries, it documents the ones
> the plan already fixed and adds the detail needed to build against them.

## Page / subfolder pattern

One page component per screen, matching the five sections in
`03_UX_ARCHITECTURE.MD` (**Updated 2026-09-23:** "routes" became stacked scroll
sections — there is no router; `src/App.tsx` maps `PageId` to these
components and `src/shell/Shell.tsx` mounts all five at once). Each page's
root is a plain `<div>` (not `<main>`; the shell owns the one `<main>` and
wraps each page in a named `<section>`) carrying an explicit
`min-height: 900px` design floor, never `height`:

```
src/pages/Home.tsx
src/pages/Profile.tsx
src/pages/Distinctions.tsx
src/pages/Projects.tsx
src/pages/Contact.tsx
```

Local, screen-specific pieces live in a same-named lowercase subfolder next
to the page, never inside a shared/generic `components/` bucket. Verified
precedents (shipped files under `src/pages/`):

- `src/pages/profile/Chamber.tsx`, `src/pages/profile/ProfileInkField.tsx`,
  `src/pages/profile/profile.css`
- `src/pages/contact/Dock.tsx`, `src/pages/contact/useMagneticDock.ts`,
  `src/pages/contact/contact.css`
- `src/pages/distinctions/ScanModal.tsx`, `src/pages/distinctions/distinctions.css`
- `src/pages/projects/ProjectCard.tsx`, `src/pages/projects/projects.css`
- `src/pages/home/InkFlow.tsx`, `src/pages/home/Hero.tsx`, `src/pages/home/home.css`

Distinctions' lightbox already has a named placeholder,
`src/pages/distinctions/ScanModal.tsx` — **extend it, don't rewrite it.** Its
existing contract (focus-trapped `role="dialog"`, `Escape` closes, focus
moves to the close button on open, Tab cycles within the dialog) is exactly
what the decoded Voronoi cells need on the other end of the interaction (see
below) and should not be re-derived from scratch.

## The three-way effect-placement rule

Every custom visual/interactive effect in this rebuild falls into exactly one
of three buckets. Pick the bucket by what the effect actually *is*, not by
habit:

1. **Canvas/SVG effect tightly coupled to one component → component-internal
   `ref` + `useEffect`, with a `prefers-reduced-motion` short-circuit.**
   **Honest caveat, checked against both pre-reset candidates:**
   `src/pages/home/InkFlow.tsx` and `src/pages/profile/ProfileInkField.tsx`
   are the two decorative-background components that actually shipped in the
   old build, and **neither is a `ref`+`useEffect` canvas example** — both
   are CSS-only (absolutely-positioned `<span>` layers animated via
   `@keyframes`, `ProfileInkField.tsx` additionally using an inline
   zero-size `<svg>` goo `<filter>` referenced via CSS `filter: url(...)`,
   not a canvas). Both files' own comments explain why CSS was chosen over a
   JS-driven effect for their case: no per-frame pixel control or canvas
   readback needed, CSS compositing is cheaper, and a CSS `@keyframes` rule
   is genuinely stopped by `prefers-reduced-motion` in a way a JS or SMIL
   loop isn't automatically. **Bucket 1 therefore has no shipped canvas
   precedent in this codebase.** The mockup's real effects this bucket must
   cover — Home's `dc-import name="Ink Flow Background"` (props
   `ink`/`speed`/`ring-gap`/`animate`, never decoded as one of the six
   slugs) and Profile's canvas-based ink-bloom particle system (`<canvas>`,
   `mix-blend-mode: exclusion`, a real `requestAnimationFrame` loop per
   `01_ART_DIRECTION.MD`) — are more elaborate than what previously shipped.
   Per the plan's "full visual/interaction fidelity, not simplified"
   mandate, building these for real will likely require an actual
   canvas+`ref`+`useEffect` implementation, not a CSS-only simplification
   modeled on `InkFlow.tsx`/`ProfileInkField.tsx`. The *placement* rule
   still holds regardless of technique — it's one component's own effect,
   so it owns its `ref`+`useEffect` (or CSS-only markup, if a future
   implementer determines that's sufficient for a given effect) internally
   rather than exposing a hook — but don't cite the two pre-reset files as
   proof a canvas is unnecessary; they simply never attempted one.
   **Corrected 2026-09-21:** Home's Ink Flow Background did turn out to be a
   CSS-only exception, once actually found — it's a nested `ext_resources`
   entry inside `main-page-standalone`'s manifest (`decode-mockup.mjs` writes
   such entries out as an opaque `.html` asset, which nobody had opened), and
   its real source is plain layered CSS (SVG turbulence/displacement filters,
   masked/blended `repeating-radial-gradient` dot rings, `@keyframes`), no
   canvas or `requestAnimationFrame` at all. `InkFlowBackground.tsx` is
   render-only plus `useId()` for filter-id scoping — no `ref`/`useEffect`
   needed, unlike this paragraph's prediction. Profile's ink-bloom remains a
   real canvas per this paragraph's original reasoning.
2. **Reusable/testable interaction logic → custom hook, component stays
   render-only.** Implemented by `src/pages/contact/useMagneticDock.ts`, consumed
   by `src/pages/contact/Dock.tsx`. The hook owns a `containerRef` and a
   `cardRefs` array, listens for `pointermove`/`pointerleave` on the
   container, and writes `transform` directly to each card's DOM style
   (not via `setState`) — deliberate, per the file's own comment, because
   this is "a continuous, non-committing hover effect" and a re-render per
   mousemove frame would be wasted work. `Dock.tsx` itself contains zero
   effect logic; it only maps data to elements and attaches the refs the
   hook gives it.
3. **Pure computation → a plain, DOM-free TS module, consumed by a
   render-only component.** No pre-reset file demonstrates this one
   directly (the old build didn't yet have a real Voronoi implementation),
   but the plan names the target explicitly: `src/pages/distinctions/voronoi.ts`
   for the weighted-Voronoi half-plane-clipping math. Keeping it as a plain
   module with no React/DOM dependency is what makes it unit-testable
   without a browser environment.

### Placement examples added by `continuous-scroll-and-doodles` (2026-09-23)

The height-fluid / scroll-shell work produced more instances of the three
buckets. Each is classified by what it actually is, not by where it happens
to be exported from — several are **pure functions exported next to a hook**,
which is the usual, deliberate way to make a hook's math testable without a
browser rather than a fourth bucket:

- **Bucket 2 (hook, render-only consumer), with the math extracted as a pure,
  DOM-free function exported from the same module and unit-tested on its
  own:**
  - `useStageScale` (`src/shell/useStageScale.ts`) + `computeStageScale(width)
    = width / 1440` (width only, uncapped; never viewport height).
  - `useMagneticDock` (`src/pages/contact/useMagneticDock.ts`) +
    `computeMagneticFalloff(pointer, cardCenter, containerHeight = 900)` (the
    per-card Gaussian falloff; the vertical spread scales with the section's
    real height, bit-for-bit identical at 900).
  - `useNavFocusCycle(itemCount, enabled)` (`src/pages/home/`) — `enabled`
    re-creates the old "only while Home is mounted" scope now that Home is
    always mounted.
  - `useActiveSection`, `useHashNavigation` (`src/shell/`) — hooks that own an
    `IntersectionObserver` / the `popstate`+`hashchange` listeners; the
    shell's single `navigateToSection` function is injected into
    `useHashNavigation` so the hook decides only *when* to navigate.
  - `useLayerHeight` (`src/pages/projects/useLayerHeight.ts`) — a hook
    (`useLayoutEffect` + `ResizeObserver` on `clientHeight`, *not*
    `getBoundingClientRect`, which includes the shell's scale) that hands the
    Projects SVG layers their real design-space height.
- **Bucket 3 (plain DOM-free module, render-only consumer):**
  - `perturbPoints` (`src/pages/distinctions/strokeMath.ts`, the seeded-noise
    point perturbation extracted from the mascot builder and reused by the
    molecular doodles), `computeLabelSizing(height)` (`labelSizing.ts`),
    `computeCellPolygons(seeds, height, gap)` (`voronoi.ts`),
    `molecularDoodles.ts` + `doodleFrame.ts` (per-frame path data for the
    doodles), `projectsLayout.ts` (`layerViewBox`, `resolveLayerHeight`,
    `ambientY`), `src/shell/sectionHash.ts` (`sectionHash`, `pageIdFromHash`).
  - **`ambientY(designY, height) = designY * height / 900` exists twice** —
    in `src/pages/distinctions/voronoi.ts` and in
    `src/pages/projects/projectsLayout.ts` (Projects kept its own
    `ambientY`/`DESIGN_HEIGHT` copy rather than importing across screens).
    Same rule, two definitions: a recorded, deferred cleanup (verify item
    S1), not a design intent.
- **Bucket 1 (component-internal), no hook:** Home's `ringHeight()` inside
  `InkFlowBackground.tsx` (fixed-px ring heights instead of container %),
  and the Distinctions doodle layer's `DoodleLayer.tsx`, which is
  render-only (an SVG path pool) — its per-frame writes come from the
  existing `VoronoiCellField` rAF loop, not a second effect.

## Effect contracts

### Home — Ink Flow Background

- **Bucket:** component-internal effect (bucket 1 above) — render-only CSS/DOM
  (`src/pages/home/InkFlowBackground.tsx` + `home.css`), not canvas; see the
  2026-09-21 correction on bucket 1 above.
- **Decorative only, no exceptions.** Per the CLAUDE.md decorative-animation
  pattern, it must be fully `aria-hidden`, never a tab stop, and — since this
  is a persistent ambient background rather than an intro/sting — the
  "dismiss on any keypress" clause doesn't apply the way it does to a
  one-shot intro animation, but the "never partially decorative" rule still
  does: nothing inside it may carry real information.
- **Props to own** (per the decoded `data-props` block): an ink/accent color,
  a speed value, a ring-gap value, and an `animate` boolean. `animate` must
  be forced `false` (or the component must render a static frame) under
  `prefers-reduced-motion: reduce`.
- **Real content lives outside it, already.** The "Kevin." wordmark, the
  EN/ES toggle, and the numbered nav list are all plain accessible markup
  layered on top of this background in the decoded template — this already
  satisfies "the host page's real content must independently carry the same
  information," so don't let a future rewrite accidentally move any of that
  text *inside* the decorative layer.
- **Resolved 2026-09-21 (was an open risk, see `02_DESIGN_SYSTEM.MD` Fix 1):**
  the headline/nav text's default ink color (`#14150f`) had ~1.05:1 contrast
  against the raw page background (`#0e0f0b`) with no backdrop — readable
  only if this component always painted a lighter region under the text,
  which was never guaranteed. The accessibility phase resolved this with a
  backdrop-independent fix instead of a component guarantee: Home's default
  text/UI color changed to `#f3f2ef` (≈17.18:1 against `#0e0f0b`), so real
  content is legible with this component absent, unloaded, static-framed, or
  reduced-motion-disabled. Full rationale: `05_ACCESSIBILITY.MD`'s Home
  worked example; corrected values: `02_DESIGN_SYSTEM.MD`.

### Profile — ink-bloom canvas

- **Bucket:** component-internal effect (bucket 1), canvas-based rather than
  CSS — this is a `requestAnimationFrame` particle system (7–14
  noise-perturbed lobes per blob, procedurally regenerated), not a fixed
  keyframe loop, so it needs a real canvas and per-frame JS, unlike Home's
  simpler CSS layers.
- Renders with `mix-blend-mode: exclusion` over Profile's diagonal
  paper→dark gradient.
- **Decorative only** — `aria-hidden`, no focus, `prefers-reduced-motion`
  short-circuits to either a static frame or no canvas at all.

### Profile — goo-filter chambers

- **Bucket:** none of the three placement buckets, deliberately — this is
  **functional UI**, not a decorative effect, and must not be built like one.
- **Verified state machine** (matches both the decoded template's `status`
  field and the shipped `src/pages/profile/Chamber.tsx` exactly):
  `'separate' | 'binding' | 'bonded'`.
- **Contract, as implemented by `Chamber.tsx`:**
  - Props: `chamber` (data: index, dot labels, fused word), `state`
    (`ChamberState`), `onEnter`, `onLeave`, `onToggleBonded`.
  - Markup: `role="button"`, `tabIndex={0}`, `aria-pressed={state === 'bonded'}`.
  - Interaction: `onPointerEnter`/`onFocus` → `onEnter`; `onPointerLeave`/`onBlur`
    → `onLeave`; `onClick` → `onToggleBonded`; `onKeyDown` handles `Enter` and
    `' '` (Space) → `preventDefault()` + `onToggleBonded()`.
  - Rendering: shows the separate dot labels (`chamber.dots.join(' · ')`)
    unless `state === 'bonded'`, in which case it shows the fused word
    (`chamber.fused`).
  - **This must stay real, keyboard-operable UI in the React port** — the
    decoded template confirms the same three-state model server-side
    (`status: locked ? 'bonded' : on ? 'binding' : 'separate'`), so this was
    never meant to be a hover-only decorative flourish.
- **The SVG goo filter is shared, not per-chamber.** One `<filter id="profileGoo">`
  (`feGaussianBlur` + `feColorMatrix`) is defined once at the Profile page
  level (matching the decoded template's single `<svg>` `<defs>` block); each
  `Chamber` applies it via CSS `filter`, it does not own or duplicate the
  filter definition itself.

### Distinctions — Voronoi cell field + lightbox

- **Bucket:** pure module (bucket 3) for the geometry, render-only component
  for the cells, existing precedent component for the lightbox.
- `src/pages/distinctions/voronoi.ts` (or equivalent) owns: seed points with
  per-cert weights in px² (the plan's example: `title: 30000`,
  `anfeca: 15000`, down to `aiinit: 8500`), the additively-weighted
  Voronoi/"power diagram" half-plane clipping, breathing (sinusoidal
  position/weight jitter), and corner-rounding derived from each corner's
  actual joint angle. No DOM access — plain data in, path data out.
- **Cells are real interactive targets, not decorative shapes.** Verified
  directly from `docs/_decoded/distinction-section-v4-standalone/template.html`:
  each cell is an SVG `<path role="{{c.role}}" tabindex="{{c.tab}}"
  aria-label="{{c.aria}}" onMouseEnter/onMouseLeave/onFocus/onBlur/onClick
  onKeyDown="{{keyOpen}}">`. The render-only cell-field component must
  reproduce this exactly: a real `role`, a real `tabindex`, a real
  `aria-label` per cell, and a keydown handler that opens the same way a
  click does — not just a `<path>` with a `cursor:pointer` style and a click
  handler.
- **The lightbox is `ScanModal.tsx`, extended.** Confirmed contract from
  `src/pages/distinctions/ScanModal.tsx`: `role="dialog"
  aria-modal="true"`, focus moves to the close button on mount, `Escape`
  calls `onClose`, `Tab`/`Shift+Tab` are trapped within the dialog's own
  focusable elements (computed live via
  `querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')`),
  and clicking the overlay outside the dialog also closes it (click on the
  inner dialog stops propagation). The decoded template confirms the same
  gate (`if (!id || this.props.lightbox === false) return;`) — this is a
  real, keyboard-dismissable modal, not a bare image popup.
- **The crayon-mascot doodle overlay (arrow + blinking eyes) is decorative
  only** — it reacts to the same hover state as the cells (pointing at
  whichever cell is hovered) but must be `aria-hidden` and must never itself
  become a tab stop, per the CLAUDE.md decorative-animation pattern.
- **The molecular / health doodles (added 2026-09-23) share that contract.**
  DNA helix, flask, molecule, pill capsule, microscope
  (`molecularDoodles.ts`, bucket 3; `doodleFrame.ts` builds mascot + spores +
  molecular strokes from one clock; `DoodleLayer.tsx` is the render-only SVG
  path pool, bucket-3 consumer) are point arrays, one continuous
  noise-perturbed stroke each, reusing `strokeMath.ts` — not binary assets
  and not a new perturbation algorithm. `DoodleLayer` must be `aria-hidden`,
  `focusable="false"`, have no `tabindex`/interactive descendants, and be
  `pointer-events: none`; the worked example is in `05_ACCESSIBILITY.MD`.
  Its viewBox is exactly `1440 x <measured height>` (so `xMinYMin meet` is a
  1:1 mapping) and every coordinate the layer emits must be height-aware
  (`ambientY`/`yFraction`) or an SVG clip at heights below ~838 would hide it.
- **The lightbox is portaled (2026-09-23).** `ScanModal` renders through
  `createPortal(..., document.body)` (a `position: fixed` overlay inside the
  transformed stage would be positioned against the stage) at `z-index: 9100`,
  above the fixed pill nav (`9000`); see `05_ACCESSIBILITY.MD`.

### Projects — stroke-glyph title

- **Bucket:** pure module for the glyph stroke data + noise jitter (a
  `GLYPHS` per-letter dictionary of stroke skeletons, matching the decoded
  template's own constant name), render-only SVG component to draw it.
- **Decorative lettering, not real text** — the word "PROJECTS" is assembled
  from single-stroke SVG paths that redraw with jitter every frame, so a
  screen reader gets nothing from the SVG itself. Per the CLAUDE.md pattern,
  pair it with a real accessible heading carrying the same content (e.g. a
  visually-hidden `<h1>Projects</h1>`, or an `aria-label` on the SVG's
  containing group) — do not rely on the glyph paths alone to convey the
  section title.
- The shared crayon mascot reappears here (per the decoded template's own
  comment, "Shared crayon character from Distinction v4 — same guy, same
  proportions") pointing at whatever project card has hover focus — same
  decorative-only contract as on Distinctions.

### Contact — magnetic dock

- **Bucket:** custom hook (bucket 2) + render-only component —
  `src/pages/contact/useMagneticDock.ts` + `src/pages/contact/Dock.tsx`.
- **Hook shape and math (`useMagneticDock.ts`).** `useMagneticDock(cardCount)`
  returns `{ containerRef, cardRefs }` and writes directly to each card's
  `style.transform`/`zIndex` on `pointermove`/`pointerleave` (rAF-batched),
  with no `setState` in the hot path. The math is a **per-card Gaussian
  falloff**, not a flat parallax: `computeMagneticFalloff` computes `dx`/`dy`
  from each card's *own* center and returns `f = exp(-(dx² + dy²))`, with an
  anisotropic spread (`dy` is divided by `spread × 2.2`, and that vertical
  spread is scaled by the container's real height over the 900px baseline it
  was tuned at). `f` drives both a `translateY` lift and a `scale`, so cards
  near the cursor are pulled and grow while distant ones barely move
  (`01_ART_DIRECTION.MD`, verified against the decoded template). The pointer
  is converted back into the dock's unscaled coordinate space before the
  falloff is computed, so it stays correct at any `--stage-scale`. Under
  `prefers-reduced-motion` the `pointermove` listener is never attached at
  all, so reduced-motion users get static cards instead of a
  suppressed-but-still-computed effect.
- **Component contract:** `Dock.tsx` stays render-only — it maps channel
  data (Email, GitHub, WhatsApp, LinkedIn, Book a call) to real `<a href>` or
  `<button>` elements (a `disabled` channel renders as a real disabled
  `<button>`, not a styled-to-look-disabled link), attaches each element's
  ref into `cardRefs`, and renders index/label/sub-label spans. **These are
  functional links, not decorative surfaces** — the magnetic-pull hover is
  an enhancement layered on top of always-real, always-focusable elements,
  never a substitute for them.
- The corner-bracket "reticle" motif on each card is pure CSS decoration
  (four absolutely-positioned bordered spans) — `aria-hidden`, no component
  logic of its own.
