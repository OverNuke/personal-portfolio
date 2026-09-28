import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installLayoutStubs, restoreLayoutStubs } from '../test/layoutStubs';
import { renderWithLang } from '../test/renderWithLang';
import Contact from './Contact';

// Phase 4.4: headline/status/quote are page-level dictionary copy;
// per-channel content is covered by Dock.test.tsx/channels.test.ts.
// `installLayoutStubs` supplies `matchMedia` for Dock's `useMagneticDock`
// (`usePrefersReducedMotion`) call on mount.
describe('Contact page content (Phase 4.4)', () => {
  beforeEach(() => installLayoutStubs());
  afterEach(() => restoreLayoutStubs());

  it('renders the en headline/status/quote', () => {
    renderWithLang(<Contact />);
    expect(screen.getByRole('heading', { name: 'Reach out' })).toBeInTheDocument();
    expect(screen.getByText('open to work')).toBeInTheDocument();
    expect(screen.getByText('The smallest acts of kindness can change someone’s day.')).toBeInTheDocument();
  });

  it('renders the es headline/status/quote', () => {
    renderWithLang(<Contact />, { lang: 'es' });
    expect(screen.getByRole('heading', { name: 'Contáctame' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Reach out' })).toBeNull();
    expect(screen.getByText('disponible para trabajar')).toBeInTheDocument();
    expect(
      screen.getByText('Los actos más pequeños de bondad pueden cambiar el día de alguien.'),
    ).toBeInTheDocument();
  });

  it('renders the dock with a translated channel label in es, proving end-to-end wiring', () => {
    renderWithLang(<Contact />, { lang: 'es' });
    expect(screen.getByText('Agenda una llamada')).toBeInTheDocument();
  });
});
