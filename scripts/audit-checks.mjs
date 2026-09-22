/**
 * Pure geometry/threshold predicates for the collage audit
 * (scripts/audit.mjs). No DOM, no Playwright -- these take plain data
 * (bounding-box-shaped objects) and return booleans, so they can be unit
 * tested under vitest without a browser. scripts/audit.mjs is the
 * orchestration layer: it launches Chromium, collects real bounding boxes
 * from the rendered app, and feeds them through these functions.
 *
 * Rebuilt for the React port's real shell (docs/00, docs/03, docs/14): a
 * fixed, non-responsive 1440x900 stage, letterboxed/scaled via
 * `transform: scale()` on smaller viewports (src/shell/useStageScale.ts),
 * not a responsively-reflowing layout. The predicates below are unchanged
 * from the quarantined version (`_quarantine/scripts/audit-checks.mjs`) --
 * the geometry math (rotation reconstruction, intersection, clipping,
 * target-size) is stack-agnostic and still correct. What changed is which
 * viewport widths this module's constants describe and how
 * scripts/audit.mjs uses them -- see that file's top comment.
 */

// Sub-pixel/scrollbar rounding tolerance, in CSS px.
const EPSILON = 1;

// Widths swept ONLY for the letterbox/overflow check (see audit.mjs) -- the
// old meaning of "does content reflow correctly at this width" no longer
// applies (docs/00: fixed stage, no responsive redesign), so these no
// longer drive the occlusion/target-size/clipped-text checks at all. Kept
// as the same four reference widths as the old responsive-era sweep for
// continuity/comparability, now repurposed to answer "does the letterboxed
// stage ever leak a scrollbar at this viewport size".
export const VIEWPORT_WIDTHS = [1440, 1280, 1100, 390];
export const VIEWPORT_HEIGHT = 900;

// The one width/height the occlusion/target-size/clipped-text checks run
// at: the stage's own native size, where `--stage-scale` resolves to 1 and
// `getBoundingClientRect()` reports real, unscaled design pixels. Running
// these checks at any other viewport would measure the *scaled* stage
// instead (WCAG 2.5.8 is about CSS px as rendered, so a smaller viewport's
// letterbox-shrunk targets would produce findings that have nothing to do
// with a real layout defect -- see audit.mjs's `assertNativeScale`).
export const STAGE_WIDTH = 1440;
export const STAGE_HEIGHT = 900;

// WCAG 2.2 SC 2.5.8 (Target Size Minimum, AA): 24x24 CSS px.
export const MIN_TARGET_SIZE = 24;

/**
 * Whether two axis-aligned rects genuinely overlap (more than EPSILON of
 * shared area on both axes). Edge-touching rects (e.g. adjacent grid cells)
 * are NOT an intersection.
 */
export function rectsIntersect(a, b, epsilon = EPSILON) {
  if (!a || !b) return false;
  if (a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) return false;

  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

  return overlapX > epsilon && overlapY > epsilon;
}

/** WCAG 2.5.8: both dimensions must meet the minimum. */
export function meetsMinTargetSize(rect, min = MIN_TARGET_SIZE) {
  if (!rect) return false;
  return rect.width >= min && rect.height >= min;
}

/** True if scrollWidth exceeds clientWidth by more than rounding noise. */
export function hasHorizontalOverflow(scrollWidth, clientWidth, epsilon = EPSILON) {
  return scrollWidth - clientWidth > epsilon;
}

/**
 * An element clips its own text only when BOTH its overflow is actually
 * hidden/clip on that axis AND its content genuinely exceeds the box --
 * plain overflow:visible content (natural wrapping) is never "clipped".
 */
export function isTextClipped({ clientWidth, clientHeight, scrollWidth, scrollHeight, overflowX, overflowY }) {
  const clipsX = isClippingOverflow(overflowX) && scrollWidth - clientWidth > EPSILON;
  const clipsY = isClippingOverflow(overflowY) && scrollHeight - clientHeight > EPSILON;
  return clipsX || clipsY;
}

function isClippingOverflow(value) {
  return value === 'hidden' || value === 'clip';
}

/**
 * The visually-hidden ("sr-only") pattern collapses an element to a ~1px
 * box while keeping its text in the accessibility tree (see
 * `.projects-sr-heading` / `.sr-only`). Such elements must be excluded from
 * clipped-text and target-size checks -- they are deliberately invisible,
 * not a rendering defect. A missing rect is treated as hidden (nothing to
 * measure).
 */
export function isVisuallyHidden(rect, threshold = EPSILON) {
  if (!rect) return true;
  return rect.width <= threshold && rect.height <= threshold;
}

/**
 * Recovers a rotation angle (degrees) from a computed `transform` string.
 * `getComputedStyle(el).transform` reports "none" for the identity
 * transform (which is also what `rotate(0deg)` normalizes to) and
 * otherwise a 2D `matrix(a, b, c, d, e, f)` string, where
 * `atan2(b, a)` recovers the rotation component in radians. Non-matrix
 * forms (e.g. `matrix3d(...)`, from a 3D transform) are treated as zero
 * rotation rather than parsed -- out of scope for this audit, since no
 * current stylesheet uses a 3D transform on a text-bearing ancestor.
 */
