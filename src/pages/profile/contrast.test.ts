import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHAMBER_COLUMN_X,
  CHAMBER_COUNT,
  CHAMBER_GAP,
  CHAMBER_HEIGHT,
  FUSED_TOP_OFFSET,
  PROFILE_BOX,
  chamberFusedYPositions,
  compositeAlpha,
  contrastRatio,
  hexToRgb,
  interpolateGradientStops,
  linearGradientT,
  quantizeRgb,
  radialGlowAlpha,
  rgbToHex,
} from './contrast';
import { CHAMBERS } from './chambersData';
import type { GradientStop, RGB, RadialGlow } from './contrast';

/*
 * Task 3.5 (spec `profile-acrostic`'s "AA-passing, documented accent
 * contrast" requirement, decision #522's corrected wording): pins
 * `--color-profile-initial`'s measured contrast at each of the 5 chambers'
 * ACTUAL rendered position on `--color-profile-bg`, composited with
 * `.profile-bg__glow`, as a regression guard.
 *
 * Deliberately parses the real CSS custom properties/rules out of the actual
 * stylesheet files on disk (`fs.readFileSync` -- Vite's `?raw` import suffix
 * doesn't survive the `@tailwindcss/vite` plugin, which claims every `.css`
 * import including `?raw`-suffixed ones and returns an empty string; verified
 * directly before choosing this approach) rather than hardcoding their values
 * here -- a future edit to the gradient stops, the glow overlay, or the
 * initial-color token itself will change what this test measures, not just
 * what ships. Only the pure math (gradient projection, radial-alpha, WCAG
 * contrast) lives in `contrast.ts`.
 */

const indexCss = fs.readFileSync(path.resolve(__dirname, '../../styles/index.css'), 'utf8');
const profileCss = fs.readFileSync(path.resolve(__dirname, './profile.css'), 'utf8');

function extractCustomProperty(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`${name} not found`);
  return match[1].trim();
}

function parseHexColor(value: string): string {
  const match = value.match(/#[0-9a-fA-F]{6}/);
  if (!match) throw new Error(`no hex color in "${value}"`);
  return match[0];
}

function parseGradientStops(gradientValue: string): { angleDeg: number; stops: GradientStop[] } {
  const parts = gradientValue
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const angleMatch = parts[0].match(/(-?[\d.]+)deg/);
  if (!angleMatch) throw new Error(`no angle in "${gradientValue}"`);
  const stops: GradientStop[] = parts.slice(1).map((part) => {
    const colorMatch = part.match(/#[0-9a-fA-F]{6}/);
    const posMatch = part.match(/([\d.]+)%/);
    if (!colorMatch || !posMatch) throw new Error(`bad gradient stop "${part}"`);
    return { position: Number(posMatch[1]) / 100, color: hexToRgb(colorMatch[0]) };
  });
  return { angleDeg: Number(angleMatch[1]), stops };
}

/** Extracts a `selector { ... }` rule's body. `selector` is matched literally
 *  (regex-escaped) immediately followed by optional whitespace then `{`, so
 *  `.profile-chamber` never accidentally matches `.profile-chambers` or
 *  `.profile-chamber__fused`. */
function parseCssRuleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`rule "${selector}" not found`);
  return match[1];
}

/** Extracts a `<property>: <n>px;` declaration's numeric value from a rule
 *  body. The negative lookbehind stops `height` from matching inside
 *  `min-height`. */
function parsePxDeclaration(ruleBody: string, property: string): number {
  const match = ruleBody.match(new RegExp(`(?<![\\w-])${property}:\\s*(-?[\\d.]+)px`));
  if (!match) throw new Error(`property "${property}" not found in "${ruleBody}"`);
  return Number(match[1]);
}

function parseRadialGlow(css: string): RadialGlow {
  const ruleMatch = css.match(/\.profile-bg__glow\s*\{([^}]*)\}/);
  if (!ruleMatch) throw new Error('.profile-bg__glow rule not found');
  const gradientMatch = ruleMatch[1].match(/radial-gradient\(([^;]+)\);/);
  if (!gradientMatch) throw new Error('no radial-gradient() in .profile-bg__glow');
  const value = gradientMatch[1];
  const shapeMatch = value.match(/^([\d.]+)%\s+([\d.]+)%\s+at\s+([\d.]+)%\s+([\d.]+)%/);
  if (!shapeMatch) throw new Error(`unexpected radial-gradient shape "${value}"`);
  const [, rxPct, ryPct, cxPct, cyPct] = shapeMatch;
  const rgbaMatch = value.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)\s*0%/);
  if (!rgbaMatch) throw new Error(`no starting rgba() 0% stop in "${value}"`);
  const [, r, g, b, alpha] = rgbaMatch;
  const endMatch = value.match(/transparent\s+([\d.]+)%/);
  if (!endMatch) throw new Error(`no "transparent X%" end stop in "${value}"`);
  return {
    cx: Number(cxPct) / 100,
    cy: Number(cyPct) / 100,
    rx: Number(rxPct) / 100,
    ry: Number(ryPct) / 100,
    color: { r: Number(r), g: Number(g), b: Number(b) },
    alpha: Number(alpha),
    stopEnd: Number(endMatch[1]) / 100,
  };
}

const { angleDeg, stops } = parseGradientStops(extractCustomProperty(indexCss, '--color-profile-bg'));
const glow = parseRadialGlow(profileCss);
const initial = hexToRgb(parseHexColor(extractCustomProperty(indexCss, '--color-profile-initial')));
const accent = hexToRgb(parseHexColor(extractCustomProperty(indexCss, '--color-profile-accent')));

