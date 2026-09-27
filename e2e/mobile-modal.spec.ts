import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/**
 * Phone lightbox guard (spec `scan-modal-mobile`, R2.1/R2.2): the Distinctions
 * ScanModal is portaled to <body>, OUTSIDE the scaled stage, so at phone widths
 * it lays out in real CSS px (the one recorded exception to the fixed 1440px
 * design width). At <= 640px it must fit the viewport, cause no horizontal
 * overflow, keep a >= 44x44 close control reachable, and give the scan an
 * intrinsic height (not the desktop absolute-fill, which collapses the plate).
 *
 * Runs only under the `mobile` project (playwright.config.ts). `anfeca` is the
 * scan-bearing cell it opens; the placeholder branch probes whichever cells
 * have no scan yet, so it does not depend on which plates exist.
 */

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
/** Cells that may still lack a scan (the placeholder branch); any that has one is skipped. */
const MAYBE_PLACEHOLDER = ['aiinit', 'powerbi', 'ai', 'propadeutic'];

test.use({ reducedMotion: 'no-preference' });

const dialog = (page: Page) => page.getByRole('dialog');

async function openCell(page: Page, id: string): Promise<Locator> {
  await page.goto('/#distinctions');
  const cell = page.locator(`#section-distinction [data-card="${id}"]`);
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  await expect(dialog(page)).toBeVisible();
  return cell;
}

/** Bounding boxes and overflow, measured in the page (real CSS px, no stage scale). */
function measure(page: Page) {
  return page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        w: r.width,
        h: r.height,
      };
    };
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      dialog: box(document.querySelector('[role="dialog"]')),
      close: box(document.querySelector('.distinctions-modal__close')),
      img: box(document.querySelector('.distinctions-modal__scan')),
      plate: box(document.querySelector('.distinctions-modal__plate')),
      link: box(document.querySelector('.distinctions-modal__open')),
      scanPosition: document.querySelector('.distinctions-modal__scan')
        ? getComputedStyle(document.querySelector('.distinctions-modal__scan')!).position
        : null,
    };
  });
}

test.describe('phone (390px)', () => {
  test.use({ viewport: PHONE });

  test('a scan-bearing cell opens a lightbox that fits, does not overflow, and keeps its controls reachable', async ({
    page,
  }) => {
    test.slow();
    await openCell(page, 'anfeca');
    const image = page.locator('.distinctions-modal__scan');
    await expect(image).toBeVisible();
    // Wait for the real pixels: an image with no intrinsic size yet has no height to measure.
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);

    const m = await measure(page);
    const d = m.dialog!;
    // The dialog sits inside the viewport horizontally ...
    expect(d.left).toBeGreaterThanOrEqual(0);
    expect(d.right).toBeLessThanOrEqual(PHONE.width);
    // ... its top is reachable (never scrolled/clipped above the fold) ...
    expect(d.top).toBeGreaterThanOrEqual(0);
    // ... and the page has no horizontal overflow.
    expect(m.scrollWidth).toBeLessThanOrEqual(PHONE.width);

    // The close control is on screen and a >= 44x44 target (WCAG 2.5.5 / mobile a11y).
    const c = m.close!;
    expect(c.w).toBeGreaterThanOrEqual(44);
    expect(c.h).toBeGreaterThanOrEqual(44);
    expect(c.left).toBeGreaterThanOrEqual(0);
    expect(c.right).toBeLessThanOrEqual(PHONE.width);

    // The scan gets its intrinsic height, not a collapsed absolute-fill: the box keeps the
    // image's own aspect ratio (a letterboxed fill box would not) and the plate wraps it.
    // (Not an absolute px floor: a landscape plate like anfeca's is only ~215px tall at 390.)
    const img = m.img!;
    const natural = await image.evaluate(
      (el: HTMLImageElement) => el.naturalWidth / el.naturalHeight,
    );
    expect(img.h).toBeGreaterThan(150);
    expect(Math.abs(img.w / img.h - natural) / natural).toBeLessThan(0.02);
    expect(m.plate!.h).toBeLessThanOrEqual(img.h + 1);

    // The "Open full size" escape hatch is a >= 44px target too, and inside the viewport.
    const l = m.link!;
    expect(l.h).toBeGreaterThanOrEqual(44);
    expect(l.left).toBeGreaterThanOrEqual(0);
    expect(l.right).toBeLessThanOrEqual(PHONE.width);
  });

  test('the close control is reachable: scrolling the overlay brings it fully into view', async ({
    page,
  }) => {
    test.slow();
    await openCell(page, 'anfeca');
    const close = page.getByRole('button', { name: 'Close scan viewer' });
    await close.scrollIntoViewIfNeeded();
    const box = await close.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE.height);
    await close.click();
    await expect(dialog(page)).toBeHidden();
  });

  test('the placeholder branch (a cell with no scan) fits and does not overflow', async ({
    page,
  }) => {
    test.slow();
    let opened: string | null = null;
    for (const id of MAYBE_PLACEHOLDER) {
      await openCell(page, id);
      if ((await page.locator('.distinctions-modal__scan').count()) === 0) {
        opened = id;
        break;
      }
      await page.keyboard.press('Escape');
    }
    test.skip(opened === null, 'every cell has a scan: no placeholder branch left to exercise');

    await expect(page.getByText('Scan not yet available')).toBeVisible();
    // No scan, so no "Open full size" link.
    await expect(page.locator('.distinctions-modal__open')).toHaveCount(0);

    const m = await measure(page);
    const d = m.dialog!;
    expect(d.left).toBeGreaterThanOrEqual(0);
    expect(d.right).toBeLessThanOrEqual(PHONE.width);
    expect(d.top).toBeGreaterThanOrEqual(0);
    expect(m.scrollWidth).toBeLessThanOrEqual(PHONE.width);
    expect(m.close!.w).toBeGreaterThanOrEqual(44);
    expect(m.close!.h).toBeGreaterThanOrEqual(44);
    expect(m.close!.bottom).toBeLessThanOrEqual(PHONE.height);
  });
});

test.describe('desktop width (1280px), unchanged', () => {
  test.use({ viewport: DESKTOP });

  test('the lightbox keeps its centred 720px dialog and absolute-fill scan', async ({ page }) => {
    test.slow();
    await openCell(page, 'anfeca');
    const m = await measure(page);
    const d = m.dialog!;
    expect(d.w).toBe(720);
    // Centred horizontally in the viewport.
    expect(Math.abs(d.left - (DESKTOP.width - 720) / 2)).toBeLessThanOrEqual(1);
    // The desktop plate still fills absolutely, and the whole dialog fits the viewport.
    expect(m.scanPosition).toBe('absolute');
    expect(d.top).toBeGreaterThanOrEqual(0);
    expect(d.bottom).toBeLessThanOrEqual(DESKTOP.height);
    expect(m.scrollWidth).toBeLessThanOrEqual(DESKTOP.width);
  });
});
