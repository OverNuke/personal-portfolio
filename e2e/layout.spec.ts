import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { routes } from '../src/routes/registry';
import { SECTION_HEIGHT, STAGE_WIDTH, VIEWPORTS, forceScreenHeight, sectionId } from './helpers';

/**
 * Layout guard for the continuous-scroll shell (spec `continuous-scroll-layout`,
 * task 8.2 -- verify findings C1/S4, W1, W3, W6, W7, W8). It replaces the
 * throwaway Playwright probes the earlier phases relied on: real geometry in a
 * real browser, because none of these properties has a valid jsdom layer.
 *
 * Two families:
 *  - the 900px FLOOR: every section is exactly 900px tall (`min-height: 900px`,
 *    never `height`, never below), with no horizontal scroll, at stage scale
 *    1.0 / 0.8 / 0.6;
 *  - the height-fluid machinery built in Phases 1-6, which is verified at the
 *    floor AND with one screen root forced taller (spec: effects "MUST remain
 *    correct at any height >= 900"). Only the forced case can tell a height-
 *    aware effect from the old hardcoded-900 one, since the two coincide at
 *    exactly 900. Heights below 900 are explicitly unsupported and never forced.
 *
 * Reduced motion is on unless a test needs the motion path (the Contact dock
 * only listens for the pointer when motion is allowed): it freezes the rAF
 * effects so geometry is deterministic.
 */

const FORCED_HEIGHT = 1400;

async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.screen-section')).toHaveCount(5);
  // Web fonts change text extents (Profile columns, Contact quote); measure after they settle.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Rect in the SECTION's own unscaled layout px (origin = section top-left). */
interface LocalRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Overlap area (layout px^2) of two rects. */
function overlapArea(a: LocalRect, b: LocalRect): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

