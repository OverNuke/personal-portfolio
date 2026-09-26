import { describe, expect, it } from 'vitest';
import { PROJECTS } from './projectsData';

const byId = (id: string) => {
  const project = PROJECTS.find((p) => p.id === id);
  if (!project) throw new Error(`missing project ${id}`);
  return project;
};

describe('PROJECTS repository links', () => {
  it('points Barbershop at the real Sinhularity repository', () => {
    expect(byId('p1').repo?.href).toBe('https://github.com/Sinhularity/barbershop');
  });

  it('points AcopiaTech at the real Sinhularity repository', () => {
    expect(byId('p2').repo?.href).toBe('https://github.com/Sinhularity/acopiatech-app');
  });

  it('keeps Odoo private: no repo link, private label present', () => {
    const odoo = byId('p3');
    expect(odoo.repo).toBeUndefined();
    expect(odoo.privateLabel).toBeDefined();
  });

  it('leaves no placeholder in-page `#repo-` anchor anywhere', () => {
    for (const project of PROJECTS) {
      expect(JSON.stringify(project)).not.toContain('#repo-');
    }
  });
});

// Pins the mockup-verbatim copy so a metadata sync cannot silently rewrite it.
describe('PROJECTS mockup copy', () => {
  it('keeps the three projects in order', () => {
    expect(PROJECTS.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it.each([
    ['p1', 'barbershop', 'web-dev final · 2025', ['Express', 'JavaScript', 'Docker', 'MySQL']],
    ['p2', 'acopiatech', 'routing · 2025', ['Flutter', 'Dart', 'Firebase', 'Maps API']],
    ['p3', 'odoo module', 'private · 2025', ['Odoo', 'Python', 'PostgreSQL']],
  ])('%s keeps its name, meta line and tags', (id, name, metaLine, tags) => {
    const project = byId(id);
    expect(project.name).toBe(name);
    expect(project.metaLine).toBe(metaLine);
    expect(project.tags).toEqual(tags);
  });

  it.each([
    [
      'p1',
      'Barbershop',
      'Employee and appointment records, built end to end for the web development course — full CRUD, containerised, shipped to production.',
      'the appointment grid — rebuilt twice before it held',
    ],
    [
      'p2',
      'Acopiatech',
      'Mobile app for e-waste donation and collection routing, field-tested on local routes.',
      'route picker — Maps API doing the heavy lifting',
    ],
    [
      'p3',
      'Odoo Custom Module',
      'Document management module built for a local company, folded into their existing ERP.',
      'document handoff, collapsed into one screen',
    ],
  ])('%s keeps its title, description and annotation', (id, title, description, annotation) => {
    const project = byId(id);
    expect(project.title).toBe(title);
    expect(project.description).toBe(description);
    expect(project.annotation.text).toBe(annotation);
  });
});
