// Shared jsdom stand-ins for the three browser facilities the measured-height
// components need and jsdom lacks: `clientHeight` (always 0, jsdom has no
// layout engine), `ResizeObserver` (missing), and `matchMedia` (missing; the
// `usePrefersReducedMotion` hook calls it on first render). Extracted from
// the copy-pasted `beforeEach` blocks in Projects' StrokeGlyphTitle/
// CrayonMascot tests so new tests share one definition instead of a third
// copy (verify-report W10). Those two existing tests still carry their own
// copies -- they live in `src/pages/projects/*`, outside Phase 6's scope.
//
// Usage: call `installLayoutStubs()` in `beforeEach`, `restoreLayoutStubs()`
// in `afterEach`. Three mocks total, all installed and torn down together.
import { act } from '@testing-library/react';
import { vi } from 'vitest';

export interface LayoutStubs {
  /** Sets the height every element's `clientHeight` reports (0 = "no layout
   *  yet", which components treat as "fall back to the design height"). */
  setHeight(height: number): void;
  /** Simulates the browser resizing the observed element: updates
   *  `clientHeight` and fires the most recently registered ResizeObserver
   *  callback inside `act`. */
  resize(height: number): void;
}

export interface LayoutStubOptions {
  /** What `matchMedia('(prefers-reduced-motion: reduce)').matches` reports.
   *  `true` (default) pins components to their static pose, so no rAF loop
   *  runs; `false` lets the continuous loop start. */
  reducedMotion?: boolean;
}

export function installLayoutStubs({ reducedMotion = true }: LayoutStubOptions = {}): LayoutStubs {
  let layerHeight = 0;
  let notifyResize: () => void = () => {};

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
  vi.stubGlobal('matchMedia', () => ({
    matches: reducedMotion,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => layerHeight);

  return {
    setHeight(height) {
      layerHeight = height;
    },
    resize(height) {
      layerHeight = height;
      act(() => notifyResize());
    },
  };
}

export function restoreLayoutStubs(): void {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
}
