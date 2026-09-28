// Compile-time-only fixtures proving `Dictionary` (typed from `en`) enforces
// EN/ES key parity. Deliberately named `*.typecheck.ts`, not `*.test.ts`:
// tsconfig.app.json excludes `*.test.ts(x)` from `tsc -b --noEmit` (the
// `pnpm typecheck` script), so a `@ts-expect-error` inside an actual test
// file is checked by nothing and can never go red. This file IS included in
// the app project and is never imported anywhere, so Vite/Vitest never
// bundle or execute it -- it exists purely for `pnpm typecheck` to walk.
//
// Runtime dictionary parity (no empty strings, same key set) is covered
// separately in `dictionary.test.ts`; `pick()` behavior in `types.test.ts`.
import type { Dictionary } from './types';

// A dictionary missing a required nested key (`shell.language`) must fail.
// TS reports a missing-property error on the nested object literal itself
// (`shell: {}`), not on the `export const` line, so the directive goes here.
export const missingKey: Dictionary = {
  nav: {
    pill: {
      home: 'Home',
      profile: 'Profile',
      distinction: 'Distinctions',
      projects: 'Projects',
      contact: 'Contact',
    },
    homeList: {
      profile: 'Who me?',
      distinction: 'Distinction',
      projects: 'Projects',
      contact: 'Reach out',
    },
  },
  // @ts-expect-error -- Dictionary requires `shell.language` (and `shell.screens`/`shell.sections`)
  shell: {},
};

// A dictionary with an extra top-level key must fail (excess-property check).
export const extraKey: Dictionary = {
  nav: {
    pill: {
      home: 'Home',
      profile: 'Profile',
      distinction: 'Distinctions',
      projects: 'Projects',
      contact: 'Contact',
    },
    homeList: {
      profile: 'Who me?',
      distinction: 'Distinction',
      projects: 'Projects',
      contact: 'Reach out',
    },
  },
  shell: { screens: 'Screens', sections: 'Sections', language: 'Language' },
  // @ts-expect-error -- Dictionary has no `extra` key
  extra: 'nope',
};
