# 07. Animation Guidelines

> Written 2026-09-21 (Phase 6). Covers motion **philosophy and per-effect
> timing** only — the screen-transition contract is a separate doc,
> `14_REFORM_MOTION.md`, per this doc set's existing split. **Updated
> 2026-09-23:** that doc's REFORM/ENTER route crossfade is SUPERSEDED (the
> five screens are now stacked scroll sections; nothing mounts/unmounts on
> navigation) — the only shell transition left is the pill's active-state swap,
> see the Home pill-nav bullet below and `14_REFORM_MOTION.md`. Every
> duration/easing value below is read directly from
> `docs/_decoded/*/template.html` (inline `transition:`/`animation:` CSS or
> the per-frame JS driving a `<canvas>`/SVG effect) — none are invented or
> estimated. Where a value could not be found in source, that's stated
> explicitly rather than filled in with a plausible-sounding number.

## No animation library

Confirmed in `06_FRONTEND_STACK.MD`: `package.json` has zero `framer-motion`
dependency. Motion in this project is **CSS custom properties, CSS
`@keyframes`, `<canvas>` + `requestAnimationFrame`, and per-frame-driven SVG**
— never a JS animation library. Every value in this doc is expressed in terms
a build agent implements with those primitives directly, not as props to a
library component.

## The house ease

One cubic-bezier curve, `cubic-bezier(.2,.85,.2,1)`, recurs across every
screen's UI-state transitions — verified independently in four different
decoded templates, not copy-pasted from one and assumed elsewhere:

