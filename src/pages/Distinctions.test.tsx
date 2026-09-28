import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installLayoutStubs, restoreLayoutStubs } from '../test/layoutStubs';
import { renderWithLang } from '../test/renderWithLang';
import { useLang } from '../shell/LangContext';
import { CERTIFICATIONS_BY_ID } from './distinctions/distinctionsData';
import Distinctions from './Distinctions';

// Spec `i18n-foundation` / "Site-wide toggle availability": toggling from a
// non-Home section must update visible strings without a reload. This probe
// stands in for the real pill-chrome toggle (Shell/PillNav, tested
// separately) -- it shares the same LangProvider as Distinctions via
// renderWithLang, so `setLang` here is the exact mechanism the real toggle
// calls.
function LangToggleProbe() {
  const { setLang } = useLang();
  return (
    <button type="button" onClick={() => setLang('es')}>
      switch-to-es
    </button>
  );
}

describe('Distinctions (Phase 4.2 localization, toggled from this section)', () => {
  beforeEach(() => installLayoutStubs({ reducedMotion: true }));
  afterEach(() => restoreLayoutStubs());

  it('flips the heading from en to es on toggle, without remounting', async () => {
    const user = userEvent.setup();
    renderWithLang(
      <>
        <LangToggleProbe />
        <Distinctions />
      </>,
    );
    expect(screen.getByRole('heading', { name: 'Distinctions' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'switch-to-es' }));

    expect(screen.getByRole('heading', { name: 'Distinciones' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Distinctions' })).toBeNull();
  });

  it('opens a cert cell and shows the lightbox title/meta/imageAlt in es after toggling', async () => {
    const user = userEvent.setup();
    renderWithLang(
      <>
        <LangToggleProbe />
        <Distinctions />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'switch-to-es' }));

    const anfeca = CERTIFICATIONS_BY_ID.anfeca;
    await user.click(
      screen.getByRole('button', { name: `Ver documento — ${anfeca.title.es}` }),
    );

    const dialog = screen.getByRole('dialog', { name: anfeca.title.es });
    expect(dialog).toHaveTextContent(anfeca.lightboxMeta.es);
    // The scan image is portaled to <body> (ScanModal), outside the render
    // container -- `screen` queries the whole document, `container` doesn't.
    expect(screen.getByAltText(`Documento de ${anfeca.title.es}`)).toBeInTheDocument();
  });

  it('keeps painting real cell geometry after a locale toggle (no blank/frozen colony)', async () => {
    const user = userEvent.setup();
    const { container } = renderWithLang(
      <>
        <LangToggleProbe />
        <Distinctions />
      </>,
    );
    const pathBefore = container.querySelector('path[data-cid="anfeca"]') as SVGPathElement;
    expect(pathBefore.getAttribute('d')?.length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'switch-to-es' }));

    const pathAfter = container.querySelector('path[data-cid="anfeca"]') as SVGPathElement;
    expect(pathAfter.getAttribute('d')?.length).toBeGreaterThan(0);
  });
});
