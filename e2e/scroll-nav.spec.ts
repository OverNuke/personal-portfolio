import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { routes } from '../src/routes/registry';
import type { PageId } from '../src/routes/registry';
import {
  SECTION_HEIGHT,
  VIEWPORTS,
  clickPill,
  expectSectionAtTop,
  resetToTop,
  sectionId,
  sectionTop,
  stageScale,
  waitForScrollSettled,
} from './helpers';

/**
 * Scroll navigation contract (specs `continuous-scroll-layout` "Pill-nav scroll
 * accuracy" and `nav-model` "Hash Deep Links", tasks 7.5 / 7.6 / 8.2): where a
 * pill click lands, and how the URL hash drives, and is driven by, navigation.
 *
 * The router is gone; the 5 sections are one scrolling document, and the only
 * URL state is the hash (`#home #profile #distinctions #projects #contact`).
 */

// -- Pill-nav landing ---------------------------------------------------------

for (const viewport of VIEWPORTS) {
  test.describe(`pill landing at ${viewport.width}x${viewport.height} (scale ${viewport.scale})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });

    test('each pill lands its section top at 0 +-2px', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.screen-section')).toHaveCount(5);
      expect(await stageScale(page)).toBeCloseTo(viewport.scale, 2);

      for (const route of routes) {
        await resetToTop(page);
        await clickPill(page, route.pageId);
        await expectSectionAtTop(page, route.pageId);
        await expect(
          page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: route.navLabel, exact: true }),
        ).toHaveAttribute('aria-current', 'page');
      }
    });
  });
}

test.describe('pill landing with animated (smooth) scrolling', () => {
  test.use({ viewport: { width: 1152, height: 720 }, reducedMotion: 'no-preference' });

  test('each pill still lands its section top at 0 +-2px', async ({ page }) => {
    test.slow(); // several scrolls/fresh pages under always-on rAF effects
    await page.goto('/');
    await expect(page.locator('.screen-section')).toHaveCount(5);
    for (const route of routes) {
      await resetToTop(page);
      await clickPill(page, route.pageId);
      await expectSectionAtTop(page, route.pageId);
    }
  });
});

test.describe('pill landing when the viewport is shorter than a section (aspect > 1.6:1)', () => {
  // 1152 wide => scale 0.8 => a section is 720px tall, but the viewport is only 600px. Unlike the
  // aspect-matched viewports (where "start" and "center" alignment coincide), a wrong block alignment shows here.
  test.use({ viewport: { width: 1152, height: 600 }, reducedMotion: 'reduce' });

  test('every pill still lands its section top at 0 +-2px', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.screen-section')).toHaveCount(5);
    for (const route of routes) {
      await resetToTop(page);
      await clickPill(page, route.pageId);
      await expectSectionAtTop(page, route.pageId);
    }
  });
});

test.describe('pill landing when the viewport is taller than a section (aspect < 1.6:1)', () => {
  // 1152 wide => scale 0.8 => a section is 720px tall, but the viewport is 900px.
  test.use({ viewport: { width: 1152, height: 900 }, reducedMotion: 'reduce' });

  test('Contact clamps at the document bottom (fully visible, no trailing spacer); every other section still lands at 0', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.screen-section')).toHaveCount(5);
    const scale = await stageScale(page);
    const viewportHeight = page.viewportSize()!.height;
    // Precondition of the exception: the viewport really is taller than one scaled section.
    expect(viewportHeight).toBeGreaterThan(SECTION_HEIGHT * scale);

    for (const route of routes.filter((r) => r.pageId !== 'contact')) {
      await resetToTop(page);
      await clickPill(page, route.pageId);
      await expectSectionAtTop(page, route.pageId);
    }

    await resetToTop(page);
    await clickPill(page, 'contact');
    await waitForScrollSettled(page);
    const contact = await page.evaluate(() => {
      const rect = document.getElementById('section-contact')!.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, docBottom: document.documentElement.scrollHeight - window.scrollY };
    });
    // Whole section visible, bottom-aligned to the viewport: top cannot reach 0 without dead space.
    expect(contact.bottom).toBeCloseTo(viewportHeight, 0);
    expect(contact.top).toBeGreaterThanOrEqual(0);
    expect(contact.top).toBeCloseTo(viewportHeight - SECTION_HEIGHT * scale, 0);
    // ...and the document ends exactly where Contact does (nothing trailing it).
    expect(contact.docBottom).toBeCloseTo(contact.bottom, 0);
  });
});

// -- Hash deep links ----------------------------------------------------------

/** Every scroll position the page reports, from the very first frame, so a smooth animation is distinguishable from an instant jump. */
async function recordScrollPositions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log: number[] = [];
    (window as unknown as { __scrollLog: number[] }).__scrollLog = log;
    window.addEventListener('scroll', () => log.push(window.scrollY), { passive: true });
  });
}

function scrollLog(page: Page): Promise<number[]> {
  return page.evaluate(() => (window as unknown as { __scrollLog: number[] }).__scrollLog.slice());
}

const liveText = (page: Page) => page.locator('[aria-live="polite"]');

/** Focus is on THIS section's own heading (each of the 5 screens carries its own `[data-screen-heading]`). */
async function expectHeadingFocused(page: Page, pageId: PageId): Promise<void> {
  await expect(page.locator(`#${sectionId(pageId)} [data-screen-heading]`)).toBeFocused();
}

for (const viewport of VIEWPORTS) {
  test.describe(`hash deep links at ${viewport.width}x${viewport.height}`, () => {
    // Motion ON: under reduced motion `behavior: 'auto'` is instant too, which would make the instant-load check prove nothing.
    test.use({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'no-preference' });

    for (const route of routes) {
      const hash = route.hash;
      test(`a fresh load of /${hash} lands instantly at the section top, focused and announced`, async ({ page }) => {
        await recordScrollPositions(page);
        // A fresh page => a real load (a same-page goto to another hash would be a same-document navigation).
        await page.goto(`/${hash}`);

        await expectSectionAtTop(page, route.pageId);
        const index = routes.indexOf(route);
        const target = index * SECTION_HEIGHT * viewport.scale;
        // Instant: the only positions ever reported are the start and the destination -- a smooth animation would log intermediates.
        const positions = await scrollLog(page);
        for (const y of positions) {
          expect(Math.abs(y - 0) < 1 || Math.abs(y - target) < 1, `intermediate scrollY ${y} while loading ${hash}`).toBe(true);
        }
        if (index > 0) expect(positions.length).toBeGreaterThan(0);

        await expectHeadingFocused(page, route.pageId);
        await expect(liveText(page)).toHaveText(`${route.navLabel}.`);
        await expect(
          page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: route.navLabel, exact: true }),
        ).toHaveAttribute('aria-current', 'page');
        expect(new URL(page.url()).hash).toBe(hash);
      });
    }
  });
}

