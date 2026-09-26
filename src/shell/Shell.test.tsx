import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installLayoutStubs, restoreLayoutStubs } from '../test/layoutStubs';
import type { PageId } from '../routes/registry';
import { useSectionNav } from './SectionNavContext';
import { useSectionVisible } from './SectionVisibilityContext';
import Shell from './Shell';
import { VIEWPORT_ROOT_MARGIN } from './useSectionVisibility';

const TITLES: Record<PageId, string> = {
  home: 'Kevin',
  profile: 'Who me?',
  distinction: 'Distinctions',
  projects: 'Projects headline',
  contact: 'Reach out',
};

// Light stand-ins for the five real screens (the real ones pull in canvases,
// rAF loops and measured-height SVGs that have nothing to do with the shell).
// Each carries exactly what the shell relies on: one `[data-screen-heading]`.
function makePage(id: PageId): ComponentType {
  function Page() {
    const { activeSection, goToSection } = useSectionNav();
    const visible = useSectionVisible();
    return (
      <div data-testid={`screen-${id}`}>
        <output data-testid={`visible-${id}`}>{String(visible)}</output>
        <h2 data-screen-heading tabIndex={-1}>
          {TITLES[id]}
        </h2>
        {id === 'home' && (
          <>
            <output data-testid="home-sees-active">{activeSection}</output>
            <button type="button" onClick={() => goToSection('contact')}>
              in-page link to contact
            </button>
          </>
        )}
      </div>
    );
  }
  return Page;
}

const PAGES = {
  home: makePage('home'),
  profile: makePage('profile'),
  distinction: makePage('distinction'),
  projects: makePage('projects'),
  contact: makePage('contact'),
} satisfies Record<PageId, ComponentType>;

// The shell owns TWO observers: the midline one (`useActiveSection`, pill
// highlight) and the viewport one (`useSectionVisibility`, pausing effect loops).
// They are told apart by their root margin, so each test can drive them separately.
let midlineCallback: IntersectionObserverCallback = () => {};
let viewportCallback: IntersectionObserverCallback = () => {};
const scrollIntoView = vi.fn();

function entryFor(domId: string, isIntersecting: boolean) {
  return { target: document.getElementById(domId) as Element, isIntersecting } as IntersectionObserverEntry;
}

/** The section is under the viewport midline (drives the pill's active state). */
function reportIntersecting(domId: string) {
  act(() => midlineCallback([entryFor(domId, true)], {} as IntersectionObserver));
}

/** The section entered/left the viewport (drives pausing of its effect loops). */
function reportVisibility(domId: string, isIntersecting: boolean) {
  act(() => viewportCallback([entryFor(domId, isIntersecting)], {} as IntersectionObserver));
}

function installObservers() {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        if (options?.rootMargin === VIEWPORT_ROOT_MARGIN) viewportCallback = cb;
        else midlineCallback = cb;
      }
      observe() {}
      disconnect() {}
    },
  );
}

function liveRegion(container: HTMLElement) {
  return container.querySelector('[aria-live="polite"]') as HTMLElement;
}

function setHash(hash: string) {
  window.history.replaceState(null, '', `/${hash}`);
}

