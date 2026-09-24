import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StrokeGlyphTitle from './StrokeGlyphTitle';

// jsdom has no layout: clientHeight is always 0 and ResizeObserver/matchMedia
// don't exist. The three stubs below stand in for "the real section is
// `layerHeight` px tall, and the browser tells us when that changes".
let layerHeight = 0;
let notifyResize: () => void = () => {};

beforeEach(() => {
  layerHeight = 0;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        notifyResize = callback;
      }
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

function renderTitle() {
  const { container } = render(
    <div>
      <StrokeGlyphTitle color="#586a30" />
    </div>,
  );
  return container.querySelector('svg') as SVGSVGElement;
}

describe('StrokeGlyphTitle viewBox', () => {
  it('falls back to the 900px design height when the layer has no measurable height yet', () => {
    expect(renderTitle().getAttribute('viewBox')).toBe('0 0 1440 900');
  });

  it.each([700, 1400])('tracks a %ipx-tall section (1 unit = 1 CSS px, top-left anchored)', (height) => {
    layerHeight = height;
    const svg = renderTitle();
    expect(svg.getAttribute('viewBox')).toBe(`0 0 1440 ${height}`);
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMinYMin meet');
  });

  it('follows the section when it is resized after mount', () => {
    layerHeight = 900;
    const svg = renderTitle();
    expect(svg.getAttribute('viewBox')).toBe('0 0 1440 900');
    layerHeight = 1400;
    act(() => notifyResize());
    expect(svg.getAttribute('viewBox')).toBe('0 0 1440 1400');
  });
});
