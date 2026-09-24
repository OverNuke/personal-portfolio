// Pure computation for the molecular / health doodle set on Distinctions --
// DNA helix, flask, molecule, pill capsule, microscope (docs/04 bucket 3:
// plain data in, path data out, no DOM). These are CODE, not binary image
// assets: literal point arrays following the exact convention of the crayon
// mascot's `GUY_BODY`/`GUY_EAR_L`/`GUY_EAR_R`/`GUY_ARM` (doodleStrokes.ts,
// docs/01_ART_DIRECTION.MD "The doodle / hand-drawn layer").
//
// Line quality matches the mascot on purpose:
//  - each doodle is ONE continuous pen stroke (a single ordered point list
//    -> a single `smooth()` call -> a single `M`), traced the way a hand
//    would draw it without lifting the pen (retracing a line where a shape
//    needs a branch);
//  - the same seeded noise as the mascot (`perturbPoints` = the extracted
//    `at()` from buildDoodleStrokes: `rnd(i, frame, seed)`), re-drawn on the
//    same `floor(t * 7.5)` frame cadence, amplitude 1.3px (mascot: 1.1-1.6);
//  - the mascot's open-stroke weight (3.2, the arm/arrow/barb width) in the
//    same ink color the caller passes (`#e0452b`, docs/01/docs/02);
//  - deterministic -- never `Math.random()` (docs/07 "boil"): same inputs,
//    same path. Under prefers-reduced-motion (`jitterOn: false`) the noise
//    is dropped entirely and the pose is frozen (docs/05).
//
// Height-awareness: every doodle is a free-floating ambient decoration, so
// its resting y is authored in the 900-tall design space (`designY`) and
// re-anchored to the section's real height with `ambientY` (voronoi.ts) --
// the same rule the mascot and spores follow. Shape sizes stay fixed px.
//
// Placement (why these anchors): the doodles ride the same
// `pointer-events: none` overlay as the mascot, above the cells, so the rules
// are (1) never cover a certificate label -- they live in the alleys between
// label columns / the bands between label rows, verified at 700/800/900/
// 1100/1400px by molecularDoodles.test.ts against the real cell geometry +
// label sizing; (2) never crowd the primary mascot, the spores' drift areas
// or the title spark -- they stay light decoration, the mascot and spores
// remain the focal doodles; (3) never sit on the two decorative eye cells'
// images.
import { perturbPoints, smooth } from './strokeMath';
import { ambientY } from './voronoi';
import type { DoodlePath } from './doodleStrokes';

/** Local-space helper: `n + 1` points along an ellipse arc, degrees, y-down. */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, n: number): number[][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}

/** Local-space helper: evenly spaced points on a straight segment, both ends
 *  included (equally spaced collinear points keep Catmull-Rom straight). */
function line(x0: number, y0: number, x1: number, y1: number, n: number): number[][] {
  return Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
}

