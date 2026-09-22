import { expect, test } from '@playwright/test';
import { routes } from '../src/routes/registry';

/**
 * Smoke suite -- fast, broad, shallow (per docs/09's phasing note: the deep
 * accessibility pass lives in an ad-hoc Playwright driver run once during
 * that phase, not duplicated here as a committed suite). Rewritten against
 * the real 5-route shell (`src/routes/registry.ts`) after the full-reset
 * rebuild -- the quarantined version (`_quarantine/e2e/smoke.spec.ts`)
 * targeted the old 4-module overlay shell's `role="banner"`/"Modules" nav/
 * `role="dialog"` module pattern, none of which exist anymore.
 *
 * Covers exactly: every route loads clean, the pill nav reaches every
 * screen, Home's nav list + EN/ES toggle work, the Distinctions lightbox
 * opens/closes, and one basic keyboard-navigation path. Anything deeper
 * (full keyboard traversal, reduced-motion, contrast, decorative-layer
 * aria-hidden audits) is Part A's job, not this file's.
 */

test.describe('routes load clean', () => {
  for (const route of routes) {
    test(`${route.path} loads without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(String(err)));

      await page.goto(route.path);
      await expect(page.locator('[data-screen-heading]')).toBeVisible();

      expect(errors).toEqual([]);
    });
  }
});

test('pill nav reaches every screen', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Screens' });

  for (const route of routes) {
    await nav.getByRole('button', { name: route.navLabel, exact: true }).click();
    await expect(page).toHaveURL(route.path);
    await expect(page.getByTestId(`screen-${route.pageId}`)).toBeVisible();
  }
});

test('Home nav list navigates and EN/ES toggle switches language', async ({ page }) => {
  await page.goto('/');

  const enButton = page.getByRole('button', { name: 'EN' });
  const esButton = page.getByRole('button', { name: 'ES' });
  await expect(enButton).toHaveAttribute('aria-pressed', 'true');

  await esButton.click();
  await expect(esButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: /¿Yo\?/ })).toBeVisible();

  await page.getByRole('link', { name: /¿Yo\?/ }).click();
  await expect(page).toHaveURL('/profile');
});

test('Distinctions lightbox opens and closes', async ({ page }) => {
  await page.goto('/distinction');

  await page.locator('[role="button"][data-card]').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('keyboard: Tab reaches the pill nav and Enter navigates', async ({ page }) => {
  await page.goto('/');

  const profileButton = page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: 'Profile' });
  await profileButton.focus();
  await expect(profileButton).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/profile');
});
