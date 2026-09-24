import { describe, expect, it } from 'vitest';
import { perturbPoints, rnd } from './strokeMath';

const SQUARE = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

describe('perturbPoints', () => {
  it('with no frame (reduced motion) is a pure scale-then-translate, no noise', () => {
    expect(perturbPoints(SQUARE, 100, 200, 7, 1.5, null, 2)).toEqual([
      [100, 200],
      [120, 200],
      [120, 220],
      [100, 220],
    ]);
  });

  it('with a frame adds the seeded per-point noise the mascot uses: x from rnd(i, f, seed), y from rnd(i + 41, f, seed)', () => {
    const out = perturbPoints(SQUARE, 100, 200, 7, 1.5, 3);
    out.forEach((p, i) => {
      expect(p[0]).toBeCloseTo(100 + SQUARE[i][0] + rnd(i, 3, 7) * 1.5, 12);
      expect(p[1]).toBeCloseTo(200 + SQUARE[i][1] + rnd(i + 41, 3, 7) * 1.5, 12);
    });
    // and the noise is real: the frame really moved the points, by at most `amp` per axis
    const moved = out.map((p, i) => Math.hypot(p[0] - (100 + SQUARE[i][0]), p[1] - (200 + SQUARE[i][1])));
    expect(Math.max(...moved)).toBeGreaterThan(0.05);
    expect(Math.max(...moved)).toBeLessThanOrEqual(1.5 * Math.SQRT2);
  });

  it('is deterministic per (frame, seed) and boils across frames and seeds', () => {
    const a = perturbPoints(SQUARE, 0, 0, 7, 1.5, 3);
    expect(perturbPoints(SQUARE, 0, 0, 7, 1.5, 3)).toEqual(a);
    expect(perturbPoints(SQUARE, 0, 0, 7, 1.5, 4)).not.toEqual(a);
    expect(perturbPoints(SQUARE, 0, 0, 8, 1.5, 3)).not.toEqual(a);
  });
});
