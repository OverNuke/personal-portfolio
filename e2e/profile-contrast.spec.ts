import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { contrastRatio } from '../src/pages/profile/contrast';
import type { RGB } from '../src/pages/profile/contrast';
import { expectSectionAtTop } from './helpers';

/**
 * Real-browser pin for the chamber-01 acrostic-initial contrast gate (spec
 * `profile-acrostic`, decision #522, design `sdd/profile-acrostic-i18n`,
 * Phase 6 task 6.2).
 *
 * `src/pages/profile/contrast.test.ts` (vitest) already pins the ratio via
 * pure CSS-gradient + radial-glow math re-derived from the stylesheet
 * source (5.15:1 at chamber 1) -- but that module has no way to see
 * `InkBloomCanvas` (`.profile-ink-canvas { mix-blend-mode: exclusion }`,
 * profile.css), which paints ON TOP of the gradient+glow composite the
 * vitest pin measures. That canvas is the one contribution to the real
 * rendered backdrop static CSS math can never account for -- a risk
 * carried forward since batch 3b ("do not treat the static gradient+glow
 * composite numbers as the final real-browser floor").
 *
 * This test is that missing real-browser measurement: it opens a real
 * Chromium page under reduced motion, fuses chamber 1 (hover -- the fused
 * word, and the initial letter it wraps, ship `opacity: 0` at rest and only
 * become visible on hover/focus/bonded, Chamber.tsx), and samples the
 * ACTUAL painted pixels next to the "K" initial, not a recomputed value.
 */
test('chamber 01 initial-letter contrast holds >= 4.5:1 against the real rendered backdrop', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#profile');
  await expectSectionAtTop(page, 'profile');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  const chamber = page.locator('.profile-chamber').first();
  // Fusion previews on hover (Chamber.tsx's onEnter -> state 'binding'),
  // which is when `.profile-chamber__fused` (and the initial letter inside
  // it) actually becomes visible -- it ships `opacity: 0` at rest.
  await chamber.hover();
  const fusedWord = chamber.locator('.profile-chamber__fused');
  await expect(fusedWord).toHaveCSS('opacity', '1');
  // profile.css's reduced-motion block collapses the fusion opacity/transform
  // transition to 0.01ms; two frames is ample settle time regardless.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

  const initialColor = await page.evaluate(() => {
    const el = document.querySelector('.profile-chamber__initial');
    if (!el) throw new Error('.profile-chamber__initial not found after hovering chamber 1.');
    return getComputedStyle(el).color;
  });
  const foreground = parseRgbString(initialColor);

  // Sample the real backdrop in the gap between the (always-visible)
  // chamber index label (top: 14px) and the (now-visible) fused word
  // (top: 48px) -- clear of both texts, and clear of the goo dot cluster
  // (which sits well to the right, x >= column-left + ~290, see
  // chambersData.ts's fused-geometry comments), so it measures pure
  // composited background: the gradient, `.profile-bg__glow`, AND the
  // exclusion-blend canvas.
  const sampleRect = await page.evaluate(() => {
    const index = document.querySelector('.profile-chamber__index');
    const initialEl = document.querySelector('.profile-chamber__initial');
    if (!index || !initialEl) {
      throw new Error('.profile-chamber__index or .profile-chamber__initial not found.');
    }
    const indexRect = index.getBoundingClientRect();
    const initialRect = initialEl.getBoundingClientRect();
    const midY = (indexRect.bottom + initialRect.top) / 2;
    return { x: initialRect.left + 4, y: midY - 5, width: 24, height: 10 };
  });
  const backdrop = await meanRgb(page, sampleRect);

  const ratio = contrastRatio(foreground, backdrop);
  test.info().annotations.push({
    type: 'chamber-01-contrast',
    description:
      `foreground ${rgbToCss(foreground)}, backdrop ${rgbToCss(backdrop)}, ratio ${ratio.toFixed(2)}` +
      ` (vitest static pin: 5.15 at chamber 1, contrast.test.ts)`,
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});

function parseRgbString(value: string): RGB {
  const match = /rgba?\(([^)]+)\)/.exec(value);
  if (!match) throw new Error(`Could not parse computed color "${value}"`);
  const [r, g, b] = match[1].split(',').map((part) => parseFloat(part.trim()));
  return { r, g, b };
}

function rgbToCss({ r, g, b }: RGB): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * Mean per-channel color (0-255) of a viewport-relative rect, decoded in-page
 * from a real screenshot -- the same screenshot-and-canvas-decode technique
 * `e2e/mobile-scroll.spec.ts`'s `meanLuminance` uses, generalized to return
 * the RGB triplet instead of a pre-reduced luminance number: this test needs
 * a real foreground/background PAIR to feed `contrastRatio` (which applies
 * the WCAG gamma-correction itself), not an already-collapsed luminance.
 */
async function meanRgb(
  page: Page,
  rect: { x: number; y: number; width: number; height: number },
): Promise<RGB> {
  const png = await page.screenshot({ clip: rect, scale: 'css' });
  return page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let r = 0;
    let g = 0;
    let b = 0;
    const count = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    return { r: r / count, g: g / count, b: b / count };
  }, png.toString('base64'));
}
