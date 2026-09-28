import { describe, expect, it } from 'vitest';
import {
  checkLightbox,
  dialogFitsViewport,
  findSmallTargets,
  hasHorizontalOverflow,
  lightboxMatchesCell,
  meetsStageViewportOverflowContract,
  shouldFailRun,
} from './audit-checks.mjs';

/**
 * Contract for `.stage-viewport`'s computed overflow (src/shell/shell.css), the
 * one static guard the collage audit keeps on the shell's horizontal
 * containment.
 *
 * The continuous-scroll shell ships `overflow-x: clip` (task 7.1). The audit
 * pins that as a static guard (policy / defense in depth, not a measured leak:
 * removing the clip does not make the page scroll horizontally today). It has
 * to be `clip`, never `hidden`: a non-visible/non-clip value on one axis
 * promotes the other axis from `visible` to `auto`, which would turn the
 * wrapper into a scroll container and capture the document's vertical scroll.
 * So the computed pair the audit accepts is exactly `clip/visible` (or
 * `clip/clip`).
 */
describe('meetsStageViewportOverflowContract', () => {
  it('accepts the shipped contract: overflow-x clip with a visible y axis', () => {
    expect(meetsStageViewportOverflowContract('clip', 'visible')).toBe(true);
  });

  it('accepts clip on both axes (still not a scroll container)', () => {
    expect(meetsStageViewportOverflowContract('clip', 'clip')).toBe(true);
  });

  it.each(['visible', 'auto', 'scroll'])(
    'rejects x = %s (would permit horizontal scroll or leak the pre-transform box)',
    (x) => {
      expect(meetsStageViewportOverflowContract(x, 'visible')).toBe(false);
    },
  );

  it.each(['auto', 'scroll', 'hidden'])(
    'rejects y = %s (would make the wrapper a scroll container that captures document scroll)',
    (y) => {
      expect(meetsStageViewportOverflowContract('clip', y)).toBe(false);
    },
  );

  it('rejects the pre-continuous-scroll contract, hidden/hidden', () => {
    expect(meetsStageViewportOverflowContract('hidden', 'hidden')).toBe(false);
  });

  it('rejects hidden on x even though it also clips: it forces y to auto, so the valid pair cannot occur', () => {
    expect(meetsStageViewportOverflowContract('hidden', 'auto')).toBe(false);
    expect(meetsStageViewportOverflowContract('hidden', 'visible')).toBe(false);
  });

  it('rejects a missing computed style (nothing was measured)', () => {
    expect(meetsStageViewportOverflowContract(null, null)).toBe(false);
    expect(meetsStageViewportOverflowContract(undefined, 'visible')).toBe(false);
  });
});

