import { describe, expect, it } from 'vitest';
import { buildDoodleStrokes, DOODLE_PATH_IDS } from './doodleStrokes';
import type { DoodlePath, DoodleParams } from './doodleStrokes';
import {
  DEFAULT_GAP,
  DEFAULT_HOVER_GROWTH,
  DEFAULT_ROUNDNESS,
  ambientY,
  computeCellGeometry,
  computeLiveSeeds,
} from './voronoi';

const COLOR = '#e0452b';

/** Resting frame: reduced-motion pose, nothing hovered. */
const REST = { t: 0, jitterOn: false, hoverValues: {} as Record<string, number> };
/** Live frame: boil + sway on, two cells partly hovered (anfeca wins the peak
 *  so the arm waves and the arrow shoots out toward it). */
const LIVE = { t: 1.3, jitterOn: true, hoverValues: { anfeca: 0.8, english: 0.2 } as Record<string, number> };

/** Builds one frame. The cells are ALWAYS computed at `cellsHeight` (default
 *  900) so a height-aware test can isolate the doodle's own height handling
 *  from the cell geometry's. */
function build(
  frame: typeof REST | typeof LIVE,
  extra: Partial<DoodleParams> & { height?: number } = {},
  cellsHeight = 900,
): Record<string, DoodlePath> {
  const seeds = computeLiveSeeds(frame.t, cellsHeight, {
    breathe: frame.jitterOn,
    hoverGrowth: DEFAULT_HOVER_GROWTH,
    hoverValues: frame.hoverValues,
  });
  const cells = computeCellGeometry(seeds, cellsHeight, { gap: DEFAULT_GAP, roundness: DEFAULT_ROUNDNESS });
  const strokes = buildDoodleStrokes({ ...frame, cells, color: COLOR, ...extra } as DoodleParams);
  return Object.fromEntries(strokes.map((s) => [s.id, s]));
}

