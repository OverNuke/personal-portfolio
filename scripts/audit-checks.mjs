/**
 * Pure geometry/threshold predicates for the collage audit
 * (scripts/audit.mjs). No DOM, no Playwright -- these take plain data
 * (bounding-box-shaped objects) and return booleans, so they can be unit
 * tested under vitest without a browser. scripts/audit.mjs is the
 * orchestration layer: it launches Chromium, collects real bounding boxes
 * from the rendered app, and feeds them through these functions.
 *
 * Rebuilt for the React port's real shell (docs/00, docs/03): a
 * non-responsive, 1440px-wide stage of five stacked sections (one continuously
 * scrolling page), uniformly scaled by `transform: scale()` from the viewport
 * WIDTH alone on narrower viewports (src/shell/useStageScale.ts) -- not a
 * responsively-reflowing layout. The geometry predicates below are unchanged
 * from the pre-reset version of this file --
 * the geometry math (rotation reconstruction, intersection, clipping,
 * target-size) is stack-agnostic and still correct. What changed is which
 * viewport widths this module's constants describe and how
 * scripts/audit.mjs uses them -- see that file's top comment.
 */

// Sub-pixel/scrollbar rounding tolerance, in CSS px.
const EPSILON = 1;

// Widths swept ONLY for the horizontal-containment check (see audit.mjs) --
// the old meaning of "does content reflow correctly at this width" no longer
// applies (docs/00: fixed stage, no responsive redesign), so these no
// longer drive the occlusion/target-size/clipped-text checks at all. Kept
// as the same four reference widths as the old responsive-era sweep for
// continuity/comparability, now repurposed to answer "does the scaled stage
// ever leak horizontally at this viewport width".
export const VIEWPORT_WIDTHS = [1440, 1280, 1100, 390];
export const VIEWPORT_HEIGHT = 900;

// The one width/height the occlusion/target-size/clipped-text checks run
// at: the stage's own native size, where `--stage-scale` resolves to 1 and
// `getBoundingClientRect()` reports real, unscaled design pixels. Running
// these checks at any other viewport would measure the *scaled* stage
// instead (WCAG 2.5.8 is about CSS px as rendered, so a smaller viewport's
// scaled-down targets would produce findings that have nothing to do
// with a real layout defect -- see audit.mjs's `assertNativeScale`).
// 1440x900 is also exactly one section tall, so every section can be scrolled
// flush to the viewport top for its pass.
export const STAGE_WIDTH = 1440;
export const STAGE_HEIGHT = 900;

// WCAG 2.2 SC 2.5.8 (Target Size Minimum, AA): 24x24 CSS px.
export const MIN_TARGET_SIZE = 24;

// The phone viewport of the lightbox + report-only pass (iPhone 13 CSS size).
// Width matches the narrowest entry of VIEWPORT_WIDTHS; the height is the phone's
// own, since the lightbox's top-reachability depends on it.
export const PHONE_VIEWPORT = { width: 390, height: 844 };

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
 * The contract on `.stage-viewport`'s COMPUTED overflow (src/shell/shell.css:
 * `overflow-x: clip`): a STATIC guard that pins the shipped task-7.1 contract.
 * It is defense in depth, not the no-horizontal-scroll invariant itself --
 * measured: with `overflow-x: visible` Chromium does NOT scroll horizontally
 * for the transformed 1440px stage (the scaled extent is what counts toward
 * scrollable overflow), so the document-width and painted-stage checks in
 * audit.mjs stay silent and this predicate is the only thing that notices.
 * Rejecting `visible`/`auto`/`scroll` is therefore a policy choice (the wrapper
 * must keep clipping horizontally so a future wide, non-transformed child can't
 * leak a scrollbar), not an observed defect.
 *
 * `clip` rather than `hidden` is load-bearing: `hidden` (or `auto` / `scroll`)
 * on one axis promotes a `visible` other axis to `auto`, turning the wrapper
 * into a scroll container that would capture the document's vertical scroll
 * (the shell is one continuously scrolling page). Hence y must stay `visible`
 * or `clip`. The accepted computed pair is `clip/visible` (shipped) or
 * `clip/clip`. `null`/`undefined` (nothing measured) never passes.
 *
 * Replaces the pre-continuous-scroll `hidden/hidden` expectation, which the
 * shipped layout deliberately no longer satisfies.
 */
export function meetsStageViewportOverflowContract(overflowX, overflowY) {
  return overflowX === 'clip' && (overflowY === 'visible' || overflowY === 'clip');
}

/**
 * An element clips its own text only when BOTH its overflow is actually
 * hidden/clip on that axis AND its content genuinely exceeds the box --
 * plain overflow:visible content (natural wrapping) is never "clipped".
 */
