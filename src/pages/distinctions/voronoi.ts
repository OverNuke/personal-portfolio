// Pure, DOM-free weighted-Voronoi ("power diagram") geometry -- docs/04's
// bucket-3 contract ("Pure computation -> a plain, DOM-free TS module,
// consumed by a render-only component... No DOM access, plain data in,
// path data out"). Ported verbatim (formulas unchanged, only typed) from the
// `<script>` block of
// docs/_decoded/distinction-section-v4-standalone/template.html, lines
// 511-627 (seed data + `clipHalf`/`powerCell`/`centroid`/`insetPoly`/
// `simplify`/`roundPath`) and 835-860 (`seeds(t)`/`geometry(t)`, the
// breathing formulas cited in docs/07).
//
// Power diagram definition (the actual math, stated once here since no
// other doc spells out the formula itself): for seed s with weight w_s, its
// cell is `{ p : |p - s|^2 - w_s <= |p - q|^2 - w_q }` for every other seed
// q. Expanding and cancelling the quadratic |p|^2 term turns each pairwise
// constraint into a straight half-plane cut, so a cell is the intersection
// of the stage rectangle with one half-plane per other seed -- an
// *additively weighted* Voronoi diagram (bigger weight = bigger cell),
// distinct from a plain nearest-seed Voronoi diagram, which has no `w`.

export const STAGE_WIDTH = 1440;
export const STAGE_HEIGHT = 900;

export type CellKind = 'title' | 'rec' | 'accent' | 'meta';

export interface CellSeed {
  id: string;
  kind: CellKind;
  x: number;
  y: number;
  w: number;
  /** `index * 1.9` (template.html line 528) -- deliberately non-aligned per
   *  -cell offset so cells never breathe in lockstep (docs/07). */
  phase: number;
}

export interface LiveSeed {
  id: string;
  kind: CellKind;
  x: number;
  y: number;
  w: number;
}

export interface CellGeometry {
  id: string;
  kind: CellKind;
  d: string;
  cx: number;
  cy: number;
  area: number;
}

interface Point {
  x: number;
  y: number;
}

// Colony seeds -- power-diagram sites. `w` is a weight in px^2 (bigger =
// bigger cell). Verified verbatim against template.html lines 514-527,
// including the exact x/y/w for every one of the 9 real certification
// cells plus the 3 non-interactive cells (title heading, and the two
// decorative "colony eye" cells, `count`/`span`).
const RAW_SEEDS: Omit<CellSeed, 'phase'>[] = [
  { id: 'title', kind: 'title', x: 215, y: 225, w: 30000 },
  { id: 'anfeca', kind: 'rec', x: 600, y: 190, w: 15000 },
  { id: 'nota', kind: 'rec', x: 905, y: 150, w: 9000 },
  { id: 'propadeutic', kind: 'rec', x: 1250, y: 195, w: 12000 },
  { id: 'exaver', kind: 'rec', x: 285, y: 545, w: 11000 },
  { id: 'english', kind: 'rec', x: 630, y: 505, w: 9500 },
  { id: 'powerbi', kind: 'rec', x: 975, y: 455, w: 10000 },
  { id: 'ai', kind: 'rec', x: 1305, y: 470, w: 8500 },
  { id: 'toefl', kind: 'rec', x: 320, y: 795, w: 9000 },
  { id: 'aiinit', kind: 'rec', x: 690, y: 800, w: 8500 },
  { id: 'count', kind: 'accent', x: 1010, y: 780, w: 7000 },
  { id: 'span', kind: 'meta', x: 1300, y: 800, w: 6500 },
];

export const CELL_SEEDS: CellSeed[] = RAW_SEEDS.map((seed, index) => ({ ...seed, phase: index * 1.9 }));

/** The 9 real, interactive certification cell ids, in the colony's own seed
 *  order (not the display-numbering order -- see distinctionsData.ts for
 *  the 01..09 numbering, which follows the decoded template's separate
 *  label list instead). */
export const CERT_CELL_IDS: string[] = CELL_SEEDS.filter((s) => s.kind === 'rec').map((s) => s.id);

