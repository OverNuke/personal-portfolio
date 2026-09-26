# 05. Accessibility

> Written 2026-09-21 (Phase 6 of the rebuild). This is a full rewrite — the
> prior `05_ACCESSIBILITY.MD` was deleted in the reset and was **not** read to produce
> this doc (off-limits per this batch's instructions). What follows is derived
> from two sources only: (1) the decorative-animation pattern as currently
> described in this repo's own root `CLAUDE.md` ("Key architectural decisions
> to know before touching UI code"), and (2) direct inspection of the decoded
> mockup templates under `docs/_decoded/*/template.html`. Scope is WCAG 2.2
> AA, matching this project's stated target elsewhere in the doc set.
>
> Cross-references: `02_DESIGN_SYSTEM.MD` owns the actual hex values and
> contrast math (including the 3 corrected pairings restated below);
> `03_UX_ARCHITECTURE.MD` owns the pill-nav/hash-deep-link/keyboard-navigation
> model (there is no routing since 2026-09-23) this doc's keyboard rules must
> stay consistent with; `04_COMPONENT_RULES.MD`
> owns each effect's component contract (props, state machine, bucket
> placement) — this doc owns *why* each effect is accessible or not, and the
> concrete a11y contract layered on top of those component contracts.

## The Decorative / Auto-Playing Animations pattern

This is the project's one non-negotiable pattern for any effect that moves on
its own without a user action driving it. Restated here in full since this
doc is the canonical home for it going forward (CLAUDE.md's copy now points
here):

1. **Fully `aria-hidden`, never partially.** A rapidly auto-cycling or
   continuously-animating decorative layer has no coherent screen-reader
   translation. The entire decorative subtree gets `aria-hidden="true"` — not
   just the moving parts, not "except this one label," all of it. There is no
   such thing as a 90%-decorative animation for this purpose.
2. **Never a tab stop.** Nothing inside a decorative layer receives
   `tabindex`, and nothing inside it can be reached via Tab. If part of an
   effect *is* meant to be reachable (an interactive control layered visually
   over or beside it), that part is a real, separate, non-`aria-hidden`
   element — not a hole punched in the decorative tree.
3. **Dismissed on any keypress — for one-shot intro/sting animations.** This
   clause is specifically for animations that play once and are meant to be
   skippable (an intro reveal, a section sting). A persistent ambient
   background that runs for as long as its host screen is mounted (Home's Ink
   Flow Background, Profile's ink-bloom canvas) is not a one-shot intro, so
   "dismiss on keypress" doesn't literally apply to it — but the "never
   partially decorative" and "never a tab stop" clauses still do,
   unconditionally, for every decorative effect regardless of whether it's
   one-shot or ambient.
4. **The host page's real content must independently carry the same
   information, in real accessible markup — not inside the decorative
   layer.** If an intro animation contains a name and role, the actual page
   must also have that name and role as real DOM text, reachable without ever
   seeing or running the animation. A decorative effect can never be the only
   place information lives.

> **Added 2026-09-23 — always-mounted screens.** "For as long as its host
> screen is mounted" used to mean "while that screen is the one showing".
> With the continuous-scroll shell (`03_UX_ARCHITECTURE.MD`) all five
> screens are mounted at all times, so every decorative loop below — Home's
> ink flow, Profile's ink-bloom canvas (the goo chambers are functional UI,
> not decorative, but their ambient wobble also runs off-screen), Distinctions'
> Voronoi + doodle layer, Projects' mascot and glyph title, Contact's dock —
> runs whether or not its section is on screen. The accessibility clauses are
> unaffected (still fully `aria-hidden`, never a tab stop, real content
> independent). The cost is performance, not a11y: it is **unmeasured**, and
> nothing pauses off-screen loops today; pausing loops for sections outside
> the viewport is a recorded candidate follow-up, not shipped behavior.
> Under `prefers-reduced-motion: reduce` the same per-effect fallbacks apply
> to all five simultaneously.

