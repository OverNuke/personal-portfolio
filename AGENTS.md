# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project state

Mid-rebuild. A React + Vite + TS + Tailwind scaffold exists (`package.json`,
`pnpm-lock.yaml`, `vite.config.ts`, etc.), but the design it originally
implemented (an abstract 12-col rotation grid) didn't match the real design.

The real design lives in `mockup/*.html` — proprietary "bundler" tool exports
(a component DSL, not plain HTML) that only render through their own runtime
loader; opening one raw in a browser shows an "Unpacking..." placeholder, not
the actual page. `scripts/decode-mockup.mjs` decodes the embedded
`__bundler/template` and `__bundler/manifest` payloads into readable
HTML/CSS/JS under `docs/_decoded/<slug>/` (gitignored — a reading aid, not
shipped code).

A full reset is in progress: the old `docs/00-14` and old `src/` (except
`src/assets/plates/*` and `src/assets/doodle/*`, which were verified correct
against the mockup and kept) were moved to `_quarantine/` (gitignored). The
numbered docs under `docs/` are being rewritten from the decoded mockup
content — see the table below for current status. `src/` component rebuild
follows once the doc set is complete.

The stage is a fixed 1440×900 layout, not responsive — see
`00_PROJECT_VISION.MD`. That's a deliberate scope decision for this rebuild,
not an oversight.

## Commands

```bash
pnpm install         # first time / after pulling dependency changes
pnpm dev             # Vite dev server
pnpm build           # tsc -b && vite build (production build)
pnpm preview         # preview the production build locally
pnpm typecheck       # tsc --noEmit
pnpm lint            # eslint . (add lint:fix to auto-fix)
pnpm format          # prettier --write . (add format:check to only check)
pnpm test            # vitest run (add test:watch for watch mode)
pnpm run decode:mockup  # scripts/decode-mockup.mjs — unpacks mockup/*.html into docs/_decoded/
pnpm run audit:collage  # scripts/audit.mjs — occlusion/target-size/clipped-text audit at 1440/1280/1100/390px (always `pnpm run`, never bare `pnpm audit` — that's pnpm's own dependency-audit subcommand; script is being rebuilt post-reset, see 09_IMPLEMENTATION_ROADMAP.md)
pnpm e2e             # pnpm build && playwright test — real browser specs under e2e/ (being rewritten post-reset)
```

This project uses **pnpm** exclusively — `package.json`'s `preinstall` script blocks `npm install`/`yarn install`. Don't reintroduce `package-lock.json` or a second lockfile.

`.github/workflows/deploy.yml` and `.github/workflows/ci.yml` (checkout → install → typecheck → lint → test → build → e2e) both exist. `ci.yml` has a TODO to re-enable `pnpm run audit:collage` once `scripts/audit.mjs` is rebuilt against the new component tree — see the roadmap doc.

There is no `tools/halftone.py` — an earlier plan referenced a halftone-preset asset pipeline that was never built. Real image/font assets are sourced from `mockup/*.html`'s decoded manifests and `raw/*` (real certificate scans and project screenshots) — see `13_ASSET_SPEC.md`.

## Agent session hygiene

- Ad-hoc verification scripts, probe `.mjs` files, and screenshots belong in the session scratchpad directory. Never the repo root. Committed tooling lives in `scripts/` and is referenced from `package.json`.
- Never delete an untracked file without explicit user confirmation — git cannot recover it. Move it to `_quarantine/` (gitignored) and let the user empty that directory.
- `.Codex/`, `.atl/`, `.impeccable/` are gitignored tool state.
- `_quarantine/` currently holds the pre-reset `docs/00-14` and `src/` (see Project state above). It's a holding pen, not storage — ask the user before adding more to it or before assuming its contents are safe to delete.
- `docs/_decoded/` (gitignored) is `scripts/decode-mockup.mjs`'s output — a reading aid for porting the real mockup content, not shipped code. Re-run the script if it's missing or the mockup files change; don't hand-edit its contents.

## What this project is

**KEVIN_PORTFOLIO** — a developer portfolio deliberately built as *not* a website: a fixed-stage, 5-screen single-page app (Home, Profile, Distinctions, Projects, Contact) with screen-specific, hand-built visual effects (canvas ink-bloom, SVG goo-filter chambers, a weighted-Voronoi credential layout, hand-lettered SVG titles, mouse-proximity hover physics) rather than a conventional dashboard grid. See `00_PROJECT_VISION.MD` for the full concept and `10_PROJECT_MANIFESTO.md` for the reasoning behind it.

