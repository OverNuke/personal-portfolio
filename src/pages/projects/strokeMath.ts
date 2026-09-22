// Shared, DOM-free math primitives used by both the hand-lettered title
// (glyphStrokes.ts) and the crayon mascot / annotation doodles
// (mascotStrokes.ts). Ported verbatim from
// docs/_decoded/projects-section-v2-standalone/template.html's inline
// <script> (rnd/smooth/ellipsePts, lines ~515-544) -- no math changed, only
// converted to typed, side-effect-free functions.

/** Seeded pseudo-random in [-1, 1). Deterministic per (a, b, c) -- the same
 *  frame index always reproduces the same jitter, which is what makes the
 *  doodles look hand-redrawn instead of genuinely noisy (docs/07). */
export function rnd(a: number, b: number, c: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
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

/** Points evenly distributed around an ellipse, `rot` radians offset. */
export function ellipsePts(cx: number, cy: number, rx: number, ry: number, n: number, rot = 0): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2 + rot;
    out.push([cx + Math.cos(th) * rx, cy + Math.sin(th) * ry]);
  }
  return out;
}
