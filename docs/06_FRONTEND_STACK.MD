# 06. Frontend Stack

> Rewritten 2026-09-21. Every version and dependency below was read directly
> from the tracked `package.json` at repo root, not carried forward from the
> prior (quarantined) doc — that doc's Framer Motion mention is explicitly
> corrected below, not repeated.

## Core

- **React 19.3** (`react` / `react-dom` `^19.3.0`)
- ~~**react-router-dom 7.18** (`^7.18.4`) — kept deliberately, see
  `03_UX_ARCHITECTURE.MD` for why routing is retained instead of the
  mockup's bare local `state.screen`.~~ **REMOVED 2026-09-23
  (`continuous-scroll-and-doodles`, task 7.6).** The five screens are now
  stacked sections of one scrolling page, so there is no routing:
  `react-router-dom` is gone from `package.json` (`dependencies` is `react` +
  `react-dom` only) and from the lockfile, and nothing in `src/`, `e2e/` or
  config imports it. Sections are addressed by URL hash instead — see
  `03_UX_ARCHITECTURE.MD`. Do not reintroduce a router without a new
  navigation decision recorded there first.
- **Vite 8.3** (`^8.3.0`) via `@vitejs/plugin-react` — dev server, build,
  and preview all go through Vite; no separate bundler.
- **TypeScript 6.0** (`^6.0.3`), project-referenced (`tsc -b`) across
  `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`. `pnpm build`
  runs `tsc -b && vite build && node scripts/copy-404.mjs`; `pnpm typecheck`
  runs `tsc -b --noEmit`.
- **Tailwind CSS 4.3** (`^4.3.3`) via `@tailwindcss/vite` — **CSS-first
  config**, no `tailwind.config.js` in this stack. Verified two ways, not
  asserted: `vite.config.ts` registers `tailwindcss()` from
  `@tailwindcss/vite` directly as a Vite plugin (no separate PostCSS/Tailwind
  config wiring), and a repo-root glob for `tailwind.config.*` returns no
  matches. Tokens/theme live in CSS (`@theme` blocks or plain CSS custom
  properties), not a JS config file. Do not reintroduce a
  `tailwind.config.js` for this project without a documented reason.

## No Framer Motion — corrected, not carried forward

An earlier planning pass mentioned Framer Motion as a possible motion
library. **It was never adopted.** `package.json` has zero `framer-motion`
dependency (verified: no match for `framer` in either `dependencies` or
`devDependencies`), and it should stay that way. Motion in this project is
**CSS custom properties plus native browser APIs** — CSS `@keyframes`/custom
properties, `<canvas>` with `requestAnimationFrame`, inline SVG (including
SMIL-free, per-frame-driven paths), and the Web Animations API where a
declarative CSS animation isn't expressive enough. The existing
`_quarantine/src/pages/home/InkFlow.tsx` is the reference precedent for this
rule in practice: it's plain CSS `@keyframes` layers, not a JS animation
library, specifically because (per that file's own comment) a CSS
`@keyframes` rule is genuinely stopped by `prefers-reduced-motion`, while a
JS-driven or SMIL-driven animation isn't automatically. Full motion timing
and philosophy live in `07_ANIMATION_GUIDELINES.md` / `14_REFORM_MOTION.md`
(a later phase) — this doc's job is only to state plainly, for anyone
scaffolding a new effect, that reaching for an animation library is not this
project's convention.

## Testing

- **Vitest 5** (`^5.0.1`) — `pnpm test` runs `vitest run`; `pnpm test:watch`
  runs `vitest` in watch mode.
- **Testing Library** — `@testing-library/react` `^16.3.3`,
  `@testing-library/jest-dom` `^7.0.1`, `@testing-library/user-event`
  `^14.6.7`, on top of `jsdom` `^30.1.0` as the DOM environment.
- **Playwright 1.63** (`@playwright/test` `^1.63.0`) — `pnpm e2e` runs
  `pnpm build && playwright test`; specs live under `e2e/` and run against a
  real production build, not the dev server.

## Lint / format

- **ESLint 10** (`^10.11.0`) with `typescript-eslint` `^8.70.0`,
  `eslint-plugin-react-hooks` `^7.1.1`, `eslint-plugin-react-refresh`
  `^0.5.7`. `pnpm lint` / `pnpm lint:fix`.
- **Prettier 3.9** (`^3.9.8`). `pnpm format` / `pnpm format:check`.
  `.prettierrc.json` and `.prettierignore` are already tracked at repo root.

## Package manager

**pnpm exclusively.** `package.json`'s `preinstall` script
(`node scripts/verify-pnpm.mjs`) blocks `npm install`/`yarn install` outright.
Do not reintroduce `package-lock.json` or any second lockfile —
`pnpm-lock.yaml` is the only one that should ever be committed.

## Build-adjacent scripts

Not third-party dependencies, but part of the stack's actual build pipeline
(`scripts/`, wired into `package.json`):

- `scripts/verify-pnpm.mjs` — the `preinstall` guard above.
- `scripts/copy-404.mjs` — runs after `vite build`, part of the GitHub Pages
  deploy shape: it copies `dist/index.html` to `dist/404.html` so Pages
  serves the app shell for an unmatched path. **Updated 2026-09-23:** with no
  router, a path URL such as `/profile` therefore renders Home (deep links
  are hashes, see `03_UX_ARCHITECTURE.MD`); the script itself is unchanged.
- `scripts/decode-mockup.mjs` — one-time/repeatable decode step for
  `mockup/*.html` into `docs/_decoded/` (see the plan and
  `13_ASSET_SPEC.md`); not part of the production build, a reading/authoring
  aid only.
- `scripts/audit.mjs` (rebuild target, see `09_IMPLEMENTATION_ROADMAP.md`) —
  wired as `pnpm run audit:collage`.

## What this doc is not

This doc states dependency facts and the "no animation library" convention
only. It does not own component boundaries (`04_COMPONENT_RULES.MD`), the
routing/navigation model (`03_UX_ARCHITECTURE.MD`), or asset pipeline details
(`13_ASSET_SPEC.md`, a parallel phase).