for (const viewport of VIEWPORTS) {
  test.describe(`floor at ${viewport.width}x${viewport.height} (scale ${viewport.scale})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });

    test('all 5 sections are exactly 900px tall and the page never scrolls horizontally', async ({ page }) => {
      await openApp(page);

      const measured = await page.evaluate(() => ({
        sections: Array.from(document.querySelectorAll<HTMLElement>('.screen-section')).map((section) => ({
          id: section.id,
          clientHeight: section.clientHeight,
          rectHeight: section.getBoundingClientRect().height,
        })),
        scale: document.querySelector<HTMLElement>('.stage')!.getBoundingClientRect().width / 1440,
        scalerWidth: document.querySelector<HTMLElement>('.stage-scaler')!.getBoundingClientRect().width,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
      }));

      expect(measured.sections.map((s) => s.id)).toEqual(routes.map((r) => sectionId(r.pageId)));
      expect(measured.scale).toBeCloseTo(viewport.scale, 2);
      for (const section of measured.sections) {
        // Exactly the floor: below it would clip Projects (cards reach y=868), above it nothing feeds the section.
        expect(section.clientHeight, section.id).toBe(SECTION_HEIGHT);
        expect(section.rectHeight, section.id).toBeCloseTo(SECTION_HEIGHT * measured.scale, 0);
      }
      expect(measured.scrollWidth).toBe(measured.clientWidth);
      // The document is exactly the scaled stack: no dead space beside it (`overflow-x: clip` would hide
      // an over-wide scaler from the check above) and no trailing spacer after the last section.
      expect(measured.scalerWidth).toBeCloseTo(STAGE_WIDTH * viewport.scale, 0);
      expect(measured.scrollHeight).toBeCloseTo(routes.length * SECTION_HEIGHT * viewport.scale, 0);
    });
  });
}

/** The 5 screen roots (children of each `.screen-section`). */
const SCREEN_ROOTS = {
  home: '.home-screen',
  profile: '.profile-screen',
  distinction: '.distinctions-screen',
  projects: '.projects-screen',
  contact: '.contact-screen',
} as const;

// Everything below runs at scale 1.0 (1440x900): the geometry is scale-invariant
// (it is measured in layout px), and the scale-dependent behavior is covered by
// the floor test above and by scroll-nav.spec.ts.
test.describe('height-fluid effects', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  /** Run one check at the natural 900px floor and again with `root` forced to FORCED_HEIGHT. */
  function atFloorAndTaller(name: string, root: keyof typeof SCREEN_ROOTS, check: (page: Page, height: number) => Promise<void>) {
    for (const height of [SECTION_HEIGHT, FORCED_HEIGHT]) {
      test(`${name} (${height === SECTION_HEIGHT ? 'floor' : `forced to ${height}px`})`, async ({ page }) => {
        await openApp(page);
        if (height !== SECTION_HEIGHT) await forceScreenHeight(page, SCREEN_ROOTS[root], height);
        await check(page, height);
      });
    }
  }

  atFloorAndTaller('Profile columns are vertically centered in their section', 'profile', async (page, height) => {
    const measured = await page.evaluate(() => {
      const screen = document.querySelector<HTMLElement>('.profile-screen')!.getBoundingClientRect();
      const mid = (top: number, bottom: number) => (top + bottom) / 2;
      const column = (selector: string) => {
        const el = document.querySelector<HTMLElement>(selector)!;
        const box = el.getBoundingClientRect();
        const children = Array.from(el.children).map((child) => child.getBoundingClientRect());
        const top = Math.min(...children.map((rect) => rect.top));
        const bottom = Math.max(...children.map((rect) => rect.bottom));
        return { children: children.length, boxMid: mid(box.top, box.bottom), contentMid: mid(top, bottom), contentHeight: bottom - top };
      };
      return { screenMid: mid(screen.top, screen.bottom), intro: column('.profile-intro'), chambers: column('.profile-chambers') };
    });

    for (const [name, column] of Object.entries({ intro: measured.intro, chambers: measured.chambers })) {
      // Guard against a vacuous pass: the column has real content that fits inside the section.
      expect(column.children, name).toBeGreaterThan(0);
      expect(column.contentHeight, name).toBeGreaterThan(200);
      expect(column.contentHeight, name).toBeLessThan(height);
      // The column BOX spans the section and its CONTENT is centered in it.
      expect(column.boxMid, `${name} box midpoint`).toBeCloseTo(measured.screenMid, 0);
      expect(column.contentMid, `${name} content midpoint`).toBeCloseTo(measured.screenMid, 0);
    }
  });

  atFloorAndTaller('Contact quote stays inside its section and clear of all 5 dock cards at rest', 'contact', async (page) => {
    const measured = await page.evaluate(() => {
      const screenRect = document.querySelector<HTMLElement>('.contact-screen')!.getBoundingClientRect();
      const scale = screenRect.width / 1440;
      const local = (el: Element): LocalRect => {
        const rect = el.getBoundingClientRect();
        return {
          top: (rect.top - screenRect.top) / scale,
          bottom: (rect.bottom - screenRect.top) / scale,
          left: (rect.left - screenRect.left) / scale,
          right: (rect.right - screenRect.left) / scale,
        };
      };
      return {
        screenHeight: screenRect.height / scale,
        quote: local(document.querySelector('.contact-quote')!),
        cards: Array.from(document.querySelectorAll('.contact-dock__card')).map(local),
      };
    });

    expect(measured.cards).toHaveLength(5);
    expect(measured.quote.top).toBeGreaterThanOrEqual(0);
    expect(measured.quote.bottom).toBeLessThanOrEqual(measured.screenHeight);
    expect(measured.quote.left).toBeGreaterThanOrEqual(0);
    expect(measured.quote.right).toBeLessThanOrEqual(STAGE_WIDTH);
    measured.cards.forEach((card, index) => {
      expect(overlapArea(measured.quote, card), `card ${index}`).toBe(0);
    });
  });

  atFloorAndTaller('Home ring layers keep constant px heights', 'home', async (page) => {
    const heights = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.ink-flow__dark-rings > *, .ink-flow__light-rings > *')).map((ring) =>
        parseFloat(getComputedStyle(ring).height),
      ),
    );
    // The decoded source's `height: N%` resolved against the 900px design stage
    // (34/38/40/44/46/52% => 306/342/360/396/414/468px), frozen as px. A
    // `%`-of-container height (the pre-Phase-5 behavior) would grow with the
    // section instead: 52% of 1400 = 728px. (These are the CSS box heights;
    // getBoundingClientRect() heights differ because the rings animate/rotate.)
    expect(heights).toHaveLength(9); // 6 dark + 3 light rings
    const unique = [...new Set(heights.map((h) => Math.round(h * 100) / 100))].sort((a, b) => a - b);
    expect(unique).toEqual([306, 342, 360, 396, 414, 468]);
  });

  atFloorAndTaller('Home ink flow renders inside its section', 'home', async (page) => {
    const rects = await page.evaluate(() => {
      const box = (el: Element) => el.getBoundingClientRect();
      const screen = box(document.querySelector('.home-screen')!);
      const flow = box(document.querySelector('.ink-flow')!);
      return { screenTop: screen.top, screenBottom: screen.bottom, flowTop: flow.top, flowBottom: flow.bottom, flowWidth: flow.width };
    });
    expect(rects.flowTop).toBeGreaterThanOrEqual(rects.screenTop - 1);
    expect(rects.flowBottom).toBeLessThanOrEqual(rects.screenBottom + 1);
    expect(rects.flowBottom - rects.flowTop).toBeGreaterThan(SECTION_HEIGHT - 2);
    expect(rects.flowWidth).toBeCloseTo(STAGE_WIDTH, 0);
  });

  atFloorAndTaller('Projects card layer is not clipped by its section', 'projects', async (page, height) => {
    const measured = await page.evaluate(() => {
      const screenRect = document.querySelector<HTMLElement>('.projects-screen')!.getBoundingClientRect();
      const scale = screenRect.width / 1440;
      const elements = Array.from(document.querySelectorAll('.projects-cards-layer *'));
      const bottoms = elements.map((el) => (el.getBoundingClientRect().bottom - screenRect.top) / scale);
      return { count: elements.length, deepest: Math.max(...bottoms), screenHeight: screenRect.height / scale };
    });
    // Cards are absolutely positioned in px (W7): the deepest one sits ~868px down
    // whatever the section height, so it must fit in the floor and be really there.
    expect(measured.count).toBeGreaterThan(10);
    expect(measured.deepest).toBeGreaterThan(840);
    expect(measured.deepest).toBeLessThanOrEqual(measured.screenHeight);
    expect(measured.deepest).toBeLessThanOrEqual(height);
  });

  atFloorAndTaller('Distinctions SVGs share the rendered box (no non-uniform stretch)', 'distinction', async (page, height) => {
    const svgs = await page.evaluate(() =>
      ['.distinctions-cells-svg', '.distinctions-doodle-svg'].map((selector) => {
        const svg = document.querySelector<SVGSVGElement>(selector)!;
        const rect = svg.getBoundingClientRect();
        return {
          selector,
          viewBoxWidth: svg.viewBox.baseVal.width,
          viewBoxHeight: svg.viewBox.baseVal.height,
          layoutHeight: svg.clientHeight,
          aspectRatioOfBox: rect.width / rect.height,
        };
      }),
    );
    for (const svg of svgs) {
      expect(svg.viewBoxWidth, svg.selector).toBe(STAGE_WIDTH);
      expect(svg.viewBoxHeight, svg.selector).toBe(height);
      expect(svg.layoutHeight, svg.selector).toBe(height);
      // viewBox aspect == rendered aspect => uniform scale on both axes.
      expect(svg.viewBoxWidth / svg.viewBoxHeight, svg.selector).toBeCloseTo(svg.aspectRatioOfBox, 2);
    }
  });

  atFloorAndTaller('Distinctions cells fill the section (no dead space)', 'distinction', async (page, height) => {
    const coverage = await page.evaluate((h) => {
      const svg = document.querySelector<SVGSVGElement>('.distinctions-cells-svg')!;
      const cells = Array.from(svg.querySelectorAll<SVGGeometryElement>('path[data-cid]'));
      const margin = 16.5; // voronoi clip rectangle inset
      const step = 12;
      let inside = 0;
      let covered = 0;
      for (let y = margin; y <= h - margin; y += step) {
        for (let x = margin; x <= 1440 - margin; x += step) {
          inside += 1;
          const point = new DOMPoint(x, y);
          if (cells.some((cell) => cell.isPointInFill(point))) covered += 1;
        }
      }
      return { cells: cells.length, ratio: covered / inside, samples: inside };
    }, height);
    expect(coverage.cells).toBe(12);
    expect(coverage.samples).toBeGreaterThan(1000);
    // Measured fill ratio is the cell area over the clip rect, minus the deliberate 7px gaps.
    expect(coverage.ratio).toBeGreaterThan(0.9);
  });
});

test.describe('Contact dock hover', () => {
  // The dock only listens for the pointer when motion is allowed.
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });

  const FRACTIONS = [0.05, 0.25, 0.5, 0.75, 0.95];

  /** Hover the dock at `fraction` of its height and read every card's scale once the rAF paint has landed. */
  async function cardScalesAt(page: Page, fraction: number, dockHeight: number): Promise<number[]> {
    // Put the sample point in the middle of the viewport, then hover it.
    const target = await page.evaluate(
      ({ f, selector }) => {
        const dock = document.querySelector<HTMLElement>(`${selector} .contact-dock`)!;
        const rect = dock.getBoundingClientRect();
        const pageY = rect.top + window.scrollY + rect.height * f;
        window.scrollTo({ top: pageY - window.innerHeight / 2, behavior: 'instant' });
        return { x: rect.left + rect.width / 2, y: pageY - window.scrollY, height: rect.height };
      },
      { f: fraction, selector: SCREEN_ROOTS.contact },
    );
    expect(target.height).toBeCloseTo(dockHeight, 0);
    await page.mouse.move(target.x - 40, target.y - 1);
    await page.mouse.move(target.x, target.y);

    const readScales = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('.contact-dock__card')).map((card) => {
          const match = /scale\(([\d.]+)\)/.exec(card.style.transform);
          return match ? parseFloat(match[1]) : 1;
        }),
      );
    // Non-zero response: at least one card is scaled above its resting 1.0. Polled
    // (the dock paints on rAF), never slept on.
    await expect
      .poll(async () => Math.max(...(await readScales())), { message: `dock fraction ${fraction}` })
      .toBeGreaterThan(1.02);
    // Let the settled frame land, then sample the whole vector.
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    return readScales();
  }

  test('responds across the full dock height, identically at 900 and at a taller section', async ({ page }) => {
    test.slow();
    await openApp(page);

    const atFloor: number[][] = [];
    for (const fraction of FRACTIONS) atFloor.push(await cardScalesAt(page, fraction, SECTION_HEIGHT));

    await forceScreenHeight(page, SCREEN_ROOTS.contact, FORCED_HEIGHT);
    const taller: number[][] = [];
    for (const fraction of FRACTIONS) taller.push(await cardScalesAt(page, fraction, FORCED_HEIGHT));

    // Cards are percent-anchored and the falloff's vertical spread scales with the container's real
    // height (`useMagneticDock`), so pointer y, card centers and the spread all scale together: the same
    // pointer FRACTION must give the same response at every height. A dock still tuned to the old
    // 900px band would respond differently (weaker or stronger) once the section is taller.
    atFloor.forEach((scales, index) => {
      scales.forEach((scale, card) => expect(taller[index][card], `fraction ${FRACTIONS[index]}, card ${card}`).toBeCloseTo(scale, 2));
    });
  });
});

test.describe('pill nav crossfade (task 8.1)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const activeTransition = (page: Page) =>
    page.evaluate(() => {
      const button = document.querySelector<HTMLElement>('.pill-nav__button')!;
      const style = getComputedStyle(button);
      return { properties: style.transitionProperty, duration: style.transitionDuration, easing: style.transitionTimingFunction };
    });

  test('the active-pill background/color crossfade takes 120ms on the house ease', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const transition = await activeTransition(page);
    expect(transition.properties).toBe('background, color');
    expect(transition.duration).toBe('0.12s, 0.12s');
    // The shared "house ease" (docs/07): cubic-bezier(.2, .85, .2, 1).
    expect(transition.easing).toBe('cubic-bezier(0.2, 0.85, 0.2, 1), cubic-bezier(0.2, 0.85, 0.2, 1)');
  });

  test('reduced motion removes the crossfade entirely (docs/14: instant end state)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const transition = await activeTransition(page);
    expect(transition.duration).toBe('0s');
  });
});
