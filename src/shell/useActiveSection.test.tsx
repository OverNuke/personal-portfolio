import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useActiveSection } from './useActiveSection';

const IDS = ['section-home', 'section-profile', 'section-projects', 'section-contact'];

// Minimal IntersectionObserver stand-in: records what was observed and lets a
// test push entries through the callback the way the browser would.
let callback: IntersectionObserverCallback = () => {};
let options: IntersectionObserverInit | undefined;
let observed: Element[] = [];
let disconnected = false;

function report(id: string, isIntersecting: boolean) {
  const target = document.getElementById(id) as Element;
  act(() => {
    callback([{ target, isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
}

beforeEach(() => {
  observed = [];
  disconnected = false;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback, init?: IntersectionObserverInit) {
        callback = cb;
        options = init;
      }
      observe(element: Element) {
        observed.push(element);
      }
      disconnect() {
        disconnected = true;
      }
    },
  );
  for (const id of IDS) {
    const section = document.createElement('section');
    section.id = id;
    document.body.appendChild(section);
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('useActiveSection', () => {
  it('starts on the first section and observes every section', () => {
    const { result } = renderHook(() => useActiveSection(IDS));
    expect(result.current.activeId).toBe('section-home');
    expect(observed.map((el) => el.id)).toEqual(IDS);
  });

  it('watches a 1px band on the viewport midline, so exactly the section under the middle of the screen is active', () => {
    renderHook(() => useActiveSection(IDS));
    expect(options?.rootMargin).toBe('-50% 0px -50% 0px');
  });

  it('follows the section that crosses the midline, and ignores sections leaving it', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    report('section-profile', true);
    expect(result.current.activeId).toBe('section-profile');

    report('section-profile', false);
    expect(result.current.activeId).toBe('section-profile'); // leaving alone changes nothing

    report('section-contact', true);
    expect(result.current.activeId).toBe('section-contact');
  });

  it('lockTo() marks the target active immediately and suppresses intermediate sections during the scroll', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    act(() => result.current.lockTo('section-contact'));
    expect(result.current.activeId).toBe('section-contact');

    report('section-profile', true); // scroll passing through
    report('section-projects', true);
    expect(result.current.activeId).toBe('section-contact');
  });

  it('releases the lock once the target itself is reached, then follows scrolling again', () => {
    const { result } = renderHook(() => useActiveSection(IDS));

    act(() => result.current.lockTo('section-projects'));
    report('section-profile', true);
    report('section-projects', true); // arrived
    expect(result.current.activeId).toBe('section-projects');

    report('section-contact', true); // the user keeps scrolling
    expect(result.current.activeId).toBe('section-contact');
  });

  it('never leaves the lock stuck if the target cannot reach the midline (timeout releases it)', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useActiveSection(IDS));

    act(() => result.current.lockTo('section-contact'));
    report('section-profile', true);
    expect(result.current.activeId).toBe('section-contact');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    report('section-profile', true);
    expect(result.current.activeId).toBe('section-profile');
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = renderHook(() => useActiveSection(IDS));
    unmount();
    expect(disconnected).toBe(true);
  });
});
