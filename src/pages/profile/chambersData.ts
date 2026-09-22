// Real chamber content, verified verbatim against
// docs/_decoded/profile-section-v4-standalone/template.html lines 407-417
// (the `data` array inside `renderVals()`). Each dot tuple in the decoded
// source is `[label, size, baseX, baseY, fusedX, fusedY]` -- positions are
// px offsets inside a 560x132 chamber box, `size` is the dot's diameter at
// rest. Nothing here is invented; the four fused words and every skill/trait
// label are copied exactly from source.
//
// Wobble/drift keyframe assignment matches the decoded `renderVals()`
// exactly: `wob[(i + j) % 3]` / `drift[(i + j) % 3]`, where `i` is the
// chamber index and `j` is the dot's index within that chamber -- these
// three keyframe sets (docs/07: cellWobA 11s / cellWobB 13s / cellWobC 9.5s,
// driftA 13s / driftB 16s / driftC 10s, all ease-in-out infinite) are
// deliberately mismatched in period so dots never breathe in lockstep.
const WOBBLE_KEYFRAMES = ['cellWobA 11s ease-in-out infinite', 'cellWobB 13s ease-in-out infinite', 'cellWobC 9.5s ease-in-out infinite'];
const DRIFT_KEYFRAMES = ['driftA 13s ease-in-out infinite', 'driftB 16s ease-in-out infinite', 'driftC 10s ease-in-out infinite'];

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
      ['Java', 58, 214, 66, 322, 72],
      ['JavaScript', 52, 318, 42, 362, 40],
      ['Python', 40, 452, 94, 394, 82],
    ],
  },
  {
    index: '02',
    fused: 'Systems',
    dots: [
      ['SQL', 56, 232, 66, 332, 66],
      ['UML', 46, 438, 66, 394, 66],
    ],
  },
  {
    index: '03',
    fused: 'Anywhere',
    dots: [
      ['Spanish', 54, 218, 68, 324, 74],
      ['English B1+', 48, 330, 38, 362, 42],
      ['French basics', 34, 474, 96, 396, 80],
    ],
  },
  {
    index: '04',
    fused: 'Dependable',
    dots: [
      ['Responsible', 46, 206, 56, 324, 68],
      ['Hardworking', 42, 296, 100, 358, 42],
      ['Teamwork', 40, 396, 38, 392, 70],
      ['Dedicated', 34, 486, 90, 358, 96],
    ],
  },
];

// zoneW = 404 / dots.length; left = 156 + j*zoneW (docs/_decoded ... lines 424, 439).
function buildZones(dotCount: number): ChamberZone[] {
  const zoneWidth = 404 / dotCount;
  return Array.from({ length: dotCount }, (_, j) => ({ left: 156 + j * zoneWidth, width: zoneWidth }));
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
