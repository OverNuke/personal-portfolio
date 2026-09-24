// RED -> GREEN anchor for the STAGE_HEIGHT=900 -> height-param refactor
// (sdd/continuous-scroll-and-doodles, Phase 1, tasks 1.1/1.2). Written
// against an API that does not exist yet on the pre-refactor module
// (`computeLiveSeeds`/`computeCellGeometry` took no `height` argument, and
// `computeCellPolygons` did not exist at all) -- importing/calling it fails
// until voronoi.ts is refactored to thread `height` through instead of the
// module-level `STAGE_HEIGHT` constant.
//
// Spec anchor (`sdd/continuous-scroll-and-doodles/spec`,
// `continuous-scroll-layout` capability, "Distinctions cell geometry at
// non-900 height" scenario): "all 12 cells occupy non-overlapping,
// non-degenerate positions filling the section's actual rendered height,
// with no dead space and no aspect distortion" -- verified here at
// 700/900/1400px.
import { describe, expect, it } from 'vitest';
import { DEFAULT_GAP, DEFAULT_ROUNDNESS, STAGE_WIDTH, computeCellGeometry, computeCellPolygons, computeLiveSeeds } from './voronoi';

interface Point {
  x: number;
  y: number;
}

function shoelaceArea(poly: Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    sum += p.x * q.y - q.x * p.y;
  }
  return Math.abs(sum / 2);
}

function axesOf(poly: Point[]): Point[] {
  const axes: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    axes.push({ x: -(p2.y - p1.y), y: p2.x - p1.x });
  }
  return axes;
}

function project(poly: Point[], axis: Point): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of poly) {
    const dot = p.x * axis.x + p.y * axis.y;
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
}

/** Separating Axis Theorem overlap check for two convex polygons -- power
 *  cells are convex by construction (each is an intersection of
 *  half-planes), so SAT is an exact test here, not an approximation.
 *  `epsilon` tolerates the deliberate inset gap between neighboring cells
 *  (real cells never literally touch -- `insetPoly` pulls every edge in by
 *  `gap/2`) without flagging floating-point-adjacent edges as overlap. */
function polygonsOverlap(a: Point[], b: Point[]): boolean {
  const epsilon = 0.05;
  for (const axis of [...axesOf(a), ...axesOf(b)]) {
    const pa = project(a, axis);
    const pb = project(b, axis);
    if (pa.max <= pb.min + epsilon || pb.max <= pa.min + epsilon) return false;
  }
  return true;
}

const HEIGHTS = [700, 900, 1400];
// Floor well below the smallest authored cell's area (~63k px^2 at 900px,
// see the captured baseline below) -- this only needs to catch genuinely
// collapsed/degenerate polygons (near-zero area from a bad height/margin
// interaction), not enforce a tuned visual minimum size.
const MIN_CELL_AREA = 500;

function restSeeds(height: number) {
  return computeLiveSeeds(0, height, { breathe: false, hoverGrowth: 0, hoverValues: {} });
}

describe('computeCellPolygons — non-overlap and non-degeneracy at dynamic heights', () => {
  it.each(HEIGHTS)('returns 12 non-degenerate convex polygons at height=%dpx', (height) => {
    const polygons = computeCellPolygons(restSeeds(height), height, DEFAULT_GAP);

    expect(polygons).toHaveLength(12);
    polygons.forEach((poly) => {
      expect(poly.length).toBeGreaterThanOrEqual(3);
      expect(shoelaceArea(poly)).toBeGreaterThan(MIN_CELL_AREA);
    });
  });

  it.each(HEIGHTS)('has no pairwise overlap among the 12 cells at height=%dpx', (height) => {
    const polygons = computeCellPolygons(restSeeds(height), height, DEFAULT_GAP);

    for (let i = 0; i < polygons.length; i++) {
      for (let j = i + 1; j < polygons.length; j++) {
        expect(polygonsOverlap(polygons[i], polygons[j])).toBe(false);
      }
    }
  });

  it.each(HEIGHTS)('keeps every cell vertex within the stage rectangle at height=%dpx', (height) => {
    const polygons = computeCellPolygons(restSeeds(height), height, DEFAULT_GAP);

    polygons.forEach((poly) => {
      poly.forEach((p) => {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(STAGE_WIDTH);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(height);
      });
    });
  });

  it('fills more of the stage at height=1400px than at height=700px (no dead space introduced by a fixed-900 clip)', () => {
    const totalAreaAt = (height: number) =>
      computeCellPolygons(restSeeds(height), height, DEFAULT_GAP).reduce((sum, poly) => sum + shoelaceArea(poly), 0);

    // A height-param bug that silently clips to the old 900px rectangle
    // would make total cell area IDENTICAL (or smaller) at 1400px vs
    // 700px -- real height-aware geometry must grow with the stage.
    expect(totalAreaAt(1400)).toBeGreaterThan(totalAreaAt(700));
  });
});

