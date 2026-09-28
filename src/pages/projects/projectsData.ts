// Real Projects content, verified against
// docs/_decoded/projects-section-v2-standalone/template.html lines 387-465.
// Names, meta lines, tags, descriptions, and annotation copy are quoted
// verbatim from the decoded source -- nothing here is invented.
//
// Repository links: the decoded source's own hrefs were the in-page
// placeholders `#repo-barbershop` / `#repo-acopiatech`. Updated 2026-09-26:
// the real repository URLs (both under the owner's `Sinhularity` GitHub
// account) were migrated from the owner's local metadata file. Odoo has no
// repository link at all -- it is a private codebase (no public repo), so its
// group renders a plain "private repository" label instead (line 461); do
// not invent a URL for it.
//
// Polaroid photo: the decoded template has exactly ONE <image-slot> per
// project (the circular polaroid) -- no second in-card icon/detail image
// slot exists anywhere in this template. Each project's asset folder under
// src/assets/plates/projects/ has 3 screenshots; since only one is ever
// shown, the file below was chosen by matching each <image-slot>'s own
// placeholder text against the screenshots' actual on-screen content
// (judgment call -- see the final report):
// - barbershop: placeholder "Barbershop — employee screen" -> user.png
//   (its own on-screen heading literally reads "Empleado - ID 5").
// - acopiatech: placeholder "Acopiatech — route screen" -> main.png (the
//   app's home/pickup-request screen, the closest of the 3 to a
//   location-aware "route" screen; none of the 3 shows an actual map).
// - odoo: placeholder "Odoo — module screen" -> access.png (a document
//   sharing/access-groups dialog inside the ERP's file manager -- the
//   clearest match for "document management module").
import type { Localized } from '../../i18n/types';
import barbershopPhoto from '../../assets/plates/projects/barbershop/user.png';
import acopiatechPhoto from '../../assets/plates/projects/acopiatech/main.png';
import odooPhoto from '../../assets/plates/projects/odoo/access.png';

export type ProjectMarkId = 'p1' | 'p2' | 'p3';

export interface ProjectRepo {
  href: string;
  left: number;
  top: number;
  /** Blob-morph target for :hover/:focus-visible, verified at template.html
   *  lines 432/447 -- the CARD itself does not blob-morph on hover in the
   *  decoded source (only this pill link does; see projects.css comment). */
  hoverRadius: string;
}

export interface ProjectData {
  id: ProjectMarkId;
  /** The project's own brand/slug name (e.g. "barbershop") -- a proper
   *  noun, deliberately NOT `Localized` (Phase 4.3, design's File Changes
   *  table). */
  name: string;
  metaLine: Localized<string>;
  photo: string;
  photoAlt: Localized<string>;
  rotation: number;
  lift: number;
  cardZIndex: number;
  photoSize: number;
  cardWidth: number;
  left: number;
  top: number;
  flagship?: boolean;
  eyebrowIndex: string;
  eyebrowLabel: Localized<string>;
  title: Localized<string>;
  titleFontSize: number;
  description: Localized<string>;
  descriptionFontSize: number;
  copyLeft: number;
  copyTop: number;
  copyWidth: number;
  /** Tech/tool names -- proper nouns, plain strings identical regardless of
   *  locale (Phase 4.3: never wrapped in `Localized`, nothing to pick). */
  tags: string[];
  tagsLeft: number;
  tagsTop: number;
  tagsWidth?: number;
  repo?: ProjectRepo;
  privateLabel?: { left: number; top: number; width: number };
  annotation: { text: Localized<string>; left: number; top: number; width: number };
}

