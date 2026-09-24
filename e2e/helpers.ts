import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { routes } from '../src/routes/registry';
import type { PageId } from '../src/routes/registry';

/**
 * Shared measurement helpers for the continuous-scroll e2e specs
 * (layout.spec.ts, scroll-nav.spec.ts, smoke.spec.ts).
 *
 * The shell is a fixed-1440px-wide stage of five `min-height: 900px` sections,
 * uniformly scaled by `viewport width / 1440` (src/shell/useStageScale.ts). Two
 * coordinate frames therefore coexist: layout px (`clientHeight`,
 * `offsetTop`, ... -- unscaled, what the CSS says) and viewport px
 * (`getBoundingClientRect()` -- multiplied by the stage scale). Helpers below
 * say which one they return.
 */

/** Section design height (spec `continuous-scroll-layout`: the 900px floor). */
export const SECTION_HEIGHT = 900;
export const STAGE_WIDTH = 1440;

/**
 * The three aspect-matched (16:10) viewports the spec's landing numbers are
 * pinned at: stage scale 1.0 / 0.8 / 0.6. At 16:10 the viewport is exactly one
 * scaled section tall, so every section (Contact included) can reach the
 * viewport top.
 */
export const VIEWPORTS = [
  { width: 1440, height: 900, scale: 1 },
  { width: 1152, height: 720, scale: 0.8 },
  { width: 864, height: 540, scale: 0.6 },
] as const;

/** DOM id of a section (`SectionNavContext.sectionDomId`). */
export function sectionId(pageId: PageId): string {
  return `section-${pageId}`;
}

/** Top edge of a section in viewport px (0 == flush with the viewport top). */
export function sectionTop(page: Page, pageId: PageId): Promise<number> {
  return page.evaluate((id) => document.getElementById(id)!.getBoundingClientRect().top, sectionId(pageId));
}

/** Resolves once `window.scrollY` has held still for `frames` consecutive animation frames. */
export function waitForScrollSettled(page: Page, frames = 10): Promise<void> {
  return page.evaluate(
    (needed) =>
      new Promise<void>((resolve) => {
        let last = Number.NaN;
        let stable = 0;
        const tick = () => {
          const y = window.scrollY;
          if (y === last) stable += 1;
          else {
            stable = 0;
            last = y;
          }
          if (stable >= needed) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    frames,
  );
}

/**
 * Web-first check that a section's top edge lands at the viewport top (+-2px,
 * the spec's tolerance) and STAYS there once scrolling has settled -- polling
 * (not a sleep) so it holds for smooth and instant scrolls alike.
 */
export async function expectSectionAtTop(page: Page, pageId: PageId): Promise<void> {
  await expect.poll(async () => Math.abs(await sectionTop(page, pageId)), { timeout: 8000 }).toBeLessThanOrEqual(2);
  await waitForScrollSettled(page);
  expect(Math.abs(await sectionTop(page, pageId))).toBeLessThanOrEqual(2);
}

/** Click a pill-nav button by its registry label. */
export async function clickPill(page: Page, pageId: PageId): Promise<void> {
  const route = routes.find((r) => r.pageId === pageId)!;
  await page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: route.navLabel, exact: true }).click();
}

/** Instantly jump to the top of the document and wait for the pill to follow (Home active). */
export async function resetToTop(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await waitForScrollSettled(page);
}

/** Uniform stage scale actually applied (viewport px per layout px). */
export function stageScale(page: Page): Promise<number> {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.stage')!;
    return stage.getBoundingClientRect().width / stage.offsetWidth;
  });
}

/**
 * Force one screen root to a taller min-height (the spec supports "any height
 * >= 900"; heights BELOW 900 are explicitly unsupported and are never forced
 * here) and wait for the height-tracking machinery -- the ResizeObservers in
 * Distinctions / Projects, and layout itself -- to settle on the new size.
 */
export async function forceScreenHeight(page: Page, rootSelector: string, height: number): Promise<void> {
  await page.evaluate(
    ({ selector, px }) => {
      document.querySelector<HTMLElement>(selector)!.style.minHeight = `${px}px`;
    },
    { selector: rootSelector, px: height },
  );
  await expect
    .poll(() => page.evaluate((selector) => document.querySelector<HTMLElement>(selector)!.clientHeight, rootSelector))
    .toBe(height);
  // The ResizeObserver callbacks run at the next frame boundary; let two frames pass.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
