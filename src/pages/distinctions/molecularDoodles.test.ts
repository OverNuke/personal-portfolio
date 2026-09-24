import { describe, expect, it } from 'vitest';
import { buildDoodleStrokes } from './doodleStrokes';
import { computeLabelSizing } from './labelSizing';
import {
  MOLECULAR_ANCHORS,
  MOLECULAR_DOODLE_IDS,
  MOLECULAR_PATH_IDS,
  buildMolecularStrokes,
  molecularDoodlePoints,
} from './molecularDoodles';
import type { MolecularDoodleId } from './molecularDoodles';
import {
  DEFAULT_GAP,
  DEFAULT_ROUNDNESS,
  STAGE_WIDTH,
  ambientY,
  computeCellGeometry,
  computeLiveSeeds,
} from './voronoi';

const COLOR = '#e0452b';
const HEIGHTS = [700, 900, 1400];
/** Frame-distinct sample times: `f = floor(t * 7.5)`, so every 0.2s step lands
 *  in a new boil frame. Spans 30s so the sweep sees many distinct noise
 *  frames. */
const SWEEP = Array.from({ length: 150 }, (_, i) => i * 0.2);

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function bbox(pts: number[][]): Box {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

function overlaps(a: Box, b: Box, pad = 0): boolean {
  return a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
}

function points(id: MolecularDoodleId, height: number, t = 0, jitterOn = true): number[][] {
  return molecularDoodlePoints(id, { t, jitterOn, height });
}

describe('molecular doodle set', () => {
  it('is exactly the five requested doodles, each with its own path id and anchor', () => {
    expect(MOLECULAR_DOODLE_IDS).toEqual(['dna', 'flask', 'molecule', 'pill', 'microscope']);
    expect(MOLECULAR_PATH_IDS).toEqual(['mol-dna', 'mol-flask', 'mol-molecule', 'mol-pill', 'mol-microscope']);
    const anchors = MOLECULAR_DOODLE_IDS.map((id) => `${MOLECULAR_ANCHORS[id].x},${MOLECULAR_ANCHORS[id].designY}`);
    expect(new Set(anchors).size).toBe(5);
    // seeds >= 30 so the noise never correlates with the mascot's (1-12, 20-22)
    const seeds = MOLECULAR_DOODLE_IDS.map((id) => MOLECULAR_ANCHORS[id].seed);
    expect(new Set(seeds).size).toBe(5);
    seeds.forEach((s) => expect(s).toBeGreaterThanOrEqual(30));
  });
});

describe.each(MOLECULAR_DOODLE_IDS)('%s doodle', (id) => {
  const stroke = (t: number, jitterOn = true, height = 900) =>
    buildMolecularStrokes({ t, jitterOn, height, color: COLOR }).find((s) => s.id === `mol-${id}`)!;

  it('is ONE continuous stroke: a single M, one cubic per point gap, no fill', () => {
    const s = stroke(0);
    const pts = points(id, 900);
    expect(pts.length).toBeGreaterThan(6);
    expect(s.d.match(/M/g)).toHaveLength(1);
    expect(s.d.match(/C/g)).toHaveLength(pts.length - 1);
    expect(s.d.startsWith(`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}C`)).toBe(true);
    expect(s.fill).toBe('none');
    expect(s.stroke).toBe(COLOR);
    expect(s.w).toBe(3.2); // same line weight as the mascot's arm / arrow strokes
  });

  it('is deterministic: the same inputs give the same path (no Math.random)', () => {
    expect(stroke(1.3)).toEqual(stroke(1.3));
    expect(points(id, 700, 4.2)).toEqual(points(id, 700, 4.2));
  });

  it('boils on the mascot cadence: a new 1/7.5s frame redraws it, the same frame does not', () => {
    // floor(0 * 7.5) = floor(0.1 * 7.5) = 0, floor(0.2 * 7.5) = 1
    expect(stroke(0.1).d).toBe(stroke(0).d);
    expect(stroke(0.2).d).not.toBe(stroke(0).d);
    expect(stroke(3).d).not.toBe(stroke(0).d);
  });

  it('is a single frozen pose under reduced motion (jitterOn false), different from any boiled frame', () => {
    const frozen = stroke(0, false);
    expect(stroke(5, false)).toEqual(frozen);
    expect(stroke(123.4, false)).toEqual(frozen);
    expect(frozen.d).not.toBe(stroke(0, true).d);
    expect(frozen.d.match(/M/g)).toHaveLength(1);
  });

  it.each(HEIGHTS)('stays inside the %ipx-tall stage (24px margin) on every boil frame', (height) => {
    for (const t of SWEEP) {
      const b = bbox(points(id, height, t));
      expect(b.x0).toBeGreaterThanOrEqual(24);
      expect(b.x1).toBeLessThanOrEqual(STAGE_WIDTH - 24);
      expect(b.y0).toBeGreaterThanOrEqual(24);
      expect(b.y1).toBeLessThanOrEqual(height - 24);
    }
  });

  it.each([700, 1400])('%ipx: re-anchors like the mascot -- same shape, x untouched, y moved by ambientY exactly', (height) => {
    const dy = ambientY(MOLECULAR_ANCHORS[id].designY, height) - MOLECULAR_ANCHORS[id].designY;
    expect(Math.abs(dy)).toBeGreaterThan(50); // it really moved
    const base = points(id, 900, 0, false);
    const moved = points(id, height, 0, false);
    expect(moved).toHaveLength(base.length);
    base.forEach((p, i) => {
      expect(moved[i][0]).toBeCloseTo(p[0], 9);
      expect(moved[i][1]).toBeCloseTo(p[1] + dy, 9);
    });
  });

  it('is mascot-sized: a light decoration, 40-110px on its long side', () => {
    const b = bbox(points(id, 900, 0, false));
    const longSide = Math.max(b.x1 - b.x0, b.y1 - b.y0);
    expect(longSide).toBeGreaterThanOrEqual(40);
    expect(longSide).toBeLessThanOrEqual(110);
  });
});

// ---------------------------------------------------------------------------
// Placement. The doodles sit ON the same overlay as the crayon mascot, above
// the cells (pointer-events: none), so the rule is: never cover a certificate
// label, and never crowd the mascot, its spores or the title spark. Label
// boxes are derived from the real cell geometry + `computeLabelSizing`: each
// label is centered on its cell's centroid with the measured width; the
// half-heights below are conservative caps measured in Chromium at
// 700/900/1400 (cert labels 67-97px tall, title 122-144px, eye images at
// 0.73 of their width). Padding covers the +/-7px breathing jitter of the
// centroids plus the boil.
// ---------------------------------------------------------------------------
const LABEL_HALF_HEIGHT = { cert: 52, title: 76, eyeRatio: 0.4 };
const BREATHING_PAD = 14;

function labelBoxes(height: number): Box[] {
  const sizing = computeLabelSizing(height);
  const seeds = computeLiveSeeds(0, height, { breathe: false, hoverGrowth: 0, hoverValues: {} });
  return computeCellGeometry(seeds, height, { gap: DEFAULT_GAP, roundness: DEFAULT_ROUNDNESS }).map((cell) => {
    const w = sizing[cell.id].width;
    const halfH =
      cell.id === 'title'
        ? LABEL_HALF_HEIGHT.title
        : cell.id === 'count' || cell.id === 'span'
          ? w * LABEL_HALF_HEIGHT.eyeRatio
          : LABEL_HALF_HEIGHT.cert;
    return { x0: cell.cx - w / 2, x1: cell.cx + w / 2, y0: cell.cy - halfH, y1: cell.cy + halfH };
  });
}

function numbersIn(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

describe('molecular doodle placement', () => {
  it.each([700, 800, 900, 1100, 1400])(
    '%ipx: no doodle touches a certificate label, on any boil frame or the frozen pose',
    (height) => {
      const boxes = labelBoxes(height);
      expect(boxes).toHaveLength(12);
      for (const id of MOLECULAR_DOODLE_IDS) {
        const frames = [...SWEEP.map((t) => points(id, height, t)), points(id, height, 0, false)];
        for (const pts of frames) {
          const b = bbox(pts);
          boxes.forEach((box, i) => {
            expect(overlaps(b, box, BREATHING_PAD), `${id} vs label #${i} at ${height}px`).toBe(false);
          });
        }
      }
    },
  );

  it.each(HEIGHTS)('%ipx: the mascot, its spore drift areas and the title spark stay clear', (height) => {
    const seeds = computeLiveSeeds(0, height, { breathe: false, hoverGrowth: 0, hoverValues: {} });
    const cells = computeCellGeometry(seeds, height, { gap: DEFAULT_GAP, roundness: DEFAULT_ROUNDNESS });
    const strokes = buildDoodleStrokes({ t: 0, jitterOn: false, hoverValues: {}, cells, color: COLOR, height });
    const partBox = (ids: string[]) => {
      const pts: number[][] = [];
      for (const s of strokes.filter((x) => ids.includes(x.id))) {
        const n = numbersIn(s.d);
        for (let i = 0; i < n.length; i += 2) pts.push([n[i], n[i + 1]]);
      }
      return bbox(pts);
    };
    const mascot = partBox(['ear-l', 'ear-r', 'body', 'arm']);
    const spark = partBox(['spark']);
    // spores drift +/-34 x, +/-26 y around their base and are ~11px wide
    const sporeBases: [number, number][] = [
      [1185, ambientY(640, height)],
      [255, ambientY(300, height)],
      [830, ambientY(268, height)],
    ];
    const sporeBoxes = sporeBases.map(([x, y]) => ({ x0: x - 48, x1: x + 48, y0: y - 40, y1: y + 40 }));
    for (const id of MOLECULAR_DOODLE_IDS) {
      const b = bbox(points(id, height, 0, false));
      expect(overlaps(b, mascot, 40), `${id} vs mascot at ${height}px`).toBe(false);
      expect(overlaps(b, spark, 30), `${id} vs spark at ${height}px`).toBe(false);
      sporeBoxes.forEach((sb, i) => expect(overlaps(b, sb), `${id} vs spore-${i} at ${height}px`).toBe(false));
    }
  });

  it.each(HEIGHTS)('%ipx: the five doodles keep 24px between each other', (height) => {
    const boxes = MOLECULAR_DOODLE_IDS.map((id) => bbox(points(id, height, 0, false)));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlaps(boxes[i], boxes[j], 24), `${MOLECULAR_DOODLE_IDS[i]} vs ${MOLECULAR_DOODLE_IDS[j]}`).toBe(false);
      }
    }
  });
});

describe('buildMolecularStrokes', () => {
  it('returns exactly the five path ids, always present and in order, on every frame', () => {
    for (const t of [0, 0.2, 9]) {
      expect(buildMolecularStrokes({ t, jitterOn: true, height: 700, color: COLOR }).map((s) => s.id)).toEqual(
        MOLECULAR_PATH_IDS,
      );
    }
  });
});
