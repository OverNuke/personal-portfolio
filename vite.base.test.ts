import { describe, expect, it } from 'vitest';

import { resolveBase } from './vite.base';

// The Pages deploy serves a *project* site (https://<user>.github.io/<repo>/),
// so the production build must be emitted with that sub-path as Vite's `base`.
// Everything else (dev server, `pnpm preview`, the e2e/audit runs) keeps '/'.
describe('resolveBase', () => {
  it.each([undefined, '', '   ', '/'])('falls back to "/" for %j', (raw) => {
    expect(resolveBase(raw)).toBe('/');
  });

  it.each([
    ['/personal-portfolio', '/personal-portfolio/'],
    ['/personal-portfolio/', '/personal-portfolio/'],
    ['personal-portfolio', '/personal-portfolio/'],
    ['personal-portfolio/', '/personal-portfolio/'],
    ['  /personal-portfolio  ', '/personal-portfolio/'],
  ])('normalizes %j to leading + trailing slash (%j)', (raw, expected) => {
    expect(resolveBase(raw)).toBe(expected);
  });

  it('keeps nested sub-paths intact', () => {
    expect(resolveBase('/a/b')).toBe('/a/b/');
  });

  it('collapses repeated slashes', () => {
    expect(resolveBase('//personal-portfolio//')).toBe('/personal-portfolio/');
  });
});
