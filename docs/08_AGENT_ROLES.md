# AI AGENT RESPONSIBILITIES

> Rewritten 2026-09-21 for the post-reset doc set (`00`–`13`, minus `12`,
> which is retired). Table shape (agent name, `Reads`, `Responsibilities`)
> follows the structural convention of the quarantined `08_AGENT_ROLES.md`,
> but every doc reference below reflects the current numbered-doc set, not
> the old one — several of the old file's reads no longer exist or point at
> the wrong doc for what it now covers.

## ART DIRECTOR AGENT

Reads:

- `01_ART_DIRECTION.MD`
- `02_DESIGN_SYSTEM.MD`
- `10_PROJECT_MANIFESTO.md`
- `13_ASSET_SPEC.md`

Responsibilities:

- preserve visual identity per screen (dark bookends / paper middle, per-screen
  palettes — not one flat palette)
- review UI decisions against the decoded mockup's actual hex values, type
  scale, and material language
- own the contrast flags raised in `02_DESIGN_SYSTEM.MD` until
  `05_ACCESSIBILITY.MD` resolves them

---

## UX AGENT

Reads:

- `00_PROJECT_VISION.MD`
- `03_UX_ARCHITECTURE.MD`

Responsibilities:

- maintain the navigation model (pill nav, Home's keyboard arrow-cycling,
  the five-route table) and its reconciliation with `react-router-dom`
- prevent normal scrolling-website patterns from creeping back in — this is
  a fixed 1440×900 stage with peer screens, not a scrolling page
- flag any change that would silently turn the fixed stage into a responsive
  layout — that requires a new decision recorded in `00_PROJECT_VISION.MD`
  first, not a quiet fix

---

## FRONTEND AGENT

Reads:

- `04_COMPONENT_RULES.MD`
- `06_FRONTEND_STACK.MD`
- `09_IMPLEMENTATION_ROADMAP.md`
- `11_HANDOFF_HOME.md`

Responsibilities:

- implement React components against the page/subfolder pattern and the
  three-way effect-placement rule in `04_COMPONENT_RULES.MD`
- maintain the stack as documented in `06_FRONTEND_STACK.MD` — no
  reintroducing an animation library, no reintroducing a
  `tailwind.config.js`, pnpm only
- execute the phase order in `09_IMPLEMENTATION_ROADMAP.md` in sequence,
  including its MUST-FIX accessibility addendum before calling a phase done

---

## ACCESSIBILITY AGENT

Reads:

- `05_ACCESSIBILITY.MD`

Responsibilities:

- verify contrast against the specific pairings and computed ratios flagged
  in `02_DESIGN_SYSTEM.MD` (Home text-on-background, pill-nav active state,
  Contact's GitHub card) — these are known, computed risks, not open-ended
  audits
- verify keyboard navigation per effect: chamber activation
  (`Enter`/`Space`), Voronoi cell activation and lightbox
  open/close/focus-trap, Home's arrow-cycling vs. real Tab focus (see the
  simulated-vs-real-focus gap flagged in `03_UX_ARCHITECTURE.MD`)
- enforce the decorative-animation pattern (fully `aria-hidden`, never
  focusable, real content duplicated in accessible markup) on every new
  effect in `04_COMPONENT_RULES.MD`, per the pattern already established in
  the project's `CLAUDE.md`

---

## MOTION AGENT

Reads:

- `07_ANIMATION_GUIDELINES.md`
- `14_REFORM_MOTION.md`

Responsibilities:

- implement screen-to-screen transitions — including whatever replaces the
  old `Crease`/`PageLayer` overlay animation now that all five screens are
  peers rather than one persistent Home with overlays on top (see
  `03_UX_ARCHITECTURE.MD`'s explicit deferral of this question to these two
  docs)
- preserve performance on the canvas/SVG-heavy effects (ink-bloom, goo
  chambers, Voronoi breathing, stroke-glyph jitter, magnetic dock) — CSS
  custom properties and native browser APIs only, no animation library
  (`06_FRONTEND_STACK.MD`)

---

## Retired

`12_COLLAGE_SYSTEM.md` is **superseded** (its own inline convention marks it
so) and is not assigned to any agent. Its 12-column rotation-grid layout was
never the mockup's real layout model; nothing in the current doc set depends
on it.
