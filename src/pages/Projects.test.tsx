import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installLayoutStubs, restoreLayoutStubs } from '../test/layoutStubs';
import { renderWithLang } from '../test/renderWithLang';
import { PROJECTS } from './projects/projectsData';
import Projects from './Projects';

// Phase 4.3: the visually-hidden real `<h2>Projects</h2>` (NOT the decorative
// `StrokeGlyphTitle` SVG glyph, out of scope per the change's explicit
// exclusions) and the "selected work" eyebrow are the page-level strings this
// screen owns; per-card content is covered by ProjectCard.test.tsx.
// `installLayoutStubs` supplies `matchMedia` for `useCardHover`/`CrayonMascot`'s
// `usePrefersReducedMotion` calls on mount.
describe('Projects page content (Phase 4.3)', () => {
  beforeEach(() => installLayoutStubs());
  afterEach(() => restoreLayoutStubs());

  it('renders the real (visually-hidden) en heading and eyebrow', () => {
    renderWithLang(<Projects />);
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText('selected work')).toBeInTheDocument();
  });

  it('renders the es heading and eyebrow, without touching the decorative glyph', () => {
    renderWithLang(<Projects />, { lang: 'es' });
    expect(screen.getByRole('heading', { name: 'Proyectos' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Projects' })).toBeNull();
    expect(screen.getByText('trabajo seleccionado')).toBeInTheDocument();
  });

  it('renders every project title in es, proving the page wires per-card localization end to end', () => {
    renderWithLang(<Projects />, { lang: 'es' });
    for (const project of PROJECTS) {
      expect(screen.getByText(project.title.es)).toBeInTheDocument();
    }
  });
});
