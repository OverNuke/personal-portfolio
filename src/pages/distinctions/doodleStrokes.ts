// Pure computation for the crayon-mascot doodle overlay -- fully decorative
// per docs/04/docs/05 ("the crayon-mascot doodle overlay is decorative
// only... must be aria-hidden and must never itself become a tab stop").
// Ported verbatim from the `doodleStrokes(t, g)` method in
// docs/_decoded/distinction-section-v4-standalone/template.html, lines
// 655-770 (`GUY_BODY`/`GUY_EAR_L`/`GUY_EAR_R`/`GUY_ARM`/`SPARK` point
// arrays, lines 655-659). This is the SAME character Projects' own
// mascotStrokes.ts ports independently ("Shared crayon character from
// Distinction v4 -- same guy, same proportions", per that file's own
// decoded-source comment) -- per this repo's established per-screen
// -subfolder convention (docs/04), each screen re-ports its own copy
// rather than importing across page folders; the two copies' arm-aim/arrow
// targets differ (this one points at whichever certification cell has
// hover focus, Projects' points at whichever project card does).
import { rnd, smooth, blink } from './strokeMath';
import type { CellGeometry } from './voronoi';

export const GUY_BODY: number[][] = [
  [-30, -18],
  [-35, 4],
  [-29, 25],
  [-9, 34],
  [16, 31],
  [31, 13],
  [33, -9],
  [21, -25],
  [-7, -29],
];
export const GUY_EAR_L: number[][] = [
  [-27, -22],
  [-32, -41],
  [-20, -44],
  [-15, -26],
];
export const GUY_EAR_R: number[][] = [
  [10, -27],
  [15, -46],
  [27, -42],
  [25, -23],
];
export const GUY_ARM: number[][] = [
  [31, 2],
  [47, -5],
  [56, -20],
];
export const SPARK: number[][] = [
  [0, -19],
  [5, -6],
  [18, 0],
  [5, 6],
  [0, 19],
  [-5, 6],
  [-18, 0],
  [-5, -6],
];
/** `[cx, cy, phaseSeed]` for the 3 drifting spore rings (template.html line
 *  759). */
const SPORES: [number, number, number][] = [
  [1185, 640, 0],
  [255, 300, 2.1],
  [830, 268, 4.3],
];

export interface DoodlePath {
  id: string;
  d: string;
  fill: string;
  stroke: string;
  w: number;
}

/** Deterministic, frame-stable id list -- lets the caller pre-render one
 *  `<path>` per id once and update attributes in place every frame, never
 *  adding/removing SVG nodes (mirrors the decoded source's own `sc-for`
 *  strategy, and matches Projects' `MASCOT_PATH_IDS` precedent). */
export const DOODLE_PATH_IDS: string[] = [
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
  ...SPORES.flatMap((_, i) => [`spore-${i}`, `nuc-${i}`]),
];

export interface DoodleParams {
  /** Seconds since mount. */
  t: number;
  /** false under prefers-reduced-motion: reduce -- freezes idle sway, the
   *  hover-triggered wave, blink, and per-frame noise "boil" to their
   *  resting values (docs/05). The hover-aim below still reacts to
   *  `hoverValues` (snapped instantly to 0/1 by the caller under reduced
   *  motion, per this repo's established Projects/CrayonMascot precedent
   *  for the same shared character -- docs/04). */
  jitterOn: boolean;
  /** Per-cell 0..1 hover-lerp values, keyed by cell id -- the same values
   *  driving each cell's hover-grow weight in voronoi.ts. */
  hoverValues: Record<string, number>;
  /** This frame's cell geometry (for the arrow's target point + the
   *  title cell's spark anchor). */
  cells: CellGeometry[];
  /** Resolved doodle ink color -- `#e0452b` per the app-shell override
   *  (docs/01/docs/02), not the standalone default `#2b39c7`. */
  color: string;
}

/** Builds this frame's full stroke list for the mascot: body/ears, blinking
 *  dot-eyes, an idling-or-waving arm, a pointer arrow aimed at whichever
 *  cell currently has the hover peak, a sparkle near the title cell, and 3
 *  drifting spore rings. Every id in `DOODLE_PATH_IDS` is always present
 *  (empty `d` when a part is inactive) so the caller's SVG path pool never
 *  needs to add/remove nodes across frames. */
