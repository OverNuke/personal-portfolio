import { expect, test } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';
import { routes } from '../src/routes/registry';
import type { PageId } from '../src/routes/registry';
import { sectionId, waitForScrollSettled } from './helpers';

/**
 * Phone scroll guard (spec `mobile-visibility`, R1.6): on a touch-emulated
 * Pixel 7 the stage scales to ~0.29, so 3-4 sections overlap the viewport at
 * once. Two signals must stay coherent while scrolling by touch:
 *  - `data-offscreen` (any overlap, drives effect pausing) -- at least one
 *    section is always on screen;
 *  - the pill's `aria-current` (viewport midline, exactly one) -- always names
 *    a section that is NOT flagged off-screen.
 * And the regions that were seen collapsing to the stage background (#0a0a0a)
 * on real phones must read as their own surface.
 *
 * This runs only under the `mobile` project (playwright.config.ts).
 *
 * INCONCLUSIVE BY CONSTRUCTION for the dark flash itself: a screenshot forces a
 * full raster, so a transient un-rastered tile can never show up here, and
 * headless Chromium has no URL-bar resize. A green run only proves the
 * deterministic invariants above; the flash is judged on a real device
 * (change task 5.1). Off-screen toggle counts are RECORDED as annotations, not
 * asserted, until that gate sets a threshold.
 */

/** Touch drag length per step, in CSS px (well under one scaled section is ~257px, over half a viewport is not). */
const STEP = 300;
const MAX_STEPS = 12;
/** Luminance (0-255) of the stage background #0a0a0a is ~10; the paper/cream surfaces sit far above it. */
const DARK_STAGE_LUMINANCE = 40;

const NAV = (page: Page) => page.getByRole('navigation', { name: 'Screens' });

test.use({ reducedMotion: 'no-preference' });

/** Counts `data-offscreen` flips per section, from the first frame. */
async function recordOffscreenToggles(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const counts: Record<string, number> = {};
    (window as unknown as { __offscreenToggles: Record<string, number> }).__offscreenToggles =
      counts;
    // Observe the whole document (the sections don't exist yet when this script runs).
    new MutationObserver((records) => {
      for (const record of records) {
        const id = (record.target as Element).id;
        if (!id.startsWith('section-')) continue;
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }).observe(document, { attributes: true, attributeFilter: ['data-offscreen'], subtree: true });
  });
}

function offscreenToggles(page: Page): Promise<Record<string, number>> {
  return page.evaluate(
    () => (window as unknown as { __offscreenToggles: Record<string, number> }).__offscreenToggles,
  );
}

/**
 * A real touch drag: touchStart, a run of touchMoves, then a pause and touchEnd
 * (the pause zeroes the release velocity, so there is no fling and every step
 * moves a predictable distance). Positive `distance` scrolls down (the finger
 * moves up). This goes through Chromium's real touch-scroll path, which
 * `scrollTo` would not. `Input.synthesizeScrollGesture` is deliberately NOT
 * used: with `gestureSourceType: 'touch'` it emits touchstart/pointermove but
 * never scrolls the page in Chromium 153 (measured), so it cannot drive this.
 */
async function touchScroll(client: CDPSession, page: Page, distance: number): Promise<void> {
  const { width, height } = page.viewportSize()!;
  const x = Math.round(width / 2);
  const startY = Math.round(height / 2 + distance / 2);
  const moves = 10;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: startY }],
  });
  for (let i = 1; i <= moves; i++) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: Math.round(startY - (distance * i) / moves) }],
    });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(120);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await waitForScrollSettled(page);
}

interface Snapshot {
  scrollY: number;
  maxScrollY: number;
  offscreen: Record<string, boolean>;
  /** The section under the viewport midline, by geometry. */
  midline: string;
  /** Visible slice of each section (viewport px), clipped to the viewport. */
  visible: Record<string, { top: number; bottom: number }>;
}

function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.screen-section'));
    const midY = window.innerHeight / 2;
    const offscreen: Record<string, boolean> = {};
    const visible: Record<string, { top: number; bottom: number }> = {};
    let midline = '';
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      offscreen[section.id] = section.hasAttribute('data-offscreen');
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, window.innerHeight);
      if (bottom > top) visible[section.id] = { top, bottom };
      if (rect.top <= midY && midY < rect.bottom) midline = section.id;
    }
    return {
      scrollY: window.scrollY,
      maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
      offscreen,
      midline,
      visible,
    };
  });
}