## Doc-driven architecture

This project's "architecture" lives in numbered spec docs under `docs/`, not in code. Each doc is a single source of truth for its domain — don't restate their content elsewhere, reference them. All docs below have been rewritten from the decoded mockup content as of the current reset (see Project state):

| Doc | Owns |
| --- | --- |
| `00_PROJECT_VISION.MD` | Concept, the 5-screen model, the fixed 1440×900 non-responsive decision |
| `01_ART_DIRECTION.MD` | Per-screen visual language (dark identity hero, canvas ink-bloom + goo chambers, Voronoi paper cells, polaroid + hand-lettering, magnetic dock) |
| `02_DESIGN_SYSTEM.MD` | **Per-screen** color palettes (not one flat palette) with measured contrast ratios, typography (5 real font families), corrected contrast pairings |
| `03_UX_ARCHITECTURE.MD` | Real nav model (pill nav + `react-router-dom` routes + Home arrow-key focus cycling), the 5-route table, where `lang` state lives |
| `04_COMPONENT_RULES.MD` | Component contracts per custom effect; the 3-way effect-placement rule (component-internal ref+useEffect vs. custom hook vs. pure computation module) |
| `05_ACCESSIBILITY.MD` | WCAG 2.2 AA contrast pairs, keyboard mapping, decorative-animation pattern with a worked example per new effect |
| `06_FRONTEND_STACK.MD` | React + Vite + TS + Tailwind; **no Framer Motion** — motion is CSS custom properties + native canvas/SVG/Web Animations |
| `07_ANIMATION_GUIDELINES.md` | Motion philosophy, the shared "house ease," real per-effect timing values pulled from the decoded mockup |
| `08_AGENT_ROLES.md` | Which sub-agent reads which doc |
| `09_IMPLEMENTATION_ROADMAP.md` | The full reset's phase order — current progress lives here |
| `10_PROJECT_MANIFESTO.md` | The "why" behind the design choices — not enforceable spec, not site copy |
| `11_HANDOFF_HOME.md` | Full implementation spec for Home, sourced from the decoded mockup |
| `13_ASSET_SPEC.md` | Real asset manifest — font/image origin (decoded mockup UUID, or `raw/*`) to `src/assets/` destination path |
| `14_REFORM_MOTION.md` | The REFORM/ENTER screen-transition contract (opacity-only crossfade — the mockup itself has no page-turn effect) |

`12_COLLAGE_SYSTEM.md` is retired — the old 12-col rotation grid it described isn't the mockup's real layout model. Not part of the current doc set.

When docs conflict, the later dated correction wins (docs are annotated inline with the date and reason for each change) — check for "Updated"/"SUPERSEDED" notes at the top of a doc before trusting a section further down.

### Non-negotiable conflict order

When two concerns disagree, resolve in this order: **Accessibility → Project Vision → Architecture → Developer Experience → Implementation Speed.** Never trade the first for the last. This order is why the mockup's as-decoded colors were corrected rather than ported as-is where they failed WCAG AA — see `02_DESIGN_SYSTEM.MD`'s "Corrected Contrast Pairings" section.

## Key architectural decisions to know before touching UI code
- **Color/contrast values are law, not suggestions.** `02_DESIGN_SYSTEM.MD` and `05_ACCESSIBILITY.MD` list exact hex values with measured contrast ratios. Don't reintroduce a rejected/failing value; don't invent new colors without contrast-checking and documenting the ratio the way existing entries do.
- **Rounded and circular shapes are part of the design language, not excluded.** The mockup uses `border-radius: 50%` polaroid photo frames, pill-shaped nav, circular chamber dots, and curved Voronoi cell paths (`01_ART_DIRECTION.MD`) — there is no zero-border-radius rule in this design.
- **Decorative auto-playing animations must be fully `aria-hidden`, never partially.** `docs/05_ACCESSIBILITY.MD`'s "Decorative / Auto-Playing Animations" section is the reference pattern: a rapidly auto-cycling or generative animation has no coherent screen-reader translation, so it's marked fully decorative, never receives focus, and dismisses on *any* keypress — while the host page's real content must independently carry the same information in accessible markup, and must remain legible/usable without the animation running. `05_ACCESSIBILITY.MD` has a worked example of this for each of the 5 new effects (Home Ink Flow, Profile ink-bloom + chambers, Distinctions doodles + Voronoi cells, Contact magnetic dock).