The rest of this doc is that pattern applied, effect by effect, to the five
new decorative or partially-decorative effects this rebuild introduces.

## Worked examples, one per screen

### Home — Ink Flow Background

- **Decorative subtree:** the entire `dc-import name="Ink Flow Background"`
  canvas/animation layer (`docs/_decoded/index/template.html` line ~492),
  positioned `position:absolute;inset:0;z-index:0` behind Home's real content.
  Gets `aria-hidden="true"`, is never a tab stop, and carries zero information
  of its own — it is pure ambient ink motion, not a status indicator, not a
  progress signal, nothing a screen reader user would need translated.
- **Real content is already separate, and now independently legible.** The
  "Kevin." wordmark, the EN/ES toggle, and the numbered nav list
  (`Who me? / Distinction / Projects / Reach out`) are plain `<h1>`/`<a>`/
  `<div>` markup layered on top of the decorative canvas at `z-index:10` — this
  already satisfies "real content lives outside the decorative layer," and
  nothing about this rebuild should move any of that text *inside* the Ink
  Flow Background component.
- **No dependency, once corrected (Fix 1 retired 2026-09-21):** an earlier
  pass flagged this real content's default ink (`#14150f`) as sitting on the
  raw `#0e0f0b` page background at ≈1.05:1, and "fixed" it to `#f3f2ef`. That
  assumed the Ink Flow Background's own composited surface, unknown at the
  time. It's since been decoded (a nested `ext_resources` entry, not one of
  the six top-level slugs — see `02_DESIGN_SYSTEM.MD`'s "Fix 1 — RETIRED" and
  `04_COMPONENT_RULES.MD`'s matching note) and is a fully **opaque** cream
  paper (`#f6f4ea`) layer sitting *between* the shell background and the
  text. Against that real surface the decoded literal `#14150f` is ≈16.6:1 —
  no fix was ever needed, and `#f3f2ef` is no longer used on this screen.
  The underlying principle stands regardless: real content must never be
  *allowed* to depend on a decorative, `aria-hidden`,
  `prefers-reduced-motion`-short-circuitable layer for its contrast — it
  just turns out this one never did, once its real surface was known.
- **`prefers-reduced-motion`:** the component's `animate` prop (default
  `true`, per its `data-props` block: `editor:"boolean"`) must be forced to a
  static single frame under `prefers-reduced-motion: reduce`, per
  `04_COMPONENT_RULES.MD`'s existing contract for this prop. Because Fix 1
  makes real text contrast independent of the animation's paint state, the
  reduced-motion fallback carries zero legibility risk — this was not
  previously guaranteed and now is.

### Profile — ink-bloom canvas + goo-filter chambers

Two effects, two different accessibility treatments — do not conflate them.

- **The `<canvas>` ink-bloom backdrop is fully decorative.** It's a
  `requestAnimationFrame` particle system (6 procedurally-regenerated
  "bloom" shapes, `mix-blend-mode:exclusion`, `docs/_decoded/
  profile-section-v4-standalone/template.html` lines ~460–510) rendered
  behind the chamber UI. `aria-hidden="true"`, never a tab stop, carries no
  information — it is atmosphere over the paper→dark gradient, not a status
  signal.