test.describe('hash navigation', () => {
  test.use({ viewport: { width: 1152, height: 720 }, reducedMotion: 'no-preference' });

  test('control: a pill click animates (so the instant-load check above can tell the difference)', async ({ page }) => {
    await recordScrollPositions(page);
    await page.goto('/');
    await expect(page.locator('.screen-section')).toHaveCount(5);
    await clickPill(page, 'projects');
    await expectSectionAtTop(page, 'projects');
    const positions = await scrollLog(page);
    const target = 3 * SECTION_HEIGHT * 0.8;
    expect(positions.some((y) => y > 1 && Math.abs(y - target) > 1)).toBe(true);
  });

  test('a pill click pushes the section hash and Back walks the history', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.screen-section')).toHaveCount(5);
    const historyBefore = await page.evaluate(() => history.length);

    await clickPill(page, 'profile');
    await expectSectionAtTop(page, 'profile');
    expect(new URL(page.url()).hash).toBe('#profile');

    await clickPill(page, 'distinction');
    await expectSectionAtTop(page, 'distinction');
    expect(new URL(page.url()).hash).toBe('#distinctions');
    expect(await page.evaluate(() => history.length)).toBe(historyBefore + 2);

    // Re-activating the same section scrolls but does not stack a duplicate entry.
    await clickPill(page, 'distinction');
    expect(await page.evaluate(() => history.length)).toBe(historyBefore + 2);

    await page.goBack();
    await expect.poll(() => new URL(page.url()).hash).toBe('#profile');
    await expectSectionAtTop(page, 'profile');
    await expectHeadingFocused(page, 'profile');

    await page.goBack();
    await expect.poll(() => new URL(page.url()).hash).toBe('');
    await expectSectionAtTop(page, 'home');

    await page.goForward();
    await expect.poll(() => new URL(page.url()).hash).toBe('#profile');
    await expectSectionAtTop(page, 'profile');
  });

  test('an unknown hash falls back to Home without error, focus or announcement', async ({ page }) => {
    test.slow(); // several scrolls/fresh pages under always-on rAF effects
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(String(error)));

    for (const hash of ['#nonexistent', '#', '#section-profile']) {
      // A fresh page per hash: this is the LOAD behavior (a same-page goto would be a hashchange, which announces Home).
      const fresh = await page.context().newPage();
      await fresh.goto(`/${hash}`);
      await expect(fresh.locator('.screen-section')).toHaveCount(5);
      await waitForScrollSettled(fresh);
      expect(await fresh.evaluate(() => window.scrollY), hash).toBe(0);
      await expectSectionAtTop(fresh, 'home');
      await expect(liveText(fresh)).toHaveText('');
      expect(await fresh.evaluate(() => document.activeElement === document.body), hash).toBe(true);
      await expect(fresh.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: 'Home', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await fresh.close();
    }

    // A hand-edited hash that stops naming a section returns to Home as well.
    await page.goto('/#contact');
    await expectSectionAtTop(page, 'contact');
    await page.evaluate(() => {
      location.hash = '#nope';
    });
    await expectSectionAtTop(page, 'home');
    expect(errors).toEqual([]);
  });

  test('a hand-edited hash scrolls to the named section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.screen-section')).toHaveCount(5);
    await page.evaluate(() => {
      location.hash = '#contact';
    });
    await expectSectionAtTop(page, 'contact');
    await expectHeadingFocused(page, 'contact');
  });

  test('manual scrolling moves the active pill but never the hash, focus, history or live region', async ({ page }) => {
    await page.goto('/#home');
    await expect(page.locator('.screen-section')).toHaveCount(5);
    await expectSectionAtTop(page, 'home');
    await expectHeadingFocused(page, 'home');
    const historyBefore = await page.evaluate(() => history.length);

    // Scroll by hand into the middle of Distinctions (instant, so this is not a nav activation).
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), 2 * SECTION_HEIGHT * 0.8 + 200);
    await waitForScrollSettled(page);
    await expect(page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: 'Distinctions', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );

    expect(new URL(page.url()).hash).toBe('#home');
    expect(await page.evaluate(() => history.length)).toBe(historyBefore);
    await expectHeadingFocused(page, 'home');
    await expect(liveText(page)).toHaveText('Home.');
    expect(await sectionTop(page, 'distinction')).toBeLessThan(0);
  });
});

