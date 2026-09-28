// Compile-time-only fixture proving `CertId` (distinctionsData.ts, Phase
// 4.2) is a closed union, not a bare `string`. Deliberately named
// `*.typecheck.ts`, not `*.test.ts`: tsconfig.app.json excludes
// `*.test.ts(x)` from `tsc -b --noEmit` (the `pnpm typecheck` script), so a
// `@ts-expect-error` inside an actual test file is checked by nothing and
// can never go red (Phase 1 config note, `src/i18n/types.typecheck.ts`).
// This file IS included in the app project and is never imported anywhere,
// so Vite/Vitest never bundle or execute it.
//
// Runtime coverage (every real id is one of the 9, non-empty localized
// fields) lives in `distinctionsData.test.ts`.
import type { CertId } from './distinctionsData';

// A typo'd/invalid cert id must fail to satisfy `CertId`. RED confirmed by
// temporarily deleting the `@ts-expect-error` line and re-running
// `pnpm typecheck`: TS2322 "not-a-real-cert is not assignable to CertId" (the
// genuine-RED technique here, since the pre-Phase-4.2 file didn't exist to
// `git show HEAD:` back to -- there's nothing to temporarily revert to).
// @ts-expect-error -- "not-a-real-cert" is not one of the 9 CertId literals
export const invalidId: CertId = 'not-a-real-cert';

// Every real id is a valid CertId (sanity check the union actually contains
// these -- if a real id were ever removed from the union by mistake, this
// line would start failing).
export const validIds: CertId[] = [
  'anfeca',
  'nota',
  'exaver',
  'english',
  'toefl',
  'powerbi',
  'ai',
  'aiinit',
  'propadeutic',
];
