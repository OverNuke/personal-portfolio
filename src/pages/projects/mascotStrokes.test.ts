import { describe, expect, it } from 'vitest';
import { buildMascotStrokes } from './mascotStrokes';
import type { ProjectMeasure, Rect } from './mascotStrokes';
import { getTitleStrokePaths } from './glyphStrokes';

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });

// Rects mimic what CrayonMascot's measureRect() reads off the real DOM
// nodes ProjectCard renders (photo/title/note/tags per project) at the
// shipped 1440x900 design layout.
const MEASURES: Record<string, ProjectMeasure> = {
  p1: {
    photo: rect(98, 254, 276, 276),
    title: rect(76, 620, 200, 42),
    note: rect(430, 300, 150, 40),
    tags: [rect(76, 772, 70, 26), rect(154, 772, 90, 26)],
  },
  p2: {
    photo: rect(668, 142, 224, 224),
    title: rect(600, 470, 180, 30),
    note: rect(952, 142, 170, 40),
    tags: [rect(600, 626, 60, 26)],
  },
  p3: {
    photo: rect(840, 394, 210, 210),
    title: rect(1108, 400, 220, 30),
    note: rect(820, 672, 200, 40),
    tags: [rect(1108, 536, 60, 26)],
  },
};

const HOVER = { p1: 0.8, p2: 0.2, p3: 0 };
const IDLE = { p1: 0, p2: 0, p3: 0 };
const BLUE = '#586a30';
const HOT = '#c9351d';

function pathById(
  height: number | undefined,
  { t = 0, jitterOn = false, hov = HOVER }: { t?: number; jitterOn?: boolean; hov?: Record<string, number> } = {},
): Record<string, string> {
  const strokes = buildMascotStrokes({ t, jitterOn, hov, measures: MEASURES, blue: BLUE, hot: HOT, height });
  return Object.fromEntries(strokes.map((s) => [s.id, s.d]));
}

/** Every number in an SVG path `d` (M/C/Z absolute commands only -- what
 *  `smooth()` emits), alternating x, y, x, y... */
function coords(d: string): number[] {
  return (d.match(/-?\d+\.\d/g) ?? []).map(Number);
}

/** Largest per-axis deviation between two paths' coordinates once `dy` is
 *  subtracted from every y of `moved`. `smooth()` rounds to 0.1, so an exact
 *  translation can differ from the shifted original by up to ~0.1. */
function maxDeviation(base: string, moved: string, dy: number): { x: number; y: number } {
  const a = coords(base);
  const b = coords(moved);
  expect(b).toHaveLength(a.length);
  let x = 0;
  let y = 0;
  a.forEach((v, i) => {
    if (i % 2 === 0) x = Math.max(x, Math.abs(b[i] - v));
    else y = Math.max(y, Math.abs(b[i] - dy - v));
  });
  return { x, y };
}