- **The 4 chambers are real, keyboard-operable UI — not decorative, and must
  stay out of the `aria-hidden` tree entirely.** Verified against both the
  decoded template's `status` field and the shipped `Chamber.tsx`
  cited in `04_COMPONENT_RULES.MD`: each chamber is
  `role="button" tabIndex={0} aria-pressed={state === 'bonded'}`, with a
  real three-state machine (`'separate' | 'binding' | 'bonded'`). This is a
  skill-tag "fusion" interaction — separate dot labels merge into one fused
  word (e.g. three language dots → "Anywhere") — and a screen reader user
  must be able to reach, activate, and perceive the result of that fusion
  exactly as a mouse user does:
  - `Tab` reaches each chamber in document order (real focus, not simulated).
  - `Enter` or `Space` toggles `bonded` state (`onKeyDown` calls
    `preventDefault()` then the same handler `onClick` uses — no separate,
    weaker keyboard path).
  - `aria-pressed` reflects `state === 'bonded'` so assistive tech announces
    the fused/unfused state correctly, matching what's visually shown
    (separate dot labels vs. the fused italic-serif word).
  - The shared `<svg><filter id="profileGoo">` the chambers apply via CSS
    `filter` is itself non-interactive def-only markup — it renders nothing
    on its own and needs no `aria-hidden` (it has no box to hide; the filter
    reference lives on the chamber elements, which are already correctly in
    the accessible tree).