// The audit measures the painted stage's right edge against the viewport with this same predicate
// (`overflow-x: clip` hides real overflow from the document's own scrollWidth, so that alone proves little).
describe('hasHorizontalOverflow', () => {
  it('flags content wider than the viewport', () => {
    expect(hasHorizontalOverflow(1600, 1440)).toBe(true);
  });

  it('tolerates sub-pixel rounding noise (<= 1px)', () => {
    expect(hasHorizontalOverflow(1441, 1440)).toBe(false);
    expect(hasHorizontalOverflow(390.4, 390)).toBe(false);
  });

  it('flags just past the tolerance', () => {
    expect(hasHorizontalOverflow(1442, 1440)).toBe(true);
  });

  it('does not flag content narrower than the viewport', () => {
    expect(hasHorizontalOverflow(390, 1440)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Phone-scale audit (change `mobile-visibility-scanmodal`, Domain 4).
//
// The Distinctions lightbox is portaled OUTSIDE the scaled stage (the one
// real-pixel exception to the fixed 1440px design width), so at 390px it is
// audited as a real dialog: it must fit, not overflow, not clip its own text
// and keep its controls >= 24px (WCAG 2.5.8). The pill nav and the Voronoi
// cells are scaled with the stage (~0.27), so their sub-24px sizes at 390px
// are REPORTED, never gating (redesign = follow-up change `mobile-pill-nav`).
// ---------------------------------------------------------------------------

const rect = (x, y, width, height) => ({ x, y, width, height, right: x + width });

/** A well-behaved 390px lightbox snapshot; each test breaks exactly one thing. */
const fittingLightbox = (overrides = {}) => ({
  documentScrollWidth: 390,
  documentClientWidth: 390,
  dialogRect: rect(0, 0, 390, 600),
  controls: [
    { selector: 'a.distinctions-modal__open', rect: rect(10, 540, 200, 44) },
    { selector: 'button.distinctions-modal__close', rect: rect(220, 540, 150, 44) },
  ],
  clipCandidates: [
    {
      selector: 'h3#distinctions-modal-title',
      clientWidth: 300,
      clientHeight: 30,
      scrollWidth: 300,
      scrollHeight: 30,
      overflowX: 'visible',
      overflowY: 'visible',
    },
  ],
  ...overrides,
});

describe('findSmallTargets', () => {
  const elements = [
    { selector: 'button.pill-nav__button', rect: rect(0, 0, 40, 8) },
    { selector: 'path[data-card="ai"]', rect: rect(0, 0, 30, 30) },
    { selector: 'path[data-card="toefl"]', rect: rect(0, 0, 24, 24) },
    { selector: 'path[data-card="tiny"]', rect: rect(0, 0, 23, 60) },
  ];

  it('returns only the targets below 24x24 on either axis, keeping their selector and rect', () => {
    const small = findSmallTargets(elements);
    expect(small.map((e) => e.selector)).toEqual([
      'button.pill-nav__button',
      'path[data-card="tiny"]',
    ]);
    expect(small[0].rect).toEqual(rect(0, 0, 40, 8));
  });

  it('treats exactly 24x24 as compliant (WCAG 2.5.8 is a minimum)', () => {
    expect(findSmallTargets([elements[2]])).toEqual([]);
  });

  it('honours a custom minimum', () => {
    expect(findSmallTargets(elements, 44).map((e) => e.selector)).toEqual([
      'button.pill-nav__button',
      'path[data-card="ai"]',
      'path[data-card="toefl"]',
      'path[data-card="tiny"]',
    ]);
  });
});

describe('dialogFitsViewport', () => {
  it('accepts a dialog inside the viewport', () => {
    expect(dialogFitsViewport(rect(10, 20, 370, 500), 390)).toBe(true);
  });

  it('accepts a dialog that exactly spans the viewport, and sub-pixel noise', () => {
    expect(dialogFitsViewport(rect(0, 0, 390, 500), 390)).toBe(true);
    expect(dialogFitsViewport(rect(0, 0, 390.6, 500), 390)).toBe(true);
  });

  it('rejects a dialog whose right edge leaves the viewport', () => {
    expect(dialogFitsViewport(rect(0, 0, 392.2, 500), 390)).toBe(false);
  });

  it('rejects a dialog pushed off the left edge', () => {
    expect(dialogFitsViewport(rect(-20, 0, 380, 500), 390)).toBe(false);
  });

  it('rejects a dialog whose top is above the fold (its header cannot be reached)', () => {
    expect(dialogFitsViewport(rect(0, -30, 390, 500), 390)).toBe(false);
  });

  it('rejects a missing dialog (nothing was measured)', () => {
    expect(dialogFitsViewport(null, 390)).toBe(false);
  });
});

describe('checkLightbox', () => {
  it('reports nothing for a dialog that fits, does not clip and has big-enough controls', () => {
    expect(checkLightbox(fittingLightbox(), 390)).toEqual([]);
  });

  it('reports lightbox-not-opened when there is no dialog to measure', () => {
    const findings = checkLightbox(fittingLightbox({ dialogRect: null }), 390);
    expect(findings.map((f) => f.type)).toEqual(['lightbox-not-opened']);
  });

  it('reports document-level horizontal overflow', () => {
    const findings = checkLightbox(fittingLightbox({ documentScrollWidth: 420 }), 390);
    expect(findings.map((f) => f.type)).toEqual(['lightbox-overflow']);
    expect(findings[0].detail).toContain('420');
  });

  it('reports a dialog that sticks out of the viewport even when the document does not scroll', () => {
    const findings = checkLightbox(fittingLightbox({ dialogRect: rect(0, 0, 392.2, 600) }), 390);
    expect(findings.map((f) => f.type)).toEqual(['lightbox-overflow']);
    expect(findings[0].detail).toContain('392');
  });

  it('reports a text element that clips its own text', () => {
    const clipped = {
      selector: 'span.distinctions-modal__meta',
      clientWidth: 100,
      clientHeight: 20,
      scrollWidth: 240,
      scrollHeight: 20,
      overflowX: 'hidden',
      overflowY: 'visible',
    };
    const base = fittingLightbox();
    const findings = checkLightbox(
      fittingLightbox({ clipCandidates: [...base.clipCandidates, clipped] }),
      390,
    );
    expect(findings.map((f) => f.type)).toEqual(['lightbox-clipped-text']);
    expect(findings[0].detail).toContain('span.distinctions-modal__meta');
  });

  it('reports a control below 24x24 and names it with its size', () => {
    const findings = checkLightbox(
      fittingLightbox({
        controls: [{ selector: 'button.distinctions-modal__close', rect: rect(0, 0, 34.5, 20) }],
      }),
      390,
    );
    expect(findings.map((f) => f.type)).toEqual(['lightbox-target-size']);
    expect(findings[0].detail).toContain('button.distinctions-modal__close');
    expect(findings[0].detail).toContain('35x20');
  });

  it('reports every distinct problem, one finding each', () => {
    const findings = checkLightbox(
      fittingLightbox({
        documentScrollWidth: 500,
        controls: [{ selector: 'a.distinctions-modal__open', rect: rect(0, 0, 10, 10) }],
      }),
      390,
    );
    expect(findings.map((f) => f.type).sort()).toEqual([
      'lightbox-overflow',
      'lightbox-target-size',
    ]);
  });
});

// A forced click on a "breathing" cell can land on a neighbour, so the audit
// must verify the dialog it measured is the one for the cell it meant to open.
describe('lightboxMatchesCell', () => {
  it('matches when the dialog title is the one named in the cell aria-label', () => {
    expect(lightboxMatchesCell('Open scan — ANFECA Diploma', 'ANFECA Diploma')).toBe(true);
  });

  it('rejects a neighbouring cell dialog', () => {
    expect(lightboxMatchesCell('Open scan — ANFECA Diploma', 'SEP English Diploma')).toBe(false);
  });

  it('ignores whitespace differences (title wrapped across lines)', () => {
    expect(lightboxMatchesCell('Open scan — SEP  English\nDiploma', ' SEP English Diploma ')).toBe(
      true,
    );
  });

  it('does not match on a title that is only a suffix of the label text', () => {
    expect(lightboxMatchesCell('Open scan — Advanced AI Fundamentals', 'AI Fundamentals')).toBe(
      false,
    );
  });

  it('rejects missing input (nothing was read)', () => {
    expect(lightboxMatchesCell(null, 'ANFECA Diploma')).toBe(false);
    expect(lightboxMatchesCell('Open scan — ANFECA Diploma', null)).toBe(false);
    expect(lightboxMatchesCell('Open scan — ANFECA Diploma', '')).toBe(false);
  });

  // Phase 6 (bilingual audit): the aria-label's leading boilerplate is
  // t.distinctions.openScanAriaLabel, which is "Open scan — {title}" in en
  // but "Ver documento — {title}" in es (src/i18n/es.ts) -- a different
  // string, not just a different language flag. The stripped prefix must be
  // derived from the shared em-dash separator, not a hardcoded "Open scan"
  // literal, or every es-locale lightbox check would report a false
  // lightbox-wrong-dialog finding.
  it('matches an es-locale label ("Ver documento — ...") against the same title', () => {
    expect(lightboxMatchesCell('Ver documento — Diploma SEP de Inglés', 'Diploma SEP de Inglés')).toBe(
      true,
    );
  });

  it('rejects a neighbouring cell dialog under the es-locale label', () => {
    expect(lightboxMatchesCell('Ver documento — Diploma SEP de Inglés', 'ANFECA Diploma')).toBe(
      false,
    );
  });
});

describe('shouldFailRun', () => {
  const gating = { type: 'lightbox-overflow', message: 'dialog overflows' };
  const legacy = { type: 'occlusion', message: 'a overlaps b' };
  const reported = { type: 'target-size', message: 'pill is 40x8px', reportOnly: true };
  const skipped = { type: 'occlusion', message: 'skipped check', skipped: true };

  it('passes when there are no findings at all', () => {
    expect(shouldFailRun([])).toBe(false);
  });

  it('passes when the only findings are report-only (pill nav / Voronoi at phone scale)', () => {
    expect(shouldFailRun([reported, reported])).toBe(false);
  });

  it('passes when the only findings are skipped checks', () => {
    expect(shouldFailRun([skipped])).toBe(false);
  });

  it('fails on a lightbox finding even alongside report-only ones', () => {
    expect(shouldFailRun([reported, gating])).toBe(true);
  });

  it('still fails on a legacy (desktop) finding', () => {
    expect(shouldFailRun([legacy])).toBe(true);
    expect(shouldFailRun([reported, skipped, legacy])).toBe(true);
  });
});
