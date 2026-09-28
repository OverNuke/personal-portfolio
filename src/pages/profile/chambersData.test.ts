import { describe, expect, it } from 'vitest';
import { CHAMBERS, buildZones, chamberAriaLabel, chamberDotLabels } from './chambersData';
import type { ChamberDot } from './chambersData';

// Skill names are hardcoded on purpose: the owner's local metadata file is
// gitignored (`local-metadata/`) and tests must never import from it.
const ALL_LABELS = [
  'Java',
  'JavaScript',
  'TypeScript',
  'Python',
  'SQL',
  'UML',
  'Node.js',
  'Git',
  'HTML',
  'CSS',
  'Figma',
  'VS Code',
  'Spanish',
  'English B1+',
  'French basics',
  'Responsible',
  'Hardworking',
  'Teamwork',
  'Dedicated',
];

const NEW_SKILLS = ['TypeScript', 'HTML', 'CSS', 'Node.js', 'Git', 'VS Code', 'Figma'];
const REMOVED_SKILLS = ['React', 'Next.js', 'Tailwind CSS'];

// `dot.label` is `Localized<string>` (Phase 4.1) -- most skill dots are
// proper nouns kept byte-identical in both locales; `.en` is the stable
// value these membership/geometry checks were always written against.
const allDotLabels = () => CHAMBERS.flatMap((chamber) => chamber.dots.map((dot) => dot.label.en));
const allDots = () => CHAMBERS.flatMap((chamber) => chamber.dots);

// Geometry helpers. Rest radius is size / 2; fused radius is 0.57 * size
// (diameter scaled by 1.14 in Chamber.tsx, then halved).
const restRadius = (dot: ChamberDot) => dot.size / 2;
const fusedRadius = (dot: ChamberDot) => 0.57 * dot.size;
const restCenter = (dot: ChamberDot) => ({ x: dot.baseX, y: dot.baseY });
const fusedCenter = (dot: ChamberDot) => ({ x: dot.fusedX, y: dot.fusedY });

// Edge-to-edge gap between two circles; negative when they overlap.
function edgeGap(
  a: { x: number; y: number; r: number },
  b: { x: number; y: number; r: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
}

function pairs<T>(items: T[]): [T, T][] {
  return items.flatMap((first, i) => items.slice(i + 1).map((second): [T, T] => [first, second]));
}

// True when every circle is reachable from the first through links whose
// edge gap is <= maxGap (overlap counts as linked).
function isConnected(circles: { x: number; y: number; r: number }[], maxGap: number): boolean {
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length > 0) {
    const current = queue.shift() as number;
    circles.forEach((other, index) => {
      if (!seen.has(index) && edgeGap(circles[current], other) <= maxGap) {
        seen.add(index);
        queue.push(index);
      }
    });
  }
  return seen.size === circles.length;
}

