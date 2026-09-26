import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { installLayoutStubs, restoreLayoutStubs } from '../../test/layoutStubs';
import { installRafSpy } from '../../test/rafSpy';
import type { RafSpy } from '../../test/rafSpy';
import { SectionVisibilityContext } from '../../shell/SectionVisibilityContext';
import { useCardHover } from './useCardHover';

// The hover lerp only has work to do while a card is moving toward its target.
// Once every value has settled the rAF must STOP (it used to tick forever, even
// on-screen with nothing hovered), and any change of hover must wake it again.

const IDS = ['a', 'b'];
let raf: RafSpy;
let visible = true;

afterEach(() => {
  restoreLayoutStubs();
  visible = true;
});

function setup(reducedMotion = false) {
  installLayoutStubs({ reducedMotion });
  raf = installRafSpy();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SectionVisibilityContext.Provider value={visible}>{children}</SectionVisibilityContext.Provider>
  );
  return renderHook(() => useCardHover(IDS), { wrapper });
}

/** Runs frames until the loop stops by itself; returns how many it took. */
function runUntilIdle(limit = 300): number {
  let frames = 0;
  while (raf.pending() > 0 && frames < limit) {
    raf.frame();
    frames++;
  }
  return frames;
}

describe('useCardHover loop lifecycle', () => {
  it('paints its resting state once and then stops scheduling frames', () => {
    setup();
    expect(raf.pending()).toBe(1);
    raf.frame();
    expect(raf.pending()).toBe(0);
  });

  it('wakes on hover, eases the hovered card to exactly 1, then stops again', () => {
    const { result } = setup();
    raf.frame(); // settle the resting state
    expect(raf.pending()).toBe(0);

    act(() => result.current.bindFocus('a').onFocus());
    expect(raf.pending()).toBe(1);

    raf.frame();
    const firstStep = result.current.valuesRef.current.a;
    expect(firstStep).toBeGreaterThan(0);
    expect(firstStep).toBeLessThan(1); // eased, not snapped

    const frames = runUntilIdle();
    expect(frames).toBeGreaterThan(5);
    expect(frames).toBeLessThan(300);
    expect(result.current.valuesRef.current.a).toBe(1);
    expect(result.current.valuesRef.current.b).toBe(0);
    expect(raf.pending()).toBe(0);
  });

  it('wakes again when the hover ends and eases back to exactly 0', () => {
    const { result } = setup();
    act(() => result.current.bindFocus('a').onFocus());
    runUntilIdle();
    expect(result.current.valuesRef.current.a).toBe(1);

    act(() => result.current.bindFocus('a').onBlur());
    expect(raf.pending()).toBe(1);
    runUntilIdle();
    expect(result.current.valuesRef.current.a).toBe(0);
    expect(raf.pending()).toBe(0);
  });

  it('never runs two loops at once when hover changes while already animating', () => {
    const { result } = setup();
    act(() => result.current.bindFocus('a').onFocus());
    raf.frame();
    act(() => result.current.bindFocus('b').onFocus());
    act(() => result.current.bindFocus('a').onFocus());
    expect(raf.pending()).toBe(1);
  });

  it('does not start a loop for a hover that happens while the section is hidden, and catches up when it returns', () => {
    visible = false;
    const { result, rerender } = setup();
    expect(raf.pending()).toBe(0);

    act(() => result.current.bindFocus('a').onFocus());
    expect(raf.pending()).toBe(0);

    visible = true;
    rerender();
    expect(raf.pending()).toBe(1);
    runUntilIdle();
    expect(result.current.valuesRef.current.a).toBe(1);
  });

  it('under reduced motion snaps instantly and never schedules a frame (unchanged)', () => {
    const { result } = setup(true);
    act(() => result.current.bindFocus('a').onFocus());
    expect(result.current.valuesRef.current.a).toBe(1);
    expect(raf.scheduled).not.toHaveBeenCalled();
  });
});
