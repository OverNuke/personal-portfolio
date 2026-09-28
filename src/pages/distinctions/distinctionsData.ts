// Real certification content, verified verbatim against
// docs/_decoded/distinction-section-v4-standalone/template.html -- two
// independent sources inside that one file, both quoted exactly rather than
// assumed to agree:
// 1. The per-cell label `<div>`s (lines 407-459) -- the always-visible
//    on-colony caption (`labelMeta` below).
// 2. The `CELLS` JS array's `t`/`m` fields (lines 514-527) -- the title
//    used everywhere, and the shorter meta string used only for the
//    lightbox footer + the (unrendered) hover-readout text
//    (`c.t + ' — ' + c.m`).
// These two sources disagree in exactly one place: `anfeca`'s on-colony
// label reads "ANFECA · 2025 · honors" while its CELLS.m is the shorter
// "ANFECA · 2025" -- not a typo to "fix", both values are preserved
// separately below (`labelMeta` vs `lightboxMeta`) since collapsing them
// would silently drop real, verified content from one of the two sources.
//
// Numbering (01..09) follows the label `<div>`s' own document order
// (anfeca, nota, exaver, english, toefl, powerbi, ai, aiinit, propadeutic --
// template.html lines 407-459), which is NOT the same order as the `CELLS`
// seed array used for the Voronoi geometry (voronoi.ts's `CELL_SEEDS`,
// template.html lines 514-527) -- the two lists are independently ordered
// in the decoded source itself, so this file's array order matches the
// numbering, and each entry's `id` is what joins it back to its seed/cell
// geometry in voronoi.ts.
import type { Localized } from '../../i18n/types';
import anfecaScan from '../../assets/plates/certificates/anfeca.png';
import notaScan from '../../assets/plates/certificates/nota.png';
import exaverScan from '../../assets/plates/certificates/exaver.png';
import angloScan from '../../assets/plates/certificates/anglo.png';
import sepToelfScan from '../../assets/plates/certificates/sepToelf.png';
import powerbiScan from '../../assets/plates/certificates/powerbi.png';
import aiScan from '../../assets/plates/certificates/ai.png';
import aiInitScan from '../../assets/plates/certificates/aiinit.png';
import propadeuticScan from '../../assets/plates/certificates/propadeutic.png';

/** The 9 real certification ids -- a closed union (Phase 4.2) so a typo in a
 *  new cert's id, or a stale id at a call site, is a compile error rather
 *  than a silent `undefined` lookup. See `distinctionsData.typecheck.ts` for
 *  the compile-time proof (tsconfig excludes `*.test.ts` from `tsc -b`, per
 *  the Phase 1 config note). `CERTIFICATIONS_BY_ID` itself stays keyed by
 *  plain `string` -- callers (Distinctions.tsx, VoronoiCellField.tsx) look
 *  cells up by a dynamically-typed DOM/seed id, not a `CertId` literal. */
export type CertId =
  | 'anfeca'
  | 'nota'
  | 'exaver'
  | 'english'
  | 'toefl'
  | 'powerbi'
  | 'ai'
  | 'aiinit'
  | 'propadeutic';

export interface CertCell {
  id: CertId;
  number: string;
  /** Phase 4.2: localized. Proper nouns/institution names that are already
   *  Spanish or acronym-only stay byte-identical across locales. */
  title: Localized<string>;
  /** Always-visible JetBrains Mono caption on the colony field itself. */
  labelMeta: Localized<string>;
  /** Shown in the lightbox footer (`openMeta`) -- template.html line 485. */
  lightboxMeta: Localized<string>;
  /** `undefined` when no scan has been captured yet for this cert -- see
   *  the mapping note below. ScanModal renders its own "no scan yet"
   *  placeholder state for these, it does not fabricate or reuse a
   *  different cert's image. */
  certificateImage?: string;
}

/**
 * Certificate-scan mapping -- judgment call (the decoded template itself
 * never states a mapping, since its own `<image-slot>` is a bundler-editor
 * placeholder the author drops a file into by hand, not a data-bound `src`).
 * Resolved by name correspondence, verified against
 * `docs/13_ASSET_SPEC.md`'s file list:
 * - `anfeca` / `nota` / `exaver` -- direct 1:1, filenames match the cell id
 *   verbatim.
 * - `english` -> `anglo.png`. Updated 2026-09-26 (user-decided): the scan is
 *   not an English certificate, it is a SEV/DGB "Diploma" from Colegio
 *   Anglo-Mexicano de Coatzacoalcos for the "Capacitacion para el Trabajo:
 *   Tecnologias de la Informacion y la Comunicacion" (9 Jul 2021). The cell's
 *   title and lightbox meta now say so ("ICT Training Diploma", "Colegio
 *   Anglo-Mexicano · Coatzacoalcos · 2021"), which DEPARTS FROM THE MOCKUP's
 *   "English Certificate" copy on purpose, same reasoning as `toefl` below.
 *   The id stays `english` (Voronoi seed + geometry tests) and the plate stays
 *   `anglo.png`.
 * - `toefl` -> `sepToelf.png`. Updated 2026-09-26: the scan is not a TOEFL /
 *   ETS document, it is the SEP English-specialty diploma from the
 *   Coatzacoalcos institute (4 Dec 2018). The cell's title and metas now say
 *   so ("SEP English Diploma", "SEP · 2018"), which DEPARTS FROM THE MOCKUP's
 *   "TOEFL Certificate" / "ETS · 2018" copy on purpose -- the site must not
 *   claim a certificate its own scan contradicts. The id stays `toefl` so
 *   the Voronoi seed and its geometry tests are untouched.
 * - `powerbi` / `ai` / `propadeutic` -- added 2026-09-26, rasterized from
 *   `raw/certificates/` PDFs (origins in `docs/13_ASSET_SPEC.md`).
 * - `aiinit` -- added 2026-09-26 (owner-confirmed): the image-only
 *   `raw/certificates/Certificado-BIG-School-*.pdf` is the "Certificado de
 *   Iniciacion al Desarrollo con IA" (mouredev + BIG school, 26/06/2026). Its
 *   embedded image was fitted onto a black 1440x920 plate.
 *   Every cell now has a scan; `distinctionsData.test.ts` pins the (now
 *   empty) scan-less allow-list, and ScanModal's "scan not yet available"
 *   placeholder (the decoded `<image-slot placeholder="Drop the scan">`
 *   empty state) stays as the fallback for any future cell without one.
 */
