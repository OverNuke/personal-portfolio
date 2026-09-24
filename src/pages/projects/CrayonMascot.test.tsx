import { render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CrayonMascot from './CrayonMascot';
import { MASCOT_PATH_IDS } from './mascotStrokes';

// Same three jsdom stand-ins as StrokeGlyphTitle.test.tsx: no layout, no
// ResizeObserver, no matchMedia. `matches: true` pins the static
// reduced-motion pose so `paint(0, false)` runs synchronously on mount.
let layerHeight = 0;

beforeEach(() => {
  layerHeight = 0;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => layerHeight);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderMascot() {
  const containerRef = createRef<HTMLDivElement>();
  const valuesRef = { current: { p1: 0, p2: 0, p3: 0 } };
  const { container } = render(
    <div>
      <div ref={containerRef} />
      <CrayonMascot containerRef={containerRef} valuesRef={valuesRef} blueColor="#586a30" hotColor="#c9351d" />
    </div>,
  );
  const svg = container.querySelector('svg') as SVGSVGElement;
  const paths = Array.from(svg.querySelectorAll('path'));
  const bodyD = paths[MASCOT_PATH_IDS.indexOf('body')].getAttribute('d') as string;
  return { svg, bodyD };
}

describe('CrayonMascot at different section heights', () => {
  it('keeps the shipped viewBox and mascot position at the 900px design height', () => {
    layerHeight = 900;
    const { svg, bodyD } = renderMascot();
    expect(svg.getAttribute('viewBox')).toBe('0 0 1440 900');
    expect(bodyD.startsWith('M476.0 790.4C')).toBe(true);
  });

  it.each([
    [700, '0 0 1440 700', 'M476.0 610.0C'],
    [1400, '0 0 1440 1400', 'M476.0 1241.5C'],
  ])('at %ipx: viewBox tracks the section and the mascot re-anchors with it', (height, viewBox, bodyStart) => {
    layerHeight = height;
    const { svg, bodyD } = renderMascot();
    expect(svg.getAttribute('viewBox')).toBe(viewBox);
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMinYMin meet');
    expect(bodyD.startsWith(bodyStart)).toBe(true);
  });
});