export function isTextClipped({
  clientWidth,
  clientHeight,
  scrollWidth,
  scrollHeight,
  overflowX,
  overflowY,
}) {
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
 * original pre-reset investigation this logic was ported from).
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
export function unrotateElementRect(
  measuredRect,
  localWidth,
  localHeight,
  angleDegrees,
  originX,
  originY,
) {
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

/**
 * The targets (`{ selector, rect }`) smaller than `min` x `min` CSS px on either
 * axis (WCAG 2.5.8). Used for the REPORT-ONLY phone-scale findings on the
 * scaled pill nav and Voronoi cells, where the stage scale (~0.27 at 390px)
 * shrinks every target; see `shouldFailRun` for why those never gate.
 */
export function findSmallTargets(elements, min = MIN_TARGET_SIZE) {
  return elements.filter((el) => !meetsMinTargetSize(el.rect, min));
}

/**
 * Whether the lightbox dialog's box sits inside a `viewportWidth`-wide
 * viewport: no edge past the left/right sides (EPSILON of sub-pixel noise
 * allowed) and a top that is not above the fold, so its header stays
 * reachable. A missing rect (nothing measured) never fits.
 */
export function dialogFitsViewport(rect, viewportWidth, epsilon = EPSILON) {
  if (!rect) return false;
  return rect.x >= -epsilon && rect.right <= viewportWidth + epsilon && rect.y >= -epsilon;
}

/**
 * The lightbox checks at phone width, as findings `{ type, detail }`
 * (`type` is one of `lightbox-not-opened | lightbox-overflow |
 * lightbox-clipped-text | lightbox-target-size`). These are GATING: the
 * dialog is portaled outside the scaled stage and lays out in real CSS px
 * (docs/00's recorded exception), so any of them is a real defect.
 *
 * `snapshot`: `{ documentScrollWidth, documentClientWidth, dialogRect,
 * controls: [{ selector, rect }], clipCandidates: [...isTextClipped input
 * + selector] }`, collected in the browser by scripts/audit.mjs.
 */
export function checkLightbox(snapshot, viewportWidth) {
  if (!snapshot.dialogRect) {
    return [
      {
        type: 'lightbox-not-opened',
        detail: 'no [role="dialog"] was found after activating the cell',
      },
    ];
  }

  const findings = [];
  const { documentScrollWidth, documentClientWidth, dialogRect } = snapshot;

  if (hasHorizontalOverflow(documentScrollWidth, documentClientWidth)) {
    findings.push({
      type: 'lightbox-overflow',
      detail: `document scrollWidth ${documentScrollWidth} > clientWidth ${documentClientWidth}`,
    });
  }
  if (!dialogFitsViewport(dialogRect, viewportWidth)) {
    findings.push({
      type: 'lightbox-overflow',
      detail:
        `dialog spans x ${Math.round(dialogRect.x)}..${Math.round(dialogRect.right)}, ` +
        `y from ${Math.round(dialogRect.y)}, outside the ${viewportWidth}px viewport`,
    });
  }

  for (const el of snapshot.clipCandidates) {
    if (isTextClipped(el)) {
      findings.push({
        type: 'lightbox-clipped-text',
        detail: `"${el.selector}" clips its own text (overflow ${el.overflowX}/${el.overflowY})`,
      });
    }
  }

  for (const el of findSmallTargets(snapshot.controls)) {
    findings.push({
      type: 'lightbox-target-size',
      detail:
        `"${el.selector}" is ${Math.round(el.rect.width)}x${Math.round(el.rect.height)}px, ` +
        `below ${MIN_TARGET_SIZE}x${MIN_TARGET_SIZE}px`,
    });
  }

  return findings;
}

/**
 * Whether the audit run must exit non-zero. A finding gates unless it is
 * `skipped` (a check that could not run) or `reportOnly` (a known, documented
 * gap that must be SHOWN but not fail CI: the pill nav's and Voronoi cells'
 * sub-24px targets at phone scale, whose fix is the follow-up change
 * `mobile-pill-nav`). Everything else -- the desktop checks and every
 * lightbox finding -- fails the run.
 */
export function shouldFailRun(findings) {
  return findings.some((f) => !f.skipped && !f.reportOnly);
}

/**
 * Whether the dialog that opened is the one for the cell that was activated:
 * the cell's `aria-label` is "Open scan — {title}" (VoronoiCellField.tsx) and
 * the dialog's heading is that same `{title}`. The audit force-clicks Voronoi
 * cells that move every frame, so a click could land on a neighbour; without this
 * check the audit would measure the wrong dialog and still report the run green.
 * Whitespace is normalised; an exact title match (not a suffix) is required;
 * missing input never matches.
 */
export function lightboxMatchesCell(cellLabel, dialogTitle) {
  const squash = (text) => (typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '');
  const title = squash(dialogTitle);
  if (!title || !squash(cellLabel)) return false;
  return squash(cellLabel).replace(/^Open scan\s*[—-]\s*/, '') === title;
}
