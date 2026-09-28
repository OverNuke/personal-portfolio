import { describe, expect, it } from 'vitest';
import { format, pick } from './types';
import type { Localized } from './types';

describe('pick (resolves a Localized<T> for the active locale)', () => {
  const greeting: Localized<string> = { en: 'Hello', es: 'Hola' };

  it('returns the en value for lang "en"', () => {
    expect(pick(greeting, 'en')).toBe('Hello');
  });

  it('returns the es value for lang "es"', () => {
    expect(pick(greeting, 'es')).toBe('Hola');
  });

  it('works for non-string T too (e.g. a Localized<number>)', () => {
    const count: Localized<number> = { en: 1, es: 2 };
    expect(pick(count, 'en')).toBe(1);
    expect(pick(count, 'es')).toBe(2);
  });
});

describe('format (interpolates a {placeholder} template, word-order-safe across locales)', () => {
  it('substitutes a single placeholder', () => {
    expect(format('Open scan — {title}', { title: 'ANFECA' })).toBe('Open scan — ANFECA');
  });

  it('substitutes multiple placeholders regardless of template order', () => {
    expect(format('{a} then {b}', { a: 'X', b: 'Y' })).toBe('X then Y');
    expect(format('{b} then {a}', { a: 'X', b: 'Y' })).toBe('Y then X');
  });

  it('leaves an unknown placeholder untouched instead of throwing', () => {
    expect(format('Hello {name}', {})).toBe('Hello {name}');
  });

  it('is a no-op on a template with no placeholders', () => {
    expect(format('plain text', { unused: 'x' })).toBe('plain text');
  });
});