/** Mean Rec.709 luminance (0-255) of a viewport-relative rect, decoded in-page from a real screenshot. */
async function meanLuminance(page: Page, rect: { top: number; bottom: number }): Promise<number> {
  const { width } = page.viewportSize()!;
  const png = await page.screenshot({
    clip: { x: 0, y: rect.top, width, height: rect.bottom - rect.top },
    scale: 'css',
  });
  return page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4)
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    return sum / (data.length / 4);
  }, png.toString('base64'));
}

/** Sections whose paper/photo surfaces must never read as the dark stage background (Profile is dark by design). */
const LIGHT_SURFACES: PageId[] = ['home', 'distinction'];

test('a touch scroll top to bottom and back never leaves a collapsed region or a stale nav', async ({
  page,
}) => {
  test.slow(); // real screenshots under always-on rAF effects on emulated hardware
  await recordOffscreenToggles(page);
  await page.goto('/');
  await expect(page.locator('.screen-section')).toHaveCount(routes.length);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const client = await page.context().newCDPSession(page);

  const luminances: string[] = [];

  async function checkStep(label: string): Promise<void> {
    // Both observers report a beat after the scroll settles: poll until they agree with the geometry.
    await expect
      .poll(
        async () => {
          const state = await snapshot(page);
          const notOffscreen = Object.entries(state.offscreen)
            .filter(([, off]) => !off)
            .map(([id]) => id);
          const current = await NAV(page).locator('[aria-current]').allTextContents();
          const expected = routes.find((r) => sectionId(r.pageId) === state.midline)!.navLabel;
          const problems: string[] = [];
          if (notOffscreen.length < 1) problems.push('every section is flagged off-screen');
          else if (!notOffscreen.includes(state.midline))
            problems.push(`midline section ${state.midline} is flagged off-screen`);
          if (current.length !== 1) problems.push(`${current.length} pills are current`);
          else if (current[0].trim() !== expected)
            problems.push(`current pill ${current[0]} != midline ${expected}`);
          return problems;
        },
        { message: `${label}: the two visibility signals`, timeout: 5000 },
      )
      .toEqual([]);

    const state = await snapshot(page);
    for (const pageId of LIGHT_SURFACES) {
      const slice = state.visible[sectionId(pageId)];
      if (!slice || slice.bottom - slice.top < 40) continue;
      const luminance = await meanLuminance(page, slice);
      luminances.push(`${label} ${pageId}=${luminance.toFixed(0)}`);
      expect(luminance, `${label}: ${pageId} reads as the dark stage background`).toBeGreaterThan(
        DARK_STAGE_LUMINANCE,
      );
    }
  }

  await checkStep('top');

  let steps = 0;
  for (; steps < MAX_STEPS; steps++) {
    const before = await snapshot(page);
    if (before.scrollY >= before.maxScrollY - 1) break;
    await touchScroll(client, page, STEP);
    await checkStep(`down ${steps + 1}`);
  }
  const bottom = await snapshot(page);
  // Guard against a vacuous pass: the gesture really scrolled us to the end, in several steps.
  expect(bottom.scrollY).toBeGreaterThanOrEqual(bottom.maxScrollY - 1);
  expect(steps).toBeGreaterThanOrEqual(2);

  for (let up = 0; up < MAX_STEPS; up++) {
    const before = await snapshot(page);
    if (before.scrollY <= 1) break;
    await touchScroll(client, page, -STEP);
    await checkStep(`up ${up + 1}`);
  }
  expect((await snapshot(page)).scrollY).toBeLessThanOrEqual(1);

  const toggles = await offscreenToggles(page);
  test.info().annotations.push(
    { type: 'offscreen-toggles', description: JSON.stringify(toggles) },
    { type: 'luminance', description: luminances.join(', ') },
    {
      type: 'inconclusive',
      description: 'headless cannot show the real-device dark flash; see change task 5.1',
    },
  );
});
