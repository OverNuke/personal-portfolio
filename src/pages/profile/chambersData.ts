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
  label: string;
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
  fused: string;
  dots: ChamberDot[];
  zones: ChamberZone[];
  /** `"<fused> — <dot1>, <dot2>, ..."`, e.g. `"Anywhere — Spanish, English B1+, French basics"`
   *  -- matches the decoded source's own `aria` field (`d.fused + ' — ' + d.dots.map(t => t[0]).join(', ')`)
   *  verbatim. This is the always-derivable text equivalent for the visual dot-fusion effect,
   *  present regardless of hover/bonded state (docs/04). */
  ariaLabel: string;
}

// [label, size, baseX, baseY, fusedX, fusedY]
type RawDot = [string, number, number, number, number, number];

interface RawChamber {
  index: string;
  fused: string;
  dots: RawDot[];
}

const RAW_CHAMBERS: RawChamber[] = [
  {
    index: '01',
    fused: 'Software',
    dots: [
      ['Java', 58, 208, 60, 322, 72],
      ['JavaScript', 52, 306, 96, 362, 40],
      ['TypeScript', 46, 398, 40, 352, 96],
      ['Python', 40, 486, 90, 394, 82],
    ],
  },
  {
    index: '02',
    fused: 'Systems',
    dots: [
      ['SQL', 56, 232, 66, 332, 66],
      ['UML', 46, 438, 66, 394, 66],
      ['Node.js', 44, 335, 32, 364, 34],
      ['Git', 38, 524, 100, 366, 102],
    ],
  },
  {
    index: '03',
    fused: 'Tools',
    dots: [
      ['HTML', 50, 208, 76, 330, 62],
      ['CSS', 46, 300, 34, 372, 44],
      ['Figma', 42, 396, 92, 370, 92],
      ['VS Code', 36, 488, 62, 404, 72],
    ],
  },
  {
    index: '04',
    fused: 'Anywhere',
    dots: [
      ['Spanish', 54, 218, 68, 324, 74],
      ['English B1+', 48, 330, 38, 362, 42],
      ['French basics', 34, 474, 96, 396, 80],
    ],
  },
  {
    index: '05',
    fused: 'Dependable',
    dots: [
      ['Responsible', 46, 206, 56, 324, 68],
      ['Hardworking', 42, 296, 100, 358, 42],
      ['Teamwork', 40, 396, 38, 392, 70],
      ['Dedicated', 34, 486, 90, 358, 96],
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
  ariaLabel: `${chamber.fused} — ${chamber.dots.map((dot) => dot[0]).join(', ')}`,
  zones: buildZones(chamber.dots.length),
  dots: chamber.dots.map(([label, size, baseX, baseY, fusedX, fusedY], j) => ({
    label,
    size,
    baseX,
    baseY,
    fusedX,
    fusedY,
    wobble: WOBBLE_KEYFRAMES[(i + j) % 3],
    drift: DRIFT_KEYFRAMES[(i + j) % 3],
  })),
}));