describe('Shell (continuous scroll)', () => {
  beforeEach(() => {
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
    setHash('');
  });
  afterEach(() => {
    restoreLayoutStubs();
    setHash('');
  });

  function setup(reducedMotion = false, hash = '') {
    setHash(hash);
    installLayoutStubs({ reducedMotion });
    installObservers();
    return render(<Shell pages={PAGES} />);
  }

  it('stacks all 5 screens in one page under a single <main>, each a named section', () => {
    setup();
    expect(screen.getAllByRole('main')).toHaveLength(1);

    const regions = within(screen.getByRole('main')).getAllByRole('region');
    expect(regions.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Home',
      'Profile',
      'Distinctions',
      'Projects',
      'Contact',
    ]);
    expect(regions.map((r) => r.id)).toEqual([
      'section-home',
      'section-profile',
      'section-distinction',
      'section-projects',
      'section-contact',
    ]);
    // every page really is mounted at once (nothing is swapped in/out any more)
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5);
  });

  it('tells each screen whether its section is on screen, so effect loops can pause off-screen (W8)', () => {
    setup();
    // fail open: everything is visible until the observer says otherwise
    for (const id of Object.keys(TITLES)) expect(screen.getByTestId(`visible-${id}`)).toHaveTextContent('true');

    reportVisibility('section-projects', false);
    expect(screen.getByTestId('visible-projects')).toHaveTextContent('false');
    expect(screen.getByTestId('visible-home')).toHaveTextContent('true');
    expect(screen.getByTestId('visible-contact')).toHaveTextContent('true');

    reportVisibility('section-projects', true);
    expect(screen.getByTestId('visible-projects')).toHaveTextContent('true');
  });

  it('flags an off-screen section (data-offscreen) so its CSS keyframes can pause too', () => {
    setup();
    const section = document.getElementById('section-projects') as HTMLElement;
    expect(section).not.toHaveAttribute('data-offscreen');

    reportVisibility('section-projects', false);
    expect(section).toHaveAttribute('data-offscreen');
    expect(document.getElementById('section-home')).not.toHaveAttribute('data-offscreen');

    reportVisibility('section-projects', true);
    expect(section).not.toHaveAttribute('data-offscreen');
  });

  it('keeps a paused section mounted and reachable: pausing is not unmounting', () => {
    setup();
    reportVisibility('section-projects', false);
    expect(screen.getByRole('heading', { name: 'Projects headline' })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getAllByRole('region')).toHaveLength(5);
  });

  it('puts the pill nav before <main> in DOM order, so it is the first Tab stop and landmark', () => {
    setup();
    const nav = screen.getByRole('navigation', { name: 'Screens' });
    const main = screen.getByRole('main');
    expect(nav.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('a pill activation scrolls THAT section to the top, focuses ITS heading and announces it', async () => {
    const user = userEvent.setup();
    const { container } = setup();

    await user.click(screen.getByRole('button', { name: 'Projects' }));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('section-projects'));

    expect(screen.getByRole('heading', { name: 'Projects headline' })).toHaveFocus();
    expect(liveRegion(container)).toHaveTextContent('Projects.');
    expect(screen.getByRole('button', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
  });

  it('scrolls without animation under prefers-reduced-motion (function is never gated on motion)', async () => {
    const user = userEvent.setup();
    setup(true);

    await user.click(screen.getByRole('button', { name: 'Contact' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    expect(screen.getByRole('heading', { name: 'Reach out' })).toHaveFocus();
  });

  it('a scroll-driven section change only moves the pill highlight -- no focus move, no announcement', () => {
    const { container } = setup();
    const before = document.activeElement;
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

    reportIntersecting('section-distinction');

    expect(screen.getByRole('button', { name: 'Distinctions' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(document.activeElement).toBe(before);
    expect(liveRegion(container)).toBeEmptyDOMElement();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('screens can trigger the same explicit activation (Home list / Profile CTA) and can read the active section', async () => {
    const user = userEvent.setup();
    const { container } = setup();
    expect(screen.getByTestId('home-sees-active')).toHaveTextContent('home');

    await user.click(screen.getByRole('button', { name: 'in-page link to contact' }));

    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('section-contact'));
    expect(screen.getByRole('heading', { name: 'Reach out' })).toHaveFocus();
    expect(liveRegion(container)).toHaveTextContent('Contact.');

    reportIntersecting('section-contact');
    expect(screen.getByTestId('home-sees-active')).toHaveTextContent('contact');
  });

  describe('URL hash deep links', () => {
    it('loading with #projects scrolls INSTANTLY to that section, then focuses its heading and announces it', () => {
      const { container } = setup(false, '#projects');

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
      expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('section-projects'));
      expect(screen.getByRole('heading', { name: 'Projects headline' })).toHaveFocus();
      expect(liveRegion(container)).toHaveTextContent('Projects.');
      expect(screen.getByRole('button', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
    });

    it('the load scroll is instant even under prefers-reduced-motion, and does not push history', () => {
      const push = vi.spyOn(window.history, 'pushState');
      setup(true, '#contact');
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
      expect(push).not.toHaveBeenCalled();
      expect(window.location.hash).toBe('#contact');
    });

    it('#distinctions reaches the Distinctions section', () => {
      setup(false, '#distinctions');
      expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('section-distinction'));
    });

    it.each(['', '#', '#foo', '#section-projects', '#/profile'])(
      'the empty/unknown hash %j stays on Home: no scroll, no focus move, no announcement, no error',
      (hash) => {
        const before = document.activeElement;
        const { container } = setup(false, hash);

        expect(scrollIntoView).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(before);
        expect(liveRegion(container)).toBeEmptyDOMElement();
        expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
      },
    );

    it('an explicit pill activation pushes the section hash', async () => {
      const user = userEvent.setup();
      const push = vi.spyOn(window.history, 'pushState');
      setup();

      await user.click(screen.getByRole('button', { name: 'Projects' }));

      expect(push).toHaveBeenCalledTimes(1);
      expect(window.location.hash).toBe('#projects');
    });

    it('an in-page link activation (Home list / Profile CTA path) pushes the hash too', async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole('button', { name: 'in-page link to contact' }));
      expect(window.location.hash).toBe('#contact');
    });

    it('activating the section the URL already names does not push a duplicate entry (but still scrolls)', async () => {
      const user = userEvent.setup();
      setup(false, '#projects');
      scrollIntoView.mockClear();
      const push = vi.spyOn(window.history, 'pushState');

      await user.click(screen.getByRole('button', { name: 'Projects' }));

      expect(push).not.toHaveBeenCalled();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('a scroll-driven section change never touches the hash, history, focus or live text', () => {
      const push = vi.spyOn(window.history, 'pushState');
      const replace = vi.spyOn(window.history, 'replaceState');
      const { container } = setup(false, '#profile');
      reportIntersecting('section-profile'); // the load scroll arrives; the pill lock releases
      scrollIntoView.mockClear();
      replace.mockClear();
      const focused = document.activeElement;

      reportIntersecting('section-projects');
      reportIntersecting('section-contact');

      expect(window.location.hash).toBe('#profile');
      expect(push).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(focused);
      expect(liveRegion(container)).toHaveTextContent('Profile.');
      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Contact' })).toHaveAttribute('aria-current', 'page');
    });

    it('back/forward (popstate) scrolls SMOOTHLY to the hash section, focuses + announces it, and never pushes again', () => {
      const push = vi.spyOn(window.history, 'pushState');
      const { container } = setup();

      act(() => {
        setHash('#distinctions');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
      expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('section-distinction'));
      expect(screen.getByRole('heading', { name: 'Distinctions' })).toHaveFocus();
      expect(liveRegion(container)).toHaveTextContent('Distinctions.');
      expect(push).not.toHaveBeenCalled();
    });

    it('a manual hash edit (hashchange) scrolls without animation under prefers-reduced-motion, no push', () => {
      const push = vi.spyOn(window.history, 'pushState');
      setup(true);

      act(() => {
        setHash('#contact');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
      expect(push).not.toHaveBeenCalled();
    });

    it('going back to an empty hash returns to Home', () => {
      setup(false, '#projects');
      scrollIntoView.mockClear();

      act(() => {
        setHash('');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('section-home'));
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    });

    it('a hash-driven scroll locks the pill highlight on the target like a pill click does', () => {
      setup();

      act(() => {
        setHash('#contact');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      // the animation passes over Projects on the way: the highlight must not flicker there
      reportIntersecting('section-projects');
      expect(screen.getByRole('button', { name: 'Contact' })).toHaveAttribute('aria-current', 'page');

      reportIntersecting('section-contact');
      reportIntersecting('section-projects'); // lock released on arrival: scroll-driven changes flow again
      expect(screen.getByRole('button', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
    });
  });
});
