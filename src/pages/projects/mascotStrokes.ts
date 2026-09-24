// Pure computation for the shared crayon mascot + its annotation doodles
// (rings, arrows, title underlines, tag rings, background swoosh/spark/
// spores). Ported from the `strokes()`/`arrow()` methods in
// docs/_decoded/projects-section-v2-standalone/template.html (lines
// 507-719) -- "Shared crayon character from Distinction v4 -- same guy,
// same proportions" per that file's own comment (line 507). Takes already
// -measured DOM rects as plain data (no DOM access itself), so the geometry
// math stays unit-testable per docs/04_COMPONENT_RULES.MD's pure-module
// preference -- CrayonMascot.tsx owns the actual `getBoundingClientRect`
// measurement and rAF loop.
import { ambientY, DESIGN_HEIGHT } from './projectsLayout';
import { ellipsePts, rnd, smooth } from './strokeMath';

/** The mascot's resting y in the 900-tall design space (template.html). It
 *  floats free of any card/CSS partner, so it re-anchors proportionally to
 *  the real section height via `ambientY` -- unlike SWOOSH/SPARK/flag-ring,
 *  which pair with top-px CSS (`.projects-flagship-badge top:250px`,
 *  `.projects-eyebrow top:78px`) and stay absolute on purpose. */
const GUY_DESIGN_Y = 812;

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
export const SPORES: number[][] = [
  [500, 492, 0],
  [700, 84, 2.1],
  [1012, 706, 4.3],
];
export const SWOOSH: number[][] = [
  [68, 202],
  [180, 210],
  [320, 200],
  [462, 211],
  [604, 197],
];

export const PIDS = ['p1', 'p2', 'p3'] as const;
export type ProjectMarkId = (typeof PIDS)[number];
export const MAXTAGS = 4;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export interface ProjectMeasure {
  photo?: Rect;
  title?: Rect;
  note?: Rect;
  tags: Rect[];
}

export interface PathDatum {
  id: string;
  d: string;
  fill: string;
  stroke: string;
  w: number;
}

export interface MascotParams {
  /** Seconds since mount. Ignored (treated as 0) for every ambient/idle
   *  motion when `jitterOn` is false. */
  t: number;
  /** false under prefers-reduced-motion: reduce -- freezes noise jitter and
   *  idle sway/blink/drift to their resting values (docs/05). */
  jitterOn: boolean;
  /** Per-project 0..1 hover-lerp values, shared with useCardHover so the
   *  mascot's aim/rings/underlines move off the same value as card lift. */
  hov: Record<string, number>;
  measures: Record<string, ProjectMeasure>;
  blue: string;
  hot: string;
  /** Real rendered height of the layer the strokes paint into. Only the
   *  free-floating ambient doodles (the mascot's resting y and the spores)
   *  re-anchor to it; everything measured off the DOM already follows the
   *  real cards, and the top-anchored doodles (swoosh, spark, flag ring)
   *  stay pinned to their CSS-positioned partners. Defaults to the 900px
   *  design height, which reproduces the originally shipped output. */
  height?: number;
}

/** Builds this frame's full stroke list for the mascot + its annotation
 *  doodles (everything except the "PROJECTS" title, which StrokeGlyphTitle
 *  owns independently). Every id in `MASCOT_PATH_IDS` is always present in
 *  the output (empty `d` when idle) so the caller's SVG path pool never
 *  needs to add/remove nodes across frames. */