describe('chambersData', () => {
  describe('shape and coverage', () => {
    it('has 5 chambers with at most 4 dots each', () => {
      expect(CHAMBERS).toHaveLength(5);
      for (const chamber of CHAMBERS) {
        expect(chamber.dots.length).toBeGreaterThanOrEqual(2);
        expect(chamber.dots.length).toBeLessThanOrEqual(4);
      }
    });

    it('numbers the chambers 01 to 05 in order', () => {
      expect(CHAMBERS.map((chamber) => chamber.index)).toEqual(['01', '02', '03', '04', '05']);
    });

    it('holds exactly the 19 labels, each once', () => {
      const labels = allDotLabels();
      expect(labels).toHaveLength(19);
      expect(new Set(labels).size).toBe(19);
      expect([...labels].sort()).toEqual([...ALL_LABELS].sort());
    });

    it.each(NEW_SKILLS)('lists the new skill %s exactly once', (skill) => {
      expect(allDotLabels().filter((label) => label === skill)).toHaveLength(1);
    });

    it.each(REMOVED_SKILLS)('does not list the removed skill %s', (skill) => {
      expect(allDotLabels()).not.toContain(skill);
    });

    it('keeps the approved membership and order per chamber (fused words are the final KEVIN acrostic set)', () => {
      expect(
        CHAMBERS.map((chamber) => [chamber.fused, chamber.dots.map((dot) => dot.label.en)]),
      ).toEqual([
        ['Key languages', ['Java', 'JavaScript', 'TypeScript', 'Python']],
        ['Environment', ['SQL', 'UML', 'Node.js', 'Git']],
        ['Versatile', ['HTML', 'CSS', 'Figma', 'VS Code']],
        ['International', ['Spanish', 'English B1+', 'French basics']],
        ['Networked', ['Responsible', 'Hardworking', 'Teamwork', 'Dedicated']],
      ]);
    });
  });

  // Spec `profile-acrostic` / decision #522: the 5 fused words are decorative,
  // aria-hidden, and stay English in both locales -- they are the acrostic
  // itself, not translatable content.
  describe('KEVIN acrostic', () => {
    it("spells KEVIN top-to-bottom from each chamber's first letter", () => {
      expect(CHAMBERS.map((chamber) => chamber.fused[0]).join('')).toBe('KEVIN');
    });

    it.each([
      [0, 'Key languages'],
      [1, 'Environment'],
      [2, 'Versatile'],
      [3, 'International'],
      [4, 'Networked'],
    ])('chamber %i fused word is %s', (index, fused) => {
      expect(CHAMBERS[index].fused).toBe(fused);
    });
  });

  // Design: the old static `ariaLabel` field became `chamberAriaLabel(chamber,
  // lang)`, built from a new translated `name` (what the chamber represents,
  // e.g. "programming languages") -- decoupled from the now-decorative,
  // English-only `fused` acrostic word.
  describe('chamberDotLabels', () => {
    it('resolves each dot label for the given locale, in dot order', () => {
      for (const chamber of CHAMBERS) {
        expect(chamberDotLabels(chamber, 'en')).toEqual(chamber.dots.map((dot) => dot.label.en));
        expect(chamberDotLabels(chamber, 'es')).toEqual(chamber.dots.map((dot) => dot.label.es));
      }
    });
  });

  describe('chamberAriaLabel', () => {
    it('is derived as "<localized name> — <localized labels joined by comma>"', () => {
      for (const chamber of CHAMBERS) {
        for (const lang of ['en', 'es'] as const) {
          const labels = chamber.dots.map((dot) => dot.label[lang]).join(', ');
          expect(chamberAriaLabel(chamber, lang)).toBe(`${chamber.name[lang]} — ${labels}`);
        }
      }
    });

    it('reads as the approved text for the first two chambers', () => {
      expect(chamberAriaLabel(CHAMBERS[0], 'en')).toBe(
        'Programming languages — Java, JavaScript, TypeScript, Python',
      );
      expect(chamberAriaLabel(CHAMBERS[1], 'en')).toBe('Development tools — SQL, UML, Node.js, Git');
    });

    it('varies with locale while the fused acrostic word does not', () => {
      for (const chamber of CHAMBERS) {
        expect(chamberAriaLabel(chamber, 'en')).not.toBe(chamberAriaLabel(chamber, 'es'));
        // The label text never contains the (English-only, decorative) fused
        // word -- it describes the chamber's contents instead.
        expect(chamberAriaLabel(chamber, 'en')).not.toContain(chamber.fused);
        expect(chamberAriaLabel(chamber, 'es')).not.toContain(chamber.fused);
      }
    });

    it('never leaves an empty name in either locale', () => {
      for (const chamber of CHAMBERS) {
        expect(chamber.name.en.length).toBeGreaterThan(0);
        expect(chamber.name.es.length).toBeGreaterThan(0);
      }
    });
  });

  describe('dot ids (stable React keys, independent of the label text)', () => {
    it('gives every dot a non-empty id', () => {
      for (const dot of allDots()) {
        expect(dot.id.length).toBeGreaterThan(0);
      }
    });

    it('keeps every id unique across all 19 dots', () => {
      const ids = allDots().map((dot) => dot.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it.each([
      ['Java', 'java'],
      ['Node.js', 'node-js'],
      ['English B1+', 'english-b1'],
      ['VS Code', 'vs-code'],
    ])('slugifies %s to %s (derived from the English label, independent of es)', (label, id) => {
      const dot = allDots().find((candidate) => candidate.label.en === label);
      expect(dot?.id).toBe(id);
    });
  });

  // Phase 4.1: proper-noun dots (tech/tool names) stay byte-identical across
  // locales; the non-proper-noun dots (spoken languages, chamber 5's soft
  // skills) get real, neutral-LatAm-Spanish translations (decision #522).
  describe('translated dot labels (Phase 4.1)', () => {
    const PROPER_NOUNS = [
      'Java',
      'JavaScript',
      'TypeScript',
      'Python',
      'SQL',
      'UML',
      'Node.js',
      'Git',
      'HTML',
      'CSS',
      'Figma',
      'VS Code',
    ];

    it.each(PROPER_NOUNS)('%s is identical in en and es (proper noun)', (label) => {
      const dot = allDots().find((candidate) => candidate.label.en === label);
      expect(dot?.label.es).toBe(label);
    });

    it.each([
      ['Spanish', 'Español'],
      ['English B1+', 'Inglés B1+'],
      ['French basics', 'Francés básico'],
      ['Responsible', 'Responsable'],
      ['Hardworking', 'Trabajador'],
      ['Teamwork', 'Trabajo en equipo'],
      ['Dedicated', 'Dedicado'],
    ])('%s translates to %s in es', (en, es) => {
      const dot = allDots().find((candidate) => candidate.label.en === en);
      expect(dot?.label.es).toBe(es);
    });

    it('every dot has a non-empty label in both locales', () => {
      for (const dot of allDots()) {
        expect(dot.label.en.length).toBeGreaterThan(0);
        expect(dot.label.es.length).toBeGreaterThan(0);
      }
    });
  });

  describe('buildZones', () => {
    it.each([2, 3, 4])('builds %i contiguous bands of 404/n starting at x=156', (count) => {
      const zones = buildZones(count);
      expect(zones).toHaveLength(count);
      zones.forEach((zone, j) => {
        expect(zone.width).toBeCloseTo(404 / count, 10);
        expect(zone.left).toBeCloseTo(156 + (j * 404) / count, 10);
      });
      expect(zones.reduce((sum, zone) => sum + zone.width, 0)).toBeCloseTo(404, 10);
    });

    it('gives every chamber zones that end at x=560', () => {
      for (const chamber of CHAMBERS) {
        expect(chamber.zones).toEqual(buildZones(chamber.dots.length));
        const last = chamber.zones[chamber.zones.length - 1];
        expect(last.left + last.width).toBeCloseTo(560, 10);
      }
    });
  });

  describe('rest geometry (560x132 box)', () => {
    it.each(CHAMBERS.map((chamber) => [chamber.fused, chamber] as const))(
      '%s: every pair keeps an edge gap of at least 48px, no overlap',
      (_name, chamber) => {
        const circles = chamber.dots.map((dot) => ({ ...restCenter(dot), r: restRadius(dot) }));
        for (const [a, b] of pairs(circles)) {
          expect(edgeGap(a, b)).toBeGreaterThanOrEqual(48);
        }
      },
    );

    it.each(CHAMBERS.map((chamber) => [chamber.fused, chamber] as const))(
      '%s: every dot stays inside the box, right of the label column and clear of the status text',
      (_name, chamber) => {
        for (const dot of chamber.dots) {
          const { x, y } = restCenter(dot);
          const r = restRadius(dot);
          expect(x - r).toBeGreaterThanOrEqual(176);
          expect(x + r).toBeLessThanOrEqual(548);
          expect(y - r).toBeGreaterThanOrEqual(8);
          expect(y + r).toBeLessThanOrEqual(124);
          if (x + r > 480) expect(y - r).toBeGreaterThanOrEqual(40);
        }
      },
    );
  });

  describe('fused geometry (goo blob, R = 0.57 * size)', () => {
    it.each(CHAMBERS.map((chamber) => [chamber.fused, chamber] as const))(
      '%s: the blob is connected (nearest-neighbour edge gap <= 8px)',
      (_name, chamber) => {
        const circles = chamber.dots.map((dot) => ({ ...fusedCenter(dot), r: fusedRadius(dot) }));
        expect(isConnected(circles, 8)).toBe(true);
      },
    );

    it.each(CHAMBERS.map((chamber) => [chamber.fused, chamber] as const))(
      '%s: every fused dot stays inside the box with drift room and right of the fused word column',
      (_name, chamber) => {
        for (const dot of chamber.dots) {
          const { x, y } = fusedCenter(dot);
          const R = fusedRadius(dot);
          expect(y - R).toBeGreaterThanOrEqual(7);
          expect(y + R).toBeLessThanOrEqual(125);
          expect(x - R).toBeGreaterThanOrEqual(160);
        }
      },
    );

    it('detects a disconnected blob (the connectivity check has teeth)', () => {
      expect(
        isConnected(
          [
            { x: 0, y: 0, r: 20 },
            { x: 100, y: 0, r: 20 },
          ],
          8,
        ),
      ).toBe(false);
      expect(
        isConnected(
          [
            { x: 0, y: 0, r: 20 },
            { x: 45, y: 0, r: 20 },
          ],
          8,
        ),
      ).toBe(true);
    });
  });

  // Tuples are [label, size, baseX, baseY, fusedX, fusedY].
  describe('mockup tuples stay verbatim', () => {
    const tupleOf = (label: string) => {
      const dot = CHAMBERS.flatMap((chamber) => chamber.dots).find(
        (candidate) => candidate.label.en === label,
      );
      if (!dot) throw new Error(`missing dot ${label}`);
      return [dot.label.en, dot.size, dot.baseX, dot.baseY, dot.fusedX, dot.fusedY];
    };
    const fusedOf = (label: string) => tupleOf(label).slice(4);

    it.each([
      ['SQL', 56, 232, 66, 332, 66],
      ['UML', 46, 438, 66, 394, 66],
      ['Spanish', 54, 218, 68, 324, 74],
      ['English B1+', 48, 330, 38, 362, 42],
      ['French basics', 34, 474, 96, 396, 80],
      ['Responsible', 46, 206, 56, 324, 68],
      ['Hardworking', 42, 296, 100, 358, 42],
      ['Teamwork', 40, 396, 38, 392, 70],
      ['Dedicated', 34, 486, 90, 358, 96],
    ])('%s keeps its full mockup tuple', (...tuple) => {
      expect(tupleOf(tuple[0] as string)).toEqual(tuple);
    });

    it.each([
      ['Java', 322, 72],
      ['JavaScript', 362, 40],
      ['Python', 394, 82],
    ])(
      '%s keeps its mockup fused coordinates (only its rest position moves)',
      (label, fusedX, fusedY) => {
        expect(fusedOf(label)).toEqual([fusedX, fusedY]);
      },
    );
  });
});
