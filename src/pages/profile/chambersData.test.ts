import { describe, expect, it } from 'vitest';
import { CHAMBERS, buildZones } from './chambersData';
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

const allDotLabels = () => CHAMBERS.flatMap((chamber) => chamber.dots.map((dot) => dot.label));

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

    it('keeps the approved membership and order per chamber', () => {
      expect(
        CHAMBERS.map((chamber) => [chamber.fused, chamber.dots.map((dot) => dot.label)]),
      ).toEqual([
        ['Software', ['Java', 'JavaScript', 'TypeScript', 'Python']],
        ['Systems', ['SQL', 'UML', 'Node.js', 'Git']],
        ['Tools', ['HTML', 'CSS', 'Figma', 'VS Code']],
        ['Anywhere', ['Spanish', 'English B1+', 'French basics']],
        ['Dependable', ['Responsible', 'Hardworking', 'Teamwork', 'Dedicated']],
      ]);
    });
  });

  describe('ariaLabel', () => {
    it('is derived as "<fused> — <labels joined by comma>" for every chamber', () => {
      for (const chamber of CHAMBERS) {
        expect(chamber.ariaLabel).toBe(
          `${chamber.fused} — ${chamber.dots.map((dot) => dot.label).join(', ')}`,
        );
      }
    });

    it('reads as the approved text for the Tools chamber', () => {
      expect(CHAMBERS[2].ariaLabel).toBe('Tools — HTML, CSS, Figma, VS Code');
    });

    it('reads as the approved text for the merged Software and Systems chambers', () => {
      expect(CHAMBERS[0].ariaLabel).toBe('Software — Java, JavaScript, TypeScript, Python');
      expect(CHAMBERS[1].ariaLabel).toBe('Systems — SQL, UML, Node.js, Git');
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
        (candidate) => candidate.label === label,
      );
      if (!dot) throw new Error(`missing dot ${label}`);
      return [dot.label, dot.size, dot.baseX, dot.baseY, dot.fusedX, dot.fusedY];
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
