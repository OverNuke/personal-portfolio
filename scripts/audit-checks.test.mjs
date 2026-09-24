import { describe, expect, it } from 'vitest';
import { hasHorizontalOverflow, meetsStageViewportOverflowContract } from './audit-checks.mjs';

/**
 * Contract for `.stage-viewport`'s computed overflow (src/shell/shell.css), the
 * one static guard the collage audit keeps on the shell's horizontal
 * containment.
 *
 * The continuous-scroll shell ships `overflow-x: clip` (task 7.1). The audit
 * pins that as a static guard (policy / defense in depth, not a measured leak:
 * removing the clip does not make the page scroll horizontally today). It has
 * to be `clip`, never `hidden`: a non-visible/non-clip value on one axis
 * promotes the other axis from `visible` to `auto`, which would turn the
 * wrapper into a scroll container and capture the document's vertical scroll.
 * So the computed pair the audit accepts is exactly `clip/visible` (or
 * `clip/clip`).
 */
describe('meetsStageViewportOverflowContract', () => {
  it('accepts the shipped contract: overflow-x clip with a visible y axis', () => {
    expect(meetsStageViewportOverflowContract('clip', 'visible')).toBe(true);
  });

  it('accepts clip on both axes (still not a scroll container)', () => {
    expect(meetsStageViewportOverflowContract('clip', 'clip')).toBe(true);
  });

  it.each(['visible', 'auto', 'scroll'])('rejects x = %s (would permit horizontal scroll or leak the pre-transform box)', (x) => {
    expect(meetsStageViewportOverflowContract(x, 'visible')).toBe(false);
  });

  it.each(['auto', 'scroll', 'hidden'])('rejects y = %s (would make the wrapper a scroll container that captures document scroll)', (y) => {
    expect(meetsStageViewportOverflowContract('clip', y)).toBe(false);
  });

  it('rejects the pre-continuous-scroll contract, hidden/hidden', () => {
    expect(meetsStageViewportOverflowContract('hidden', 'hidden')).toBe(false);
  });

  it('rejects hidden on x even though it also clips: it forces y to auto, so the valid pair cannot occur', () => {
    expect(meetsStageViewportOverflowContract('hidden', 'auto')).toBe(false);
    expect(meetsStageViewportOverflowContract('hidden', 'visible')).toBe(false);
  });

  it('rejects a missing computed style (nothing was measured)', () => {
    expect(meetsStageViewportOverflowContract(null, null)).toBe(false);
    expect(meetsStageViewportOverflowContract(undefined, 'visible')).toBe(false);
  });
});

// The audit measures the painted stage's right edge against the viewport with this same predicate
// (`overflow-x: clip` hides real overflow from the document's own scrollWidth, so that alone proves little).
describe('hasHorizontalOverflow', () => {
  it('flags content wider than the viewport', () => {
    expect(hasHorizontalOverflow(1600, 1440)).toBe(true);
  });

  it('tolerates sub-pixel rounding noise (<= 1px)', () => {
    expect(hasHorizontalOverflow(1441, 1440)).toBe(false);
    expect(hasHorizontalOverflow(390.4, 390)).toBe(false);
  });

  it('flags just past the tolerance', () => {
    expect(hasHorizontalOverflow(1442, 1440)).toBe(true);
  });

  it('does not flag content narrower than the viewport', () => {
    expect(hasHorizontalOverflow(390, 1440)).toBe(false);
  });
});
