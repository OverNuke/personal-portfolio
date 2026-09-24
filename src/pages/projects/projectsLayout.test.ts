import { describe, expect, it } from 'vitest';
import { ambientY, DESIGN_HEIGHT, DESIGN_WIDTH, layerViewBox, resolveLayerHeight } from './projectsLayout';

describe('projectsLayout', () => {
  it('pins the shipped design space at 1440x900', () => {
    expect(DESIGN_WIDTH).toBe(1440);
    expect(DESIGN_HEIGHT).toBe(900);
  });

  describe('layerViewBox', () => {
    it.each([
      [700, '0 0 1440 700'],
      [900, '0 0 1440 900'],
      [1400, '0 0 1440 1400'],
    ])('is 1 viewBox unit = 1 CSS px, top-left anchored, at height %i', (height, expected) => {
      expect(layerViewBox(height)).toBe(expected);
    });
  });

  describe('resolveLayerHeight', () => {
    it('passes a real measured height through', () => {
      expect(resolveLayerHeight(1400)).toBe(1400);
      expect(resolveLayerHeight(700)).toBe(700);
    });

    it.each([0, -5, Number.NaN])('falls back to the design height for an unusable measurement (%s)', (measured) => {
      expect(resolveLayerHeight(measured)).toBe(900);
    });
  });

  describe('ambientY', () => {
    it('is the identity at the design height', () => {
      expect(ambientY(812, 900)).toBe(812);
      expect(ambientY(84, 900)).toBe(84);
    });

    it('scales a design-space y proportionally to the real height', () => {
      expect(ambientY(812, 700)).toBeCloseTo(631.5556, 3);
      expect(ambientY(812, 1400)).toBeCloseTo(1263.1111, 3);
      expect(ambientY(84, 1800)).toBe(168);
    });
  });
});