- Home's nav-list item hover/focus shift: `transform .22s
  cubic-bezier(.2,.85,.2,1), color .22s ease` (`docs/_decoded/index/
  template.html` line 509).
- Profile's chamber dot fusion: `transform .9s cubic-bezier(.24,1.15,.32,1),
  background .7s ease` — note this is a close relative with an
  **overshoot** (`1.15` > 1 in the second control point), used specifically
  for the fusion snap, not identical to the house curve (`docs/_decoded/
  profile-section-v4-standalone/template.html` line 369).
- Contact's dock card lift: `transform .24s cubic-bezier(.2,.85,.2,1),
  box-shadow .24s ease` (`docs/_decoded/contact-section-v2-standalone/
  template.html` line 407, repeated on all 5 cards).
- Projects' repository-pill blob morph: `border-radius .35s
  cubic-bezier(.2,.85,.2,1)` (`docs/_decoded/projects-section-v2-standalone/
  template.html` lines 432, 447).

**Convention for new work:** `cubic-bezier(.2,.85,.2,1)` is this project's
default ease for any discrete UI-state transition (hover, focus, toggle) —
a fast decelerate with no overshoot, matching the "mechanical, not playful"
character these four independent usages already establish. Reach for
Profile's overshoot variant (`cubic-bezier(.24,1.15,.32,1)`) only for an
effect that's specifically about two things *snapping together* (the
fusion metaphor it was built for) — don't apply it generally.

## Per-effect motion specifics

### Home

- Nav-list item shift on hover/focus: `translateX(10px)`, `transform .22s
  cubic-bezier(.2,.85,.2,1), color .22s ease`. Trailing arrow (`→`) opacity
  `0→1` over `.22s ease` (no easing curve given for opacity specifically —
  plain `ease`, not the house cubic-bezier).
- Pill-nav active/inactive background+color swap: `background .2s ease,
  color .2s ease` (`docs/_decoded/index/template.html` line 623) — plain
  `ease`, not the house curve; this is chrome, not content, and reads
  correctly as a slightly softer, less "designed" transition.
  > **Corrected 2026-09-23 (task 8.1, spec `screen-transitions`): the
  > decoded value above was deliberately REPLACED, not ported.** The shipped
  > pill (`.pill-nav__button` in `src/shell/shell.css`) uses `background
  > 120ms` and `color 120ms` on the house ease (`--ease-house`,
  > `cubic-bezier(.2,.85,.2,1)`), with `transition: none` under
  > `prefers-reduced-motion: reduce` (the pill had no reduced-motion handling
  > before). Reason: the REFORM/ENTER route crossfade that owned the 120ms
  > timing was retired when the screens became scroll sections, and the spec
  > redefines that timing as the pill's own active-state transition
  > (`14_REFORM_MOTION.md`). The pill's change is purely visual and never
  > delays scroll or focus. The `.2s ease` figure and the "plain `ease`, not
  > the house curve" rationale above are historical.
- The EN/ES toggle's active/inactive swap has **no transition declared at
  all** in the decoded source — it's an instant background/color swap.
  Carry this forward as-is; don't add easing that isn't in the source for a
  binary two-state toggle.
- Ink Flow Background: no per-frame timing values were recoverable — this
  component was never one of the six decoded mockup slugs (see
  `01_ART_DIRECTION.MD`'s open question). Its only documented contract is
  the prop surface (`ink`, `speed` default `1.3` range `0.2–3`, `ring-gap`
  default `7px` range `4–14`, `animate` boolean) from `docs/_decoded/index/
  template.html`'s `data-props` block — implement its actual per-frame
  motion using that prop surface and this doc's general "mechanical, not
  playful" character, not a recovered timing curve, since none exists to
  recover.

### Profile

- **Ink-bloom canvas** (`requestAnimationFrame` loop, 6 procedurally
  regenerated "bloom" shapes): each bloom's blur radius interpolates as a
  function of its own age `t` (0→1) — outer lobe `blur(3 + 13·t px)` fading
  to `rgba(152,148,134, 0.5·fade)`, inner lobe `blur(1.4 + 5·t px)` fading
  to `rgba(168,164,150, 0.42·fade)` — a soft-focus bloom that sharpens
  slightly then dissolves as it ages, not a fixed-radius shape
  (`docs/_decoded/profile-section-v4-standalone/template.html` lines
  495–510). `mix-blend-mode: exclusion` throughout.
- **Chamber dot fusion** (state-change, not decoration — see
  `05_ACCESSIBILITY.MD`): dot `transform`/`background` on `.9s
  cubic-bezier(.24,1.15,.32,1)` / `.7s ease`; fused-word reveal on `opacity
  .5s ease .2s` (200ms delay) and `transform .6s
  cubic-bezier(.24,1.15,.32,1) .16s` (160ms delay) — the word fades/settles
  in slightly after the dots finish merging, not simultaneously.
- **Ambient chamber wobble/drift** (organic "breathing" `border-radius`
  and position jitter on the dots at rest): three wobble keyframe sets —
  `cellWobA 11s`, `cellWobB 13s`, `cellWobC 9.5s`, all `ease-in-out
  infinite` — and three drift sets — `driftA 13s`, `driftB 16s`, `driftC
  10s`, all `ease-in-out infinite` — deliberately mismatched periods per
  dot so they never fall into visual sync.
- **"Looking for an opportunity" pulse badge:** `livePulse 2.4s
  ease-in-out infinite` — `scale(1)↔scale(1.24)` combined with an organic
  `border-radius` morph (`60% 40% 55% 45%/45% 55% 40% 60%` ↔ `45% 55% 40%
  60%/60% 40% 55% 45%`), i.e. the dot doesn't just pulse in size, its shape
  breathes too.

### Distinctions

- **Cell breathing** (sinusoidal position + weight jitter, computed per
  frame in JS, not CSS keyframes): position jitter
  `x += cos(t·0.37 + phase)·7px`, `y += sin(t·0.31 + phase·1.3)·7px`;
  weight jitter `sin(t·0.55 + phase)` folded into each cell's power-diagram
  weight before re-clipping (`docs/_decoded/distinction-section-v4-standalone/
  template.html` lines 835–844). Three distinct, deliberately non-integer
  frequencies (`0.55`, `0.37`, `0.31` rad/s) so cells never breathe in
  lockstep — same "mismatched periods" principle as Profile's chamber
  wobble/drift above.
- **Doodle stroke "boil":** deterministically noise-perturbed per frame via
  a seeded pseudo-random function (`rnd(i, f, seed)`, not `Math.random()`)
  — reproducible jitter, not true randomness, so the same frame index
  always produces the same offset. This is what makes the crayon mascot's
  lines look hand-redrawn rather than vector-static.
  **Added 2026-09-23:** the five molecular/health doodles
  (`molecularDoodles.ts`) reuse this exact technique and cadence — the same
  seeded noise (`perturbPoints` in `strokeMath.ts`), a new noise frame every
  `floor(t · 7.5)` (1/7.5 s), amplitude 1.3px (the mascot uses 1.1–1.6), 3.2px
  line width — driven by the same single `requestAnimationFrame` loop that
  drives the cells and the mascot (no second loop). Under
  `prefers-reduced-motion: reduce` the noise is dropped and each doodle is a
  frozen resting pose.
- **Lightbox/eye opacity:** `transition: opacity .2s` on both the
  certificate image-slot and the lightbox's blinking-eye character — a
  short, plain-`ease` fade, no house-curve override.

### Projects

- **Card hover lift** is **not** a CSS transition — it's an exponential
  ease-toward-target computed every animation frame:
  `next = current + (target − current) × 0.14`, where `target` is `1` on
  hover-in / `0` on hover-out (`docs/_decoded/projects-section-v2-standalone/
  template.html` line 798). At 60fps this settles to within ~0.2% of target
  in roughly 35–40 frames (~550–650ms) — a smooth decelerating approach
  with no overshoot, driving the card's `translateY` lift, its opacity
  relative to whichever card currently has the hover "peak," the doodle
  arrow's aim point, and the annotation note's reveal, **all off the same
  single lerp value** ("lift + focus are driven here, on the same lerp as
  the doodles, so plate, copy and annotation move as one body" — the
  template's own comment, line 721). Port this as one shared per-card
  spring-like value (a `useRef` + rAF loop, or a small custom hook), not as
  four separate CSS transitions with matched durations — the whole point of
  computing them from one lerp is that they can never drift out of sync.
- **Repository-pill blob morph:** `border-radius .35s
  cubic-bezier(.2,.85,.2,1)` — house ease, the pill's four corner radii
  scramble into an irregular blob shape on hover
  (`62% 38% 55% 45%/45% 60% 40% 55%`) and back.
- **"PROJECTS" stroke-glyph jitter:** per-frame noise-perturbed stroke
  paths (same seeded-noise technique as Distinctions' doodle), redrawn
  continuously — no fixed CSS timing, it's a rAF loop by construction since
  the path data itself is regenerated each frame.

### Contact

- **Magnetic dock:** `transform .24s cubic-bezier(.2,.85,.2,1), box-shadow
  .24s ease` on each card (house ease) smooths the per-frame
  `translateY`/`scale` values a `pointermove`-driven rAF loop computes from
  the Gaussian falloff `f = exp(-(dx² + dy²))` (`dx`/`dy` normalized by
  `dockSpread`, default `260px`, with the `y` axis using `spread × 2.2` —
  i.e. the falloff is **anisotropic**, roughly twice as forgiving
  vertically as horizontally). This is the complete formula, verified at
  `docs/_decoded/contact-section-v2-standalone/template.html` lines
  574–589 — nothing simplified or estimated.
- **GitHub-card-style arrow badges** (all 5 cards' bottom-right "↗"
  circles): `cellWobble 3.2s ease-in-out infinite`, staggered per card by
  `animation-delay` `0s / .4s / .8s / 1.2s / 1.6s` (card index × 0.4s) so
  the five badges wobble out of phase with each other.
- **"Open to work" pulse badge:** `livePulse 2.4s ease-in-out infinite` —
  same curve/shape-morph as Profile's badge above, reused verbatim.

## Off-screen pause

All five screens are mounted at once (`03_UX_ARCHITECTURE.MD`), so a continuous
effect must stop while its section can't be seen. **Pause, never unmount** —
unmounting would break the always-mounted contract (headings, Tab reachability,
scroll landing).

- **Signal:** `useSectionVisible()` (`src/shell/SectionVisibilityContext.tsx`),
  fed by one `IntersectionObserver` in `Shell` (`useSectionVisibility`). It
  defaults to `true` (fail open: a missing signal means "animate", never
  "freeze") and is `false` only while the section is wholly off the viewport.
  The observer's root margin is slightly **negative** (`-4px` top/bottom):
  900px sections in a 900px viewport touch their neighbours' edges, and a
  touching neighbour would otherwise count as visible. It is not
  `activeSection` (one section under the midline): mid-scroll two sections are
  visible and both keep animating.
- **rAF loops:** gate the effect — `if (!visible) return;` after the
  reduced-motion branch, `visible` in the deps. **If the effect's output
  depends on its deps (section height, colours), paint once before returning
  while hidden:** in motion mode nothing else paints while paused, so a
  resize off-screen would otherwise leave stale geometry
  (`CrayonMascot` paints its resting pose; `VoronoiCellField` paints at the top
  of every run). State that must survive a pause lives in a ref, not in the
  effect (`InkBloomCanvas`'s blooms, `VoronoiCellField`'s clock origin), so
  resuming is invisible.
- **CSS keyframes:** `Shell` sets `data-offscreen` on a hidden section and
  `shell.css` pauses every animation inside it (`animation-play-state`).
- **A new continuous effect follows this rule.** The per-loop contract is
  `src/pages/loopVisibility.test.tsx`; add the new owner to its list.

## `prefers-reduced-motion` governance

This doc states timing; `05_ACCESSIBILITY.MD` states the fallback contract
per effect (the summary table there is the source of truth for what "reduced
motion" resolves to for each of the 5 effects above). The general rule that
applies to every rAF loop and every `@keyframes` rule in this section: check
`matchMedia('(prefers-reduced-motion: reduce)').matches` (and its `change`
event) before starting continuous/ambient motion, and prefer a CSS
`@keyframes` rule over a JS/rAF loop wherever the effect allows it, precisely
because a CSS `@keyframes` animation is stopped by an
`@media (prefers-reduced-motion: reduce) { animation: none }` override in a
way a hand-rolled JS loop is not automatically — this is also why
`06_FRONTEND_STACK.MD` cites `src/pages/home/InkFlowBackground.tsx`
as the precedent for preferring CSS where the effect doesn't
strictly need per-frame pixel control (Profile's ink-bloom canvas and
Projects' stroke-glyph jitter do need it — genuine per-frame regeneration —
and must implement their own explicit reduced-motion short-circuit instead).

## What this doc is not

This doc owns per-effect timing/easing values and the "mechanical, not
playful" house-ease convention. It does not own the accessibility contract
per effect (decorative-vs-real classification, keyboard behavior — that's
`05_ACCESSIBILITY.MD`), each effect's component/prop/state-machine contract
(`04_COMPONENT_RULES.MD`), or the pill nav's active-state transition (`14_REFORM_MOTION.md`; the
former screen-to-screen route-change transition no longer exists).