// Phase 4.2 (decision #522, neutral LatAm Spanish): institution names,
// place names and acronym-only metas are already Spanish or locale-neutral
// and stay byte-identical; titles with a generic English word (Introduction,
// Fundamentals, Certificate) get a real translation. `english`'s and
// `toefl`'s es titles use the REAL document names from the provenance
// comment above, not a back-translation of the English paraphrase.
export const CERTIFICATIONS: CertCell[] = [
  {
    id: 'anfeca',
    number: '01',
    title: { en: 'ANFECA Academic Recognition', es: 'Reconocimiento Académico ANFECA' },
    labelMeta: { en: 'ANFECA · 2025 · honors', es: 'ANFECA · 2025 · honores' },
    lightboxMeta: { en: 'ANFECA · 2025', es: 'ANFECA · 2025' },
    certificateImage: anfecaScan,
  },
  {
    id: 'nota',
    number: '02',
    title: { en: 'Nota Laudatoria', es: 'Nota Laudatoria' },
    labelMeta: { en: 'Universidad Veracruzana · 2025', es: 'Universidad Veracruzana · 2025' },
    lightboxMeta: { en: 'Universidad Veracruzana · 2025', es: 'Universidad Veracruzana · 2025' },
    certificateImage: notaScan,
  },
  {
    id: 'exaver',
    number: '03',
    title: { en: 'EXAVER Proficiency', es: 'Suficiencia EXAVER' },
    labelMeta: { en: 'Universidad Veracruzana · 2022', es: 'Universidad Veracruzana · 2022' },
    lightboxMeta: { en: 'Universidad Veracruzana · 2022', es: 'Universidad Veracruzana · 2022' },
    certificateImage: exaverScan,
  },
  {
    id: 'english',
    number: '04',
    title: {
      en: 'ICT Training Diploma',
      es: 'Diploma de Capacitación en TIC',
    },
    labelMeta: { en: 'Anglo Mexicano · 2021', es: 'Anglo Mexicano · 2021' },
    lightboxMeta: {
      en: 'Colegio Anglo-Mexicano · Coatzacoalcos · 2021',
      es: 'Colegio Anglo-Mexicano · Coatzacoalcos · 2021',
    },
    certificateImage: angloScan,
  },
  {
    id: 'toefl',
    number: '05',
    title: { en: 'SEP English Diploma', es: 'Diploma SEP de Inglés' },
    labelMeta: { en: 'SEP · 2018', es: 'SEP · 2018' },
    lightboxMeta: { en: 'SEP · Coatzacoalcos · 2018', es: 'SEP · Coatzacoalcos · 2018' },
    certificateImage: sepToelfScan,
  },
  {
    id: 'powerbi',
    number: '06',
    title: { en: 'Introduction to Power BI', es: 'Introducción a Power BI' },
    labelMeta: { en: 'CONISOFT · 2025', es: 'CONISOFT · 2025' },
    lightboxMeta: { en: 'CONISOFT · 2025', es: 'CONISOFT · 2025' },
    certificateImage: powerbiScan,
  },
  {
    id: 'ai',
    number: '07',
    title: { en: 'AI Fundamentals', es: 'Fundamentos de IA' },
    labelMeta: { en: 'DataCamp · 2026', es: 'DataCamp · 2026' },
    lightboxMeta: { en: 'DataCamp · 2026', es: 'DataCamp · 2026' },
    certificateImage: aiScan,
  },
  {
    id: 'aiinit',
    number: '08',
    title: { en: 'AI Initiation', es: 'Iniciación al Desarrollo con IA' },
    labelMeta: { en: 'MoureDev · 2026', es: 'MoureDev · 2026' },
    lightboxMeta: { en: 'MoureDev · 2026', es: 'MoureDev · 2026' },
    certificateImage: aiInitScan,
  },
  {
    id: 'propadeutic',
    number: '09',
    title: { en: 'Propadeutic Certificate', es: 'Certificado Propedéutico' },
    labelMeta: { en: 'TecNM · CCPIA · 2026', es: 'TecNM · CCPIA · 2026' },
    lightboxMeta: { en: 'TecNM · CCPIA · 2026', es: 'TecNM · CCPIA · 2026' },
    certificateImage: propadeuticScan,
  },
];

export const CERTIFICATIONS_BY_ID: Record<string, CertCell> = Object.fromEntries(
  CERTIFICATIONS.map((cert) => [cert.id, cert]),
);
