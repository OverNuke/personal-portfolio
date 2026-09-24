import { routes } from '../routes/registry';
import type { PageId } from '../routes/registry';

/** The section's deep-link hash, e.g. `'distinction'` -> `'#distinctions'`. */
export function sectionHash(pageId: PageId): string {
  return routes.find((route) => route.pageId === pageId)?.hash ?? '';
}

/**
 * The section a URL hash names, or `null` for an empty/unknown hash (callers
 * treat that as "Home"). Exact match on the registry's hash, compared
 * case-insensitively so a hand-typed `#Projects` still lands; deliberately
 * nothing looser -- no prefix/query tolerance, no legacy path or
 * `#section-*` support.
 */
export function pageIdFromHash(hash: string): PageId | null {
  const wanted = hash.toLowerCase();
  return routes.find((route) => route.hash === wanted)?.pageId ?? null;
}
