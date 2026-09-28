import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installLayoutStubs, restoreLayoutStubs } from '../test/layoutStubs';
import { renderWithLang } from '../test/renderWithLang';
import Home from './Home';

// Home has no SectionNavContext.Provider here -- its default value (docs:
// SectionNavContext.tsx) is inert (`goToSection: () => {}`), which is enough
// for these label/landmark assertions; no test in this file clicks a list
// item to prove navigation (Shell.test.tsx's stand-in pages already cover
// that path end to end). `installLayoutStubs` supplies the `matchMedia` jsdom
// lacks -- InkFlowBackground's `usePrefersReducedMotion` calls it on mount.
describe('Home', () => {
  beforeEach(() => installLayoutStubs());
  afterEach(() => restoreLayoutStubs());

  it('renders its numbered list labels from the dictionary (t.nav.homeList) in en', () => {
    renderWithLang(<Home />);
    const nav = within(screen.getByRole('navigation', { name: 'Sections' }));
    expect(nav.getAllByRole('link').map((link) => link.textContent?.replace(/\d+/, '').trim())).toEqual(
      ['Who me?→', 'Distinction→', 'Projects→', 'Reach out→'],
    );
  });

  it('renders the Spanish list labels and landmark names when mounted in the es locale', () => {
    renderWithLang(<Home />, { lang: 'es' });
    const nav = within(screen.getByRole('navigation', { name: 'Secciones' }));
    expect(nav.getAllByRole('link').map((link) => link.textContent?.replace(/\d+/, '').trim())).toEqual(
      ['¿Yo?→', 'Distinción→', 'Proyectos→', 'Contacto→'],
    );
    expect(screen.getByRole('group', { name: 'Idioma' })).toBeInTheDocument();
  });

  it("the EN/ES toggle's own group aria-label is translated too", () => {
    renderWithLang(<Home />);
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
  });

  it('clicking ES on Home\'s own toggle switches its list to Spanish', async () => {
    const user = userEvent.setup();
    renderWithLang(<Home />);

    await user.click(screen.getByRole('button', { name: 'ES' }));

    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /¿Yo\?/ })).toBeInTheDocument();
  });
});