describe('computeCellGeometry — approval test anchored to the shipped 900px layout', () => {
  // Captured from the pre-refactor module (STAGE_HEIGHT=900 constant) via
  // `computeLiveSeeds(0, {breathe:false, hoverGrowth:0, hoverValues:{}})` +
  // `computeCellGeometry(seeds, {gap: DEFAULT_GAP, roundness: DEFAULT_ROUNDNESS})`
  // on 2026-09-22, BEFORE any code in this change touched voronoi.ts. This
  // is the "currently shipped, presumed-correct" baseline the height-param
  // refactor must reproduce exactly at height=900 (strict-tdd.md's
  // Approval Testing pattern) -- any drift here means the refactor changed
  // behavior at the one height that must stay pixel-identical.
  const BASELINE_900 = [
    { id: 'title', cx: 211.989, cy: 220.055, area: 162827.826 },
    { id: 'anfeca', cx: 591.838, cy: 185.671, area: 111581.994 },
    { id: 'nota', cx: 913.621, cy: 153.89, area: 87581.995 },
    { id: 'propadeutic', cx: 1249.315, cy: 176.558, area: 108423.315 },
    { id: 'exaver', cx: 240.525, cy: 551.494, area: 113209.148 },
    { id: 'english', cx: 628.604, cy: 506.567, area: 99256.634 },
    { id: 'powerbi', cx: 970.398, cy: 460.906, area: 102955.591 },
    { id: 'ai', cx: 1289.224, cy: 487.454, area: 81495.991 },
    { id: 'toefl', cx: 272.004, cy: 783.13, area: 96612.118 },
    { id: 'aiinit', cx: 686.034, cy: 769.579, area: 77170.927 },
    { id: 'count', cx: 1007.071, cy: 752.026, area: 77635.405 },
    { id: 'span', cx: 1292.015, cy: 763.752, area: 63475.337 },
  ];

  it('reproduces the pre-refactor cx/cy/area for all 12 cells at height=900px within 0.05px/px^2', () => {
    const seeds = restSeeds(900);
    const cells = computeCellGeometry(seeds, 900, { gap: DEFAULT_GAP, roundness: DEFAULT_ROUNDNESS });

    expect(cells).toHaveLength(BASELINE_900.length);
    cells.forEach((cell, i) => {
      const expected = BASELINE_900[i];
      expect(cell.id).toBe(expected.id);
      expect(cell.cx).toBeCloseTo(expected.cx, 1);
      expect(cell.cy).toBeCloseTo(expected.cy, 1);
      expect(cell.area).toBeCloseTo(expected.area, 1);
    });
  });

  it('produces a non-empty rounded path `d` for every cell at 700/900/1400px', () => {
    HEIGHTS.forEach((height) => {
      const seeds = restSeeds(height);
      const cells = computeCellGeometry(seeds, height, { gap: DEFAULT_GAP, roundness: DEFAULT_ROUNDNESS });
      cells.forEach((cell) => {
        expect(cell.d.length).toBeGreaterThan(0);
        expect(cell.d.startsWith('M')).toBe(true);
      });
    });
  });
});
