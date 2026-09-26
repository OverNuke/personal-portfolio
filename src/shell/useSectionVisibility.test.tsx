import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSectionVisibility, VIEWPORT_ROOT_MARGIN } from './useSectionVisibility';

const IDS = ['section-a', 'section-b', 'section-c'];

interface FakeObserver {
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[];
  disconnected: boolean;
}
let observers: FakeObserver[] = [];

function installObserver() {
  observers = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private readonly record: FakeObserver;
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.record = { callback, options, observed: [], disconnected: false };
        observers.push(this.record);
      }
      observe(element: Element) {
        this.record.observed.push(element);
      }
      disconnect() {
        this.record.disconnected = true;
      }
    },
  );
}

/** What the browser reports: one entry per section whose intersection changed. */
function report(changes: Record<string, boolean>) {
  const [observer] = observers;
  const entries = Object.entries(changes).map(
    ([id, isIntersecting]) => ({ target: document.getElementById(id), isIntersecting }) as IntersectionObserverEntry,
  );
  act(() => observer.callback(entries, {} as IntersectionObserver));
}

beforeEach(() => {
  installObserver();
  for (const id of IDS) {
    const el = document.createElement('section');
    el.id = id;
    document.body.appendChild(el);
  }
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('useSectionVisibility', () => {
  it('starts with every section visible, so nothing is frozen before the first report (fail open)', () => {
    const { result } = renderHook(() => useSectionVisibility(IDS));
    expect(result.current).toEqual({ 'section-a': true, 'section-b': true, 'section-c': true });
  });

  it('observes every section', () => {
    renderHook(() => useSectionVisibility(IDS));
    expect(observers).toHaveLength(1);
    expect(observers[0].observed.map((el) => el.id)).toEqual(IDS);
  });

  it('uses a slightly NEGATIVE root margin: a neighbour merely touching the viewport edge is not visible', () => {
    // Sections are 900px tall in a 900px viewport, so parked on one section its
    // neighbours sit exactly on the viewport edges. A zero or positive margin
    // reports those edge-adjacent sections as intersecting and pauses nothing.
    renderHook(() => useSectionVisibility(IDS));
    const margin = observers[0].options?.rootMargin ?? '';
    expect(margin).toBe(VIEWPORT_ROOT_MARGIN);
    const [top, , bottom] = margin.split(' ').map(parseFloat);
    expect(top).toBeLessThan(0);
    expect(bottom).toBeLessThan(0);
  });

  it('marks a section hidden when it leaves the viewport and visible again when it returns', () => {
    const { result } = renderHook(() => useSectionVisibility(IDS));

    report({ 'section-b': false, 'section-c': false });
    expect(result.current).toEqual({ 'section-a': true, 'section-b': false, 'section-c': false });

    report({ 'section-b': true });
    expect(result.current).toEqual({ 'section-a': true, 'section-b': true, 'section-c': false });
  });

  it('keeps the same object when a report changes nothing (no pointless re-render of five screens)', () => {
    const { result } = renderHook(() => useSectionVisibility(IDS));
    report({ 'section-b': false });
    const before = result.current;
    report({ 'section-b': false });
    expect(result.current).toBe(before);
  });

  it('disconnects its observer on unmount', () => {
    const { unmount } = renderHook(() => useSectionVisibility(IDS));
    unmount();
    expect(observers[0].disconnected).toBe(true);
  });

  it('fails open when IntersectionObserver does not exist', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { result } = renderHook(() => useSectionVisibility(IDS));
    expect(result.current).toEqual({ 'section-a': true, 'section-b': true, 'section-c': true });
  });
});