export const PROJECTS: ProjectData[] = [
  {
    id: 'p1',
    name: 'barbershop',
    metaLine: { en: 'web-dev final · 2025', es: 'proyecto final · 2025' },
    photo: barbershopPhoto,
    photoAlt: {
      en: 'Barbershop employee record screen',
      es: 'Pantalla de registro de empleados de Barbershop',
    },
    rotation: -2.2,
    lift: 9,
    cardZIndex: 8,
    photoSize: 276,
    cardWidth: 320,
    left: 76,
    top: 232,
    flagship: true,
    eyebrowIndex: '01',
    eyebrowLabel: { en: 'backend', es: 'backend' },
    title: { en: 'Barbershop', es: 'Barbershop' },
    titleFontSize: 42,
    description: {
      en: 'Employee and appointment records, built end to end for the web development course — full CRUD, containerised, shipped to production.',
      es: 'Registro de empleados y citas, construido de principio a fin para el curso de desarrollo web — CRUD completo, contenerizado y llevado a producción.',
    },
    descriptionFontSize: 14,
    copyLeft: 76,
    copyTop: 620,
    copyWidth: 400,
    tags: ['Express', 'JavaScript', 'Docker', 'MySQL'],
    tagsLeft: 76,
    tagsTop: 772,
    repo: {
      href: 'https://github.com/Sinhularity/barbershop',
      left: 76,
      top: 824,
      hoverRadius: '62% 38% 55% 45% / 45% 60% 40% 55%',
    },
    annotation: {
      text: {
        en: 'Focus on backend logic, but involved in all steps of the development lifecycle',
        es: 'Enfocado en la lógica del backend, pero involucrado en todas las etapas del ciclo de desarrollo',
      },
      left: 430,
      top: 300,
      width: 150,
    },
  },
  {
    id: 'p2',
    name: 'acopiatech',
    metaLine: { en: 'routing · 2025', es: 'rutas · 2025' },
    photo: acopiatechPhoto,
    photoAlt: {
      en: 'Acopiatech pickup request screen',
      es: 'Pantalla de solicitud de recolección de Acopiatech',
    },
    rotation: 2.4,
    lift: 9,
    cardZIndex: 8,
    photoSize: 224,
    cardWidth: 264,
    left: 648,
    top: 120,
    eyebrowIndex: '02',
    eyebrowLabel: { en: 'mobile', es: 'móvil' },
    title: { en: 'Acopiatech', es: 'Acopiatech' },
    titleFontSize: 30,
    description: {
      en: 'Mobile app for e-waste donation and collection routing, field-tested on local routes.',
      es: 'Aplicación móvil para donación y recolección de residuos electrónicos, probada en rutas reales.',
    },
    descriptionFontSize: 13.5,
    copyLeft: 600,
    copyTop: 470,
    copyWidth: 204,
    tags: ['Flutter', 'Dart', 'Firebase', 'Maps API'],
    tagsLeft: 600,
    tagsTop: 626,
    tagsWidth: 210,
    repo: {
      href: 'https://github.com/Sinhularity/acopiatech-app',
      left: 600,
      top: 704,
      hoverRadius: '55% 45% 62% 38% / 40% 55% 45% 60%',
    },
    annotation: {
      text: {
        en: 'We actually did it! Got third place in the ANFECA 2025!',
        es: '¡Lo logramos! Tercer lugar en ANFECA 2025',
      },
      left: 952,
      top: 142,
      width: 170,
    },
  },
  {
    id: 'p3',
    name: 'odoo module',
    metaLine: { en: 'private · 2025', es: 'privado · 2025' },
    photo: odooPhoto,
    photoAlt: {
      en: 'Odoo document access-groups screen',
      es: 'Pantalla de grupos de acceso a documentos de Odoo',
    },
    rotation: -1.6,
    lift: 9,
    cardZIndex: 9,
    photoSize: 210,
    cardWidth: 250,
    left: 820,
    top: 372,
    eyebrowIndex: '03',
    eyebrowLabel: { en: 'module', es: 'módulo' },
    title: { en: 'Odoo Custom Module', es: 'Módulo Personalizado de Odoo' },
    titleFontSize: 30,
    description: {
      en: 'Document management module built for a local company, folded into their existing ERP.',
      es: 'Módulo de gestión documental construido para una empresa local, integrado a su ERP existente.',
    },
    descriptionFontSize: 13.5,
    copyLeft: 1108,
    copyTop: 400,
    copyWidth: 250,
    tags: ['Odoo', 'Python', 'PostgreSQL'],
    tagsLeft: 1108,
    // 565 = 558.125 (es description's real rendered bottom edge at this
    // column's 250px width, measured live via Playwright -- the es TITLE
    // "Módulo Personalizado de Odoo" wraps to 2 lines here, not the
    // description itself, pushing the description 28.8px lower than en's
    // single-line title) + 6.67 (this card's own EN copy-to-tags gap:
    // 536 - 529.328, the same "intended" gap the other two cards use,
    // preserved rather than invented). Batch 6's audit found 3 occlusion
    // findings, es-only -- all 3 turned out to be THIS card's 3 tag pills
    // overlapping the description (p1/p2 have 4 tags each and were never
    // exceeded: es clears them by 8.77px/5.08px respectively, confirmed by
    // measurement, left untouched). privateLabel.top (606) still clears the
    // new tags row with ~13px to spare. Change `profile-acrostic-i18n`,
    // batch 6b.
    tagsTop: 565,
    tagsWidth: 250,
    privateLabel: { left: 1108, top: 606, width: 250 },
    annotation: {
      text: {
        en: 'Giving maintenance and new features to a private codebase, with no public repository',
        es: 'Dando mantenimiento y nuevas funciones a un código privado, sin repositorio público',
      },
      left: 820,
      top: 672,
      width: 200,
    },
  },
];
