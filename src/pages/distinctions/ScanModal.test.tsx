import { render, screen } from '@testing-library/react';
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
        <ScanModal isOpen title="AWS Cloud Practitioner" meta="2024" imageAlt="" onClose={() => {}} />
      </div>,
    );

    const dialog = screen.getByRole('dialog', { name: 'AWS Cloud Practitioner' });
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.closest('.distinctions-modal-overlay')?.parentElement).toBe(document.body);
  });

  it('renders nothing (anywhere) while closed', () => {
    render(<ScanModal isOpen={false} title="AWS Cloud Practitioner" meta="2024" imageAlt="" onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