describe('buildMascotStrokes -- approval of the shipped 900px output (captured pre-refactor)', () => {
  it('reproduces the resting (t=0, no jitter) doodle paths exactly', () => {
    const rest = pathById(undefined);
    expect(rest['body']).toBe(
      'M476.0 790.4C470.4 797.0,469.8 808.2,470.0 816.8C470.2 825.4,472.0 836.0,477.2 842.0C482.4 848.0,492.2 851.6,501.2 852.8C510.2 854.0,523.2 853.4,531.2 849.2C539.2 845.0,545.8 835.6,549.2 827.6C552.6 819.6,553.6 808.8,551.6 801.2C549.6 793.6,545.2 786.0,537.2 782.0C529.2 778.0,513.8 775.8,503.6 777.2C493.4 778.6,481.6 783.8,476.0 790.4Z',
    );
    expect(rest['arm']).toBe(
      'M549.2 814.4C546.4 812.3,538.9 803.9,532.6 801.6C526.3 799.3,515.1 800.9,511.6 800.8',
    );
    expect(rest['ptr-shaft']).toBe(
      'M511.6 800.8C511.1 790.1,511.5 756.8,508.6 736.7C505.8 716.6,501.1 697.7,494.5 680.0C488.0 662.4,479.6 646.0,469.4 630.8C459.2 615.7,447.1 601.8,433.2 589.1C419.3 576.4,403.6 565.0,386.0 554.8C368.4 544.6,337.4 532.4,327.7 528.0',
    );
    expect(rest['spore-0']).toBe(
      'M511.0 492.0C511.0 494.0,509.9 496.5,508.4 498.1C506.9 499.7,504.2 501.0,501.9 501.4C499.6 501.7,496.5 501.2,494.5 500.2C492.5 499.2,490.5 497.2,489.7 495.2C488.9 493.3,488.9 490.7,489.7 488.8C490.5 486.8,492.5 484.8,494.5 483.8C496.5 482.8,499.6 482.3,501.9 482.6C504.2 483.0,506.9 484.3,508.4 485.9C509.9 487.5,511.0 490.0,511.0 492.0Z',
    );
    expect(rest['spore-1']).toBe(
      'M711.0 84.0C711.0 86.0,709.9 88.5,708.4 90.1C706.9 91.7,704.2 93.0,701.9 93.4C699.6 93.7,696.5 93.2,694.5 92.2C692.5 91.2,690.5 89.2,689.7 87.2C688.9 85.3,688.9 82.7,689.7 80.8C690.5 78.8,692.5 76.8,694.5 75.8C696.5 74.8,699.6 74.3,701.9 74.6C704.2 75.0,706.9 76.3,708.4 77.9C709.9 79.5,711.0 82.0,711.0 84.0Z',
    );
    expect(rest['spore-2']).toBe(
      'M1023.0 706.0C1023.0 708.0,1021.9 710.5,1020.4 712.1C1018.9 713.7,1016.2 715.0,1013.9 715.4C1011.6 715.7,1008.5 715.2,1006.5 714.2C1004.5 713.2,1002.5 711.2,1001.7 709.2C1000.9 707.3,1000.9 704.7,1001.7 702.8C1002.5 700.8,1004.5 698.8,1006.5 697.8C1008.5 696.8,1011.6 696.3,1013.9 696.6C1016.2 697.0,1018.9 698.3,1020.4 699.9C1021.9 701.5,1023.0 704.0,1023.0 706.0Z',
    );
    expect(rest['flag-ring']).toBe(
      'M170.9 268.9C165.6 274.1,153.3 279.4,141.1 281.9C128.9 284.5,111.1 285.4,97.7 284.1C84.3 282.9,69.2 278.9,60.9 274.5C52.7 270.0,47.4 263.0,48.1 257.5C48.8 251.9,55.8 245.2,65.1 241.1C74.5 237.0,90.5 233.7,104.1 233.0C117.7 232.3,135.3 233.9,146.8 237.0C158.3 240.0,169.1 245.8,173.2 251.2C177.2 256.5,176.3 263.8,170.9 268.9Z',
    );
    expect(rest['ul-a-p1']).toBe(
      'M76.0 664.0C92.7 664.5,142.7 667.2,176.0 667.0C209.3 666.8,259.3 663.7,276.0 663.0',
    );
  });

  it('reproduces a live (t=1.3, jitter on) frame exactly', () => {
    const live = pathById(undefined, { t: 1.3, jitterOn: true });
    expect(live['body']).toBe(
      'M474.5 793.4C468.9 799.9,470.5 809.7,471.2 818.4C471.8 827.1,473.6 839.4,478.4 845.7C483.2 852.0,491.2 854.9,500.1 856.1C509.1 857.2,524.0 857.0,532.0 852.8C540.1 848.6,545.4 839.1,548.4 830.9C551.5 822.6,552.1 810.4,550.1 803.1C548.2 795.7,544.5 790.6,536.9 786.7C529.4 782.8,515.4 778.7,504.9 779.8C494.5 780.9,480.1 787.0,474.5 793.4Z',
    );
    expect(live['arm']).toBe(
      'M548.6 817.3C546.0 815.2,538.7 807.4,532.5 804.9C526.3 802.5,514.8 803.2,511.2 802.8',
    );
    expect(live['spore-1']).toBe(
      'M683.6 102.0C683.7 104.1,684.2 105.9,682.7 107.6C681.1 109.3,676.8 111.8,674.4 111.9C671.9 112.1,669.7 110.1,667.9 108.7C666.1 107.4,664.5 105.3,663.7 103.7C663.0 102.2,662.7 101.1,663.4 99.2C664.1 97.3,666.0 93.7,667.9 92.5C669.7 91.2,672.2 91.3,674.5 91.6C676.8 91.9,680.2 92.7,681.7 94.4C683.2 96.2,683.4 99.8,683.6 102.0Z',
    );
    expect(live['ring-a-p1']).toBe(
      'M376.5 437.1C368.7 462.3,352.1 486.9,331.5 503.8C311.0 520.8,279.8 534.9,253.2 538.8C226.5 542.6,195.6 538.6,171.7 526.9C147.7 515.3,123.7 491.7,109.7 469.0C95.6 446.3,87.1 417.3,87.6 390.6C88.2 363.9,98.3 331.3,113.0 308.9C127.6 286.5,151.3 266.6,175.4 256.2C199.5 245.8,231.1 242.5,257.6 246.5C284.2 250.5,314.6 262.5,334.8 280.2C354.9 297.9,371.5 326.5,378.5 352.6C385.4 378.8,384.3 411.9,376.5 437.1Z',
    );
  });

  it('reproduces the first 3 "PROJECTS" title strokes exactly', () => {
    expect(getTitleStrokePaths(0, BLUE).slice(0, 3).map((p) => p.d)).toEqual([
      'M77.3 77.9L77.0 180.4',
      'M78.2 75.4C84.0 77.0,105.9 80.2,113.5 85.1C121.0 90.0,124.0 98.0,123.4 104.7C122.8 111.4,117.9 121.8,110.0 125.6C102.1 129.3,81.6 126.9,75.9 127.2',
      'M146.7 75.8L144.2 180.7',
    ]);
  });

  it('treats an explicit height of 900 identically to the default', () => {
    expect(pathById(900, { t: 1.3, jitterOn: true })).toEqual(pathById(undefined, { t: 1.3, jitterOn: true }));
  });
});