// Defaults from the decoded `data-props` block (template.html line 510):
// gap 7px, roundness 56px, hoverGrowth 55%.
export const DEFAULT_GAP = 7;
export const DEFAULT_ROUNDNESS = 56;
export const DEFAULT_HOVER_GROWTH = 0.55;
/** Per-frame hover-lerp ease factor (template.html line 923: `cur + (target
 *  - cur) * 0.12`). */
export const HOVER_LERP = 0.12;

/** Clip a convex polygon to the half-plane `nx*x + ny*y <= c`. */
function clipHalf(poly: Point[], nx: number, ny: number, c: number): Point[] {
  const out: Point[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const da = nx * a.x + ny * a.y - c;
    const db = nx * b.x + ny * b.y - c;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/** Power cell of seed `i`: the stage rectangle clipped by one half-plane per
 *  other seed. */
function powerCell(i: number, seeds: LiveSeed[]): Point[] {
  const margin = 13;
  let poly: Point[] = [
    { x: margin, y: margin },
    { x: STAGE_WIDTH - margin, y: margin },
    { x: STAGE_WIDTH - margin, y: STAGE_HEIGHT - margin },
    { x: margin, y: STAGE_HEIGHT - margin },
  ];
  const s = seeds[i];
  for (let j = 0; j < seeds.length && poly.length >= 3; j++) {
    if (j === i) continue;
    const q = seeds[j];
    const dx = q.x - s.x;
    const dy = q.y - s.y;
    if (dx * dx + dy * dy < 1e-6) continue;
    poly = clipHalf(poly, 2 * dx, 2 * dy, q.x * q.x + q.y * q.y - s.x * s.x - s.y * s.y + s.w - q.w);
  }
  return poly;
}

function centroid(poly: Point[]): { x: number; y: number; area: number } {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const f = p.x * q.y - q.x * p.y;
    a += f;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  if (Math.abs(a) < 1e-6) return { x: poly[0]?.x ?? 0, y: poly[0]?.y ?? 0, area: 0 };
  return { x: cx / (3 * a), y: cy / (3 * a), area: Math.abs(a / 2) };
}

/** Convex polygons inset exactly by re-clipping with each edge pushed
 *  inward -- this is what carves the visible gap between neighboring
 *  cells. */
function insetPoly(poly: Point[], d: number): Point[] {
  if (d <= 0 || poly.length < 3) return poly;
  const c = centroid(poly);
  let p = poly;
  for (let i = 0; i < poly.length && p.length >= 3; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    let ex = b.x - a.x;
    let ey = b.y - a.y;
    const len = Math.hypot(ex, ey) || 1;
    ex /= len;
    ey /= len;
    let nx = ey;
    let ny = -ex;
    if (nx * (a.x - c.x) + ny * (a.y - c.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    p = clipHalf(p, nx, ny, nx * a.x + ny * a.y - d);
  }
  return p;
}

/** Drops slivers (near-duplicate vertices a clip can leave behind -- these
 *  produced stray needle corners) and near-collinear vertices. */
function simplify(poly: Point[], minEdge: number): Point[] {
  if (poly.length < 4) return poly;
  const out: Point[] = [];
  for (const v of poly) {
    const last = out[out.length - 1];
    if (last && Math.hypot(v.x - last.x, v.y - last.y) < minEdge) continue;
    out.push(v);
  }
  while (out.length > 3 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) < minEdge) {
    out.pop();
  }
  if (out.length < 3) return poly;
  const keep: Point[] = [];
  for (let i = 0; i < out.length; i++) {
    const v = out[i];
    const p = out[(i - 1 + out.length) % out.length];
    const q = out[(i + 1) % out.length];
    const l1 = Math.hypot(p.x - v.x, p.y - v.y) || 1;
    const l2 = Math.hypot(q.x - v.x, q.y - v.y) || 1;
    const dot = ((p.x - v.x) * (q.x - v.x) + (p.y - v.y) * (q.y - v.y)) / (l1 * l2);
    if (dot > -0.9995) keep.push(v); // skip vertices that are effectively straight
  }
  return keep.length >= 3 ? keep : out;
}

/** Heavy corner rounding derived from each corner's actual joint angle
 *  (`r / tan(theta/2)`) so a sharp corner gets blunted rather than keeping a
 *  spike with a token fillet -- this is what avoids the black pockets that
 *  open up between cells under naive fixed-radius rounding. */
function roundPath(poly: Point[], r: number): string {
  const n = poly.length;
  if (n < 3) return '';
  let d = '';
  for (let i = 0; i < n; i++) {
    const v = poly[i];
    const p = poly[(i - 1 + n) % n];
    const q = poly[(i + 1) % n];
    const l1 = Math.hypot(p.x - v.x, p.y - v.y) || 1;
    const l2 = Math.hypot(q.x - v.x, q.y - v.y) || 1;
    const dot = Math.max(-1, Math.min(1, ((p.x - v.x) * (q.x - v.x) + (p.y - v.y) * (q.y - v.y)) / (l1 * l2)));
    const half = Math.acos(dot) / 2;
    const rr = Math.min(r / Math.max(Math.tan(half), 0.12), l1 * 0.5, l2 * 0.5);
    const ax = v.x + ((p.x - v.x) / l1) * rr;
    const ay = v.y + ((p.y - v.y) / l1) * rr;
    const bx = v.x + ((q.x - v.x) / l2) * rr;
    const by = v.y + ((q.y - v.y) / l2) * rr;
    d += (i === 0 ? 'M' : 'L') + ax.toFixed(1) + ' ' + ay.toFixed(1);
    d += 'Q' + v.x.toFixed(1) + ' ' + v.y.toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1);
  }
  return d + 'Z';
}

export interface BreathingOptions {
  /** false under prefers-reduced-motion: reduce -- freezes both the
   *  position jitter and the weight jitter (docs/05). */
  breathe: boolean;
  /** 0..1, e.g. `DEFAULT_HOVER_GROWTH` (55%). */
  hoverGrowth: number;
  /** Per-cell 0..1 hover-lerp values (docs/07's `hov[c.id]`, eased toward
   *  its 0/1 target at `HOVER_LERP` per frame by the caller). */
  hoverValues: Record<string, number>;
}

/** Live seed set for time `t` (seconds since mount) with the sinusoidal
 *  "breathing" position/weight jitter folded in -- docs/07's exact
 *  frequencies: `x += cos(t*0.37 + phase)*7`, `y += sin(t*0.31 +
 *  phase*1.3)*7`, weight jitter `sin(t*0.55 + phase)` folded into the
 *  weight as `w * (1 + b*0.05 + hover*hoverGrowth)`. */
export function computeLiveSeeds(t: number, options: BreathingOptions): LiveSeed[] {
  const { breathe, hoverGrowth, hoverValues } = options;
  return CELL_SEEDS.map((seed) => {
    const h = hoverValues[seed.id] ?? 0;
    const b = breathe ? Math.sin(t * 0.55 + seed.phase) : 0;
    return {
      id: seed.id,
      kind: seed.kind,
      x: seed.x + (breathe ? Math.cos(t * 0.37 + seed.phase) * 7 : 0),
      y: seed.y + (breathe ? Math.sin(t * 0.31 + seed.phase * 1.3) * 7 : 0),
      w: seed.w * (1 + b * 0.05 + h * hoverGrowth),
    };
  });
}

export interface GeometryOptions {
  /** Full inter-cell gap in px (half is applied as the inset distance) --
   *  `DEFAULT_GAP` (7). */
  gap: number;
  /** Corner-rounding radius in px -- `DEFAULT_ROUNDNESS` (56). */
  roundness: number;
}

/** Turns a live seed set into renderable cell path data. No DOM access --
 *  callers (VoronoiCellField) own translating `d`/`cx`/`cy` into actual SVG
 *  attributes / label positions. */
export function computeCellGeometry(seeds: LiveSeed[], options: GeometryOptions): CellGeometry[] {
  const insetDistance = options.gap / 2;
  const r = options.roundness;
  return seeds.map((seed, i) => {
    const raw = powerCell(i, seeds);
    const inset = simplify(insetPoly(raw, insetDistance), Math.max(10, r * 0.32));
    const c = centroid(inset.length >= 3 ? inset : raw);
    return { id: seed.id, kind: seed.kind, d: roundPath(inset, r), cx: c.x, cy: c.y, area: c.area };
  });
}