export function parseRotationDegrees(transformValue) {
  if (!transformValue || transformValue === 'none') return 0;
  const match = /^matrix\(([^)]+)\)$/.exec(transformValue);
  if (!match) return 0;
  const [a, b] = match[1].split(',').map((part) => parseFloat(part.trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return (Math.atan2(b, a) * 180) / Math.PI;
}

/**
 * Recovers the uniform scale factor from a computed 2D `transform` matrix
 * string (`matrix(a, b, c, d, e, f)`, scale = hypot(a, b)). Used to assert
 * the stage is running at its native 1:1 size (src/shell/useStageScale.ts's
 * `--stage-scale`) before trusting any measured rect for the
 * occlusion/target-size/clipped-text checks -- see audit.mjs's
 * `assertNativeScale`. Returns 1 for "none" (the identity transform).
 */
export function parseScale(transformValue) {
  if (!transformValue || transformValue === 'none') return 1;
  const match = /^matrix\(([^)]+)\)$/.exec(transformValue);
  if (!match) return 1;
  const [a, b] = match[1].split(',').map((part) => parseFloat(part.trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  return Math.hypot(a, b);
}

/**
 * Reconstructs a text element's PRE-rotation local rect -- its position
 * and size in a shared rotated ancestor's own local coordinate space,
 * before that ancestor's rotation was applied -- given:
 *   - `measuredRect`: the element's own `getBoundingClientRect()` output
 *     (the post-rotation axis-aligned bounding box of its now-tilted
 *     shape);
 *   - `localWidth`/`localHeight`: the element's own border-box dimensions,
 *     UNAFFECTED by any ancestor transform (`element.offsetWidth`/
 *     `element.offsetHeight`);
 *   - `angleDegrees`/`originX`/`originY`: the shared rotated ancestor's own
 *     rotation angle and rotation center (its own bounding-box center, for
 *     the common `transform: rotate(θ)` case with default
 *     `transform-origin: 50% 50%` and no additional translate).
 *
 * Still load-bearing in this rebuild: `.projects-card` and
 * `.projects-flagship-badge` (src/pages/projects/projects.css) both carry a
 * real `transform: rotate(...)`, so two text-bearing children of the same
 * rotated card can appear to overlap in raw `getBoundingClientRect()`
 * output without actually overlapping in the card's own local layout.
 *
 * IMPORTANT: naively rotating `measuredRect`'s own 4 (already-inflated)
 * AABB corners by `-angleDegrees` does NOT recover the pre-rotation rect --
 * an axis-aligned box's own bounding box only ever GROWS under any nonzero
 * rotation, so rotating an already-inflated AABB a second time compounds
 * the inflation instead of canceling it (verified empirically in the
 * original quarantined investigation this logic was ported from).
 *
 * What IS exact, regardless of angle, is: (1) the midpoint of a rotated
 * rectangle's own AABB is always the rectangle's true geometric center
 * (rotation preserves a shape's center of symmetry, and a rectangle's AABB
 * is symmetric about that same center); and (2) rotating a single POINT by
 * `-θ` is an exact inverse of rotating it by `θ` -- unlike rotating a box's
 * corners and re-deriving a new AABB from them, which is lossy. So this
 * function un-rotates ONLY the element's center point (exact), then
 * rebuilds an axis-aligned rect around the recovered center using the
 * element's own rotation-invariant local dimensions.
 */
export function unrotateElementRect(measuredRect, localWidth, localHeight, angleDegrees, originX, originY) {
  if (!measuredRect) return measuredRect;
  if (!angleDegrees) return measuredRect;

  const centerAfter = {
    x: measuredRect.x + measuredRect.width / 2,
    y: measuredRect.y + measuredRect.height / 2,
  };

  const radians = (-angleDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = centerAfter.x - originX;
  const dy = centerAfter.y - originY;
  const centerBefore = {
    x: originX + dx * cos - dy * sin,
    y: originY + dx * sin + dy * cos,
  };

  const x = centerBefore.x - localWidth / 2;
  const y = centerBefore.y - localHeight / 2;
  return { x, y, width: localWidth, height: localHeight, right: x + localWidth };
}

/**
 * Given the chain of `getComputedStyle(ancestor).transform` values walking
 * UPWARD from a text element toward the audited scope (nearest ancestor
 * first), returns the index of the nearest ancestor carrying a genuine
 * (non-zero) rotation, or `null` if none of them do. scripts/audit.mjs
 * walks the live DOM to build this chain inside its browser-evaluated
 * snapshot function; this is the pure decision logic underneath it.
 */
export function findNearestRotatedAncestorIndex(ancestorTransforms) {
  for (let i = 0; i < ancestorTransforms.length; i++) {
    if (parseRotationDegrees(ancestorTransforms[i]) !== 0) return i;
  }
  return null;
}
