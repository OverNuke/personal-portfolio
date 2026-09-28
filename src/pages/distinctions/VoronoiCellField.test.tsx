import { act, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { es } from '../../i18n/es';
import { format, pick } from '../../i18n/types';
import { installLayoutStubs, restoreLayoutStubs } from '../../test/layoutStubs';
import type { LayoutStubs } from '../../test/layoutStubs';
import { renderWithLang } from '../../test/renderWithLang';
import { CERTIFICATIONS, CERTIFICATIONS_BY_ID } from './distinctionsData';
import VoronoiCellField from './VoronoiCellField';
import { DOODLE_PATH_IDS } from './doodleStrokes';
import { MOLECULAR_PATH_IDS, buildMolecularStrokes } from './molecularDoodles';
import { CERT_CELL_IDS } from './voronoi';

// Component-level proof of verify-report W2 / spec "VoronoiCellField's SVG
// MUST NOT stretch non-uniformly once height is dynamic": BOTH the cells svg
// and the doodle svg must carry a viewBox whose aspect ratio equals the real
// (measured) box, with a uniform-scale `preserveAspectRatio`.
let stubs: LayoutStubs;

beforeEach(() => {
  stubs = installLayoutStubs({ reducedMotion: true });
});

afterEach(() => {
  restoreLayoutStubs();
});

function renderField(lang: 'en' | 'es' = 'en') {
  const { container } = renderWithLang(<VoronoiCellField onOpenCell={() => {}} />, { lang });
  const cellsSvg = container.querySelector('svg.distinctions-cells-svg') as SVGSVGElement;
  const doodleSvg = container.querySelector('svg[aria-hidden="true"]') as SVGSVGElement;
  return { container, cellsSvg, doodleSvg };
}

describe('VoronoiCellField SVG viewBoxes', () => {
  it('falls back to the 900px design height before the first measurement', () => {
    const { cellsSvg, doodleSvg } = renderField();
    expect(cellsSvg.getAttribute('viewBox')).toBe('0 0 1440 900');
    expect(doodleSvg.getAttribute('viewBox')).toBe('0 0 1440 900');
  });

  it.each([700, 900, 1400])(
    '%ipx: the doodle svg tracks the measured height and never stretches',
    (height) => {
      stubs.setHeight(height);
      const { cellsSvg, doodleSvg } = renderField();
      expect(cellsSvg.getAttribute('viewBox')).toBe(`0 0 1440 ${height}`);
      expect(doodleSvg.getAttribute('viewBox')).toBe(`0 0 1440 ${height}`);
      // `none` is what stretched the old fixed-900 viewBox by 1.56x at 1400
      // and squashed it by 0.78x at 700; `meet` scales uniformly.
      expect(doodleSvg.getAttribute('preserveAspectRatio')).toBe('xMinYMin meet');
    },
  );

  it('follows the section when it is resized after mount', () => {
    stubs.setHeight(900);
    const { doodleSvg } = renderField();
    expect(doodleSvg.getAttribute('viewBox')).toBe('0 0 1440 900');
    stubs.resize(1400);
    expect(doodleSvg.getAttribute('viewBox')).toBe('0 0 1440 1400');
    stubs.resize(700);
    expect(doodleSvg.getAttribute('viewBox')).toBe('0 0 1440 700');
  });
});

// ---------------------------------------------------------------------------
// 6.2 wiring: the molecular doodles ride the SAME paint/rAF loop as the mascot
// and stay static under prefers-reduced-motion.
// ---------------------------------------------------------------------------
describe('VoronoiCellField molecular doodle wiring', () => {
  function molecularPaths(container: HTMLElement) {
    return Object.fromEntries(
      MOLECULAR_PATH_IDS.map((_, i) => {
        const svg = container.querySelector('svg[aria-hidden="true"]') as SVGSVGElement;
        const node = svg.querySelectorAll('path')[DOODLE_PATH_IDS.length + i] as SVGPathElement;
        return [MOLECULAR_PATH_IDS[i], node];
      }),
    );
  }

  it('reduced motion: all 5 are painted once in the frozen pose at the measured height, and NO animation loop starts', () => {
    stubs.setHeight(700);
    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    const { container } = renderField();
    const nodes = molecularPaths(container);
    const expected = buildMolecularStrokes({
      t: 0,
      jitterOn: false,
      height: 700,
      color: '#e0452b',
    });
    expect(Object.keys(nodes)).toEqual(MOLECULAR_PATH_IDS);
    expected.forEach((s) => {
      const node = nodes[s.id];
      expect(node.getAttribute('d')).toBe(s.d);
      expect(node.getAttribute('d')?.startsWith('M')).toBe(true);
      expect(node.getAttribute('stroke')).toBe('#e0452b');
      expect(node.getAttribute('fill')).toBe('none');
      expect(node.getAttribute('stroke-width')).toBe('3.2');
    });
    expect(raf).not.toHaveBeenCalled();
  });

  it('the doodles add no interactive element: still exactly the 9 certificate cells are buttons and tab stops', () => {
    stubs.setHeight(900);
    const { container } = renderField();
    expect(within(container).getAllByRole('button')).toHaveLength(9);
    const svg = container.querySelector('svg[aria-hidden="true"]') as SVGSVGElement;
    expect(svg.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(9);
  });

  it('motion on: one shared rAF loop redraws the molecular doodles on every new boil frame', () => {
    restoreLayoutStubs();
    stubs = installLayoutStubs({ reducedMotion: false });
    stubs.setHeight(900);
    let tick: FrameRequestCallback = () => {};
    const raf = vi.fn((cb: FrameRequestCallback) => {
      tick = cb;
      return 1;
    });
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const { container } = renderField();
    const nodes = molecularPaths(container);

    // exactly ONE loop was started for the whole layer (mascot + molecular)
    expect(raf).toHaveBeenCalledTimes(1);
    const now = performance.now();
    act(() => tick(now + 1000));
    const first = Object.fromEntries(
      MOLECULAR_PATH_IDS.map((id) => [id, nodes[id].getAttribute('d')]),
    );
    act(() => tick(now + 1400)); // 0.4s later = 3 boil frames on
    expect(raf).toHaveBeenCalledTimes(3); // each tick re-arms the SAME loop, nothing else schedules frames
    MOLECULAR_PATH_IDS.forEach((id) => {
      expect(first[id]?.startsWith('M')).toBe(true);
      expect(nodes[id].getAttribute('d')).not.toBe(first[id]);
    });
  });
});

// Phase 4.2: localized title/intro, cert title/labelMeta, and the per-cell
// "Open scan" aria-label. Without these, switching `pick(cert.title, lang)`
// back to `.en` (or reverting the heading) would leave every other test in
// this file green -- these are the only assertions with teeth on the es
// output specifically.
describe('VoronoiCellField localized content (Phase 4.2, es)', () => {
  it('renders the es heading and intro', () => {
    renderField('es');
    expect(screen.getByRole('heading', { name: es.distinctions.heading })).toBeInTheDocument();
    expect(screen.getByText(es.distinctions.intro)).toBeInTheDocument();
  });

  it('gives every cert cell an es "Open scan" aria-label with no leftover {title} token', () => {
    renderField('es');
    for (const id of CERT_CELL_IDS) {
      const cert = CERTIFICATIONS_BY_ID[id];
      const expected = format(es.distinctions.openScanAriaLabel, { title: pick(cert.title, 'es') });
      expect(screen.getByRole('button', { name: expected })).toBeInTheDocument();
      expect(expected).not.toContain('{title}');
    }
  });

  it('shows each cert label in es (title + labelMeta), not the en fallback', () => {
    const { container } = renderField('es');
    for (const cert of CERTIFICATIONS) {
      const label = Array.from(container.querySelectorAll('.distinctions-label--cert')).find(
        (el) => el.querySelector('.distinctions-label__number')?.textContent === cert.number,
      );
      expect(label, cert.id).toBeTruthy();
      expect(within(label as HTMLElement).getByText(cert.title.es)).toBeInTheDocument();
      expect(within(label as HTMLElement).getByText(cert.labelMeta.es)).toBeInTheDocument();
      if (cert.title.es !== cert.title.en) {
        expect(within(label as HTMLElement).queryByText(cert.title.en)).toBeNull();
      }
    }
  });
});
