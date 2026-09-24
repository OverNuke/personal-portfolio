import { describe, expect, test } from 'vitest';
import { computeMagneticFalloff } from './useMagneticDock';

// Covers `continuous-scroll-layout`'s "Contact falloff across full rendered
// height" scenario (sdd/continuous-scroll-and-doodles/spec): the falloff
// must keep responding continuously across the section's *actual* rendered
// height, not just the original ~214-774px card band tuned against a fixed
// 900px container.
describe('computeMagneticFalloff', () => {
  test('preserves the currently shipped falloff at the 900px baseline (approval test)', () => {
    // Approval test: same inputs, same formula the original inline paint()
    // math used (DOCK_SPREAD=260, DOCK_SPREAD_Y_FACTOR=2.2). This MUST keep
    // producing this exact value after extraction -- if it doesn't, the
    // currently shipped hover response has regressed.
    const cardCenter = { x: 500, y: 450 };
    const pointer = { x: 560, y: 500 };
    const dx = (pointer.x - cardCenter.x) / 260;
    const dy = (pointer.y - cardCenter.y) / (260 * 2.2);
    const expected = Math.exp(-(dx * dx + dy * dy));

    expect(computeMagneticFalloff(pointer, cardCenter, 900)).toBeCloseTo(expected, 10);
  });

  test('produces a stronger response for the same vertical offset as container height grows', () => {
    // A card sitting 300px below the pointer, at three increasingly tall
    // container heights. If falloff were still computed against the fixed
    // 900px-tuned constants (no height-awareness), all three values would
    // be identical -- this is the exact behavior the height param exists to
    // change.
    const cardCenter = { x: 200, y: 400 };
    const pointer = { x: 200, y: 700 }; // 300px straight below the card

    const at700 = computeMagneticFalloff(pointer, cardCenter, 700);
    const at900 = computeMagneticFalloff(pointer, cardCenter, 900);
    const at1400 = computeMagneticFalloff(pointer, cardCenter, 1400);

    expect(at700).toBeGreaterThan(0);
    expect(at900).toBeGreaterThan(at700);
    expect(at1400).toBeGreaterThan(at900);
  });

  test('stays meaningfully non-zero for a card/pointer pair near the bottom of a 1400px container', () => {
    // Old fixed-900 tuning clustered all meaningful response inside the
    // ~214-774px card band; a card near the bottom of a much taller
    // (1400px) container must still get a real, continuous response, not a
    // near-zero one this far outside that old band.
    const cardCenter = { x: 700, y: 1300 };
    const pointer = { x: 700, y: 1100 }; // 200px above, well past the old band

    const falloff = computeMagneticFalloff(pointer, cardCenter, 1400);

    expect(falloff).toBeCloseTo(0.9507, 3);
  });
});
