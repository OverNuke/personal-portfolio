# 09. Implementation Roadmap

> Rewritten 2026-09-21 from the approved reset plan. Written to be directly
> executable by a build agent in batches — each phase below states what to
> do, what it depends on, and what "done" looks like, not just a bare list.
> Status markers (**DONE** / **IN PROGRESS** / **NOT STARTED**) reflect what
> could be confirmed at the time this doc was written; a later phase should
> update them rather than treat this file as frozen history.

## Phase 1 — Archive old docs/src — **DONE** (archive since deleted)

Old `docs/00`–`14` and the old `src/` (except `src/assets/plates/*` and
`src/assets/doodle/*`, promoted forward) were parked in a gitignored
`_quarantine/` holding pen during the reset. That directory no longer exists
and nothing in the repo references it.

## Phase 2 — Decode mockup via `scripts/decode-mockup.mjs` — **DONE**

`docs/_decoded/<slug>/template.html` exists for all six `mockup/*.html`
sources: `index`, `contact-section-v2-standalone`,
`distinction-section-v4-standalone`, `main-page-standalone`,
`profile-section-v4-standalone`, `projects-section-v2-standalone`. These are
real, readable HTML/CSS/JS (bundler payloads unpacked), not the raw
"Unpacking..." stubs the mockup files render as when opened directly.

## Phase 3 — Asset reconciliation — **IN PROGRESS** (separate agent)