- **`prefers-reduced-motion`:** the ink-bloom canvas must short-circuit to
  either a static single frame or no canvas at all (per
  `04_COMPONENT_RULES.MD`'s bucket-1 contract). The chambers' own dot-fusion
  transition (`transform .9s cubic-bezier(.24,1.15,.32,1)`, fused-word reveal
  `opacity .5s ease .2s, transform .6s cubic-bezier(.24,1.15,.32,1) .16s`,
  breathing `cellWob*`/`drift*` keyframes) is a **state-change animation on
  functional UI**, not ambient decoration — under reduced motion it must
  collapse to an instant or near-instant state swap (no eased transform,
  keyframe wobble/drift removed) rather than disappearing, because the
  fusion result itself is the information being conveyed, not the motion
  toward it.

### Distinctions — Voronoi cell field + doodle overlay + lightbox

- **The crayon-mascot doodle overlay is fully decorative.** The hand-drawn
  arrow + blinking-eyes character (`GUY_BODY`/`GUY_EAR_L`/`GUY_EAR_R`/
  `GUY_ARM` point arrays, deterministically noise-perturbed per frame) reacts
  to whichever cell is hovered but conveys no information a screen reader
  user needs — the cell it's "pointing at" is already independently
  identified by that cell's own `aria-label`. `aria-hidden="true"`, never a
  tab stop, regardless of how much visual attention it draws.
- **The molecular / health doodles are fully decorative — same contract as
  the mascot, worked example (added 2026-09-23,
  `continuous-scroll-and-doodles`).** Five hand-drawn strokes — DNA helix,
  flask, molecule, pill capsule, microscope
  (`src/pages/distinctions/molecularDoodles.ts`, driven per frame by
  `doodleFrame.ts`, rendered by `DoodleLayer.tsx`) — are atmosphere: they
  carry no information a screen-reader user needs, and they are not the only
  place any information lives (the certificates are the real cells and their
  labels, below). The whole layer is one `<svg>`, checked against the code:
  - `aria-hidden="true"` on the `<svg>` itself — the entire subtree, not just
    the moving paths — plus `focusable="false"` (the legacy IE/Edge quirk
    where an SVG root can take focus).
  - No `tabindex` anywhere in the layer and no interactive descendants at all
    (only pooled `<path>`s, `fill="none"`, drawn imperatively by the shared
    animation loop); it can never become a tab stop.
  - `pointer-events: none` on `.distinctions-doodle-svg`
    (`distinctions.css`), so it never intercepts hover/click/keyboard
    interaction on the cells beneath it. It is a sibling overlay above the
    cells and label layer, not a wrapper around anything interactive.
  - **Reduced motion:** under `prefers-reduced-motion: reduce` the animation
    loop is not started; `paint(0, false)` draws each doodle once with the
    noise dropped — a frozen, noise-free resting pose (no boil). Doodle
    geometry is deterministic (seeded noise), not random.
  - **Real content is independent.** The certificate cells keep their real
    `role="button"`, `tabindex`, and per-cell `aria-label`; the label text
    ("number / title / meta") is real DOM text. The doodles are placed in
    the corridor between label rows so they don't cover any certificate
    label (asserted by `molecularDoodles.test.ts` at 700/800/900/1100/1400px).
  - **Verified in a real browser (Phase 6 probe, 2026-09-23):** at 700/900/1400
    with motion on and off the layer's `aria-hidden` is `true`,
    `pointer-events` is `none`, 0 descendants carry `tabindex`, and the
    accessibility snapshot of the section contains only the 9 "Open scan"
    cell buttons and the heading — no doodle appears. Unit-level guards:
    `DoodleLayer.test.tsx`, `VoronoiCellField.test.tsx`.
  - **No contrast pairing is claimed or added** for the doodle ink
    (`#e0452b`, resolved by `VoronoiCellField.tsx`): it is decorative and
    non-informational, so it is not part of the contrast tables in
    `02_DESIGN_SYSTEM.MD`.
- **The cells themselves are real interactive targets, not decorative
  shapes.** Verified directly from `docs/_decoded/
  distinction-section-v4-standalone/template.html` line ~395: each cell is
  an SVG `<path role="{{c.role}}" tabindex="{{c.tab}}" aria-label="{{c.aria}}"
  onMouseEnter/onMouseLeave/onFocus/onBlur/onClick onKeyDown="{{keyOpen}}">`.
  The React port must reproduce every one of those attributes literally — a
  real `role`, a real `tabIndex`, a real per-cell `aria-label` (naming the
  certificate, not just "cell 3"), and a keydown handler
  (`keyOpen = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.open(e); } }`,
  confirmed verbatim in the decoded script) that opens the lightbox
  identically to a click. A `<path>` with only a `cursor:pointer` style and a
  click handler is **not** an acceptable port of this contract.
- **The lightbox (`ScanModal.tsx`, extended per `04_COMPONENT_RULES.MD`) is a
  real, keyboard-dismissable modal**, confirmed against both the shipped
  component's contract and the decoded template's own gate
  (`if (!id || this.props.lightbox === false) return;`, line ~828):
  - `role="dialog" aria-modal="true"` on the dialog surface.
  - Opens with focus moved to the dialog's own close button
    (`aria-label="Close scan viewer"`, decoded line ~502) — not to the
    dialog root, not left on the triggering cell.
  - `Escape` closes it (`this.onKey = (e) => { if (e.key === 'Escape')
    this.close(); }`, decoded line ~864).
  - `Tab`/`Shift+Tab` are trapped within the dialog's own focusable elements,
    computed live via `querySelectorAll('button, [href],
    [tabindex]:not([tabindex="-1"])')` — focus never silently escapes to the
    page behind it while open.
  - **On close, focus returns to the triggering cell** — the cell that
    opened the lightbox, not the top of the document and not wherever focus
    happens to land by default. Restore-on-close only (nothing moves focus
    on open beyond the close button below) — the modal analogue of the shell's
    explicit-activation focus rule.
  - Clicking the overlay outside the dialog also closes it; a click on the
    dialog itself stops propagation so it doesn't self-close.
  - **Portal and stacking (added 2026-09-23, verified in
    `ScanModal.tsx` / `distinctions.css`).** Because the whole stage is a
    CSS-transformed element, a `position: fixed` overlay rendered inside it
    would be positioned against the stage, not the viewport. The dialog is
    therefore rendered with `createPortal(..., document.body)`, so it sits in
    the root stacking context, outside `.stage`. Its overlay is
    `z-index: 9100`, deliberately **above the fixed pill nav (`9000`)**: at
    the earlier `z-index: 40` the scrim rendered *under* the nav, so a pill
    could be clicked (and the page scrolled away) while an `aria-modal`
    dialog was open. Verified with a browser probe: `elementFromPoint` over
    the pill hits the overlay, and Escape restores focus to the trigger cell.
    Note the rest of the page is not made `inert` while the dialog is open;
    the focus trap and the overlay are what contain interaction.
- **`prefers-reduced-motion`:** the Voronoi field's own sinusoidal
  "breathing" (position jitter via `Math.cos(t*0.37+phase)*7`,
  `Math.sin(t*0.31+phase*1.3)*7`, weight jitter via `Math.sin(t*0.55+phase)`
  — `docs/_decoded/distinction-section-v4-standalone/template.html` lines
  ~835–844) and the doodle's per-frame noise "boil" must both stop under
  reduced motion, settling each cell into its resting (non-jittered) shape
  and pinning the doodle to a single static pose. Cell hit-targets, labels,
  and the click/keyboard-activation contract above are completely
  independent of this and are unaffected either way.

### Contact — magnetic dock

- **The lift/scale/follow physics are decorative/enhancement-only, not the
  interaction itself.** The Gaussian-falloff pull
  (`f = exp(-(dx² + dy²))`, computed per card from that card's own center,
  driving `translateY`/`scale` — verified at `docs/_decoded/
  contact-section-v2-standalone/template.html` lines ~574–589) is a
  continuous hover enhancement layered on top of always-real elements. It
  gets `aria-hidden` treatment in the sense that it carries no independent
  information and must never be the only way a card's affordance is
  perceptible — but note this doesn't mean literally hiding the cards, since
  the cards underneath are real functional content (see next point).
- **The 5 cards are real links, not decorative surfaces, and must be fully
  keyboard-operable independent of the mouse-proximity effect.** Verified:
  all 5 are real `<a href>` elements today (`mailto:ksfgarcia24@gmail.com`,
  `https://github.com/overnuke`, `https://wa.me/`,
  `https://linkedin.com/in/keffwontwakeup`, `https://cal.com/` —
  `docs/_decoded/contact-section-v2-standalone/template.html` lines
  407–516). `04_COMPONENT_RULES.MD`'s contract additionally requires that
  *if* a future channel is unavailable, it renders as a real disabled
  `<button>`, never a styled-to-look-disabled link — not something the
  current decoded markup exercises, but the contract to build against.
  - Every card must be `Tab`-focusable in document order and
    `Enter`/`Space`-activatable exactly as any native link/button already is
    — no custom key handling is needed here specifically *because* these are
    native `<a>`/`<button>` elements, which is the point: don't replace them
    with `<div onClick>` in service of the magnetic effect.
  - **Since not everyone can trigger the mouse-proximity lift** (keyboard
    users, switch users, screen-reader users, reduced-motion users), the same
    visual affordance the hover physics provides — the sense that "this card
    is now the active one" — must be independently available via
    `:focus-visible` on each card: a real, visible focus treatment (e.g. the
    same lift/shadow-boost the hover state already uses, `box-shadow:0 30px
    56px rgba(0,0,0,.66)` per the decoded `style-hover`, or an equivalent) at
    minimum outline strength, not just the browser's bare default outline.
    The magnetic pull is an enhancement on top of that, never a substitute
    for it.
  - The corner-bracket "reticle" motif on each card (4 absolutely-positioned
    bordered spans framing the card) is pure CSS decoration —
    `aria-hidden="true"`, no component logic, no focus/interaction role of
    its own.
- **`prefers-reduced-motion`:** the hook (`useMagneticDock`) must
  skip attaching its `pointermove` listener entirely under reduced motion
  (not just skip *applying* the computed transform) — per
  `04_COMPONENT_RULES.MD`'s explicit call-out that the hook
  (`useMagneticDock.ts`) carries one.
  Cards render at their resting `translateY(0) scale(1)` state, fully
  functional as links, with no continuous mousemove computation running in
  the background.

## Established pattern: upgrading mockup-only mouse affordances to real accessible elements

> Added 2026-09-21 (Phase 11 close-out). Not recovered from the decoded
> mockup — the mockup itself gets this wrong in places (see
> `docs/11_HANDOFF_HOME.md`'s EN/ES toggle note below). This section names,
> as an explicit repo convention, a principle that was independently applied
> by four different build agents across four different screens without ever
> being written down — worth codifying now so a future screen follows it on
> purpose rather than by accident.

**The rule:** where the decoded mockup implements a real, functional control
as a mouse-only pattern — a `role="button"` `<div>` with a click handler but
no `tabindex`, a hover-only affordance, a plain `<div>`/`<span>` doing a
link's or button's job — the React port does **not** reproduce that gap
faithfully. It upgrades the element to its real semantic equivalent (a
native `<button>` or `<a>`, real `tabIndex`/`role` where a native element
isn't available) so it is genuinely keyboard-operable, and treats this as
**fixing a source defect on port, not adding a new feature** — consistent
with this repo's non-negotiable conflict order (Accessibility → Project
Vision → Architecture → Developer Experience → Implementation Speed).
Mockup fidelity does not extend to reproducing a keyboard trap.

**Confirmed applied in four independent places:**

- **Home's EN/ES toggle** — the decoded markup gives each language cell
  `role="button"` and a click handler but no `tabindex` (mouse-only in the
  source). Ported as a real `<button type="button">` instead. See
  `docs/11_HANDOFF_HOME.md`'s EN/ES toggle section for the full source-defect
  writeup.
- **Profile's chamber activation** — each chamber ships as real
  `role="button" tabIndex={0} aria-pressed` UI with `onKeyDown` handling
  `Enter`/`Space` identically to `onClick` (`src/pages/profile/Chamber.tsx`),
  not a hover-only fusion effect.
- **Projects' hover-reveal annotations** — the per-card hover state that
  reveals doodle annotations is wired with `onFocus`/`onBlur` alongside
  `onPointerEnter`/`onPointerLeave` (`src/pages/projects/useCardHover.ts`,
  `ProjectCard.tsx`), so keyboard focus reveals the same annotation a mouse
  hover would.
- **Contact's dock cards** — all 5 cards render as real `<a href>` (or a
  real disabled `<button>` for a future unavailable channel), never a
  `<div onClick>` wrapped in the magnetic-hover effect
  (`src/pages/contact/Dock.tsx`).

A future screen or effect that ports a mouse-only mockup pattern should
follow this same principle by default, not re-litigate it from scratch.

## `prefers-reduced-motion` — summary table

Every decorative or physics-driven effect in this rebuild needs a static,
fully-functional fallback under `prefers-reduced-motion: reduce`. None of
these are optional or "nice if there's time" — each is required before its
Phase 8 component counts as done (`09_IMPLEMENTATION_ROADMAP.md` Phase 9).

| Effect | Screen | Reduced-motion fallback | Functionality preserved? |
|---|---|---|---|
| Ink Flow Background | Home | `animate` prop forced `false` → static single frame | Yes — real text no longer depends on it for contrast at all (Fix 1) |
| Ink-bloom canvas | Profile | Static single frame, or no canvas mounted | Yes — purely atmospheric, zero functional role |
| Goo-filter chamber transitions | Profile | Instant/near-instant state swap, no eased transform or `cellWob*`/`drift*` keyframe wobble | Yes — fusion state, `aria-pressed`, and keyboard activation are all independent of the transition's duration |
| Voronoi breathing + doodle boil (crayon mascot **and** the 5 molecular doodles, added 2026-09-23) | Distinctions | Cells settle to resting (non-jittered) shape; every doodle pinned to one static, noise-free pose | Yes — cell hit-targets, labels, click/keyboard activation, and the lightbox are all independent of the jitter |
| Magnetic dock (Gaussian follow) | Contact | `pointermove` listener not attached; cards at rest `translateY(0) scale(1)` | Yes — all 5 cards stay real, focusable, activatable links; `:focus-visible` gives the same affordance the hover lift would have |

## Keyboard mapping — consistency with `03_UX_ARCHITECTURE.MD`

This doc does not redefine navigation; it enforces the model `03` already
decided, plus the effect-level keyboard contracts above. Restated together so
one table covers every keyboard interaction in the app:

| Context | Keys | Behavior |
|---|---|---|
| Pill nav (persistent chrome, all screens) | `Tab` to reach a button, `Enter`/`Space` to activate | Real focus, real activation — **scrolls** to the section (`goToSection`; was `navigate(path)` before 2026-09-23), pushes the `#hash`, moves focus to that section's heading, announces it. (DOM order: the nav follows `<main>`, so Tab reaches it after the sections' focusables — see `03_UX_ARCHITECTURE.MD`.) |
| Home's numbered list — **real** activation | `Tab` to reach a list item, `Enter` to activate | Real focus, real activation — same `goToSection` path (scroll + hash push + heading focus + announce); the links are real `<a href="#profile">` etc. |
| Home's numbered list — **simulated** highlight | `ArrowRight`/`ArrowDown` (+1), `ArrowLeft`/`ArrowUp` (−1), window-level listener **only while Home is the active section** (`enabled`; was "while Home is mounted" — Home is now always mounted) | **Does not move real keyboard focus** — only re-renders which item is visually highlighted (color + `translateX(10px)` + arrow reveal). See `03_UX_ARCHITECTURE.MD`'s explicit flag: this is a known gap between the simulated highlight and real Tab focus, carried forward as-is from the mockup, not silently fixed here — a build agent must not describe arrow-key cycling as "keyboard navigation of the list" without this caveat. **Known limitation, disclosed 2026-09-23:** while Home is the active section the cycling `preventDefault()`s ArrowUp/ArrowDown, so those keys do **not** scroll the page there (PageUp/PageDown, Space, Home/End and the pill nav still do). Inherited from the mockup; not resolved |
| Profile chambers | `Tab` to reach, `Enter`/`Space` to toggle `bonded` | Real focus + real activation, `aria-pressed` reflects state |
| Distinctions cells | `Tab` to reach, `Enter`/`Space` to open lightbox | Real focus + real activation, matches click behavior exactly (`keyOpen` handler) |
| Distinctions lightbox | `Tab`/`Shift+Tab` trapped inside dialog, `Escape` closes | Focus moves to close button on open, returns to triggering cell on close |
| Contact cards | `Tab` to reach, `Enter`/`Space` (native link/button activation) | Native elements — no custom handler needed; `:focus-visible` gives the hover-lift's visual affordance |
| Explicit section navigation — pill / Home list / Profile CTA, **and** hash-driven navigation (load with a valid hash, Back/Forward, hand-edited hash). Replaces the old "Route change" row (2026-09-23; no routes exist) | n/a (not a keypress of its own) | Focus moves to the destination section's own heading (`[data-screen-heading]`, stable `tabIndex={-1}`, `focus({ preventScroll: true })`); `aria-live="polite"` region announces the section by name (`"Profile."`) — both fire in the same tick the scroll starts, per `03_UX_ARCHITECTURE.MD`. **Scroll-driven changes (wheel/touch/keyboard scrolling) and a load with no/empty/unknown hash move neither focus nor the announcement** — only the pill's visual active state follows the scroll |

## What this doc is not

This doc owns the accessibility contract — decorative-vs-real classification,
keyboard behavior, reduced-motion fallbacks, and the resolved contrast
values' rationale. It does not own the actual hex values or contrast
arithmetic (`02_DESIGN_SYSTEM.MD` is the source of record for those), the
navigation/focus-management architecture itself (`03_UX_ARCHITECTURE.MD`), each
effect's component/prop contract (`04_COMPONENT_RULES.MD`), or motion timing
and easing values (`07_ANIMATION_GUIDELINES.md` / `14_REFORM_MOTION.md`).
