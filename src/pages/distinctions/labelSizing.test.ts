import { describe, expect, it } from 'vitest';
import { computeLabelSizing } from './labelSizing';

// Approval tests: `computeLabelSizing` was extracted verbatim out of
// VoronoiCellField's `labelSizing` useMemo (so the doodle placement test can
// derive real label boxes from it). The pinned tables below were captured by
// running the ORIGINAL inline computation (scratch script, before the
// extraction) at 700/900/1400 -- they document what the component sized its
// labels to before the move, so the extraction is proven behavior-neutral.
describe('computeLabelSizing (approval, captured from the pre-extraction inline code)', () => {
  it('900px: every one of the 12 cells has the shipped width and font size', () => {
    expect(computeLabelSizing(900)).toEqual({
      title: { width: 299, fontSize: 27 },
      anfeca: { width: 247, fontSize: 25 },
      nota: { width: 219, fontSize: 22 },
      propadeutic: { width: 244, fontSize: 24 },
      exaver: { width: 249, fontSize: 25 },
      english: { width: 233, fontSize: 23 },
      powerbi: { width: 237, fontSize: 24 },
      ai: { width: 211, fontSize: 21 },
      toefl: { width: 230, fontSize: 23 },
      aiinit: { width: 206, fontSize: 21 },
      count: { width: 265, fontSize: 21 },
      span: { width: 239, fontSize: 19 },
    });
  });

  it('700px: compressed cells give narrower labels and smaller type', () => {
    const s = computeLabelSizing(700);
    expect(s.title).toEqual({ width: 269, fontSize: 27 });
    expect(s.anfeca).toEqual({ width: 218, fontSize: 22 });
    expect(s.aiinit).toEqual({ width: 179, fontSize: 18 });
    expect(s.span).toEqual({ width: 208, fontSize: 16 });
  });

  it('1400px: tall cells give wider labels, with the type clamped at 27', () => {
    const s = computeLabelSizing(1400);
    expect(s.title).toEqual({ width: 330, fontSize: 27 });
    expect(s.exaver).toEqual({ width: 319, fontSize: 27 });
    expect(s.count).toEqual({ width: 339, fontSize: 26 });
    expect(s.aiinit).toEqual({ width: 259, fontSize: 26 });
  });
});
