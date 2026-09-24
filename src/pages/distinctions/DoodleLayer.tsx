// Render-only doodle overlay for Distinctions (docs/04 bucket 3: pure
// computation lives in doodleStrokes.ts / molecularDoodles.ts, this just
// owns the SVG node pool). One `<path>` per id is rendered ONCE and never
// added/removed -- VoronoiCellField's rAF loop writes `d`/`fill`/`stroke`
// straight to these nodes every frame through the ref map it passes in
// (same "no setState in the hot path" rationale as the cells svg).
//
// Fully decorative per docs/05 ("The crayon-mascot doodle overlay is fully
// decorative... `aria-hidden="true"`, never a tab stop"): the whole svg is
// `aria-hidden` + `focusable="false"` (legacy IE/Edge SVG focus quirk), holds
// no interactive descendants at all, and distinctions.css gives it
// `pointer-events: none` so it never intercepts hover/click on the cells
// underneath.
import type { MutableRefObject } from 'react';
import { STAGE_WIDTH } from './voronoi';
import { ALL_DOODLE_PATH_IDS } from './doodleFrame';

interface DoodleLayerProps {
  /** The section's REAL measured height (design-space px, pre-Shell
   *  -transform). The viewBox is exactly `STAGE_WIDTH x height`, so its
   *  aspect ratio always equals the CSS box's (`width/height: 100%` of
   *  `.distinctions-stage`) and `preserveAspectRatio="xMinYMin meet"` is a
   *  1:1 mapping, never a stretch. This is only safe because every
   *  coordinate the doodles emit is now height-aware (mascot/spores via
   *  `ambientY`, spark via the measured title cell, molecular doodles via
   *  `yFraction`) -- with any absolute 900-space coordinate left inside,
   *  syncing the viewBox to a height below ~838 would clip it out of view
   *  (SVG clips outside its viewBox), which is why Phase 1 had to leave this
   *  svg at the design height until `doodleStrokes.ts` was made
   *  height-aware. */
  height: number;
  pathRefs: MutableRefObject<Map<string, SVGPathElement>>;
}

function DoodleLayer({ height, pathRefs }: DoodleLayerProps) {
  return (
    <svg
      viewBox={`0 0 ${STAGE_WIDTH} ${height}`}
      preserveAspectRatio="xMinYMin meet"
      className="distinctions-doodle-svg"
      aria-hidden="true"
      focusable="false"
    >
      {ALL_DOODLE_PATH_IDS.map((id) => (
        <path
          key={id}
          ref={(el) => {
            if (el) pathRefs.current.set(id, el);
          }}
          d=""
          fill="none"
          stroke="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export default DoodleLayer;