// -- Legacy path URLs ---------------------------------------------------------

test.describe('legacy path URLs (spec `nav-model` Hash Deep Links, scenario (f))', () => {
  // Motion ON, like the hash deep-link tests: an (unwanted) animated scroll would also show up as scrollY != 0.
  test.use({ viewport: { width: 1152, height: 720 }, reducedMotion: 'no-preference' });

  // The removed per-screen routes. The site is static (no server-side rewrite), so the host serves the app shell for
  // them and the page must simply be Home: no redirect, no error, no focus/announcement, no hash added.
  for (const path of ['/profile', '/distinction', '/projects']) {
    test(`a fresh load of ${path} renders Home at the top without redirect or error`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(String(error)));

      await page.goto(path);
      // The app really rendered (this is not an error/blank page).
      await expect(page.locator('.screen-section')).toHaveCount(5);
      await waitForScrollSettled(page);

      // Home, at the top of the document.
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await expectSectionAtTop(page, 'home');
      await expect(
        page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: 'Home', exact: true }),
      ).toHaveAttribute('aria-current', 'page');

      // No redirect: the URL is exactly what was requested, no hash was added or rewritten.
      const url = new URL(page.url());
      expect(url.pathname).toBe(path);
      expect(url.hash).toBe('');

      // Loading is not an explicit activation: focus stays where a fresh page leaves it and nothing is announced.
      expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
      await expect(liveText(page)).toHaveText('');

      expect(errors).toEqual([]);
    });
  }
});