export function buildMascotStrokes({
  t,
  jitterOn,
  hov,
  measures,
  blue: B,
  hot: R,
  height = DESIGN_HEIGHT,
}: MascotParams): PathDatum[] {
  const f = jitterOn ? Math.floor(t * 7.5) : 0;
  const out: PathDatum[] = [];

  const at = (pts: number[][], ox: number, oy: number, seed: number, amp: number, sc = 1): number[][] =>
    pts.map((p, i) => [
      ox + p[0] * sc + (jitterOn ? rnd(i, f, seed) * amp : 0),
      oy + p[1] * sc + (jitterOn ? rnd(i + 41, f, seed) * amp : 0),
    ]);

  const push = (id: string, d: string, fill: string, stroke: string, w: number) => {
    out.push({ id, d: d || '', fill: fill || 'none', stroke: stroke || B, w: w || 3.2 });
  };

  const arrow = (
    key: string,
    hx: number,
    hy: number,
    tx: number,
    ty: number,
    grow: number,
    back: number,
    color: string,
    w: number,
    bowK: number,
  ) => {
    const ids = [`${key}-shaft`, `${key}-barb-a`, `${key}-barb-b`];
    if (!grow || grow < 0.05) {
      ids.forEach((id) => push(id, '', 'none', color, w));
      return;
    }
    let vx = tx - hx;
    let vy = ty - hy;
    const len = Math.hypot(vx, vy) || 1;
    const stop = Math.max(len - back, len * 0.3) * grow;
    vx /= len;
    vy /= len;
    const ex = hx + vx * stop;
    const ey = hy + vy * stop;
    const bow = Math.min(len * bowK, 60) * (vx > 0 ? -1 : 1);
    const samples: number[][] = [];
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      const bw = 4 * u * (1 - u);
      samples.push([hx + (ex - hx) * u - vy * bow * bw, hy + (ey - hy) * u + vx * bow * bw]);
    }
    push(ids[0], smooth(at(samples, 0, 0, 5, 1.3), false), 'none', color, w);
    const bx = samples[6][0] - samples[5][0];
    const by = samples[6][1] - samples[5][1];
    const bl = Math.hypot(bx, by) || 1;
    const ux = bx / bl;
    const uy = by / bl;
    const barb = (sgn: number, seed: number) =>
      smooth(
        at(
          [
            [ex - (ux * 0.94 - uy * sgn * 0.42) * 18, ey - (uy * 0.94 + ux * sgn * 0.42) * 18],
            [ex, ey],
          ],
          0,
          0,
          seed,
          1.1,
        ),
        false,
      );
    push(ids[1], barb(1, 6), 'none', color, w);
    push(ids[2], barb(-1, 7), 'none', color, w);
  };

  push('swoosh-a', smooth(at(SWOOSH, 0, 0, 90, 3), false), 'none', R, 7);
  push('swoosh-b', smooth(at(SWOOSH, 0, 7, 91, 3.4), false), 'none', R, 4.5);
  push(
    'spark',
    smooth(at(SPARK, 560, 44, 92, 1.1, 1 + (jitterOn ? Math.sin(t * 2.2) * 0.12 : 0)), true),
    B,
    B,
    2.4,
  );
  push(
    'flag-ring',
    smooth(at(ellipsePts(112, 266 - (hov.p1 || 0) * 9, 64, 26, 9, 0.4), 0, 0, 93, 2), true),
    'none',
    R,
    3,
  );

  const gx = 512;
  const gy = ambientY(GUY_DESIGN_Y, height) + (jitterOn ? Math.sin(t * 1.7) * 4 : 0);
  const S = 1.2;
  push('ear-l', smooth(at(GUY_EAR_L, gx, gy, 2, 1.1, S), true), B, B, 2.6);
  push('ear-r', smooth(at(GUY_EAR_R, gx, gy, 3, 1.1, S), true), B, B, 2.6);
  push('body', smooth(at(GUY_BODY, gx, gy, 1, 1.6, S), true), B, B, 3.2);

  const blink = jitterOn ? (() => {
    const p = (t + 0.7) % 3.9;
    return p < 0.17 ? Math.max(0.08, Math.abs(Math.cos((p / 0.17) * Math.PI))) : 1;
  })() : 1;
  (['l', 'r'] as const).forEach((side, i) => {
    const ex = gx - 14 + i * 26;
    const ey = gy - 8;
    const pts: number[][] = [];
    for (let a = 0; a < 8; a++) {
      const th = (a / 8) * Math.PI * 2;
      pts.push([ex + Math.cos(th) * 5.8, ey + Math.sin(th) * 5.8 * blink]);
    }
    out.push({ id: `eye-${side}`, d: smooth(pts, true), fill: '#f4f1e6', stroke: 'none', w: 0 });
  });

  // Plain for-of (not .forEach) so TS's control-flow analysis correctly
  // tracks the reassignment of `bestPhoto` across iterations.
  let bestPhoto: Rect | null = null;
  let bv = 0;
  for (const pid of PIDS) {
    const h = hov[pid] || 0;
    if (h > bv) {
      bv = h;
      bestPhoto = measures[pid]?.photo ?? null;
    }
  }
  const armAim = bestPhoto ? Math.atan2(bestPhoto.cy - gy, bestPhoto.cx - gx) : 0;
  const idleA = (jitterOn ? Math.sin(t * 1.6) * 0.12 : 0) - 0.15;
  const a = idleA + (armAim - idleA) * Math.min(1, bv * 1.2) + (bv > 0.1 && jitterOn ? Math.sin(t * 7) * 0.06 : 0);
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const px = 31;
  const py = 2;
  const arm = GUY_ARM.map((p) => [px + (p[0] - px) * ca - (p[1] - py) * sa, py + (p[0] - px) * sa + (p[1] - py) * ca]);
  const armPts = at(arm, gx, gy, 4, 1.2, S);
  push('arm', smooth(armPts, false), 'none', B, 3.2);

  const hand = armPts[armPts.length - 1];
  arrow(
    'ptr',
    hand[0],
    hand[1],
    bestPhoto ? bestPhoto.cx : 0,
    bestPhoto ? bestPhoto.cy : 0,
    bestPhoto ? Math.min(1, bv * 1.25) : 0,
    bestPhoto ? bestPhoto.w / 2 + 26 : 0,
    B,
    3.2,
    0.14,
  );

  PIDS.forEach((pid, pi) => {
    const e: ProjectMeasure = measures[pid] ?? { tags: [] };
    const h = hov[pid] || 0;
    const g = Math.min(1, h * 1.35);
    const ann = g;
    const ph = e.photo;

    if (ph && ann > 0.05) {
      const rx = ph.w / 2 + 9;
      const ry = ph.h / 2 + 9;
      const sc = 0.82 + 0.18 * ann;
      push(
        `ring-a-${pid}`,
        smooth(at(ellipsePts(ph.cx, ph.cy, rx * sc, ry * sc, 11, 0.3 + pi), 0, 0, 100 + pi, 2.2), true),
        'none',
        R,
        3.4,
      );
      push(
        `ring-b-${pid}`,
        smooth(at(ellipsePts(ph.cx, ph.cy, rx * sc + 7, ry * sc + 5, 11, 1.1 + pi), 0, 0, 110 + pi, 2.6), true),
        'none',
        R,
        2.2,
      );
    } else {
      push(`ring-a-${pid}`, '', 'none', R, 3.4);
      push(`ring-b-${pid}`, '', 'none', R, 2.2);
    }

    if (ph && e.note && ann > 0.05) {
      const nb = e.note;
      const right = nb.cx > ph.cx;
      const tx = right ? nb.x - 10 : nb.x + nb.w + 10;
      const ty = nb.y + 11;
      const ux = tx - ph.cx;
      const uy = ty - ph.cy;
      const ul = Math.hypot(ux, uy) || 1;
      const rad = ph.w / 2 + 17;
      arrow(`ann-${pid}`, ph.cx + (ux / ul) * rad, ph.cy + (uy / ul) * rad, tx, ty, ann, 4, R, 3, 0.12);
    } else {
      arrow(`ann-${pid}`, 0, 0, 0, 0, 0, 0, R, 3, 0);
    }

    if (e.title && ann > 0.05) {
      const ti = e.title;
      const y = ti.y + ti.h - 1;
      const x2 = ti.x + ti.w * ann;
      push(
        `ul-a-${pid}`,
        smooth(
          at(
            [
              [ti.x, y + 3],
              [ti.x + (x2 - ti.x) * 0.5, y + 6],
              [x2, y + 2],
            ],
            0,
            0,
            140 + pi,
            1.6,
          ),
          false,
        ),
        'none',
        R,
        3,
      );
      push(
        `ul-b-${pid}`,
        smooth(
          at(
            [
              [ti.x + 4, y + 8],
              [ti.x + (x2 - ti.x) * 0.6, y + 10],
              [x2 - 3, y + 7],
            ],
            0,
            0,
            150 + pi,
            1.9,
          ),
          false,
        ),
        'none',
        R,
        1.8,
      );
    } else {
      push(`ul-a-${pid}`, '', 'none', R, 3);
      push(`ul-b-${pid}`, '', 'none', R, 1.8);
    }

    for (let j = 0; j < MAXTAGS; j++) {
      const id = `tag-${pid}-${j}`;
      const tg = e.tags[j];
      if (!tg || g < 0.06) {
        push(id, '', 'none', B, 2.4);
        continue;
      }
      const sc = 0.78 + 0.22 * g;
      push(
        id,
        smooth(
          at(
            ellipsePts(tg.cx, tg.cy, (tg.w / 2 + 7) * sc, (tg.h / 2 + 6) * sc, 9, 0.6 + j),
            0,
            0,
            130 + pi * 7 + j,
            1.5,
          ),
          true,
        ),
        'none',
        B,
        2.4,
      );
    }
  });

  SPORES.forEach((s, i) => {
    const cx = s[0] + (jitterOn ? Math.cos(t * 0.28 + s[2]) * 34 : 0);
    const cy = ambientY(s[1], height) + (jitterOn ? Math.sin(t * 0.23 + s[2]) * 26 : 0);
    push(`spore-${i}`, smooth(at(ellipsePts(0, 0, 11, 9.5, 9, 0), cx, cy, 10 + i, 1.3), true), 'none', B, 2.4);
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
      B,
      1.6,
    );
  });

  return out;
}

/** Deterministic, frame-stable id list -- lets the caller pre-render one
 *  `<path>` per id once and update attributes in place every frame, never
 *  adding/removing SVG nodes (matches the decoded source's own `sc-for`
 *  strategy of always emitting every id, empty `d` when idle). */
export const MASCOT_PATH_IDS: string[] = [
  'swoosh-a',
  'swoosh-b',
  'spark',
  'flag-ring',
  'ear-l',
  'ear-r',
  'body',
  'eye-l',
  'eye-r',
  'arm',
  'ptr-shaft',
  'ptr-barb-a',
  'ptr-barb-b',
  ...PIDS.flatMap((pid) => [
    `ring-a-${pid}`,
    `ring-b-${pid}`,
    `ann-${pid}-shaft`,
    `ann-${pid}-barb-a`,
    `ann-${pid}-barb-b`,
    `ul-a-${pid}`,
    `ul-b-${pid}`,
    ...Array.from({ length: MAXTAGS }, (_, j) => `tag-${pid}-${j}`),
  ]),
  ...SPORES.flatMap((_, i) => [`spore-${i}`, `nuc-${i}`]),
];