// The layout inputs that determine WHERE each chamber's initial letter
// renders (contrast.ts's CHAMBER_COLUMN_X/CHAMBER_GAP/CHAMBER_HEIGHT/
// FUSED_TOP_OFFSET, and PROFILE_BOX.height) are hardcoded numbers in that
// module -- it has no CSS parser of its own (see its module doc). Parsed
// here and cross-checked below so an edit to profile.css's real layout (e.g.
// `.profile-chambers { left: 812px }` moved to a lighter part of the
// gradient) can't silently invalidate every ratio in this file while this
// test keeps passing.
const profileScreenMinHeight = parsePxDeclaration(
  parseCssRuleBody(profileCss, '.profile-screen'),
  'min-height',
);
const chambersColumnRule = parseCssRuleBody(profileCss, '.profile-chambers');
const realColumnX = parsePxDeclaration(chambersColumnRule, 'left');
const realColumnGap = parsePxDeclaration(chambersColumnRule, 'gap');
const realChamberHeight = parsePxDeclaration(parseCssRuleBody(profileCss, '.profile-chamber'), 'height');
const realFusedTopOffset = parsePxDeclaration(
  parseCssRuleBody(profileCss, '.profile-chamber__fused'),
  'top',
);

/** Real backdrop color at design-px (x, y): the gradient, quantized to 8-bit
 *  (the base layer the browser actually paints), THEN composited with the
 *  glow overlay and quantized again -- see contrast.ts's `quantizeRgb` doc. */
function backdropAt(y: number): RGB {
  const t = linearGradientT(angleDeg, CHAMBER_COLUMN_X, y, PROFILE_BOX.width, PROFILE_BOX.height);
  const base = quantizeRgb(interpolateGradientStops(stops, t));
  const alpha = radialGlowAlpha(glow, CHAMBER_COLUMN_X, y, PROFILE_BOX.width, PROFILE_BOX.height);
  return quantizeRgb(compositeAlpha(base, glow.color, alpha));
}

describe('Profile chamber-initial contrast (spec profile-acrostic, decision #522)', () => {
  const yPositions = chamberFusedYPositions(PROFILE_BOX.height);

  it('PROFILE_BOX.height matches the real .profile-screen min-height -- the invariant this measurement assumes', () => {
    // Every .profile-screen child is position:absolute (verified by reading
    // profile.css and Profile.tsx -- its only inline style is the shared
    // goo-filter <svg width="0" height="0">, which contributes no layout
    // height), so min-height is never stretched taller by content, at any
    // viewport width (the stage scales width only -- shell.css). If a future
    // change adds a non-absolutely-positioned child to .profile-screen, this
    // invariant, and every ratio below, must be re-derived.
    expect(profileScreenMinHeight).toBe(PROFILE_BOX.height);
  });

  it("contrast.ts's hardcoded layout constants mirror the real profile.css values", () => {
    // contrast.ts has no CSS parser of its own -- these numbers are
    // duplicated there. This is what catches a profile.css layout edit (e.g.
    // moving the chamber column) that would otherwise silently invalidate
    // every backdrop/ratio below while this file kept passing.
    expect(realColumnX).toBe(CHAMBER_COLUMN_X);
    expect(realColumnGap).toBe(CHAMBER_GAP);
    expect(realChamberHeight).toBe(CHAMBER_HEIGHT);
    expect(realFusedTopOffset).toBe(FUSED_TOP_OFFSET);
    expect(CHAMBERS.length).toBe(CHAMBER_COUNT);
  });

  it('--color-profile-initial is #c9d49a, the color approved in decision #522', () => {
    expect(rgbToHex(initial)).toBe('#c9d49a');
  });

  it('.profile-chamber__initial applies the token (not left uncolored)', () => {
    const ruleMatch = profileCss.match(/\.profile-chamber__initial\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();
    expect(ruleMatch![1]).toMatch(/color:\s*var\(--color-profile-initial\)/);
  });

  const expected = [
    { chamber: 1, y: 108, backdrop: '#515049', ratio: 5.15 },
    { chamber: 2, y: 270, backdrop: '#4f4f49', ratio: 5.25 },
    { chamber: 3, y: 432, backdrop: '#4c4b45', ratio: 5.57 },
    { chamber: 4, y: 594, backdrop: '#3b3b35', ratio: 7.18 },
    { chamber: 5, y: 756, backdrop: '#262622', ratio: 9.67 },
  ];

  expected.forEach(({ chamber, y, backdrop, ratio }) => {
    it(`chamber ${chamber} (fused-word y=${y}): backdrop ${backdrop}, contrast ~${ratio}:1`, () => {
      expect(yPositions[chamber - 1]).toBe(y);
      const bg = backdropAt(y);
      expect(rgbToHex(bg)).toBe(backdrop);
      expect(contrastRatio(initial, bg)).toBeCloseTo(ratio, 1);
    });
  });

  it('every chamber clears the 4.5:1 AA floor -- the actual regression guard', () => {
    yPositions.forEach((y) => {
      expect(contrastRatio(initial, backdropAt(y))).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('negative control: --color-profile-accent does NOT clear 4.5:1 at chamber 1 -- proves this harness can fail', () => {
    expect(contrastRatio(accent, backdropAt(yPositions[0]))).toBeLessThan(4.5);
  });
});
