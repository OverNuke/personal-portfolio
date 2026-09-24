import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STAGE_WIDTH, computeStageScale, useStageScale } from './useStageScale';

describe('computeStageScale', () => {
  it.each([
    [864, 0.6],
    [1152, 0.8],
    [1440, 1],
  ])('maps a %ipx-wide viewport to scale %d (the 0.6/0.8/1.0 spec cases)', (width, expected) => {
    expect(computeStageScale(width)).toBeCloseTo(expected, 10);
  });

  it('is uncapped: a viewport wider than 1440px scales the stage up (width-only, never min() with height)', () => {
    expect(computeStageScale(1920)).toBeCloseTo(1920 / STAGE_WIDTH, 10);
  });
});

// Stand-in for the Shell's viewport/stage pair, so the hook is exercised
// against real DOM nodes and a real `resize` event.
function Harness() {
  const { viewportRef, stageRef } = useStageScale();
  return (
    <div data-testid="viewport" ref={viewportRef}>
      <div data-testid="stage" ref={stageRef} />
    </div>
  );
}

describe('useStageScale', () => {
  let notifyStageResize: () => void = () => {};
  let stageHeight = 4500;
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    stageHeight = 4500;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notifyStageResize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => stageHeight);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.innerWidth = originalInnerWidth;
    window.innerHeight = originalInnerHeight;
  });

  function setViewport(width: number, height: number) {
    window.innerWidth = width;
    window.innerHeight = height;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }

  it('writes --stage-scale from the viewport width alone, on mount and on resize', () => {
    window.innerWidth = 1152;
    window.innerHeight = 900;
    const { getByTestId } = render(<Harness />);
    expect(getByTestId('viewport').style.getPropertyValue('--stage-scale')).toBe('0.8');

    setViewport(864, 900);
    expect(getByTestId('viewport').style.getPropertyValue('--stage-scale')).toBe('0.6');
  });

  it('ignores viewport height entirely (a wide-short and a wide-tall window scale identically)', () => {
    const { getByTestId } = render(<Harness />);
    setViewport(1152, 400);
    const short = getByTestId('viewport').style.getPropertyValue('--stage-scale');
    setViewport(1152, 2000);
    const tall = getByTestId('viewport').style.getPropertyValue('--stage-scale');
    expect(short).toBe('0.8');
    expect(tall).toBe(short);
  });

  it("mirrors the stage's natural (unscaled) height into --stage-height so the scaler can size the document", () => {
    const { getByTestId } = render(<Harness />);
    expect(getByTestId('viewport').style.getPropertyValue('--stage-height')).toBe('4500');

    stageHeight = 5400;
    act(() => notifyStageResize());
    expect(getByTestId('viewport').style.getPropertyValue('--stage-height')).toBe('5400');
  });
});
