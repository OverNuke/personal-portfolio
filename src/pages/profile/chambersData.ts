import type { Lang, Localized } from '../../i18n/types';
import { pick } from '../../i18n/types';

// Chamber content. Each dot tuple is `[label, size, baseX, baseY, fusedX,
// fusedY]` -- positions are px offsets inside a 560x132 chamber box, `size`
// is the dot's diameter at rest.
//
// Provenance (updated 2026-09-26): the mockup's own chambers were verified
// verbatim against docs/_decoded/profile-section-v4-standalone/template.html
// lines 407-417 (the `data` array inside `renderVals()`). Anywhere and
// Dependable, plus the SQL and UML dots and the fused coordinates of Java,
// JavaScript and Python, are still exactly that source (Anywhere and
// Dependable are only renumbered 04/05). The 7 added skills (TypeScript, HTML,
// CSS, Node.js, Git, VS Code, Figma) come from the owner's local metadata
// file; their tuples, the 5th chamber ("Tools") and the moved rest positions
// of Java, JavaScript and Python are new layout on the mockup's own rhythm
// (max 4 dots per chamber), pinned by chambersData.test.ts.
//
// Wobble/drift keyframe assignment matches the decoded `renderVals()`
// exactly: `wob[(i + j) % 3]` / `drift[(i + j) % 3]`, where `i` is the
// chamber index and `j` is the dot's index within that chamber -- these
// three keyframe sets (docs/07: cellWobA 11s / cellWobB 13s / cellWobC 9.5s,
// driftA 13s / driftB 16s / driftC 10s, all ease-in-out infinite) are
// deliberately mismatched in period so dots never breathe in lockstep.
const WOBBLE_KEYFRAMES = [
  'cellWobA 11s ease-in-out infinite',
  'cellWobB 13s ease-in-out infinite',
  'cellWobC 9.5s ease-in-out infinite',
];
const DRIFT_KEYFRAMES = [
  'driftA 13s ease-in-out infinite',
  'driftB 16s ease-in-out infinite',
  'driftC 10s ease-in-out infinite',
];

export interface ChamberDot {
  /** Stable id for the React key, derived once from the dot's ORIGINAL
   *  (English) label (see `slugify` below) -- deliberately independent of
   *  `label`'s es value so translating a label (Phase 4.1) never changes a
   *  dot's key and remounts it on locale toggle. */
  id: string;
  /** Most dots are proper nouns (Java, SQL, Figma, ...) and carry the same
   *  string in both locales; the spoken-language and soft-skill dots
   *  (chambers 04/05) have real es translations (Phase 4.1). */
  label: Localized<string>;
  size: number;
  baseX: number;
  baseY: number;
  fusedX: number;
  fusedY: number;
  wobble: string;
  drift: string;
}

export interface ChamberZone {
  left: number;
  width: number;
}

export interface ChamberData {
  index: string;
  /** The KEVIN acrostic word (spec `profile-acrostic`) -- decorative,
   *  `aria-hidden`, and stays English in both locales (decision #522). Not
   *  what the chamber's accessible name describes; see `name` below. */
  fused: string;
  /** What the chamber actually represents (e.g. "Programming languages"),
   *  translated -- feeds `chamberAriaLabel`. Decoupled from `fused` because
   *  the acrostic word is decorative and unrelated to the chamber's real
   *  content once KEVIN's own letters (K/E/V/I/N) drove the word choice. */
  name: Localized<string>;
  dots: ChamberDot[];
  zones: ChamberZone[];
}

/** Resolves every dot's label for one locale, in dot order -- the shared
 *  building block `chamberAriaLabel` joins; also what `Profile.tsx` uses to
 *  build the id-keyed map `Chamber` renders from (Chamber itself never
 *  calls `useLang()`, matching the `ariaLabel` prop precedent below). */
export function chamberDotLabels(chamber: ChamberData, lang: Lang): string[] {
  return chamber.dots.map((dot) => pick(dot.label, lang));
}

/** `"<localized name> — <dot1>, <dot2>, ...>"`, e.g.
 *  `"Programming languages — Java, JavaScript, TypeScript, Python"`. The
 *  always-derivable text equivalent for the visual dot-fusion effect,
 *  present regardless of hover/bonded state (docs/04). Replaces the old
 *  precomputed `ChamberData.ariaLabel` field (design: "values computed at
 *  import can't react to lang"). */
export function chamberAriaLabel(chamber: ChamberData, lang: Lang): string {
  const labels = chamberDotLabels(chamber, lang).join(', ');
  return `${pick(chamber.name, lang)} — ${labels}`;
}

// [label, size, baseX, baseY, fusedX, fusedY]. `label` accepts a plain
// string for proper-noun dots (normalized to the same value in both
// locales by `normalizeLabel` below) or a `Localized<string>` for dots with
// a real es translation.
type RawDot = [string | Localized<string>, number, number, number, number, number];