// ---------------------------------------------------------------------------
// Approval tests. The pinned strings below were captured by running the
// UNMODIFIED `buildDoodleStrokes` (scratch script, height 900) before any
// edit to doodleStrokes.ts -- they document what the module does NOW, so the
// height-aware change is proven not to have moved anything at 900.
// ---------------------------------------------------------------------------
describe('buildDoodleStrokes at the 900px design height (approval)', () => {
  it('keeps the exact id list, in order', () => {
    expect(DOODLE_PATH_IDS).toEqual([
      'ear-l',
      'ear-r',
      'body',
      'eye-l',
      'eye-r',
      'arm',
      'arrow',
      'barb-a',
      'barb-b',
      'spark',
      'spore-0',
      'nuc-0',
      'spore-1',
      'nuc-1',
      'spore-2',
      'nuc-2',
    ]);
  });

  it('resting frame: mascot, spark and spores are byte-identical to the shipped output', () => {
    const rest = build(REST);
    expect(Object.keys(rest)).toEqual(DOODLE_PATH_IDS);
    expect(rest.body).toEqual({
      id: 'body',
      d: 'M440.0 820.0C435.3 825.5,434.8 834.8,435.0 842.0C435.2 849.2,436.7 858.0,441.0 863.0C445.3 868.0,453.5 871.0,461.0 872.0C468.5 873.0,479.3 872.5,486.0 869.0C492.7 865.5,498.2 857.7,501.0 851.0C503.8 844.3,504.7 835.3,503.0 829.0C501.3 822.7,497.7 816.3,491.0 813.0C484.3 809.7,471.5 807.8,463.0 809.0C454.5 810.2,444.7 814.5,440.0 820.0Z',
      fill: COLOR,
      stroke: COLOR,
      w: 3.2,
    });
    expect(rest['ear-l'].d).toBe(
      'M443.0 816.0C440.2 813.5,436.8 800.7,438.0 797.0C439.2 793.3,447.2 791.5,450.0 794.0C452.8 796.5,456.2 808.3,455.0 812.0C453.8 815.7,445.8 818.5,443.0 816.0Z',
    );
    expect(rest.arm.d).toBe('M501.0 840.0C503.5 838.4,512.2 834.9,515.8 830.7C519.3 826.4,521.3 817.2,522.4 814.5');
    expect(rest.arrow.d).toBe('');
    expect(rest.spark.d).toBe(
      'M380.0 75.1C381.7 75.1,382.0 84.9,385.0 88.1C388.0 91.2,398.0 92.1,398.0 94.1C398.0 96.1,388.0 96.9,385.0 100.1C382.0 103.2,381.7 113.1,380.0 113.1C378.3 113.1,378.0 103.2,375.0 100.1C372.0 96.9,362.0 96.1,362.0 94.1C362.0 92.1,372.0 91.2,375.0 88.1C378.0 84.9,378.3 75.1,380.0 75.1Z',
    );
    expect(rest['spore-0'].d).toBe(
      'M1196.0 640.0C1196.0 642.0,1194.9 644.5,1193.4 646.1C1191.9 647.7,1189.2 649.0,1186.9 649.4C1184.6 649.7,1181.5 649.2,1179.5 648.2C1177.5 647.2,1175.5 645.2,1174.7 643.2C1173.9 641.3,1173.9 638.7,1174.7 636.8C1175.5 634.8,1177.5 632.8,1179.5 631.8C1181.5 630.8,1184.6 630.3,1186.9 630.6C1189.2 631.0,1191.9 632.3,1193.4 633.9C1194.9 635.5,1196.0 638.0,1196.0 640.0Z',
    );
    expect(rest['spore-1'].d.startsWith('M266.0 300.0C')).toBe(true);
    expect(rest['spore-2'].d.startsWith('M841.0 268.0C')).toBe(true);
    expect(rest['nuc-1'].d).toBe(
      'M252.0 300.0C252.0 299.0,254.0 297.0,255.0 297.0C256.0 297.0,258.0 299.0,258.0 300.0C258.0 301.0,256.0 303.0,255.0 303.0C254.0 303.0,252.0 301.0,252.0 300.0Z',
    );
  });

  it('live frame (t=1.3, boil on, anfeca hovered): mascot, arrow, spark and spores are byte-identical', () => {
    const live = build(LIVE);
    expect(live.body.d).toBe(
      'M438.5 823.0C433.8 828.4,435.5 836.4,436.2 843.6C436.8 850.9,438.3 861.4,442.2 866.7C446.2 872.0,452.5 874.3,459.9 875.3C467.4 876.2,480.1 876.1,486.8 872.6C493.6 869.1,497.8 861.2,500.2 854.3C502.7 847.3,503.1 837.0,501.5 830.9C500.0 824.8,496.9 820.9,490.7 817.7C484.5 814.5,473.1 810.7,464.3 811.6C455.6 812.5,443.2 817.7,438.5 823.0Z',
    );
    expect(live.arm.d).toBe('M500.4 842.9C503.2 842.2,512.7 841.8,517.2 838.7C521.8 835.5,525.8 826.5,527.5 824.0');
    expect(live.arrow.d).toBe(
      'M528.8 824.4C523.3 810.0,503.8 766.3,496.1 738.0C488.5 709.6,484.9 682.5,482.7 654.5C480.6 626.5,480.2 597.4,483.1 569.9C486.0 542.4,492.2 516.0,500.2 489.4C508.3 462.9,518.4 436.9,531.4 410.5C544.4 384.2,570.3 344.4,578.1 331.2',
    );
    expect(live['barb-a'].d).toBe('M560.7 343.7L578.9 332.8');
    expect(live['barb-b'].d).toBe('M576.3 352.8L576.9 332.0');
    expect(live.spark.d.startsWith('M378.4 75.7C379.8 75.6,')).toBe(true);
    expect(live['spore-0'].d.startsWith('M1227.0 646.5C1227.1 648.7,')).toBe(true);
    expect(live['spore-1'].d.startsWith('M238.6 318.0C238.7 320.1,')).toBe(true);
    expect(live['spore-2'].d.startsWith('M840.2 243.4C840.2 245.1,')).toBe(true);
    expect(live['nuc-2'].d).toBe(
      'M825.1 241.9C825.1 240.9,827.3 238.5,828.3 238.5C829.3 238.6,831.3 241.1,831.3 242.1C831.3 243.1,829.4 244.5,828.3 244.5C827.3 244.4,825.1 242.8,825.1 241.9Z',
    );
  });

  it('an explicit height of 900 is the same as omitting it', () => {
    expect(build(REST, { height: 900 })).toEqual(build(REST));
    expect(build(LIVE, { height: 900 })).toEqual(build(LIVE));
  });
});