/** Rounds to 0.1 so the authored arrays read like the mascot's literals. */
function r1(pts: number[][]): number[][] {
  return pts.map((p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
}

// ---- DNA helix ------------------------------------------------------------
// Two sine strands in opposite phase drawn as one line: down strand A, across
// the bottom crossing, back up strand B -- the strands cross every half
// turn, which is what reads as a double helix. ~30 x 84 local px.
const DNA_Y = Array.from({ length: 13 }, (_, i) => -42 + i * 7);
const DNA_PHASE = (y: number) => Math.sin((y * 2 * Math.PI) / 56);
export const DNA_HELIX: number[][] = r1([
  ...DNA_Y.map((y) => [14 * DNA_PHASE(y), y]),
  ...[...DNA_Y].reverse().map((y) => [-14 * DNA_PHASE(y), y]),
]);

// ---- Flask (Erlenmeyer) -----------------------------------------------------
// Left lip, down the neck and shoulder, round the base, up the right wall to
// the liquid line, scribble the liquid level across and back, then up the
// right neck to the right lip. ~56 x 76 local px.
export const FLASK: number[][] = r1([
  [-14, -37],
  [-9, -37],
  [-9, -24],
  [-9, -12],
  [-28, 24],
  [-27, 32],
  [-19, 37],
  [0, 38],
  [19, 37],
  [27, 32],
  [26, 24],
  [22, 10],
  [11, 6],
  [0, 10],
  [-11, 6],
  [-19, 10],
  [-11, 12],
  [0, 8],
  [11, 12],
  [17, 8],
  [9, -12],
  [9, -24],
  [9, -37],
  [14, -37],
]);

// ---- Molecule ---------------------------------------------------------------
// A hexagonal ring, then a bond out to atom A (a small loop), a second bond
// to atom B (another loop): the skeletal-formula look, one unbroken line.
// ~90 x 56 local px.
const HEX_CENTER: [number, number] = [-24, 8];
const HEX_R = 19;
const HEX_VERTS = Array.from({ length: 6 }, (_, k) => {
  const a = ((30 + 60 * k) * Math.PI) / 180;
  return [HEX_CENTER[0] + Math.cos(a) * HEX_R, HEX_CENTER[1] - Math.sin(a) * HEX_R];
});
const ATOM_A: [number, number] = [20, -14];
const ATOM_B: [number, number] = [38, 18];
const ATOM_R = 6.5;
/** Point on an atom's loop at `deg` (y-down screen degrees). */
const onAtom = (atom: [number, number], deg: number): [number, number] => [
  atom[0] + Math.cos((deg * Math.PI) / 180) * ATOM_R,
  atom[1] + Math.sin((deg * Math.PI) / 180) * ATOM_R,
];
const A_IN = onAtom(ATOM_A, 145);
const A_OUT = onAtom(ATOM_A, 75);
const B_IN = onAtom(ATOM_B, 235);
export const MOLECULE: number[][] = r1([
  ...HEX_VERTS,
  HEX_VERTS[0],
  // bond hexagon -> atom A, arriving at the loop's lower-left
  ...line(HEX_VERTS[0][0], HEX_VERTS[0][1], A_IN[0], A_IN[1], 3).slice(1),
  // loop around atom A (290deg), leaving from its underside
  ...arc(ATOM_A[0], ATOM_A[1], ATOM_R, ATOM_R, 145, 145 + 290, 7).slice(1),
  // bond atom A -> atom B, arriving at B's upper-left
  ...line(A_OUT[0], A_OUT[1], B_IN[0], B_IN[1], 3).slice(1),
  // loop around atom B (340deg)
  ...arc(ATOM_B[0], ATOM_B[1], ATOM_R, ATOM_R, 235, 235 + 340, 8).slice(1),
]);

// ---- Pill capsule -------------------------------------------------------------
// Capsule outline (two round caps, straight sides) drawn from the top middle
// around and back, then the dividing line across the middle. Tilted -40deg.
// ~62 x 62 local px after the tilt.
const PILL_HALF = 23;
const PILL_R = 12;
const PILL_TILT = (-40 * Math.PI) / 180;
const pillOutline: number[][] = [
  [0, -PILL_R],
  ...arc(PILL_HALF, 0, PILL_R, PILL_R, -90, 90, 4),
  [0, PILL_R],
  ...arc(-PILL_HALF, 0, PILL_R, PILL_R, 90, 270, 4),
  [0, -PILL_R],
];
const pillDivider: number[][] = line(0, -PILL_R, 0, PILL_R, 3).slice(1);
export const PILL: number[][] = r1(
  [...pillOutline, ...pillDivider].map((p) => [
    p[0] * Math.cos(PILL_TILT) - p[1] * Math.sin(PILL_TILT),
    p[0] * Math.sin(PILL_TILT) + p[1] * Math.cos(PILL_TILT),
  ]),
);

// ---- Microscope -----------------------------------------------------------------
// Base line, up the curved arm to the tilted tube's back, up the tube's right
// side, across the eyepiece, down its left side, across the objective end,
// down the nub and out along the stage until it meets the arm. ~58 x 88
// local px.
export const MICROSCOPE: number[][] = r1([
  [-24, 42],
  [0, 43],
  [26, 42],
  [28, 30],
  [33, 16],
  [34, 0],
  [30, -14],
  [20, -20],
  [6, -17],
  // tube: straight sides (evenly spaced points keep Catmull-Rom straight)
  ...line(-0.4, -14.1, 10.4, -39.3, 3),
  ...line(10.4, -39.3, -2.4, -44.7, 1).slice(1),
  ...line(-2.4, -44.7, -20.4, -2.7, 4).slice(1),
  ...line(-20.4, -2.7, -7.6, 2.7, 1).slice(1),
  [-10, 10],
  [-10, 17],
  [4, 17],
  [20, 17],
  [30, 16],
]);

export type MolecularDoodleId = 'dna' | 'flask' | 'molecule' | 'pill' | 'microscope';

export const MOLECULAR_DOODLE_IDS: MolecularDoodleId[] = ['dna', 'flask', 'molecule', 'pill', 'microscope'];

/** Deterministic, frame-stable id list -- same "pre-render one `<path>` per
 *  id once, update in place every frame" strategy as `DOODLE_PATH_IDS`. */
export const MOLECULAR_PATH_IDS: string[] = MOLECULAR_DOODLE_IDS.map((id) => `mol-${id}`);

const SHAPES: Record<MolecularDoodleId, number[][]> = {
  dna: DNA_HELIX,
  flask: FLASK,
  molecule: MOLECULE,
  pill: PILL,
  microscope: MICROSCOPE,
};

export interface MolecularAnchor {
  /** Center x in the 1440-wide stage. */
  x: number;
  /** Center y authored in the 900-tall design space; re-anchored to the
   *  real section height with `ambientY`. */
  designY: number;
  /** Noise seed. >= 30 so the boil never correlates with the mascot's
   *  seeds (1-12) or the spores' (10-22). */
  seed: number;
}

/** All five sit in the corridor BETWEEN the first and second label rows (design
 *  y ~340-420, a "lab bench" line across the stage): it is the one band with
 *  no certificate label at any of 700/800/900/1100/1400px, because both rows
 *  of labels move with the same yFractions the doodles do. Left to right:
 *  pill, microscope, DNA, then flask + molecule in the right-hand span
 *  (found by an exhaustive anchor search with an 8px slack over the test's
 *  own constraints -- labels, mascot, spark, spore drift areas, stage
 *  margins). The mascot (bottom) and the spores (scattered) stay the focal
 *  doodles; these are deliberately quiet. */
export const MOLECULAR_ANCHORS: Record<MolecularDoodleId, MolecularAnchor> = {
  pill: { x: 150, designY: 420, seed: 34 },
  microscope: { x: 420, designY: 390, seed: 35 },
  dna: { x: 600, designY: 350, seed: 31 },
  flask: { x: 1190, designY: 340, seed: 32 },
  molecule: { x: 1320, designY: 340, seed: 33 },
};

/** Line weight -- the mascot's open-stroke weight (arm / arrow / barbs). */
const STROKE_W = 3.2;
/** Boil amplitude in px (the mascot uses 1.1-1.6). */
const BOIL_AMP = 1.3;

export interface MolecularParams {
  /** Seconds since mount. */
  t: number;
  /** false under prefers-reduced-motion: reduce -- freezes the boil to the
   *  noise-free resting pose (docs/05). */
  jitterOn: boolean;
  /** The section's real rendered height (see `ambientY`). */
  height: number;
  /** Resolved doodle ink color. */
  color: string;
}

/** This frame's perturbed, world-placed point list for one doodle. */
export function molecularDoodlePoints(
  id: MolecularDoodleId,
  { t, jitterOn, height }: Pick<MolecularParams, 't' | 'jitterOn' | 'height'>,
): number[][] {
  const { x, designY, seed } = MOLECULAR_ANCHORS[id];
  // Same boil clock as the mascot: a new noise frame every 1/7.5s.
  const frame = jitterOn ? Math.floor(t * 7.5) : null;
  return perturbPoints(SHAPES[id], x, ambientY(designY, height), seed, BOIL_AMP, frame);
}

/** This frame's five strokes. Every id in `MOLECULAR_PATH_IDS` is always
 *  present, in order, so the caller's SVG path pool never adds/removes
 *  nodes across frames. */
export function buildMolecularStrokes(params: MolecularParams): DoodlePath[] {
  return MOLECULAR_DOODLE_IDS.map((id) => ({
    id: `mol-${id}`,
    d: smooth(molecularDoodlePoints(id, params), false),
    fill: 'none',
    stroke: params.color,
    w: STROKE_W,
  }));
}