Fonts (Archivo Black, Space Grotesk added; `LTRemark-*`/
`LTSuperiorSerif-ExtraBold` removed), `src/assets/plates/*` and
`src/assets/doodle/*` re-pointed rather than re-extracted, any net-new
assets (Contact's background photo, stroke-glyph title data) extracted, and
`docs/13_ASSET_SPEC.md` rewritten as the real source→decode→destination
manifest. This batch does not touch `13_ASSET_SPEC.md` or `src/assets/` —
confirm phase 3's own status there, not here.

## Phase 4 — Foundational docs (`00`, `01`, `02`, `10`) — **DONE**

Written by a separate agent, already present and read as source-of-truth
vocabulary for this batch: `docs/00_PROJECT_VISION.MD`,
`docs/01_ART_DIRECTION.MD`, `docs/02_DESIGN_SYSTEM.MD`,
`docs/10_PROJECT_MANIFESTO.md`.

## Phase 5 — Architecture/UX docs (`03`, `04`, `06`, `08`, `09`) — **DONE (this batch)**

This phase. Produced:

- `docs/03_UX_ARCHITECTURE.MD` — pill nav, Home's keyboard arrow-cycling
  (verified against the decoded script's exact keymap), the reconciliation
  of routing with the pre-reset shell's focus/live-region pattern, and the
  five-route table (both since rewritten for the scroll shell).
- `docs/04_COMPONENT_RULES.MD` — page/subfolder pattern, the three-way
  effect-placement rule with named precedents, and a contract per custom
  effect (Home ink flow, Profile ink-bloom + goo chambers, Distinctions
  Voronoi + lightbox, Projects stroke-glyph title, Contact magnetic dock).
- `docs/06_FRONTEND_STACK.MD` — corrected, version-verified stack facts;
  explicit correction of the historical Framer Motion mention.
- `docs/08_AGENT_ROLES.md` — updated reader/responsibility table for the new
  doc set; `12` marked retired.
- `docs/09_IMPLEMENTATION_ROADMAP.md` — this file.

**MUST-FIX flagged forward from this phase (see the addendum below):**
writing `02_DESIGN_SYSTEM.MD` surfaced real, computed WCAG contrast failures
in the mockup itself. They are called out explicitly in Phase 6 and Phase 9
below — this phase does not fix them (out of scope for a docs-only batch),
but does not let them pass silently either.

## Phase 6 — Screen-specific + motion + accessibility docs — **DONE (this batch)**

Covers three remaining docs plus one retirement:

- `docs/11_HANDOFF_HOME.md` — full rewrite of the Home implementation spec,
  sourced from `docs/_decoded/index/template.html` (the current
  `11_HANDOFF_HOME.md`, if any remains from before the reset, describes the
  old dashboard-grid Home and must not be trusted).
- `docs/07_ANIMATION_GUIDELINES.md` / `docs/14_REFORM_MOTION.md` — motion
  philosophy and the shared-element transition contract, including
  resolving the screen-to-screen transition question this batch's
  `03_UX_ARCHITECTURE.MD` explicitly deferred (what replaces the old
  `Crease`/`PageLayer` overlay animation now that all five screens are
  peers).
- `docs/05_ACCESSIBILITY.MD` — carries forward the decorative-animation
  pattern from `CLAUDE.md` verbatim, and **must** address, as MUST-FIX items
  and not nice-to-haves:
  - **Flag 1 (Home text contrast):** `#14150f` headline/nav text computed
    against the raw Home background `#0e0f0b` is ≈1.05:1 — essentially
    invisible without its animated backdrop. The backdrop
    (`dc-import name="Ink Flow Background"`) was never decoded, so its
    guarantee of a light region under the text is unverified. This doc must
    either verify that guarantee against the real component once built, or
    specify a backdrop-independent fallback (e.g. a text-shadow or a
    guaranteed-light static backing) that doesn't depend on the animation
    rendering correctly.
  - **Flag 2 (pill-nav active state):** the active pill's `#14150f`-on-accent
    (`#6f7f45` default) at 11px computes to ≈4.20:1 — under the 4.5:1 AA
    threshold for normal-size text (11px does not qualify as "large text").
  - **Flag 3 (Contact's GitHub card):** the same accent-as-background
    treatment on Contact's GitHub card passes AA at large-text size (34px
    italic headline, ≈3.97:1 against the 3:1 large-text threshold) but
    **fails** at the card's own 11px JetBrains Mono metadata lines (same
    ≈3.97:1 ratio, needs 4.5:1 at that size).
  - Per this repo's non-negotiable conflict order — **Accessibility →
    Project Vision → Architecture → Developer Experience → Implementation
    Speed** — none of these three are eligible to ship "faithfully as
    designed." Fidelity to the mockup does not override an AA failure. The
    accessibility doc must specify the actual fix (a darker/more-saturated
    accent variant for text-on-accent contexts, or restricting ink-on-accent
    to large-text-only contexts and choosing a different, higher-contrast
    color for small metadata text on an accent surface), not just log the
    numbers again.
- `docs/12_COLLAGE_SYSTEM.md` — retire (already reflected in
  `08_AGENT_ROLES.md` as superseded; no further doc work needed beyond
  confirming it stays marked that way).

**Resolved this batch:** all 3 flags fixed, not just documented — Fix 1
(`#f3f2ef` for Home's default ink-on-bg, ≈17.18:1), Fix 2 (`#8b9c56` for the
pill-nav active background, ≈6.11:1 with `#14150f` text), Fix 3 (`#4f5c2f`
for Contact's GitHub card background, ≈6.56:1 with `#f6f4ea` text) — all
three reuse a value already cataloged elsewhere in the same design system
rather than inventing a new color. Corrected values recorded in
`02_DESIGN_SYSTEM.MD`'s Corrected Contrast Pairings section; full rationale
and the decorative-animation worked examples in `05_ACCESSIBILITY.MD`.
`docs/11_HANDOFF_HOME.md`, `docs/07_ANIMATION_GUIDELINES.md`, and
`docs/14_REFORM_MOTION.md` are all written. `docs/12_COLLAGE_SYSTEM.md`
remains retired/superseded, confirmed, no further action.

## Phase 7 — Scaffold shell + routing — **DONE** (routing half SUPERSEDED 2026-09-23)

> Status updated 2026-09-21 (Phase 11 close-out). **Updated 2026-09-23:** the
> "routing", "route switch" and "fixed 1440×900 stage" halves of this phase
> were replaced by `continuous-scroll-and-doodles` (see the section at the end
> of this doc): there is no router, and the stage is a scrolling stack. The
> registry's entries are now hashes (`#home` … `#contact`), not the paths
> listed below; the "per-route heading focus" is per-section.

Confirmed built: `src/routes/registry.ts` has the 5-entry table
(`/`, `/profile`, `/distinction`, `/projects`, `/contact`), the fixed
1440×900 stage container (`src/shell/Shell.tsx`, `useStageScale`), the
pill-nav chrome (`src/shell/PillNav.tsx`) rendered once outside the route
switch, and the focus-management + `aria-live` pattern from
`03_UX_ARCHITECTURE.MD` (`Shell.tsx`'s per-route heading focus + `liveMessage`
live region).

## Phase 8 — Build section components, cheapest-to-verify first — **DONE**

> Status updated 2026-09-21 (Phase 11 close-out).

All five screens built, in the order fixed by the approved plan:

1. **Contact** (magnetic dock) — `useMagneticDock.ts` + `Dock.tsx`, per
   `04_COMPONENT_RULES.MD`'s exact contract.
2. **Projects** (polaroid cards + stroke-glyph title) — `ProjectCard.tsx`
   + `useCardHover.ts` + the glyph-stroke module.
3. **Profile** (ink-bloom canvas + goo-filter chambers) — canvas effect
   per bucket 1, `Chamber.tsx` state machine per its verified contract.
4. **Distinctions** (Voronoi cell field — largest/most complex) —
   `voronoi.ts` pure module + real keyboard-operable SVG cells + extended
   `ScanModal.tsx`.
5. **Home** (ties nav together) — `InkFlowBackground.tsx` (see
   `11_HANDOFF_HOME.md`'s note on its original, non-decoded implementation)
   plus the arrow-key nav-focus cycling behavior from
   `03_UX_ARCHITECTURE.MD`.

## Phase 9 — Accessibility pass per new effect — **DONE**

> Status updated 2026-09-21 (Phase 11 close-out).

Keyboard, reduced-motion, and `aria-hidden`+duplicated-accessible-content
contracts from `04_COMPONENT_RULES.MD`/`05_ACCESSIBILITY.MD` are implemented
per effect (see `05_ACCESSIBILITY.MD`'s "Established pattern" section, added
this phase, for four independently-applied instances of upgrading a
mockup-only mouse affordance to a real accessible element). Flags 1–3's
corrected contrast values (`02_DESIGN_SYSTEM.MD`) are wired into the actual
component styles, not just documented.

## Phase 10 — Verification — **DONE**

> Status updated 2026-09-21 (Phase 11 close-out). Actual final gate state,
> not the originally-planned state:

- **Automated gate:** `scripts/audit.mjs` runs clean (0 findings) against the
  new shell's real selectors at native 1440×900 scale. `pnpm typecheck`,
  `pnpm lint`, and `pnpm test` all pass. `e2e/smoke.spec.ts` was rewritten
  against the new 5-route registry, and `pnpm run audit:collage` is
  re-enabled in `.github/workflows/ci.yml` (`Audit` step, after the
  Playwright-browser install step).
- > **Updated 2026-09-24: this bullet is stale.** `pnpm test` now runs
  > 23 files / 262 tests (Voronoi geometry, dock falloff, doodles, Projects
  > layout, the scroll shell, hash navigation, the Pages `base` resolver, …)
  > added by `continuous-scroll-and-doodles` and the deploy fix. The audit
  > stayed clean only for the original route-per-screen shell: it was rebuilt
  > for the scroll shell in that change's Phase 10 (0 findings again), and
  > `e2e/` was rewritten against the scroll shell (58 tests). The original
  > text is kept below as history.
- **Honest gap, not glossed over:** `pnpm test` passes with **zero Vitest
  unit tests** in the rebuilt component tree — only Playwright e2e/a11y
  checks were performed during Phases 9/10. `vite.config.ts` sets
  `test.passWithNoTests: true` with an inline comment calling this out as a
  stopgap, not a coverage claim. Adding real unit tests for the rebuilt
  components (Voronoi geometry, chamber state machine, dock hover math, etc.)
  is real follow-up work, not something this close-out pass resolves.
- **Visual fidelity / manual accessibility pass:** covered per the process
  described below (mockup screenshot diff at 1440×900, keyboard-only pass,
  `prefers-reduced-motion` toggle) during Phases 8–9's build-out.

## Phase 11 — Docs-follow-implementation close-out pass — **DONE**

> Status updated 2026-09-21.

This pass. Reconciled every doc in this set against the real `src/`
implementation built in Phases 7–10: corrected `11_HANDOFF_HOME.md` (Ink Flow
Background's ×6 `ringGap` scaling), `13_ASSET_SPEC.md` (the 5-scan/9-cert
mapping and placeholder fallback), `01_ART_DIRECTION.MD` (a stale "11 seed
points" count, corrected to 12), and `05_ACCESSIBILITY.MD` (named the
mouse-affordance-to-real-element upgrade as an explicit repo convention).
Several items surfaced during the reset plan's own close-out instructions
were checked and found already accurate — no redundant notes added for
those. This closes out the full reset plan
(`drop-all-the-decision-mighty-pelican.md`).

## Change `continuous-scroll-and-doodles` — continuous scroll + molecular doodles — **DONE, ARCHIVED 2026-09-24**

> Recorded 2026-09-23; **updated 2026-09-24** (archived, 27/27 tasks; the
> audit gate is fixed — see "Gate numbers" and "Follow-ups" below). A
> spec-driven change (Strict TDD; artifacts in engram under
> `sdd/continuous-scroll-and-doodles/*`, archive report in
> `.../archive-report`; no `openspec/` directory), applied on top of Phases
> 1–11 above. Supersedes, in the docs, the discrete route-per-screen model.

**What shipped (27/27 tasks, Phases 1–10; the original 25 plus Phase 10's
audit-gate and legacy-path-URL fixes):**

- **Height-fluid effects (Phases 1–5):** Distinctions' Voronoi geometry,
  Contact's magnetic dock, Profile's column centering, Projects' glyph/mascot
  layout and Home's ink rings were made correct at any height ≥ 900
  (built and tested at 700/900/1400; `computeCellPolygons`,
  `computeMagneticFalloff`, `ambientY`, `useLayerHeight`, `ringHeight`).
- **Molecular / health doodles (Phase 6):** DNA helix, flask, molecule, pill
  capsule, microscope on Distinctions, fully `aria-hidden`
  (`01_ART_DIRECTION.MD`, `05_ACCESSIBILITY.MD`).
- **Scroll shell + nav model (Phase 7):** one scrolling page of five stacked
  sections with a 900px design floor, scaled by width alone; pill nav
  scrolls; hash deep links (`#home … #contact`); `react-router-dom` removed;
  Home arrow-cycling scoped to the active section; `ScanModal` portaled
  (`00`, `03`, `05`).
- **Screen transitions (Phase 8.1):** the REFORM/ENTER route crossfade is
  retired; the pill's own 120ms swap remains (`07`, `14`).
- **Committed e2e layout guard (Phase 8.2):** `e2e/helpers.ts`,
  `layout.spec.ts`, `scroll-nav.spec.ts`, rewritten `smoke.spec.ts` (55
  tests).
- **Docs reconciliation (Phase 9.1):** `00, 01, 03, 04, 05, 06, 07, 08, 09,
  10, 11, 14`. `13_ASSET_SPEC.md` unchanged (no asset changed: the doodles
  are code, not assets).

**Gate numbers at close (2026-09-24, final targeted re-verify
`.../verify-report-rerun`: PASS WITH WARNINGS, 0 CRITICAL):** `pnpm test`
22 files / 250 passed (262 / 23 files after the deploy fix's
`vite.base.test.ts` and the a11y fix's DOM-order test); `pnpm typecheck` and `pnpm lint` clean;
`pnpm run audit:collage` exit 0 / 0 findings; e2e 58/58 (116/116 with
`--repeat-each=2`, 0 flaky) **against a throwaway dev-server config only**.
Post-archive a11y fix (W3/W4): the pill nav now precedes `<main>` in the DOM
(first Tab stop), pinned by `Shell.test.tsx` and by `smoke.spec.ts`'s
keyboard test, which now presses a real Tab instead of `.focus()`; the
owner's production-build e2e run is green with it.

**Follow-ups after archive:**

1. **Resolved (owner-run, 2026-09-25):** `pnpm build && pnpm e2e` (production
   build + `playwright test`) passes; GitHub Pages is enabled (Source =
   GitHub Actions) and the latest CI/Deploy run deployed the site to
   `https://overnuke.github.io/personal-portfolio/`. CI/Deploy had previously
   failed at "Setup pnpm"; fixed by `packageManager: pnpm@11.17.0`,
   `pnpm/action-setup@v6` and a sub-path `base` (`vite.base.ts`,
   `resolveBase(VITE_BASE)`).
2. **Still open:** performance (W8), see the known limitations below. Known
   environment sensitivities: nominal-scale assertions assume overlay
   scrollbars (headless Chromium), and Chromium is the only engine covered.

**Resolved since the 2026-09-23 entry:** `scripts/audit.mjs` was rebuilt for
the scroll shell (Phase 10.1: it now sweeps the five hash URLs at four widths,
asserts the shipped `overflow-x: clip` contract and reads sections from the
route registry), so `ci.yml`'s `Audit` step is live **and green** — the
"audit FAILS / CI would go red" note that stood here is obsolete. Path URLs
(`/profile`) are covered by an e2e test asserting they load Home (spec
scenario f).

**Known limitations / decisions recorded (see the specs for wording):**
heights below 900px unsupported; Contact clamps at the document bottom on
windows with aspect ratio < 1.6:1 (no trailing spacer); path URLs are not
deep links (they load Home); ArrowUp/ArrowDown do not scroll while Home is
the active section; all five screens' effect loops run simultaneously,
including off-screen (performance unmeasured — pausing off-screen loops is a
candidate follow-up); Firefox/WebKit are unverified.
