# 01. Art Direction

> Rewritten 2026-09-21 from the decoded mockup. Layout numbers and hex values
> below are read directly from `docs/_decoded/*/template.html`; anything I
> could not confirm from a decoded file is flagged inline rather than guessed.

## The throughline: dark bookends, paper middle

The five screens aren't a flat, uniform palette — they alternate between two
registers, and the alternation is structural, not decorative:

- **Dark ink** — Home (`#0e0f0b`) and Contact (`#0a0a0a`) are the screens
  where the visitor arrives and where they're asked to act (navigate in,
  reach out). Both are near-black, high-contrast, headline-driven.
- **Paper** — Distinctions (`#f6f4ea` / internal cell fill `#f4f1e6`) and
  Projects (`#f6f4ea`) are the "proof" screens — credentials and work — and
  read like pages of a physical dossier: warm off-white, paper-grain texture,
  hand-annotated.
- **Profile is the literal hinge.** Its background is a single diagonal
  gradient running warm-paper → near-black left to right
  (`linear-gradient(97deg, #f6f3e9 0%, #f2eee1 22%, #dfdaca 40%, #a9a59a 47%,
  #33332d 55%, #101010 64%, #0a0a09 100%)`), with the identity copy ("Junior
  software engineer") sitting on the paper side and the interactive skill
  chambers sitting on the dark side. It's the only screen that is both
  registers at once, and its position in the nav order (Home → Profile →
  Distinctions → Projects → Contact) puts it exactly between the two dark
  bookends and the two paper screens.

## Layout philosophy per screen

**Home — asymmetric ink-flow hero.** Everything is right-aligned into a single
520px-wide column (`right:80px; top:104px`): an oversized uppercase wordmark,
an EN/ES toggle boxed in a hard 2px border, and a numbered nav list. There is
no left content at all — the entire left ~900px of the 1440px stage is given
to the animated ink-flow backdrop alone. This is a deliberate asymmetric,
almost brutalist composition: the negative space *is* the visual. **Corrected
2026-09-21** (was "dark identity hero"): the Ink Flow Background is its own
`ext_resources` entry nested inside `main-page-standalone`'s manifest, not
one of the six top-level decoded files — `decode-mockup.mjs` writes such
entries out as an opaque `.html` asset that nobody had opened, so its real,
opaque cream-paper (`#f6f4ea`) surface (SVG turbulence-warped dot-ring fields,
a lower-left ink mass, halftone dust, a paper-highlight gradient, print
grain — see `docs/_decoded/main-page-standalone/assets/ffce4155-*.html`) was
invented as a dark-background canvas ripple instead of ported. All Home text
is ink (`#14150f`) on that paper, not near-white on `#0e0f0b` — see
`02_DESIGN_SYSTEM.MD`'s retired "Fix 1."

**Profile — canvas ink-bloom + SVG goo chambers.** Two custom effects render
independently on one screen. A `<canvas>` (`mix-blend-mode: exclusion`) runs
a `requestAnimationFrame` particle system of soft irregular "blooms" (7–14
noise-perturbed lobes per blob, procedurally regenerated) drifting slowly
across the gradient. Separately, an SVG `<filter>` (`feGaussianBlur` +
`feColorMatrix`, id `profileGoo`) is applied to four stacked 560×132px
"chamber" rows on the right side; each chamber holds 2–4 small circular dots
(skill tags) that, on hover/focus, animate toward each other under the goo
filter until they visually fuse into a single blob rendering as one italic
serif word (e.g. three language dots → "Anywhere"). This is a metaphor made
literal: separate skills merging into one identity trait.

**Distinctions — weighted-Voronoi paper cells.** Rather than a grid, cell
boundaries are computed as an *additively-weighted Voronoi diagram* (a "power
diagram" — see the `powerCell()` half-plane-clipping implementation in the
decoded template) from 12 seed points, each with its own weight in px²
(**Corrected 2026-09-21, Phase 11 close-out:** this was miscounted as "11
seed points" in the prior version of this doc — the decoded `CELLS` array,
verified again against `src/pages/distinctions/voronoi.ts`'s `RAW_SEEDS`,
has 12 entries: 1 `title` cell, the 9 real certification cells, and 2
non-interactive decorative cells, `count`/`span`, not covered by the "9
certifications" figure elsewhere in this doc set). Bigger weight → bigger
cell. The largest weighted seeds (`title: 30000`, `anfeca: 15000`) get the
most visual territory; a one-off online-course cert (`aiinit: 8500`) gets
the least. Cells gently "breathe" (sinusoidal position + weight jitter) and
grow further on hover, with rounded corners whose radius is derived from
each corner's actual angle so sharp joints don't produce spiky artifacts.

**Projects — polaroid cards + hand-lettering.** Three project photos sit in
circular "polaroid" frames (`border-radius:50%` photo inside a rotated,
drop-shadowed card, e.g. `rotate(-2.2deg)`), staggered at different sizes and
z-indices to read as physically stacked prints rather than a grid. The
"PROJECTS" title is not text — it's assembled from a per-letter dictionary of
single-stroke path skeletons (`GLYPHS` in the decoded script) rendered as
SVG strokes with per-frame noise jitter, i.e. a marker-drawn wordmark that
never sits perfectly still.

**Contact — magnetic dock.** Five cards of varying size are placed at fixed
absolute positions (not a grid) and each frame's `pointermove` computes a
Gaussian falloff `f = exp(-(dx² + dy²))` from the cursor to each card's
center, driving both a lift (`translateY`) and a scale on every card
simultaneously in proportion to `f`. The effect is a soft, continuous "pull"
toward the cursor rather than a discrete per-card hover state — cards further
from the cursor visibly participate less rather than not at all.

## Material and texture language

- **Paper grain.** Projects' stage background is not a flat fill — it layers
  two `repeating-linear-gradient`s at different angles
  (`92deg`/`2deg`, hairline stripes at `rgba(20,21,15,.022)` and `.018`
  opacity) to simulate a faint cross-hatched paper texture under the
  `#f6f4ea` base. This texture is unique to Projects among the decoded
  screens — Distinctions uses a flat paper fill with no hatching.
- **Ink.** "Ink" is used literally as a UI vocabulary word inside the code
  (`accentInk` prop on Home/main-page, `ink` prop passed to the undecoded "Ink
  Flow Background" import) and as the near-black text/border color
  (`#14150f`) used consistently across every screen for foreground content on
  paper.
- **The doodle / hand-drawn layer.** A single recurring crayon-style
  character (body, two ears, one waving arm, blinking eyes — defined once as
  `GUY_BODY`/`GUY_EAR_L`/`GUY_EAR_R`/`GUY_ARM` point arrays) is redrawn
  independently in both Distinctions and Projects using the same proportions
  — the Projects template's own comment calls it out explicitly: "Shared
  crayon character from Distinction v4 — same guy, same proportions." It
  points a hand-drawn arrow (bowed Bézier shaft + two barb strokes) at
  whatever cell/card currently has hover focus, blinks on a fixed cycle, and
  is accompanied by small drifting "spore" decorations. Distinctions' lightbox
  additionally has its own big blinking SVG eye character that watches the
  cursor and steps aside once a certificate scan is loaded into the plate.
  All of these doodle strokes are deterministically noise-perturbed per frame
  (a seeded pseudo-random function, not `Math.random()`) so they "boil"
  slightly like a hand redrawing the line, rather than looking vector-static.
- **Corner-bracket / reticle motif.** Contact's five cards each carry four
  small L-shaped corner brackets (`border-left`+`border-top` etc. on
  absolutely-positioned 15×15px spans) framing the card like a
  camera-viewfinder or scan target — reinforcing the "identity as something
  being scanned/read" framing that also shows up in Distinctions' literal
  certificate-scan lightbox.

## Open question / not verified here

The Home screen's animated backdrop (`dc-import name="Ink Flow Background"`)
is referenced by both Home templates but was **not** one of the six decoded
mockup slugs, so its actual rendered palette/behavior could not be verified
from source. `02_DESIGN_SYSTEM.MD` flags a real contrast risk that depends on
what this component paints — don't assume it's simply "the accent color on
black" without checking the component itself once it's decoded or rebuilt.
