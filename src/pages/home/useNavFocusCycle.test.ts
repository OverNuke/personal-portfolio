import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useNavFocusCycle } from './useNavFocusCycle';

function press(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, cancelable: true });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe('useNavFocusCycle', () => {
  it('cycles with wraparound and swallows the key while enabled (Home is the active section)', () => {
    const { result } = renderHook(() => useNavFocusCycle(4, true));

    const down = press('ArrowDown');
    expect(result.current[0]).toBe(1);
    expect(down.defaultPrevented).toBe(true);

    press('ArrowUp');
    press('ArrowUp');
    expect(result.current[0]).toBe(3); // 1 -> 0 -> wraps to 3
  });

  it('defaults to enabled', () => {
    const { result } = renderHook(() => useNavFocusCycle(4));
    press('ArrowRight');
    expect(result.current[0]).toBe(1);
  });

  it('does not hijack the arrow keys while disabled -- native page scrolling must keep working on the other 4 sections', () => {
    const { result } = renderHook(() => useNavFocusCycle(4, false));

    for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) {
      const event = press(key);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(result.current[0]).toBe(0);
  });

  it('stops and resumes as the section becomes inactive/active', () => {
    const { result, rerender } = renderHook(({ enabled }) => useNavFocusCycle(4, enabled), {
      initialProps: { enabled: true },
    });
    press('ArrowDown');
    expect(result.current[0]).toBe(1);

    rerender({ enabled: false });
    const ignored = press('ArrowDown');
    expect(ignored.defaultPrevented).toBe(false);
    expect(result.current[0]).toBe(1);

    rerender({ enabled: true });
    press('ArrowDown');
    expect(result.current[0]).toBe(2);
  });
});
