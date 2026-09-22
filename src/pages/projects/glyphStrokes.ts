// Pure data + pure computation module -- no DOM access, per
// docs/04_COMPONENT_RULES.MD's bucket-3 contract ("Projects -- stroke-glyph
// title" section). Ported verbatim from the `GLYPHS` dictionary and
// `layoutWord()` function in
// docs/_decoded/projects-section-v2-standalone/template.html (lines
// 482-504) -- this is the "PROJECTS" hero title's real source: single-stroke
// marker-pen skeletons per letter, laid out left-to-right and redrawn with
// per-frame noise jitter (docs/07's "no fixed CSS timing, it's a rAF loop by
// construction" note). docs/13_ASSET_SPEC.md confirms there is no image
// asset backing this title -- it's 100% code.
import { rnd, smooth } from './strokeMath';

interface GlyphStroke {
  /** Skeleton points in the glyph's own local coordinate space. */
  p: number[][];
  /** Closed (filled outline) vs. open (single-stroke line). */
  c?: boolean;
}

interface Glyph {
  /** Advance width in local units before the next letter + gap. */
  w: number;
  s: GlyphStroke[];
}

// Verified letter-for-letter against the decoded template -- only the 8
// letters "PROJECTS" needs (P, R, O, J, E, C, T, S) are defined there.
export const GLYPHS: Record<string, Glyph> = {
  P: { w: 48, s: [{ p: [[2, 2], [0, 90]] }, { p: [[2, 2], [32, 8], [40, 26], [28, 44], [1, 46]] }] },
  R: {
    w: 50,
    s: [
      { p: [[2, 2], [0, 90]] },
      { p: [[2, 2], [32, 8], [40, 24], [26, 42], [1, 43]] },
      { p: [[18, 42], [44, 90]] },
    ],
  },
  O: { w: 58, s: [{ p: [[32, 2], [52, 18], [56, 46], [42, 80], [18, 86], [3, 58], [6, 24]], c: true }] },
  J: { w: 48, s: [{ p: [[6, 2], [44, 6]] }, { p: [[32, 5], [30, 62], [20, 84], [6, 80], [2, 62]] }] },
  E: {
    w: 46,
    s: [
      { p: [[4, 2], [0, 90]] },
      { p: [[4, 2], [42, 0]] },
      { p: [[2, 44], [32, 42]] },
      { p: [[0, 90], [42, 86]] },
    ],
  },
  C: { w: 56, s: [{ p: [[50, 16], [30, 2], [9, 16], [3, 48], [14, 78], [36, 86], [52, 72]] }] },
  T: { w: 50, s: [{ p: [[0, 3], [48, 0]] }, { p: [[25, 2], [22, 90]] }] },
  S: {
    w: 50,
    s: [{ p: [[46, 14], [26, 2], [8, 12], [12, 33], [34, 45], [47, 60], [40, 80], [16, 86], [3, 72]] }],
  },
};

export interface TitleStroke {
  pts: number[][];
  closed: boolean;
}

/** Lays out `word` left-to-right starting at (x0, y0), scaled by `sc`, with
 *  `gap` local units of tracking between letters. Matches
 *  `layoutWord('PROJECTS', 76, 74, 1.18, 9)` from the decoded source. */
export function layoutWord(word: string, x0: number, y0: number, sc: number, gap: number): TitleStroke[] {
  const out: TitleStroke[] = [];
  let x = x0;
  for (const ch of word) {
    const g = GLYPHS[ch];
    if (!g) continue;
    g.s.forEach((st) => out.push({ pts: st.p.map((p) => [x + p[0] * sc, y0 + p[1] * sc]), closed: !!st.c }));
    x += g.w * sc + gap * sc;
  }
  return out;
}

export const TITLE_STROKES = layoutWord('PROJECTS', 76, 74, 1.18, 9);

export interface TitlePathDatum {
  id: string;
  d: string;
  stroke: string;
  strokeWidth: number;
}

/** Produces this frame's jittered path data for every title stroke. `frame`
 *  is the same `Math.floor(t * 7.5)` cadence the decoded source uses so the
 *  same frame index always reproduces the same wobble (docs/07). */
export function getTitleStrokePaths(frame: number, color: string): TitlePathDatum[] {
  return TITLE_STROKES.map((stroke, i) => {
    const jittered = stroke.pts.map((p, j) => [
      p[0] + rnd(j, frame, i + 60) * 1.7,
      p[1] + rnd(j + 41, frame, i + 60) * 1.7,
    ]);
    return { id: `L${i}`, d: smooth(jittered, stroke.closed), stroke: color, strokeWidth: 8 };
  });
}
