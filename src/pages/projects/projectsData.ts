// Real Projects content, verified against
// docs/_decoded/projects-section-v2-standalone/template.html lines 387-465.
// Names, meta lines, tags, descriptions, and annotation copy are quoted
// verbatim from the decoded source -- nothing here is invented.
//
// Repository links: the decoded source's own hrefs are `#repo-barbershop`
// and `#repo-acopiatech` -- placeholder in-page anchors, not real GitHub
// URLs (verified: no `github.com/...` string appears anywhere in this
// template). Odoo has no repository link at all -- its group renders a
// plain "private repository" label instead (line 461). Ported as-is per
// this repo's established pattern from the Contact build of not fabricating
// a missing/placeholder destination (src/pages/contact/channels.ts's own
// comment for WhatsApp/Book-a-call).
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
  name: string;
  metaLine: string;
  photo: string;
  photoAlt: string;
  rotation: number;
  lift: number;
  cardZIndex: number;
  photoSize: number;
  cardWidth: number;
  left: number;
  top: number;
  flagship?: boolean;
  eyebrowIndex: string;
  eyebrowLabel: string;
  title: string;
  titleFontSize: number;
  description: string;
  descriptionFontSize: number;
  copyLeft: number;
  copyTop: number;
  copyWidth: number;
  tags: string[];
  tagsLeft: number;
  tagsTop: number;
  tagsWidth?: number;
  repo?: ProjectRepo;
  privateLabel?: { left: number; top: number; width: number };
  annotation: { text: string; left: number; top: number; width: number };
}

export const PROJECTS: ProjectData[] = [
  {
    id: 'p1',
    name: 'barbershop',
    metaLine: 'web-dev final · 2025',
    photo: barbershopPhoto,
    photoAlt: 'Barbershop employee record screen',
    rotation: -2.2,
    lift: 9,
    cardZIndex: 8,
    photoSize: 276,
    cardWidth: 320,
    left: 76,
    top: 232,
    flagship: true,
    eyebrowIndex: '01',
    eyebrowLabel: 'backend',
    title: 'Barbershop',
    titleFontSize: 42,
    description:
      'Employee and appointment records, built end to end for the web development course — full CRUD, containerised, shipped to production.',
    descriptionFontSize: 14,
    copyLeft: 76,
    copyTop: 620,
    copyWidth: 400,
    tags: ['Express', 'JavaScript', 'Docker', 'MySQL'],
    tagsLeft: 76,
    tagsTop: 772,
    repo: {
      href: '#repo-barbershop',
      left: 76,
      top: 824,
      hoverRadius: '62% 38% 55% 45% / 45% 60% 40% 55%',
    },
    annotation: {
      text: 'the appointment grid — rebuilt twice before it held',
      left: 430,
      top: 300,
      width: 150,
    },
  },
  {
    id: 'p2',
    name: 'acopiatech',
    metaLine: 'routing · 2025',
    photo: acopiatechPhoto,
    photoAlt: 'Acopiatech pickup request screen',
    rotation: 2.4,
    lift: 9,
    cardZIndex: 8,
    photoSize: 224,
    cardWidth: 264,
    left: 648,
    top: 120,
    eyebrowIndex: '02',
    eyebrowLabel: 'mobile',
    title: 'Acopiatech',
    titleFontSize: 30,
    description: 'Mobile app for e-waste donation and collection routing, field-tested on local routes.',
    descriptionFontSize: 13.5,
    copyLeft: 600,
    copyTop: 470,
    copyWidth: 204,
    tags: ['Flutter', 'Dart', 'Firebase', 'Maps API'],
    tagsLeft: 600,
    tagsTop: 626,
    tagsWidth: 210,
    repo: {
      href: '#repo-acopiatech',
      left: 600,
      top: 704,
      hoverRadius: '55% 45% 62% 38% / 40% 55% 45% 60%',
    },
    annotation: {
      text: 'route picker — Maps API doing the heavy lifting',
      left: 952,
      top: 142,
      width: 170,
    },
  },
  {
    id: 'p3',
    name: 'odoo module',
    metaLine: 'private · 2025',
    photo: odooPhoto,
    photoAlt: 'Odoo document access-groups screen',
    rotation: -1.6,
    lift: 9,
    cardZIndex: 9,
    photoSize: 210,
    cardWidth: 250,
    left: 820,
    top: 372,
    eyebrowIndex: '03',
    eyebrowLabel: 'module',
    title: 'Odoo Custom Module',
    titleFontSize: 30,
    description: 'Document management module built for a local company, folded into their existing ERP.',
    descriptionFontSize: 13.5,
    copyLeft: 1108,
    copyTop: 400,
    copyWidth: 250,
    tags: ['Odoo', 'Python', 'PostgreSQL'],
    tagsLeft: 1108,
    tagsTop: 536,
    tagsWidth: 250,
    privateLabel: { left: 1108, top: 606, width: 250 },
    annotation: {
      text: 'document handoff, collapsed into one screen',
      left: 820,
      top: 672,
      width: 200,
    },
  },
];
