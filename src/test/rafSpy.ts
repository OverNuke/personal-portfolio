// Controllable requestAnimationFrame for tests of continuous effect loops.
// jsdom's rAF is timer-driven and untestable; this one only runs when told to.
//
// Usage: `const raf = installRafSpy()` in `beforeEach` (undone by
// `vi.unstubAllGlobals()`); `raf.frame()` runs the currently pending callbacks
// once, exactly as one browser frame would.
import { act } from '@testing-library/react';
import { vi } from 'vitest';

export interface RafSpy {
  /** `requestAnimationFrame` calls so far (a loop that stopped stops growing). */
  readonly scheduled: ReturnType<typeof vi.fn>;
  readonly cancelled: ReturnType<typeof vi.fn>;
  /** Callbacks waiting for the next frame. */
  pending(): number;
  /** Runs one frame at `timeMs` (default: advances 16ms), inside `act`. */
  frame(timeMs?: number): void;
}

export function installRafSpy(): RafSpy {
  let nextId = 1;
  let now = 0;
  const queue = new Map<number, FrameRequestCallback>();
  const scheduled = vi.fn((cb: FrameRequestCallback) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  });
  const cancelled = vi.fn((id: number) => {
    queue.delete(id);
  });
  vi.stubGlobal('requestAnimationFrame', scheduled);
  vi.stubGlobal('cancelAnimationFrame', cancelled);

  return {
    scheduled,
    cancelled,
    pending: () => queue.size,
    frame(timeMs) {
      now = timeMs ?? now + 16;
      const callbacks = [...queue.values()];
      queue.clear();
      act(() => callbacks.forEach((cb) => cb(now)));
    },
  };
}
