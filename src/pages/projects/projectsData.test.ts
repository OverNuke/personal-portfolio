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

// Pins the mockup-verbatim EN copy so a metadata sync cannot silently
// rewrite it. `name` is NOT localized (the project's own brand/slug name,
// a proper noun -- design's File Changes table lists metaLine/eyebrowLabel/
// title/description/annotation/photoAlt as localized, `name` is absent from
// that list on purpose). `tags` are proper nouns (tech names), also plain
// strings, unchanged from before Phase 4.3.
describe('PROJECTS mockup copy (en)', () => {
  it('keeps the three projects in order', () => {
    expect(PROJECTS.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it.each([
    ['p1', 'barbershop', 'web-dev final · 2025', ['Express', 'JavaScript', 'Docker', 'MySQL']],
    ['p2', 'acopiatech', 'routing · 2025', ['Flutter', 'Dart', 'Firebase', 'Maps API']],
    ['p3', 'odoo module', 'private · 2025', ['Odoo', 'Python', 'PostgreSQL']],
  ])('%s keeps its name, meta line (en) and tags', (id, name, metaLine, tags) => {
    const project = byId(id);
    expect(project.name).toBe(name);
    expect(project.metaLine.en).toBe(metaLine);
    expect(project.tags).toEqual(tags);
  });

  it.each([
    [
      'p1',
      'Barbershop',
      'Employee and appointment records, built end to end for the web development course — full CRUD, containerised, shipped to production.',
      'Focus on backend logic, but involved in all steps of the development lifecycle',
    ],
    [
      'p2',
      'Acopiatech',
      'Mobile app for e-waste donation and collection routing, field-tested on local routes.',
      'We actually did it! Got third place in the ANFECA 2025!',
    ],
    [
      'p3',
      'Odoo Custom Module',
      'Document management module built for a local company, folded into their existing ERP.',
      'Giving maintenance and new features to a private codebase, with no public repository',
    ],
  ])('%s keeps its title, description and annotation (en)', (id, title, description, annotation) => {
    const project = byId(id);
    expect(project.title.en).toBe(title);
    expect(project.description.en).toBe(description);
    expect(project.annotation.text.en).toBe(annotation);
  });
});

// Phase 4.3: metaLine/eyebrowLabel/title/description/annotation.text/
// photoAlt became `Localized<string>`.
describe('Phase 4.3: every project is localized', () => {
  it('has non-empty metaLine/eyebrowLabel/title/description/annotation.text/photoAlt in both locales', () => {
    expect(PROJECTS).toHaveLength(3);
    for (const project of PROJECTS) {
      expect(project.metaLine.en.length, `${project.id}.metaLine.en`).toBeGreaterThan(0);
      expect(project.metaLine.es.length, `${project.id}.metaLine.es`).toBeGreaterThan(0);
      expect(project.eyebrowLabel.en.length, `${project.id}.eyebrowLabel.en`).toBeGreaterThan(0);
      expect(project.eyebrowLabel.es.length, `${project.id}.eyebrowLabel.es`).toBeGreaterThan(0);
      expect(project.title.en.length, `${project.id}.title.en`).toBeGreaterThan(0);
      expect(project.title.es.length, `${project.id}.title.es`).toBeGreaterThan(0);
      expect(project.description.en.length, `${project.id}.description.en`).toBeGreaterThan(0);
      expect(project.description.es.length, `${project.id}.description.es`).toBeGreaterThan(0);
      expect(project.annotation.text.en.length, `${project.id}.annotation.en`).toBeGreaterThan(0);
      expect(project.annotation.text.es.length, `${project.id}.annotation.es`).toBeGreaterThan(0);
      expect(project.photoAlt.en.length, `${project.id}.photoAlt.en`).toBeGreaterThan(0);
      expect(project.photoAlt.es.length, `${project.id}.photoAlt.es`).toBeGreaterThan(0);
    }
  });

  // `name` stays a plain, unlocalized string (proper noun / project slug).
  it('does not localize `name` -- it stays a plain proper-noun string', () => {
    for (const project of PROJECTS) {
      expect(typeof project.name).toBe('string');
    }
  });

  // Tags are proper nouns (tech/tool names): plain strings, identical
  // regardless of locale (no `Localized` wrapper -- there is nothing to pick).
  it('keeps every tag a plain proper-noun string, unaffected by locale', () => {
    for (const project of PROJECTS) {
      for (const tag of project.tags) {
        expect(typeof tag).toBe('string');
      }
    }
  });

  it('keeps proper-noun titles (Barbershop, Acopiatech) byte-identical across locales', () => {
    expect(byId('p1').title.es).toBe('Barbershop');
    expect(byId('p2').title.es).toBe('Acopiatech');
  });

  it('translates the generic English words in Odoo\'s title and the eyebrow labels', () => {
    expect(byId('p3').title.es).toBe('Módulo Personalizado de Odoo');
    expect(byId('p1').eyebrowLabel.es).toBe('backend');
    expect(byId('p2').eyebrowLabel.es).toBe('móvil');
    expect(byId('p3').eyebrowLabel.es).toBe('módulo');
  });

  it('translates each metaLine', () => {
    expect(byId('p1').metaLine.es).toBe('proyecto final · 2025');
    expect(byId('p2').metaLine.es).toBe('rutas · 2025');
    expect(byId('p3').metaLine.es).toBe('privado · 2025');
  });

  it('translates each description into natural, neutral LatAm Spanish', () => {
    expect(byId('p1').description.es).toBe(
      'Registro de empleados y citas, construido de principio a fin para el curso de desarrollo web — CRUD completo, contenerizado y llevado a producción.',
    );
    expect(byId('p2').description.es).toBe(
      'Aplicación móvil para donación y recolección de residuos electrónicos, probada en rutas reales.',
    );
    expect(byId('p3').description.es).toBe(
      'Módulo de gestión documental construido para una empresa local, integrado a su ERP existente.',
    );
  });

  it('translates each annotation', () => {
    expect(byId('p1').annotation.text.es).toBe(
      'Enfocado en la lógica del backend, pero involucrado en todas las etapas del ciclo de desarrollo',
    );
    expect(byId('p2').annotation.text.es).toBe('¡Lo logramos! Tercer lugar en ANFECA 2025');
    expect(byId('p3').annotation.text.es).toBe(
      'Dando mantenimiento y nuevas funciones a un código privado, sin repositorio público',
    );
  });

  it('translates each photoAlt, keeping the project brand name untranslated', () => {
    expect(byId('p1').photoAlt.es).toBe('Pantalla de registro de empleados de Barbershop');
    expect(byId('p2').photoAlt.es).toBe('Pantalla de solicitud de recolección de Acopiatech');
    expect(byId('p3').photoAlt.es).toBe('Pantalla de grupos de acceso a documentos de Odoo');
  });
});
