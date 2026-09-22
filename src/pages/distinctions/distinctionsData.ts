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
import anfecaScan from '../../assets/plates/certificates/anfeca.png';
import notaScan from '../../assets/plates/certificates/nota.png';
import exaverScan from '../../assets/plates/certificates/exaver.png';
import angloScan from '../../assets/plates/certificates/anglo.png';
import sepToelfScan from '../../assets/plates/certificates/sepToelf.png';

export interface CertCell {
  id: string;
  number: string;
  title: string;
  /** Always-visible JetBrains Mono caption on the colony field itself. */
  labelMeta: string;
  /** Shown in the lightbox footer (`openMeta`) -- template.html line 485. */
  lightboxMeta: string;
  /** `undefined` when no scan has been captured yet for this cert -- see
   *  the mapping note below. ScanModal renders its own "no scan yet"
   *  placeholder state for these, it does not fabricate or reuse a
   *  different cert's image. */
  certificateImage?: string;
}

/**
 * Certificate-scan mapping -- judgment call (5 real scan files exist for 9
 * cells; the decoded template itself never states a mapping, since its own
 * `<image-slot>` is a bundler-editor placeholder the author drops a file
 * into by hand, not a data-bound `src`). Resolved by name correspondence,
 * verified against `docs/13_ASSET_SPEC.md`'s file list:
 * - `anfeca` / `nota` / `exaver` -- direct 1:1, filenames match the cell id
 *   verbatim.
 * - `english` (English Certificate, issued by "Anglo Mexicano") ->
 *   `anglo.png`.
 * - `toefl` (TOEFL Certificate, issued by ETS) -> `sepToelf.png` (SEP is
 *   Mexico's federal education ministry, whose recognition/apostille
 *   often accompanies a TOEFL/ETS certificate for local academic use --
 *   the filename's own "Toelf" segment is the strongest signal here).
 * - `powerbi`, `ai`, `aiinit`, `propadeutic` -- all four are 2025/2026
 *   -dated certs with NO corresponding file anywhere in the asset
 *   manifest (`docs/13_ASSET_SPEC.md`'s Certificates table lists exactly
 *   5 files, and none of the 4 remaining names appear under any other
 *   spelling). Rather than reuse one of the 5 real scans as a stand-in
 *   for a document it doesn't actually depict, these 4 cells open the
 *   lightbox with an honest "scan not yet available" placeholder --
 *   which is what the decoded `<image-slot placeholder="Drop the scan">`
 *   itself natively renders when empty, so this isn't a gap the port
 *   invented, it's the source's own empty state, kept instead of papered
 *   over.
 */
export const CERTIFICATIONS: CertCell[] = [
  {
    id: 'anfeca',
    number: '01',
    title: 'ANFECA Academic Recognition',
    labelMeta: 'ANFECA · 2025 · honors',
    lightboxMeta: 'ANFECA · 2025',
    certificateImage: anfecaScan,
  },
  {
    id: 'nota',
    number: '02',
    title: 'Nota Laudatoria',
    labelMeta: 'Universidad Veracruzana · 2025',
    lightboxMeta: 'Universidad Veracruzana · 2025',
    certificateImage: notaScan,
  },
  {
    id: 'exaver',
    number: '03',
    title: 'EXAVER Proficiency',
    labelMeta: 'Universidad Veracruzana · 2022',
    lightboxMeta: 'Universidad Veracruzana · 2022',
    certificateImage: exaverScan,
  },
  {
    id: 'english',
    number: '04',
    title: 'English Certificate',
    labelMeta: 'Anglo Mexicano · 2021',
    lightboxMeta: 'Anglo Mexicano · 2021',
    certificateImage: angloScan,
  },
  {
    id: 'toefl',
    number: '05',
    title: 'TOEFL Certificate',
    labelMeta: 'ETS · 2018',
    lightboxMeta: 'ETS · 2018',
    certificateImage: sepToelfScan,
  },
  {
    id: 'powerbi',
    number: '06',
    title: 'Introduction to Power BI',
    labelMeta: 'CONISOFT · 2025',
    lightboxMeta: 'CONISOFT · 2025',
  },
  {
    id: 'ai',
    number: '07',
    title: 'AI Fundamentals',
    labelMeta: 'DataCamp · 2026',
    lightboxMeta: 'DataCamp · 2026',
  },
  {
    id: 'aiinit',
    number: '08',
    title: 'AI Initiation',
    labelMeta: 'MoureDev · 2026',
    lightboxMeta: 'MoureDev · 2026',
  },
  {
    id: 'propadeutic',
    number: '09',
    title: 'Propadeutic Certificate',
    labelMeta: 'TecNM · CCPIA · 2026',
    lightboxMeta: 'TecNM · CCPIA · 2026',
  },
];

export const CERTIFICATIONS_BY_ID: Record<string, CertCell> = Object.fromEntries(
  CERTIFICATIONS.map((cert) => [cert.id, cert]),
);

/** Distinctions' own H2 heading + intro copy (template.html lines 401-405)
 *  -- real content, not decorative, even though it lives inside the same
 *  Voronoi "title" cell shape as everything else on the colony field. */
export const TITLE_CELL = {
  heading: 'Distinctions',
  intro: 'Honors, language certification and coursework, packed as one colony. Each cell holds its own scan.',
};
