/*
 * Pure computation module (docs/04's three-way effect-placement rule) for the
 * Profile chamber-initial contrast gate (spec `profile-acrostic`, decision
 * #522). No DOM, no CSS-string parsing here -- that lives in
 * `contrast.test.ts`, which reads the real `--color-profile-bg` /
 * `--color-profile-initial` / `.profile-bg__glow` values out of the actual
 * stylesheets so this math can never silently drift from what ships.
 *
 * This module answers one question: "what color is actually behind a given
 * (x, y) point in Profile's 1440x900 design-px box, once both the
 * `--color-profile-bg` linear-gradient AND the `.profile-bg__glow` radial
 * overlay are composited?" -- the "physical-backdrop reading" decision #522
 * approved, replacing the spec's original (mathematically impossible, see
 * apply-progress) "every raw gradient stop" wording.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Real browsers paint each composited layer to an 8-bit-per-channel
 *  framebuffer before the next layer blends on top of it -- rounding here
 *  (rather than only at the very end) is what makes this module's numbers
 *  match hand-measured hex values like `#515049`, not just their un-rounded
 *  float equivalents. */
export function quantizeRgb({ r, g, b }: RGB): RGB {
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

function srgbChannelToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** Standard WCAG 2.x relative luminance. */
export function relativeLuminance({ r, g, b }: RGB): number {
  const R = srgbChannelToLinear(r);
  const G = srgbChannelToLinear(g);
  const B = srgbChannelToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** Standard WCAG 2.x contrast ratio, always >= 1. */
export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface GradientStop {
  /** 0-1, fraction of the gradient line (CSS `%` / 100). */
  position: number;
  color: RGB;
}

/** Linearly interpolates a CSS `linear-gradient`'s color stops at position
 *  `t` (0-1 along the gradient line). `stops` MUST be sorted ascending by
 *  `position` and cover [0, 1] (matches every stop list this project uses). */
export function interpolateGradientStops(stops: GradientStop[], t: number): RGB {
  if (t <= stops[0].position) return stops[0].color;
  const last = stops[stops.length - 1];
  if (t >= last.position) return last.color;
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.position && t <= b.position) {
      const f = (t - a.position) / (b.position - a.position);
      return {
        r: a.color.r + (b.color.r - a.color.r) * f,
        g: a.color.g + (b.color.g - a.color.g) * f,
        b: a.color.b + (b.color.b - a.color.b) * f,
      };
    }
  }
  return last.color;
}

/** CSS `linear-gradient(<angleDeg>deg, ...)` "magic corners" projection:
 *  returns the gradient-line position `t` (0-1) of point (x, y) inside a
 *  `width` x `height` box. Cross-validated in the prior apply-progress batch
 *  against this project's own hand-derived `t≈0.53` for chamber 1 -- see
 *  `sdd/profile-acrostic-i18n/apply-progress` (topic key) for the full
 *  derivation. */
export function linearGradientT(
  angleDeg: number,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const angleRad = (angleDeg * Math.PI) / 180;
  // CSS gradient direction vector: 0deg points "to top" (0, -1); rotates
  // clockwise with increasing angle, in a y-down screen coordinate frame.
  const dirX = Math.sin(angleRad);
  const dirY = -Math.cos(angleRad);
  const lineLength = Math.abs(width * dirX) + Math.abs(height * dirY);
  const dx = x - width / 2;
  const dy = y - height / 2;
  const dot = dx * dirX + dy * dirY;
  return 0.5 + dot / lineLength;
}

export interface RadialGlow {
  /** Ellipse center, as fractions of box width/height (CSS `at X% Y%`). */
  cx: number;
  cy: number;
  /** Ellipse radii, as fractions of box width/height (CSS explicit size,
   *  e.g. `128% 96%`). */
  rx: number;
  ry: number;
  color: RGB;
  /** Starting alpha (the `0%` stop's rgba alpha). */
  alpha: number;
  /** Fraction (0-1) of the ellipse radius where alpha linearly reaches 0
   *  (the CSS `%` on the `transparent` stop). Beyond this, alpha is 0. */
  stopEnd: number;
}

/** Alpha of a two-stop (`rgba(...) 0%, transparent X%`) CSS `radial-gradient`
 *  with an explicit elliptical size, at point (x, y) inside a `width` x
 *  `height` box. */
export function radialGlowAlpha(
  glow: RadialGlow,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const cx = glow.cx * width;
  const cy = glow.cy * height;
  const rx = glow.rx * width;
  const ry = glow.ry * height;
  const nx = (x - cx) / rx;
  const ny = (y - cy) / ry;
  const distance = Math.hypot(nx, ny);
  if (distance >= glow.stopEnd) return 0;
  return glow.alpha * (1 - distance / glow.stopEnd);
}

/** Standard "over" alpha compositing of `overlay` (at `alpha`) on top of
 *  `base`. */
export function compositeAlpha(base: RGB, overlay: RGB, alpha: number): RGB {
  return {
    r: base.r * (1 - alpha) + overlay.r * alpha,
    g: base.g * (1 - alpha) + overlay.g * alpha,
    b: base.b * (1 - alpha) + overlay.b * alpha,
  };
}

/** Profile's design-px box. Always exactly 900px tall: `.profile-screen` has
 *  `min-height: 900px` and every one of its children is `position: absolute`
 *  (verified by reading profile.css), so nothing can ever stretch the
 *  section's natural content height past that floor -- the rendered height
 *  is the floor, at every viewport width (the stage scales width only, see
 *  shell.css). If a future change adds a non-absolutely-positioned child to
 *  `.profile-screen`, this invariant -- and every contrast ratio derived
 *  from it -- must be re-verified. */
export const PROFILE_BOX = { width: 1440, height: 900 } as const;

/** `.profile-chambers`' left edge (profile.css). */
export const CHAMBER_COLUMN_X = 812;

// Exported (not just used internally) so contrast.test.ts can assert each of
// these mirrors the real value in profile.css -- these five numbers are
// hardcoded here (this module has no CSS parser of its own, see the
// module-doc comment), so nothing stops them from silently drifting out of
// sync with an edited stylesheet. The exported names make that drift
// checkable instead of an invisible assumption.
export const CHAMBER_COUNT = 5;
/** `.profile-chamber`'s `height`. */
export const CHAMBER_HEIGHT = 132;
/** `.profile-chambers`' `gap`. */
export const CHAMBER_GAP = 30;
/** `.profile-chamber__fused`'s `top` offset within its chamber box. */
export const FUSED_TOP_OFFSET = 48;

/** The y (design-px) of each of the 5 chambers' fused word (where its first
 *  letter -- the acrostic initial -- actually renders), for a Profile box of
 *  the given height. Matches `.profile-chambers { top:0; bottom:0;
 *  justify-content:center; gap:30px }` + each `.profile-chamber`'s 132px
 *  height + `.profile-chamber__fused`'s `top:48px` (profile.css). */
export function chamberFusedYPositions(boxHeight: number): number[] {
  const totalHeight = CHAMBER_COUNT * CHAMBER_HEIGHT + (CHAMBER_COUNT - 1) * CHAMBER_GAP;
  const columnTop = (boxHeight - totalHeight) / 2;
  return Array.from(
    { length: CHAMBER_COUNT },
    (_, i) => columnTop + i * (CHAMBER_HEIGHT + CHAMBER_GAP) + FUSED_TOP_OFFSET,
  );
}