interface RawChamber {
  index: string;
  fused: string;
  name: Localized<string>;
  dots: RawDot[];
}

/** Lowercase, hyphen-separated id derived from a dot's ENGLISH label -- e.g.
 *  `"Node.js"` -> `"node-js"`, `"English B1+"` -> `"english-b1"`. English
 *  labels are already unique across all 19 dots, so their slugs are too --
 *  independent of any es translation. */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** A plain-string raw label is a proper noun kept identical in both
 *  locales; an already-`Localized<string>` raw label passes through. */
function normalizeLabel(label: string | Localized<string>): Localized<string> {
  return typeof label === 'string' ? { en: label, es: label } : label;
}

// Fused words are the final KEVIN acrostic set (decision #522, spec
// `profile-acrostic`): each word's first letter reads K-E-V-I-N top-to-bottom.
// They replace the pre-acrostic fused words (Software/Systems/Tools/Anywhere/
// Dependable), which now live on as `name` -- the chamber's translated,
// accessible description, unrelated to the acrostic letter itself.
const RAW_CHAMBERS: RawChamber[] = [
  {
    index: '01',
    fused: 'Key languages',
    name: { en: 'Programming languages', es: 'Lenguajes de programación' },
    dots: [
      ['Java', 58, 208, 60, 322, 72],
      ['JavaScript', 52, 306, 96, 362, 40],
      ['TypeScript', 46, 398, 40, 352, 96],
      ['Python', 40, 486, 90, 394, 82],
    ],
  },
  {
    index: '02',
    fused: 'Environment',
    name: { en: 'Development tools', es: 'Herramientas de desarrollo' },
    dots: [
      ['SQL', 56, 232, 66, 332, 66],
      ['UML', 46, 438, 66, 394, 66],
      ['Node.js', 44, 335, 32, 364, 34],
      ['Git', 38, 524, 100, 366, 102],
    ],
  },
  {
    index: '03',
    fused: 'Versatile',
    name: { en: 'Design and tooling', es: 'Diseño y herramientas' },
    dots: [
      ['HTML', 50, 208, 76, 330, 62],
      ['CSS', 46, 300, 34, 372, 44],
      ['Figma', 42, 396, 92, 370, 92],
      ['VS Code', 36, 488, 62, 404, 72],
    ],
  },
  {
    index: '04',
    fused: 'International',
    name: { en: 'Spoken languages', es: 'Idiomas' },
    dots: [
      [{ en: 'Spanish', es: 'Español' }, 54, 218, 68, 324, 74],
      [{ en: 'English B1+', es: 'Inglés B1+' }, 48, 330, 38, 362, 42],
      [{ en: 'French basics', es: 'Francés básico' }, 34, 474, 96, 396, 80],
    ],
  },
  {
    index: '05',
    fused: 'Networked',
    name: { en: 'Work qualities', es: 'Cualidades de trabajo' },
    dots: [
      [{ en: 'Responsible', es: 'Responsable' }, 46, 206, 56, 324, 68],
      [{ en: 'Hardworking', es: 'Trabajador' }, 42, 296, 100, 358, 42],
      [{ en: 'Teamwork', es: 'Trabajo en equipo' }, 40, 396, 38, 392, 70],
      [{ en: 'Dedicated', es: 'Dedicado' }, 34, 486, 90, 358, 96],
    ],
  },
];

// Chamber box is 560px wide; the hover zones span the 404px right of the
// 156px label/fused-word column.
const ZONE_LEFT = 156;
const CHAMBER_WIDTH = 560;
const ZONE_SPAN = CHAMBER_WIDTH - ZONE_LEFT;

// zoneW = 404 / dots.length; left = 156 + j*zoneW (docs/_decoded ... lines 424, 439).
export function buildZones(dotCount: number): ChamberZone[] {
  const zoneWidth = ZONE_SPAN / dotCount;
  return Array.from({ length: dotCount }, (_, j) => ({
    left: ZONE_LEFT + j * zoneWidth,
    width: zoneWidth,
  }));
}

export const CHAMBERS: ChamberData[] = RAW_CHAMBERS.map((chamber, i) => ({
  index: chamber.index,
  fused: chamber.fused,
  name: chamber.name,
  zones: buildZones(chamber.dots.length),
  dots: chamber.dots.map(([rawLabel, size, baseX, baseY, fusedX, fusedY], j) => ({
    id: slugify(typeof rawLabel === 'string' ? rawLabel : rawLabel.en),
    label: normalizeLabel(rawLabel),
    size,
    baseX,
    baseY,
    fusedX,
    fusedY,
    wobble: WOBBLE_KEYFRAMES[(i + j) % 3],
    drift: DRIFT_KEYFRAMES[(i + j) % 3],
  })),
}));
