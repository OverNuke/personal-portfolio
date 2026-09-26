import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProjectCard from './ProjectCard';
import { PROJECTS } from './projectsData';

// ProjectCard is render-only (no refs/effects), so it mounts in plain jsdom;
// the focus binder is a no-op stand-in for useCardHover's `bindFocus`.
const bindFocus = () => ({ onFocus: () => {}, onBlur: () => {} });

function renderCard(id: string) {
  const project = PROJECTS.find((p) => p.id === id);
  if (!project) throw new Error(`missing project ${id}`);
  return render(<ProjectCard project={project} bindFocus={bindFocus} />);
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
