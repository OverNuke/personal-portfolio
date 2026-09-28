import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installLayoutStubs, restoreLayoutStubs } from '../test/layoutStubs';
import { renderWithLang } from '../test/renderWithLang';
import { CHAMBERS, chamberAriaLabel } from './profile/chambersData';
import Profile from './Profile';

// Phase 4.1: headline/bio/footer note/CTA/status text, plus each chamber's
// dot labels and status word, must localize. The chamber `ariaLabel`
// wiring itself was already done in Phase 3 -- not re-tested here.
// `installLayoutStubs` supplies the `matchMedia` jsdom lacks -- InkBloomCanvas's
// `usePrefersReducedMotion` calls it on mount (same as Home.test.tsx).
describe('Profile content (Phase 4.1)', () => {
  beforeEach(() => installLayoutStubs());
  afterEach(() => restoreLayoutStubs());

  it('renders the en headline/bio/footer note/CTA/status text', () => {
    renderWithLang(<Profile />);
    expect(screen.getByRole('heading', { name: /Junior\s*software\s*engineer/ })).toBeInTheDocument();
    expect(screen.getByText(/Universidad Veracruzana/)).toBeInTheDocument();
    expect(screen.getByText('Always learning · open to travel')).toBeInTheDocument();
    expect(screen.getByText('Get in touch →')).toBeInTheDocument();
    expect(screen.getByText('Looking for an opportunity')).toBeInTheDocument();
  });

  it('renders the es headline/bio/footer note/CTA/status text', () => {
    renderWithLang(<Profile />, { lang: 'es' });
    expect(
      screen.getByRole('heading', { name: /Ingeniero\s*de software\s*junior/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Universidad Veracruzana/)).toBeInTheDocument();
    expect(screen.getByText('Siempre aprendiendo · disponible para viajar')).toBeInTheDocument();
    expect(screen.getByText('Contáctame →')).toBeInTheDocument();
    expect(screen.getByText('En búsqueda de una oportunidad')).toBeInTheDocument();
  });

  it("keeps each chamber's ariaLabel wired (Phase 3), unaffected by Phase 4.1 content", () => {
    renderWithLang(<Profile />, { lang: 'es' });
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(CHAMBERS.length);
    CHAMBERS.forEach((chamber, index) => {
      expect(buttons[index]).toHaveAttribute('aria-label', chamberAriaLabel(chamber, 'es'));
    });
  });

  it('renders every dot label from the localized dictionary, not the raw Localized object', () => {
    renderWithLang(<Profile />, { lang: 'es' });
    // Chamber 04 (Spoken languages): a real es translation.
    expect(screen.getByText('Español')).toBeInTheDocument();
    expect(screen.getByText('Inglés B1+')).toBeInTheDocument();
    // Chamber 01 (Programming languages): proper nouns stay identical.
    expect(screen.getByText('Java')).toBeInTheDocument();
  });

  it('renders the chamber status word from the dictionary (aria-hidden corner label)', () => {
    const { container } = renderWithLang(<Profile />, { lang: 'es' });
    const statusEls = container.querySelectorAll('.profile-chamber__status');
    expect(statusEls).toHaveLength(CHAMBERS.length);
    statusEls.forEach((el) => expect(el).toHaveTextContent('separado'));
  });
});