// ---------------------------------------------------------------------------
// Height-aware behavior (`sdd/continuous-scroll-and-doodles`, Phase 6
// prerequisite): the mascot's resting y (838) and the 3 spores' y are
// free-floating ambient doodles, so they re-anchor proportionally to the
// section's real height. The title-cell spark and the arrow are derived from
// the `cells` array, so they stay untouched by a `height` argument -- the
// tests pass the SAME 900-tall cells at every height to isolate that.
// ---------------------------------------------------------------------------

/** Every number in an SVG path `d`, in order (x, y, x, y, ...). */
function nums(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

describe('buildDoodleStrokes at other section heights', () => {
  it.each([
    [700, 'M440.0 633.8C', 'M1196.0 497.8C', 'M266.0 233.3C', 'M841.0 208.4C'],
    [1400, 'M440.0 1285.6C', 'M1196.0 995.6C', 'M266.0 466.7C', 'M841.0 416.9C'],
  ])('%ipx: the resting mascot body and all 3 spores re-anchor proportionally', (height, body, s0, s1, s2) => {
    const rest = build(REST, { height });
    expect(rest.body.d.startsWith(body)).toBe(true);
    expect(rest['spore-0'].d.startsWith(s0)).toBe(true);
    expect(rest['spore-1'].d.startsWith(s1)).toBe(true);
    expect(rest['spore-2'].d.startsWith(s2)).toBe(true);
  });

  it.each([700, 1400])('%ipx: every mascot part translates by exactly the same dy, x untouched', (height) => {
    const dy = (838 * height) / 900 - 838;
    const base = build(REST);
    const moved = build(REST, { height });
    for (const id of ['ear-l', 'ear-r', 'body', 'eye-l', 'eye-r', 'arm']) {
      const a = nums(base[id].d);
      const b = nums(moved[id].d);
      expect(b).toHaveLength(a.length);
      expect(a.length).toBeGreaterThan(4);
      a.forEach((v, i) => {
        // even index = x, odd index = y; smooth() rounds to 0.1
        expect(Math.abs(b[i] - v - (i % 2 === 1 ? dy : 0))).toBeLessThanOrEqual(0.11);
      });
    }
  });

  it.each([700, 1400])('%ipx: the live (boiling, hovered) frame re-anchors by the same dy', (height) => {
    const dy = (838 * height) / 900 - 838;
    const a = nums(build(LIVE).body.d);
    const b = nums(build(LIVE, { height }).body.d);
    a.forEach((v, i) => {
      expect(Math.abs(b[i] - v - (i % 2 === 1 ? dy : 0))).toBeLessThanOrEqual(0.11);
    });
  });

  it.each([700, 1400])('%ipx: the title spark is cell-derived, so a height argument leaves it byte-identical', (height) => {
    expect(build(REST, { height }).spark).toEqual(build(REST).spark);
    expect(build(LIVE, { height }).spark).toEqual(build(LIVE).spark);
  });

  it('the spores keep their x and drift the same way, only their base y scales', () => {
    const a = nums(build(LIVE)['spore-1'].d);
    const b = nums(build(LIVE, { height: 1400 })['spore-1'].d);
    const dy = (300 * 1400) / 900 - 300;
    a.forEach((v, i) => {
      expect(Math.abs(b[i] - v - (i % 2 === 1 ? dy : 0))).toBeLessThanOrEqual(0.11);
    });
  });
});

describe('ambientY', () => {
  it('is the identity at the 900px design height, bit-for-bit (multiply before dividing)', () => {
    expect(ambientY(838, 900)).toBe(838);
    expect(ambientY(812, 900)).toBe(812);
    expect(ambientY(0.1, 900)).toBe(0.1);
  });

  it.each([
    [838, 700, 651.7777777777778],
    [838, 1400, 1303.5555555555557],
    [300, 1800, 600],
  ])('scales a design-space y=%i proportionally at height %i', (designY, height, expected) => {
    expect(ambientY(designY, height)).toBeCloseTo(expected, 9);
  });
});
