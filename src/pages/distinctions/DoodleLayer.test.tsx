import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DoodleLayer from './DoodleLayer';
import { ALL_DOODLE_PATH_IDS } from './doodleFrame';
import { MOLECULAR_PATH_IDS } from './molecularDoodles';

// Accessibility contract for the doodle overlay (docs/05 "The crayon-mascot
// doodle overlay is fully decorative... aria-hidden, never a tab stop"),
// extended to the 5 molecular doodles (spec `molecular-health-doodles`: "absent
// from the accessibility tree"). No mocks: DoodleLayer is a pure render.
// jsdom does not load distinctions.css, so `pointer-events: none` is checked
// against the real page in the Playwright probe, not here.
function renderLayer(height = 900) {
  const pathRefs = { current: new Map<string, SVGPathElement>() };
  const { container } = render(<DoodleLayer height={height} pathRefs={pathRefs} />);
  const svg = container.querySelector('svg') as SVGSVGElement;
  return { container, svg, pathRefs };
}

describe('DoodleLayer accessibility', () => {
  it('is one svg hidden from the accessibility tree and from SVG focus', () => {
    const { container, svg } = renderLayer();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
  });

  it('contains exactly the 21 doodle paths (16 mascot/spore + 5 molecular) and nothing else', () => {
    const { svg, pathRefs } = renderLayer();
    expect(svg.children).toHaveLength(21);
    expect(svg.querySelectorAll('path')).toHaveLength(ALL_DOODLE_PATH_IDS.length);
    expect(Array.from(pathRefs.current.keys())).toEqual(ALL_DOODLE_PATH_IDS);
    MOLECULAR_PATH_IDS.forEach((id) => expect(pathRefs.current.has(id)).toBe(true));
  });

  it('has no tab stop, no interactive role and no handler-bearing element anywhere inside', () => {
    const { svg } = renderLayer();
    const all = Array.from(svg.querySelectorAll('*'));
    expect(all).toHaveLength(21); // the loops below really run
    for (const el of all) {
      expect(el.hasAttribute('tabindex')).toBe(false);
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('href')).toBe(false);
      expect(el.hasAttribute('aria-label')).toBe(false);
    }
    expect(svg.querySelectorAll('a, button, input, [tabindex], [role], [onclick]')).toHaveLength(0);
  });

  it.each([700, 900, 1400])('%ipx: the viewBox is the real box, uniform-scaled (never stretched)', (height) => {
    const { svg } = renderLayer(height);
    expect(svg.getAttribute('viewBox')).toBe(`0 0 1440 ${height}`);
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMinYMin meet');
  });
});
