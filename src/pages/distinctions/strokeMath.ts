// Shared, DOM-free math primitives for Distinctions' crayon-doodle overlay
// (doodleStrokes.ts) and the lightbox's blinking eye (ScanModal.tsx).
// Self-contained per-screen duplication of the same primitives Projects
// already ships at src/pages/projects/strokeMath.ts -- this repo's
// established convention keeps each screen's subfolder self-contained
// (docs/04: "never inside a shared/generic components/ bucket"), so this is
// a deliberate re-port from the decoded source, not a cross-page import.
// Ported verbatim from
// docs/_decoded/distinction-section-v4-standalone/template.html:
// `rnd` (line 633-636), `smooth` (line 638-653), `blink` (line 772-775).

/** Seeded pseudo-random in [-1, 1). Deterministic per (a, b, c) -- the same
 *  frame index always reproduces the same jitter, which is what makes the
 *  doodles look hand-redrawn instead of genuinely noisy (docs/07's "boil"). */
export function rnd(a: number, b: number, c: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/** Places a point array in the world and boils it: every point is scaled by
 *  `sc`, translated by (`ox`, `oy`), then nudged by up to `amp` px per axis
 *  with the SAME seeded noise the crayon mascot uses (`rnd(i, frame, seed)`
 *  for x, `rnd(i + 41, frame, seed)` for y). `frame` is the integer boil
 *  frame (`Math.floor(t * 7.5)`); pass `null` for the frozen, noise-free
 *  pose under prefers-reduced-motion. Extracted from `buildDoodleStrokes`'s
 *  inline `at()` closure so the molecular doodles reuse the exact mapping
 *  instead of re-deriving it (spec: "existing strokeMath.ts primitives, not
 *  a new perturbation algorithm"). */
export function perturbPoints(
  pts: number[][],
  ox: number,
  oy: number,
  seed: number,
  amp: number,
  frame: number | null,
  sc = 1,
): number[][] {
  return pts.map((p, i) => [
    ox + p[0] * sc + (frame !== null ? rnd(i, frame, seed) * amp : 0),
    oy + p[1] * sc + (frame !== null ? rnd(i + 41, frame, seed) * amp : 0),
  ]);
}

/** Catmull-Rom-derived smoothing into an SVG path `d` string. `closed`
 *  wraps the last segment back to the first point instead of stopping. */
export function smooth(pts: number[][], closed: boolean): string {
  const n = pts.length;
  if (n < 2) return '';
  if (n === 2) {
    return `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}L${pts[1][0].toFixed(1)} ${pts[1][1].toFixed(1)}`;
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p1 = pts[i % n];
    const p2 = pts[(i + 1) % n];
    const p0 = closed ? pts[(i - 1 + n) % n] : pts[Math.max(i - 1, 0)];
    const p3 = closed ? pts[(i + 2) % n] : pts[Math.min(i + 2, n - 1)];
    d +=
      `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)},` +
      `${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)},` +
      `${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + (closed ? 'Z' : '');
}

/** Shared blink cycle -- a short, fast close every ~3.9s, open the rest of
 *  the time. Drives both the colony's small dot-eyes (scaleY) and the
 *  lightbox's big eye (eyelid transform scaleY), same formula, independent
 *  clocks (each component owns its own `t` since they're separate mounted
 *  trees in this port, unlike the decoded source's single shared class). */
export function blink(t: number): number {
  const p = (t + 0.7) % 3.9;
  return p < 0.17 ? Math.max(0.08, Math.abs(Math.cos((p / 0.17) * Math.PI))) : 1;
}
