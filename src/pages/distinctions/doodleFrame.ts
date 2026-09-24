// The Distinctions doodle layer's single per-frame entry point: the crayon
// mascot + spores (doodleStrokes.ts) followed by the molecular / health set
// (molecularDoodles.ts), built from ONE shared clock so VoronoiCellField's
// existing rAF loop drives all of them -- no second animation loop. Every id
// is always present, in a fixed order, so the SVG path pool (DoodleLayer.tsx)
// renders once and is only ever updated in place.
import { DOODLE_PATH_IDS, buildDoodleStrokes } from './doodleStrokes';
import type { DoodleParams, DoodlePath } from './doodleStrokes';
import { MOLECULAR_PATH_IDS, buildMolecularStrokes } from './molecularDoodles';
import { DESIGN_HEIGHT } from './voronoi';

export const ALL_DOODLE_PATH_IDS: string[] = [...DOODLE_PATH_IDS, ...MOLECULAR_PATH_IDS];

/** Same params as `buildDoodleStrokes` (its `cells`/`hoverValues` only matter
 *  to the mascot; the molecular doodles need just `t`, `jitterOn`, `height`
 *  and `color`). */
export function buildAllDoodleStrokes(params: DoodleParams): DoodlePath[] {
  const { t, jitterOn, color, height = DESIGN_HEIGHT } = params;
  return [...buildDoodleStrokes(params), ...buildMolecularStrokes({ t, jitterOn, height, color })];
}
