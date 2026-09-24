# 00. Project Vision

> Rewritten 2026-09-21 from the decoded mockup (`docs/_decoded/*/template.html`),
> after the prior abstract "collage/chaos" version of this doc was quarantined
> for describing an aesthetic the real design never had. Every claim below was
> checked against the decoded templates; anything I couldn't verify says so.

## What this is

> **Updated 2026-09-23 (`continuous-scroll-and-doodles`, spec
> `project-vision` / "Stage Scroll Model").** This section previously opened
> with "This portfolio is not a scrolling website. It is a single fixed-size
> stage (1440×900px) that shows exactly one of five screens at a time … There
> is no page scroll within a screen." **SUPERSEDED** — the shipped site is a
> scrolling page. Reason: the discrete one-screen-at-a-time stage was replaced
> by one continuous scroll of all five screens (the pill nav now scrolls
> instead of swapping screens). Each screen is still a composition designed
> for a fixed 1440px-wide rectangle; what changed is that the five rectangles
> are now stacked, not swapped.

This portfolio is **one continuously scrollable page of five stacked
sections** — Home, Profile, Distinctions, Projects, Contact — all mounted at
once, in that order, at a **fixed 1440px design width**. Each section has a
**900px design floor** (`min-height: 900px` on every screen root — see the
height model below). The whole stack is scaled uniformly by viewport width
alone, and the page scrolls. A floating pill-nav (top-left, `position:
fixed`) scrolls to a section; on Home, arrow keys move a simulated highlight
along Home's numbered list (see `03_UX_ARCHITECTURE.MD`). Each section is
still a self-contained composition, designed the way a gallery piece is
designed for one wall — the visitor just walks the gallery by scrolling
rather than being teleported between rooms.

There is no router and no per-screen path. Sections are addressed by URL
hash (`#home`, `#profile`, `#distinctions`, `#projects`, `#contact`); the
navigation, deep-link and focus model is owned by `03_UX_ARCHITECTURE.MD`.

## The fixed 1440px design width is a decision, not an oversight

Every decoded screen hard-codes `width:1440px;height:900px` (or
`aspect-ratio:1440/900` with a scale transform) and none of the five templates
contain a media query. This is deliberate, and it still holds for **width**:
the site is built and ships at a fixed 1440px design width that is scaled
uniformly (`documentElement.clientWidth / 1440`, uncapped — a window wider
than 1440px scales the stage up, a narrower one scales it down) so the stage
always fills the viewport width. A fully responsive redesign is still
explicitly **out of scope**: there are no breakpoints, no reflow, no
mobile layout. Don't silently "fix" this into a fluid layout later; if
responsiveness becomes a goal, it's a new decision that needs its own doc
update here first.

