import { describe, expect, it } from 'vitest';
import { routes } from '../routes/registry';
import type { PageId } from '../routes/registry';
import { pageIdFromHash, sectionHash } from './sectionHash';

describe('sectionHash (page id -> URL hash)', () => {
  it.each<[PageId, string]>([
    ['home', '#home'],
    ['profile', '#profile'],
    ['distinction', '#distinctions'],
    ['projects', '#projects'],
    ['contact', '#contact'],
  ])('%s -> %s', (pageId, hash) => {
    expect(sectionHash(pageId)).toBe(hash);
  });

  it('gives every section in the registry a distinct hash', () => {
    const hashes = routes.map((route) => sectionHash(route.pageId));
    expect(new Set(hashes).size).toBe(routes.length);
  });
});

describe('pageIdFromHash (URL hash -> page id)', () => {
  it.each<[string, PageId]>([
    ['#home', 'home'],
    ['#profile', 'profile'],
    ['#distinctions', 'distinction'],
    ['#projects', 'projects'],
    ['#contact', 'contact'],
  ])('%s -> %s', (hash, pageId) => {
    expect(pageIdFromHash(hash)).toBe(pageId);
  });

  it('round-trips every registry entry', () => {
    for (const route of routes) {
      expect(pageIdFromHash(sectionHash(route.pageId))).toBe(route.pageId);
    }
  });

  it('is case-insensitive (a hand-typed #Projects still resolves)', () => {
    expect(pageIdFromHash('#Projects')).toBe('projects');
    expect(pageIdFromHash('#CONTACT')).toBe('contact');
  });

  it.each(['', '#', '#foo', '#distinction', '#section-profile', '/profile', 'profile', '#profile?x=1', '#profile/extra'])(
    'returns null for the unknown/empty hash %j',
    (hash) => {
      expect(pageIdFromHash(hash)).toBeNull();
    },
  );
});
