import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLang } from '../../test/renderWithLang';
import ProjectCard from './ProjectCard';
import { PROJECTS } from './projectsData';

// ProjectCard is render-only (no refs/effects), so it mounts in plain jsdom;
// the focus binder is a no-op stand-in for useCardHover's `bindFocus`.
// Phase 4.3: ProjectCard now calls `useLang()` for its own chrome strings
// (Repository/private repository/flagship) and to `pick()` per-item
// `Localized<string>` content, so it needs a `LangProvider` -- same
// migration ScanModal/VoronoiCellField needed in Phase 4.2.
const bindFocus = () => ({ onFocus: () => {}, onBlur: () => {} });

function renderCard(id: string, lang: 'en' | 'es' = 'en') {
  const project = PROJECTS.find((p) => p.id === id);
  if (!project) throw new Error(`missing project ${id}`);
  return renderWithLang(<ProjectCard project={project} bindFocus={bindFocus} />, { lang });
}

describe('ProjectCard repository link', () => {
  it.each([
    ['p1', 'https://github.com/Sinhularity/barbershop'],
    ['p2', 'https://github.com/Sinhularity/acopiatech-app'],
  ])('%s renders an external link that opens in a new tab', (id, href) => {
    renderCard(id);
    const link = screen.getByRole('link', { name: /repository/i });
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows the private label and no link for the Odoo project', () => {
    renderCard('p3');
    expect(screen.getByText('private repository')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

// Phase 4.3: title/description/annotation/eyebrowLabel/metaLine/photoAlt
// became `Localized<string>`, and the static chrome strings (Repository/
// private repository/flagship) now come from the dictionary via
// ProjectCard's own `useLang()` call.
describe('ProjectCard localized content (Phase 4.3, es)', () => {
  it('renders p3 (flagship-free, private) fully in es: title, description, annotation, eyebrow, meta, private label', () => {
    renderCard('p3', 'es');
    const odoo = PROJECTS.find((p) => p.id === 'p3')!;
    expect(screen.getByRole('heading', { name: odoo.title.es })).toBeInTheDocument();
    expect(screen.getByText(odoo.description.es)).toBeInTheDocument();
    expect(screen.getByText(odoo.annotation.text.es)).toBeInTheDocument();
    expect(screen.getByText(odoo.eyebrowLabel.es)).toBeInTheDocument();
    expect(screen.getByText(odoo.metaLine.es)).toBeInTheDocument();
    expect(screen.getByText('repositorio privado')).toBeInTheDocument();
    expect(screen.getByAltText(odoo.photoAlt.es)).toBeInTheDocument();
  });

  it('renders the flagship badge and the repository link text in es', () => {
    renderCard('p1', 'es');
    expect(screen.getByText('destacado')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Repositorio/ });
    expect(link).toHaveAttribute('href', 'https://github.com/Sinhularity/barbershop');
  });

  it('keeps proper-noun tags and the plain project name unchanged in es', () => {
    renderCard('p1', 'es');
    for (const tag of ['Express', 'JavaScript', 'Docker', 'MySQL']) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
    expect(screen.getByText('barbershop')).toBeInTheDocument();
  });
});
