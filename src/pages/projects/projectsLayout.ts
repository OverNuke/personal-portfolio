// Pure, DOM-free layout math for Projects' two decorative SVG overlays
// (docs/04_COMPONENT_RULES.MD bucket 3) -- kept out of the components so the
// height-aware behavior is unit-testable at 700/900/1400px without a DOM.
//
// Why the overlays' viewBox tracks height instead of staying `0 0 1440 900`:
// both SVGs are `position:absolute; inset:0` over the same box as the cards
// layer, and everything the mascot annotates comes from `measureRect()` --
// real CSS px, top-left origin, straight off the DOM. That only lines up if
// 1 viewBox unit = 1 CSS px, top-left anchored. A fixed 900-tall viewBox in
// a taller/shorter box gets SVG's default `meet` letterboxing (uniform
// scale + centering), which silently offsets every ring/arrow/underline
// from the card it circles. Unlike Distinctions' doodle SVG (Phase 1), a
// height-tracking viewBox is NOT a clipping risk here: the SVGs are
// `overflow: visible` (projects.css), and anything past the section's
// bottom is clipped by `.projects-screen { overflow: hidden }` exactly like
// the cards themselves.

/** The 1440x900 stage every absolute coordinate in this screen was
 *  hand-placed against (projectsData.ts, glyphStrokes.ts, mascotStrokes.ts). */
export const DESIGN_WIDTH = 1440;
export const DESIGN_HEIGHT = 900;

/** viewBox string for an overlay covering a `height`-px-tall section. Width
 *  stays the fixed 1440 letterbox (spec: only height goes fluid). */
export function layerViewBox(height: number): string {
  return `0 0 ${DESIGN_WIDTH} ${height}`;
}

/** Real measured layer height, or the design height when the measurement is
 *  unusable (0 before first layout, NaN/negative from a detached node) so the
 *  first render matches the shipped 900px layout instead of collapsing. */
export function resolveLayerHeight(measured: number): number {
  return Number.isFinite(measured) && measured > 0 ? measured : DESIGN_HEIGHT;
}

/** Re-anchors a free-floating (ambient) design-space y -- one that is not
 *  tied to a CSS-positioned partner element or a measured DOM rect -- to a
 *  `height`-px-tall section, proportionally (same yFraction idea as
 *  Distinctions' voronoi.ts). Identity at DESIGN_HEIGHT. */
export function ambientY(designY: number, height: number): number {
  // Multiply before dividing so the design height maps back to `designY`
  // bit-for-bit (812/900*900 is not exactly 812 in floating point).
  return (designY * height) / DESIGN_HEIGHT;
}
