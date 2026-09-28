import { describe, expect, it } from 'vitest';
import { en } from './en';
import { es } from './es';

/** Recursively collects dot-joined leaf paths of a nested string dictionary. */
function leafPaths(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      leafPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  throw new Error(`Unexpected non-string, non-object dictionary leaf at "${prefix}"`);
}

function valueAt(dict: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], dict);
}

describe('en/es dictionary parity (backs the TS Dictionary/typeof en check)', () => {
  it('has an identical set of leaf key paths in both locales', () => {
    expect(leafPaths(es).sort()).toEqual(leafPaths(en).sort());
  });

  it('has no empty-string values in en', () => {
    for (const path of leafPaths(en)) {
      expect(valueAt(en, path), `en.${path} should not be empty`).not.toBe('');
    }
  });

  it('has no empty-string values in es', () => {
    for (const path of leafPaths(es)) {
      expect(valueAt(es, path), `es.${path} should not be empty`).not.toBe('');
    }
  });
});