> **Decision recorded 2026-09-23 (user-approved; this is the "own doc update"
> the paragraph above requires for the height axis).** What changed and what
> did not:
>
> - **Unchanged:** the 1440px design width, the single uniform scalar (equal
>   on both axes — `useMagneticDock`'s pointer un-projection depends on it),
>   no breakpoints.
> - **Changed — height model:** the original wording was a fixed 900px-tall
>   stage. It is now **fluid-capable with a 900px design floor**. Every screen
>   root carries an explicit `min-height: 900px` (a floor: never `height`,
>   never below 900), because every screen root's children are absolutely
>   positioned (natural height would be 0) and real content does not fit
>   below 900 (Projects' cards reach y=868). A section MAY grow above 900 only
>   if it gains in-flow content; the height-dependent effects (Voronoi cell
>   geometry, Contact dock, Profile columns, Projects glyph/mascot, Home ink
>   rings, the Distinctions doodles) were built and tested at 700/900/1400 so
>   they stay correct at any height ≥ 900, but **no section exceeds 900 today**.
> - **Heights below 900 are unsupported** (Projects' cards would be clipped
>   and its mascot would land inside the card band). The floor exists to make
>   that unreachable.
> - **Scale is width-only.** Viewport height never enters the scale, so a
>   short window scrolls instead of shrinking the stage.
> - **"Letterboxed" is no longer accurate.** The earlier "letterboxed / scaled
>   fixed-size stage" wording described a stage centered in a taller-or-wider
>   viewport with bars; there are no side or bottom bars now — the stage
>   scales to fill the width and the page scrolls vertically. The document
>   ends exactly where Contact ends (no trailing spacer).
> - **Known consequence (accepted):** on windows taller than a scaled section
>   (aspect ratio below 1.6:1) the last section, Contact, cannot reach the
>   viewport top — see `03_UX_ARCHITECTURE.MD`.

## The five screens

- **Home** — an animated ink-flow backdrop (`dc-import name="Ink Flow
  Background"` — its own nested `ext_resources` entry, decoded and ported in
  full; see `01_ART_DIRECTION.MD`) of swirling contour-line ink over cream
  paper, a right-aligned oversized "Kevin." wordmark, an EN/ES toggle, and a
  numbered nav list that shifts and reveals an arrow on hover/focus. Keyboard
  arrow keys move focus between the four other screens. **Corrected
  2026-09-21**: earlier documented as a "dark identity hero" (`#0e0f0b` stage)
  — that assumed the Ink Flow Background's own real surface, which is opaque
  and never decoded at the time. It's cream paper, not dark; see
  `02_DESIGN_SYSTEM.MD`'s retired "Fix 1."
- **Profile** — the hinge screen. A canvas-driven generative "ink bloom"
  animation blended with `mix-blend-mode: exclusion` over a diagonal gradient
  that runs from warm paper (`#f6f3e9`) to near-black (`#0a0a09`) left to
  right. Four SVG goo-filter "chambers" merge scattered skill-tag dots into a
  single fused word on hover/click.
- **Distinctions** — a hand-rolled weighted-Voronoi ("power diagram") colony
  of paper cells, each holding one real certification; cell size encodes
  weight/importance, not a fixed grid. Clicking a cell opens a lightbox with
  the real certificate scan. **Added 2026-09-23:** a quiet row of five
  hand-drawn molecular/health doodles (DNA helix, flask, molecule, pill
  capsule, microscope) sits between the label rows alongside the crayon
  mascot — see `01_ART_DIRECTION.MD`.
- **Projects** — three polaroid-style project photo cards (circular, rotated,
  blob-morphing on hover) on a paper-textured background, under a
  hand-lettered "PROJECTS" title built from single-stroke SVG glyph paths
  (not text), with hover-revealed handwritten annotation notes.
- **Contact** — dark, dimmed-photo backdrop with a dot-grid overlay. Five
  contact cards (Email, GitHub, WhatsApp QR, LinkedIn, Book a call) that
  "dock" toward the cursor with a Gaussian-falloff magnetic hover effect.

## Identity and tone

The real copy across the decoded templates is specific, not generic portfolio
boilerplate:

- Home: **"Kevin."** — a single-word, period-stopped wordmark, not a full name
  or a job title.
- Profile: **"Junior software engineer"** as the headline, followed by "Just
  graduated from Universidad Veracruzana. Small projects so far — and the
  appetite for one that makes a change." and a live "Looking for an
  opportunity" pulse badge. This is an early-career, honest-about-it voice —
  not an inflated "10x engineer" pitch.
- Contact: a closing line set in italic serif — *"Even an hundred of years
  isn't enough to appreciate what life is mean to be."* — kept verbatim from
  the decoded template; its imperfect grammar reads as a deliberate personal
  voice choice, not a typo to silently correct.
- A recurring hand-drawn "crayon guy" mascot (a small blinking, arm-waving
  character built from noise-perturbed SVG paths) appears independently in
  both Distinctions and Projects, pointing at whatever the visitor is
  hovering — the templates' own code comments confirm this is the same
  character reused ("Shared crayon character from Distinction v4 — same guy,
  same proportions"), not a coincidence.
- **Note (unverified/unshipped):** `docs/_decoded/main-page-standalone/template.html`
  — an older, secondary Home variant superseded by `docs/_decoded/index/` —
  contains a `role` copy string never wired into its own markup:
  `"design engineer · manga-brain"` (EN) / `"ingeniero de diseño · cerebro
  manga"` (ES). It renders nowhere in either Home template today, but it's
  worth surfacing here as evidence of the intended persona (playful,
  self-aware, technically dense) in case a future revision wants to bring a
  tagline back onto Home.

Overall tone: an early-career developer's real, specific work presented with
unusual confidence in craft (custom canvas/SVG effects everywhere) and no
attempt to look like a template — bilingual (EN/ES), technically literal in
its chrome (JetBrains Mono labels, numbered lists, "scan"/"colony"/"chamber"
framing) and personally illustrated (the crayon mascot) rather than corporate.

## What this doc is not

This doc states *what* the portfolio is and *why* it's shaped this way at the
top level. It does not own layout grids, component contracts, exact hex
values, motion timing, or accessibility rules — those belong to
`01_ART_DIRECTION.MD`, `02_DESIGN_SYSTEM.MD`, and the architecture/UX docs
that follow in later phases of this rebuild.