describe('buildMascotStrokes -- height-aware ambient anchors', () => {
  // The mascot body sits at design y=812 of 900; SPORES' y at 492/84/706.
  const BODY_DESIGN_Y = 812;
  const SPORE1_DESIGN_Y = 84;
  const SPORE2_DESIGN_Y = 706;

  it.each([700, 1400])('moves the mascot body proportionally to a %ipx-tall section', (height) => {
    const dy = BODY_DESIGN_Y * (height / 900) - BODY_DESIGN_Y;
    const dev = maxDeviation(pathById(900)['body'], pathById(height)['body'], dy);
    expect(dev.y).toBeLessThanOrEqual(0.11);
    expect(dev.x).toBeLessThanOrEqual(0.11);
  });

  it.each([700, 1400])('moves spores proportionally to a %ipx-tall section', (height) => {
    const dy1 = SPORE1_DESIGN_Y * (height / 900) - SPORE1_DESIGN_Y;
    const dy2 = SPORE2_DESIGN_Y * (height / 900) - SPORE2_DESIGN_Y;
    const dev1 = maxDeviation(pathById(900)['spore-1'], pathById(height)['spore-1'], dy1);
    const dev2 = maxDeviation(pathById(900)['spore-2'], pathById(height)['spore-2'], dy2);
    expect(dev1.y).toBeLessThanOrEqual(0.11);
    expect(dev1.x).toBeLessThanOrEqual(0.11);
    expect(dev2.y).toBeLessThanOrEqual(0.11);
    expect(dev2.x).toBeLessThanOrEqual(0.11);
    // Sanity: the shift is real (not a rounding-sized no-op) at these heights.
    expect(Math.abs(dy1) + Math.abs(dy2)).toBeGreaterThan(30);
  });

  it('keeps the idle arm attached to the body (pure translation) when nothing is hovered', () => {
    const dy = BODY_DESIGN_Y * (700 / 900) - BODY_DESIGN_Y;
    const dev = maxDeviation(pathById(900, { hov: IDLE })['arm'], pathById(700, { hov: IDLE })['arm'], dy);
    expect(dev.y).toBeLessThanOrEqual(0.11);
    expect(dev.x).toBeLessThanOrEqual(0.11);
  });

  it('re-aims the hovered arm and pointer at the (unmoved) photo from the moved body', () => {
    const at900 = pathById(900);
    const at700 = pathById(700);
    expect(at700['arm']).not.toBe(at900['arm']);
    expect(at700['ptr-shaft']).not.toBe(at900['ptr-shaft']);
    // The pointer still ends up pointing toward the p1 photo (cx=236, cy=392):
    // its last x-coordinate stays on the photo's side (< body x=512) at both heights.
    const endX = (d: string) => coords(d)[coords(d).length - 2];
    expect(endX(at700['ptr-shaft'])).toBeLessThan(512);
    expect(endX(at900['ptr-shaft'])).toBeLessThan(512);
  });

  it.each([700, 1400])(
    'leaves DOM-measured and top-anchored doodles byte-identical at %ipx (they track real rects / CSS px, not height)',
    (height) => {
      const at900 = pathById(900, { t: 1.3, jitterOn: true });
      const atH = pathById(height, { t: 1.3, jitterOn: true });
      for (const id of ['ring-a-p1', 'ring-b-p2', 'ul-a-p1', 'tag-p1-0', 'flag-ring', 'swoosh-a', 'swoosh-b', 'spark']) {
        expect(atH[id].length).toBeGreaterThan(20);
        expect(atH[id]).toBe(at900[id]);
      }
    },
  );
});