export function buildDoodleStrokes({ t, jitterOn, hoverValues, cells, color }: DoodleParams): DoodlePath[] {
  const B = color;
  const f = jitterOn ? Math.floor(t * 7.5) : 0;
  const out: DoodlePath[] = [];

  const at = (pts: number[][], ox: number, oy: number, seed: number, amp: number, sc = 1): number[][] =>
    pts.map((p, i) => [
      ox + p[0] * sc + (jitterOn ? rnd(i, f, seed) * amp : 0),
      oy + p[1] * sc + (jitterOn ? rnd(i + 41, f, seed) * amp : 0),
    ]);

  const push = (id: string, d: string, fill: string, w: number) => {
    out.push({ id, d: d || '', fill: fill || 'none', stroke: B, w: w || 3.4 });
  };

  const gx = 470;
  const gy = 838 + (jitterOn ? Math.sin(t * 1.7) * 4 : 0);
  push('ear-l', smooth(at(GUY_EAR_L, gx, gy, 2, 1.1), true), B, 2.6);
  push('ear-r', smooth(at(GUY_EAR_R, gx, gy, 3, 1.1), true), B, 2.6);
  push('body', smooth(at(GUY_BODY, gx, gy, 1, 1.6), true), B, 3.2);

  // Eyes: paper-colored dots that squash on the blink. Frozen open (k=1)
  // when jitterOn is false, rather than possibly freezing mid-blink.
  const k = jitterOn ? blink(t) : 1;
  (['l', 'r'] as const).forEach((side, i) => {
    const ex = gx - 12 + i * 22;
    const ey = gy - 6;
    const pts: number[][] = [];
    for (let a = 0; a < 8; a++) {
      const th = (a / 8) * Math.PI * 2;
      pts.push([ex + Math.cos(th) * 5.4, ey + Math.sin(th) * 5.4 * k]);
    }
    out.push({ id: `eye-${side}`, d: smooth(pts, true), fill: '#f4f1e6', stroke: 'none', w: 0 });
  });

  // Find the cell with the current hover peak (0..1).
  let bestId: string | null = null;
  let bv = 0;
  for (const id in hoverValues) {
    const h = hoverValues[id] || 0;
    if (h > bv) {
      bv = h;
      bestId = id;
    }
  }

  // Arm waves when any cell is live (hover > 0), idles otherwise. The wave
  // itself is ambient/idle motion (jitterOn-gated); the aim direction
  // toward the hovered cell is not.
  const live = bv > 0;
  const idleA = (jitterOn ? Math.sin(t * 1.6) * 0.12 : 0) - 0.15;
  const waveA = live && jitterOn ? Math.sin(t * 7) * 0.5 : 0;
  const a = idleA + waveA;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const px = 31;
  const py = 2;
  const arm = GUY_ARM.map((p) => [px + (p[0] - px) * ca - (p[1] - py) * sa, py + (p[0] - px) * sa + (p[1] - py) * ca]);
  const armPts = at(arm, gx, gy, 4, 1.2);
  push('arm', smooth(armPts, false), 'none', 3.2);

  // Pointer arrow: hidden at rest, shoots out of the hand toward whichever
  // cell is live and retracts as that cell settles back.
  const grow = Math.min(1, bv * 1.25);
  const target = bv > 0.04 ? (cells.find((c) => c.id === bestId) ?? null) : null;
  if (target) {
    const hx = armPts[armPts.length - 1][0];
    const hy = armPts[armPts.length - 1][1];
    let vx = target.cx - hx;
    let vy = target.cy - hy;
    const len = Math.hypot(vx, vy) || 1;
    const stop = Math.max(len - Math.sqrt(target.area || 10000) * 0.42, len * 0.35) * grow;
    vx /= len;
    vy /= len;
    const ex = hx + vx * stop;
    const ey = hy + vy * stop;
    const bow = Math.min(len * 0.16, 70) * (vx > 0 ? -1 : 1);
    const samples: number[][] = [];
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      const w = 4 * u * (1 - u);
      samples.push([hx + (ex - hx) * u - vy * bow * w, hy + (ey - hy) * u + vx * bow * w]);
    }
    push('arrow', smooth(at(samples, 0, 0, 5, 1.3), false), 'none', 3.2);
    const bx = samples[6][0] - samples[5][0];
    const by = samples[6][1] - samples[5][1];
    const bl = Math.hypot(bx, by) || 1;
    const ux = bx / bl;
    const uy = by / bl;
    const barb = (sgn: number) =>
      smooth(
        at(
          [
            [ex - (ux * 0.94 - uy * sgn * 0.42) * 20, ey - (uy * 0.94 + ux * sgn * 0.42) * 20],
            [ex, ey],
          ],
          0,
          0,
          6 + sgn,
          1.1,
        ),
        false,
      );
    push('barb-a', barb(1), 'none', 3.2);
    push('barb-b', barb(-1), 'none', 3.2);
  } else {
    push('arrow', '', 'none', 3.2);
    push('barb-a', '', 'none', 3.2);
    push('barb-b', '', 'none', 3.2);
  }

  const titleCell = cells.find((c) => c.id === 'title');
  if (titleCell) {
    const s = 1 + (jitterOn ? Math.sin(t * 2.2) * 0.12 : 0);
    push('spark', smooth(at(SPARK, titleCell.cx + 168, titleCell.cy - 126, 8, 1.1, s), true), B, 2.4);
  } else {
    push('spark', '', B, 2.4);
  }

  SPORES.forEach(([sx, sy, seed], i) => {
    const cx = sx + (jitterOn ? Math.cos(t * 0.28 + seed) * 34 : 0);
    const cy = sy + (jitterOn ? Math.sin(t * 0.23 + seed) * 26 : 0);
    const ring: number[][] = [];
    for (let a2 = 0; a2 < 9; a2++) {
      const th = (a2 / 9) * Math.PI * 2;
      ring.push([Math.cos(th) * 11, Math.sin(th) * 9.5]);
    }
    push(`spore-${i}`, smooth(at(ring, cx, cy, 10 + i, 1.3), true), 'none', 2.4);
    push(
      `nuc-${i}`,
      smooth(
        at(
          [
            [-3, 0],
            [0, -3],
            [3, 0],
            [0, 3],
          ],
          cx,
          cy,
          20 + i,
          0.8,
        ),
        true,
      ),
      B,
      1.6,
    );
  });

  return out;
}
