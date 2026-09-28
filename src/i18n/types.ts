import type { en } from './en';

export type Lang = 'en' | 'es';

/**
 * Central UI/page-copy dictionary shape, derived from `en` (the source of
 * truth): `es.ts`'s `const es: Dictionary = {...}` makes a missing OR extra
 * key a TypeScript error (missing-property / excess-property checks), not a
 * runtime gap discovered later. See `types.typecheck.ts` for the compile-time
 * proof and `dictionary.test.ts` for the matching runtime guard.
 */
export type Dictionary = typeof en;

/**
 * Per-item content co-located in the data modules (e.g. a cert's title),
 * as opposed to `Dictionary`'s central chrome/page copy. One value per
 * locale, both required.
 */
export type Localized<T> = Record<Lang, T>;

/** Resolves a `Localized<T>` to its active-locale value. */
export function pick<T>(value: Localized<T>, lang: Lang): T {
  return value[lang];
}

/**
 * Interpolates `{placeholder}` tokens in a dictionary template string.
 * Needed wherever a translated sentence embeds a per-item value (e.g. a
 * cert title) -- string concatenation (`prefix + value`) can't be used
 * since Spanish word order isn't guaranteed to match English's. An unknown
 * placeholder is left as literal text rather than throwing, so a template
 * typo degrades gracefully instead of crashing the render.
 */
export function format(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? params[key] : match,
  );
}
