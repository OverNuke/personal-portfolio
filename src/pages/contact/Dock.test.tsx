import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installLayoutStubs, restoreLayoutStubs } from '../../test/layoutStubs';
import { renderWithLang } from '../../test/renderWithLang';
import { channels } from './channels';
import Dock from './Dock';

// Phase 4.4: `label`/`ctaLabel`/`detailLines` became `Localized`, resolved
// by Dock's own `useLang()` call. `installLayoutStubs` supplies `matchMedia`
// for `useMagneticDock`'s `usePrefersReducedMotion` call on mount.
describe('Dock localized content (Phase 4.4)', () => {
  beforeEach(() => installLayoutStubs());
  afterEach(() => restoreLayoutStubs());

  it('renders every channel label and ctaLabel in en', () => {
    renderWithLang(<Dock />);
    for (const channel of channels) {
      expect(screen.getByText(channel.label.en)).toBeInTheDocument();
      expect(screen.getByText(channel.ctaLabel.en)).toBeInTheDocument();
    }
  });

  it('renders every channel label and ctaLabel in es, including the one translated label', () => {
    renderWithLang(<Dock />, { lang: 'es' });
    for (const channel of channels) {
      expect(screen.getByText(channel.label.es)).toBeInTheDocument();
      expect(screen.getByText(channel.ctaLabel.es)).toBeInTheDocument();
    }
    expect(screen.getByText('Agenda una llamada')).toBeInTheDocument();
    expect(screen.queryByText('Book a call')).toBeNull();
  });

  it('translates the generic-English detail lines while keeping handles untranslated', () => {
    // Each detail line is a separate text node inside one `.contact-dock__
    // detail` span (joined by a <br/>, no separator text) -- `getByText`
    // can't match a single line's text against the whole span's combined
    // textContent, so this checks each card's detail span's full text.
    const { container } = renderWithLang(<Dock />, { lang: 'es' });
    const detailText = (id: string) =>
      container.querySelector(`.contact-dock__card--${id} .contact-dock__detail`)?.textContent;

    expect(detailText('github')).toBe('@overnukerepositorios');
    expect(detailText('linkedin')).toBe('/keffwontwakeupred · perfil');
    expect(detailText('email')).toBe('ksfgarcia24@gmail.com');
    expect(detailText('github')).not.toContain('repositories');
  });
});
