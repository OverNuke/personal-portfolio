import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pushSectionHash, useHashNavigation } from './useHashNavigation';

function setHash(hash: string) {
  window.history.replaceState(null, '', `/${hash}`);
}

describe('useHashNavigation', () => {
  beforeEach(() => {
    setHash('');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    setHash('');
  });

  it('navigates instantly to the section named by the hash on mount', () => {
    setHash('#projects');
    const navigate = vi.fn();
    renderHook(() => useHashNavigation(navigate));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('projects', 'instant');
  });

  it('resolves #distinctions to the `distinction` page id', () => {
    setHash('#distinctions');
    const navigate = vi.fn();
    renderHook(() => useHashNavigation(navigate));
    expect(navigate).toHaveBeenCalledWith('distinction', 'instant');
  });

  it.each(['', '#', '#foo', '#section-profile'])('does nothing on mount for the empty/unknown hash %j (stays on Home)', (hash) => {
    setHash(hash);
    const navigate = vi.fn();
    renderHook(() => useHashNavigation(navigate));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('a valid mount hash does not push a history entry', () => {
    setHash('#contact');
    const push = vi.spyOn(window.history, 'pushState');
    renderHook(() => useHashNavigation(vi.fn()));
    expect(push).not.toHaveBeenCalled();
  });

  it('navigates (animated) on popstate with the current hash, without pushing history', () => {
    const navigate = vi.fn();
    renderHook(() => useHashNavigation(navigate));
    const push = vi.spyOn(window.history, 'pushState');

    setHash('#profile');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(navigate).toHaveBeenCalledWith('profile', 'animated');
    expect(push).not.toHaveBeenCalled();
  });

  it('navigates (animated) on a manual hashchange', () => {
    const navigate = vi.fn();
    renderHook(() => useHashNavigation(navigate));

    setHash('#contact');
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(navigate).toHaveBeenCalledWith('contact', 'animated');
  });

  it('handles the popstate + hashchange pair a back/forward fires only once', async () => {
    const navigate = vi.fn();
    renderHook(() => useHashNavigation(navigate));

    setHash('#projects');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(navigate).toHaveBeenCalledTimes(1);

    // ...but a later, separate navigation is not swallowed.
    await new Promise((resolve) => setTimeout(resolve, 5));
    setHash('#contact');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenLastCalledWith('contact', 'animated');
  });

  it.each(['', '#', '#foo'])('an empty/unknown hash on back/forward or manual edit (%j) goes Home', (hash) => {
    const navigate = vi.fn();
    renderHook(() => useHashNavigation(navigate));

    setHash(hash);
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(navigate).toHaveBeenCalledWith('home', 'animated');
  });

  it('uses the latest navigate callback without re-running the mount navigation', () => {
    setHash('#projects');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useHashNavigation(cb), { initialProps: { cb: first } });
    rerender({ cb: second });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    setHash('#contact');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(second).toHaveBeenCalledWith('contact', 'animated');
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('stops listening on unmount', () => {
    const navigate = vi.fn();
    const { unmount } = renderHook(() => useHashNavigation(navigate));
    unmount();

    setHash('#contact');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('takes over scroll restoration while mounted and gives it back on unmount', () => {
    window.history.scrollRestoration = 'auto';
    const { unmount } = renderHook(() => useHashNavigation(vi.fn()));
    expect(window.history.scrollRestoration).toBe('manual');
    unmount();
    expect(window.history.scrollRestoration).toBe('auto');
  });
});

describe('pushSectionHash', () => {
  beforeEach(() => {
    setHash('');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    setHash('');
  });

  it('pushes the section hash as a new history entry', () => {
    const before = window.history.length;
    pushSectionHash('profile');
    expect(window.location.hash).toBe('#profile');
    expect(window.history.length).toBe(before + 1);
  });

  it('keeps the path and query when it pushes', () => {
    window.history.replaceState(null, '', '/some/path?x=1');
    pushSectionHash('contact');
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/some/path?x=1#contact');
  });

  it('does not push a duplicate entry when the hash is already that section', () => {
    setHash('#projects');
    const push = vi.spyOn(window.history, 'pushState');
    pushSectionHash('projects');
    expect(push).not.toHaveBeenCalled();
  });

  it('does not fire hashchange/popstate for its own push (no handler loop)', () => {
    const navigate = vi.fn();
    renderHook(() => useHashNavigation(navigate));
    pushSectionHash('distinction');
    expect(window.location.hash).toBe('#distinctions');
    expect(navigate).not.toHaveBeenCalled();
  });
});
