import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScanModal from './ScanModal';

// The lightbox is `position: fixed` (distinctions.css). Inside the scrolling
// stage's `transform: scale()` a fixed element is positioned against the
// TRANSFORMED ANCESTOR, not the viewport -- i.e. against the whole ~4500px
// stack of sections, centering the dialog at ~y=2250 (off-screen). Rendering
// it through a portal on <body> escapes the transform. jsdom has no layout,
// so the meaningful, testable contract is the DOM ancestry.
describe('ScanModal placement', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the open dialog on <body>, outside the (transformed) tree that hosts it', () => {
    const { container } = render(
      <div data-testid="transformed-host">
        <ScanModal
          isOpen
          title="AWS Cloud Practitioner"
          meta="2024"
          imageAlt=""
          onClose={() => {}}
        />
      </div>,
    );

    const dialog = screen.getByRole('dialog', { name: 'AWS Cloud Practitioner' });
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.closest('.distinctions-modal-overlay')?.parentElement).toBe(document.body);
  });

  it('renders nothing (anywhere) while closed', () => {
    render(
      <ScanModal
        isOpen={false}
        title="AWS Cloud Practitioner"
        meta="2024"
        imageAlt=""
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

// The docs/04 / docs/05 dialog contract, pinned here so extending the modal
// (e.g. the "Open full size" link) can't quietly loosen it. Focus RESTORE to the
// triggering cell is owned by Distinctions.tsx (it holds the trigger ref) and is
// covered end to end by e2e/smoke.spec.ts, not here.
describe('ScanModal dialog contract', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function setup(props: Partial<ComponentProps<typeof ScanModal>> = {}) {
    const onClose = vi.fn();
    render(
      <ScanModal
        isOpen
        title="AWS Cloud Practitioner"
        meta="2024"
        imageSrc="/personal-portfolio/assets/scan.png"
        imageAlt="Scan of the certificate"
        onClose={onClose}
        {...props}
      />,
    );
    return { onClose, dialog: screen.getByRole('dialog', { name: 'AWS Cloud Practitioner' }) };
  }

  const closeButton = () => screen.getByRole('button', { name: 'Close scan viewer' });

  it('is a modal dialog labelled by its title', () => {
    const { dialog } = setup();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'distinctions-modal-title');
    expect(document.getElementById('distinctions-modal-title')).toHaveTextContent(
      'AWS Cloud Practitioner',
    );
  });

  it('moves focus to the close button on open', () => {
    setup();
    expect(closeButton()).toHaveFocus();
  });

  it('closes on Escape', () => {
    const { onClose } = setup();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on an overlay click but not on a click inside the dialog', () => {
    const { onClose, dialog } = setup();
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(dialog.closest('.distinctions-modal-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab and Shift+Tab inside the dialog', () => {
    setup({ imageSrc: undefined });
    // Placeholder branch: the close button is the only focusable element, so it is both first and last.
    const close = closeButton();
    const tab = fireEvent.keyDown(window, { key: 'Tab' });
    expect(tab).toBe(false); // preventDefault() was called: focus is held, not released to the page
    expect(close).toHaveFocus();
    const shiftTab = fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(shiftTab).toBe(false);
    expect(close).toHaveFocus();
  });

  describe('Open full size link', () => {
    const link = () => screen.getByRole('link', { name: /Open full size/ });

    it('points at the scan in a new tab, without leaking the opener', () => {
      setup();
      expect(link()).toHaveAttribute('href', '/personal-portfolio/assets/scan.png');
      expect(link()).toHaveAttribute('target', '_blank');
      expect(link().getAttribute('rel')).toMatch(/noopener/);
    });

    it('announces that it opens a new tab, with the arrow hidden from assistive tech', () => {
      setup();
      const hidden = link().querySelector('[aria-hidden="true"]');
      expect(hidden).toHaveTextContent('↗');
      expect(link().querySelector('.sr-only')).toHaveTextContent('(opens in new tab)');
    });

    it('is not rendered in the placeholder branch (no scan)', () => {
      setup({ imageSrc: undefined });
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('keeps initial focus on the close button, not the link', () => {
      setup();
      expect(closeButton()).toHaveFocus();
    });

    it('is inside the Tab trap: order is [link, close], both ends wrap', () => {
      setup();
      const focusable = Array.from(
        screen
          .getByRole('dialog')
          .querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'),
      );
      expect(focusable).toEqual([link(), closeButton()]);

      // Tab from the last (close) wraps to the first (link).
      expect(fireEvent.keyDown(window, { key: 'Tab' })).toBe(false);
      expect(link()).toHaveFocus();
      // Shift+Tab from the first (link) wraps to the last (close).
      expect(fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })).toBe(false);
      expect(closeButton()).toHaveFocus();
    });
  });
});
