import { describe, expect, it } from 'vitest';
import { ALL_DOODLE_PATH_IDS, buildAllDoodleStrokes } from './doodleFrame';
import { DOODLE_PATH_IDS, buildDoodleStrokes } from './doodleStrokes';
import { MOLECULAR_PATH_IDS, buildMolecularStrokes } from './molecularDoodles';
import { DEFAULT_GAP, DEFAULT_ROUNDNESS, computeCellGeometry, computeLiveSeeds } from './voronoi';

const COLOR = '#e0452b';

function frame(t: number, jitterOn: boolean, height: number) {
  const seeds = computeLiveSeeds(t, height, { breathe: jitterOn, hoverGrowth: 0.55, hoverValues: { anfeca: 0.8 } });
  const cells = computeCellGeometry(seeds, height, { gap: DEFAULT_GAP, roundness: DEFAULT_ROUNDNESS });
  return { t, jitterOn, hoverValues: { anfeca: 0.8 }, cells, height, color: COLOR };
}

describe('the combined doodle layer (one frame builder, one rAF loop)', () => {
  it('lists the 16 mascot/spore ids followed by the 5 molecular ids, with no duplicate', () => {
    expect(ALL_DOODLE_PATH_IDS).toEqual([...DOODLE_PATH_IDS, ...MOLECULAR_PATH_IDS]);
    expect(ALL_DOODLE_PATH_IDS).toHaveLength(21);
    expect(new Set(ALL_DOODLE_PATH_IDS).size).toBe(21);
  });

  it.each([
    [1.3, true, 700],
    [0, false, 900],
    [7.7, true, 1400],
  ])('t=%f jitter=%s height=%i: emits every id in order, mascot part unchanged, molecular part height-aware', (t, jitterOn, height) => {
    const params = frame(t, jitterOn, height);
    const out = buildAllDoodleStrokes(params);
    expect(out.map((s) => s.id)).toEqual(ALL_DOODLE_PATH_IDS);
    expect(out.slice(0, 16)).toEqual(buildDoodleStrokes(params));
    expect(out.slice(16)).toEqual(buildMolecularStrokes({ t, jitterOn, height, color: COLOR }));
    // real paths, not empty placeholders
    out.slice(16).forEach((s) => expect(s.d.startsWith('M')).toBe(true));
  });

  it('the molecular strokes follow the height argument (700 vs 1400 differ)', () => {
    const a = buildAllDoodleStrokes(frame(0, false, 700)).slice(16);
    const b = buildAllDoodleStrokes(frame(0, false, 1400)).slice(16);
    expect(a).toHaveLength(5);
    a.forEach((s, i) => expect(s.d).not.toBe(b[i].d));
  });
});
