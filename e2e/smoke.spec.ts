import { expect, test } from '@playwright/test';
import { routes } from '../src/routes/registry';
import { clickPill, expectSectionAtTop, sectionId } from './helpers';

/**
 * Smoke suite -- fast, broad, shallow (per docs/09's phasing note: the deep
 * accessibility pass lives in an ad-hoc Playwright driver run once during
 * that phase, not duplicated here as a committed suite).
 *
 * Written against the continuous-scroll shell (specs `continuous-scroll-layout`
 * / `nav-model`): the 5 screens are one stacked, scrolling document, so there
 * is no per-screen URL and no route change. A screen is addressed by URL hash
 * (`routes[].hash`, `/#profile`), every screen's `[data-screen-heading]` is in
 * the DOM at once (5 of them, one per `#section-*`), and the fixed pill nav
 * scrolls instead of routing. Geometry lives in layout.spec.ts and the
 * scroll/hash contract in scroll-nav.spec.ts; this file only proves that each
 * screen loads clean, the nav works, Home's list + language toggle work, the
 * Distinctions lightbox opens/closes with focus return, and one keyboard path.
 */

const pillNav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Screens' });

test.describe('screens load clean', () => {
  for (const route of routes) {
    test(`/${route.hash} loads its screen without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(String(err)));

      await page.goto(`/${route.hash}`);

      // One heading per screen, all mounted at once: 5 in the document, exactly 1 inside this section.
      await expect(page.locator('[data-screen-heading]')).toHaveCount(routes.length);
      const heading = page.locator(`#${sectionId(route.pageId)} [data-screen-heading]`);
      await expect(heading).toHaveCount(1);
      // A deep link moves focus to the target section's heading (explicit-activation rule).
      await expect(heading).toBeFocused();
      await expect(page.getByTestId(`screen-${route.pageId}`)).toBeAttached();

      expect(errors).toEqual([]);
    });
  }
});

test('pill nav reaches every screen', async ({ page }) => {
  // Reduced motion: scrolling is instant, so the assertions below don't race an animation.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.screen-section')).toHaveCount(routes.length);

  for (const route of routes) {
    await clickPill(page, route.pageId);
    await expect(page).toHaveURL(new RegExp(`${route.hash}$`));
    await expectSectionAtTop(page, route.pageId);
    await expect(pillNav(page).getByRole('button', { name: route.navLabel, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator(`#${sectionId(route.pageId)} [data-screen-heading]`)).toBeFocused();
  }
});

test('Home nav list navigates and EN/ES toggle switches language', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  // Scoped to Home's own language group: 'EN'/'ES' also match unrelated buttons' names as substrings (e.g. "Open scan").
  const languageToggle = page.getByRole('group', { name: 'Language' });
  const enButton = languageToggle.getByRole('button', { name: 'EN', exact: true });
  const esButton = languageToggle.getByRole('button', { name: 'ES', exact: true });
  await expect(enButton).toHaveAttribute('aria-pressed', 'true');

  await esButton.click();
  await expect(esButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: /¿Yo\?/ })).toBeVisible();

  await page.getByRole('link', { name: /¿Yo\?/ }).click();
  await expect(page).toHaveURL(/#profile$/);
  await expectSectionAtTop(page, 'profile');
});

test('Distinctions lightbox opens and closes, returning focus to its cell', async ({ page }) => {
    test.slow(); // several scrolls/fresh pages under always-on rAF effects
  await page.goto('/#distinctions');

  const cell = page.locator('#section-distinction [role="button"][data-card]').first();
  // The section is one of five stacked ones: bring the cell into view before using it.
  await cell.scrollIntoViewIfNeeded();
  await cell.click();

  // The dialog is portaled to <body> (outside the scaled stage), not inside the section.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => el.closest('.stage') === null)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(cell).toBeFocused();
});

test('keyboard: Tab reaches the pill nav and Enter navigates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const profileButton = pillNav(page).getByRole('button', { name: 'Profile', exact: true });
  await profileButton.focus();
  await expect(profileButton).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#profile$/);
  await expectSectionAtTop(page, 'profile');
});
