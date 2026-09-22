// Certificate-scan lightbox. Phase 7 left this as a named placeholder path
// (`src/pages/distinctions/ScanModal.tsx`) but did not create the file --
// built fresh here per docs/04_COMPONENT_RULES.MD's contract, which is
// itself derived verbatim from the decoded template's own gate
// (`if (!id || this.props.lightbox === false) return;`, template.html line
// 828) and the quarantined ScanModal.tsx precedent's contract cited there.
//
// Real, keyboard-dismissable dialog (docs/05):
// - `role="dialog" aria-modal="true"`.
// - Focus moves to the close button on open (template.html line
//   502's `aria-label="Close scan viewer"`).
// - `Escape` closes (`this.onKey = (e) => { if (e.key === 'Escape')
//   this.close(); }`, template.html line 864).
// - `Tab`/`Shift+Tab` trapped within the dialog's own focusable elements,
//   computed live via `querySelectorAll('button, [href],
//   [tabindex]:not([tabindex="-1"])')` (verbatim from the quarantined
//   contract).
// - Clicking the overlay closes it; a click on the dialog itself stops
//   propagation.
// - Focus returns to the triggering cell on close -- owned by the PARENT
//   (Distinctions.tsx holds the trigger element ref, since it's the one
//   that received the `onOpenCell(id, triggerElement)` callback), this
//   component only needs to know it's closing.
import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { usePrefersReducedMotion } from '../../shell/usePrefersReducedMotion';
import { blink } from './strokeMath';

const FOCUSABLE_SELECTOR = 'button, [href], [tabindex]:not([tabindex="-1"])';

// Eye geometry ported verbatim from template.html lines 660-661
// (`EYE_SHAPE`/`EYE_BROW`) -- the lightbox's own decorative blinking eye,
// distinct from the two small doodle "colony eye" images VoronoiCellField
// renders (those are static PNGs; this one is drawn live as SVG, tracking
// the pointer and blinking on the same shared `blink()` cycle).
const EYE_SHAPE: number[][] = [
  [18, 75],
  [58, 33],
  [130, 21],
  [202, 35],
  [243, 75],
  [199, 117],
  [130, 129],
  [57, 114],
];
const EYE_BROW: number[][] = [
  [40, 18],
  [96, 2],
  [162, 1],
  [216, 15],
];

function smoothEye(pts: number[][], closed: boolean): string {
  const n = pts.length;
  if (n < 2) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p1 = pts[i % n];
    const p2 = pts[(i + 1) % n];
    const p0 = closed ? pts[(i - 1 + n) % n] : pts[Math.max(i - 1, 0)];
    const p3 = closed ? pts[(i + 2) % n] : pts[Math.min(i + 2, n - 1)];
    d +=
      `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)},` +
      `${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)},` +
      `${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + (closed ? 'Z' : '');
}

const EYE_SHAPE_D = smoothEye(EYE_SHAPE, true);
const EYE_BROW_D = smoothEye(EYE_BROW, false);
// App-shell doodle override (docs/01/docs/02): `#e0452b`, not the
// standalone default `#2b39c7`.
const DOODLE_EYE_COLOR = '#e0452b';

export interface ScanModalProps {
  isOpen: boolean;
  title: string;
  meta: string;
  /** `undefined` when this certification has no captured scan yet --
   *  renders the "scan not yet available" placeholder state instead of a
   *  broken image (see distinctionsData.ts's mapping note). */
  imageSrc?: string;
  imageAlt: string;
  onClose: () => void;
}

function ScanModal({ isOpen, title, meta, imageSrc, imageAlt, onClose }: ScanModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lidRef = useRef<SVGGElement | null>(null);
  const eyeShapeRef = useRef<SVGPathElement | null>(null);
  const eyeBrowRef = useRef<SVGPathElement | null>(null);
  const irisRef = useRef<SVGCircleElement | null>(null);
  const glintRef = useRef<SVGCircleElement | null>(null);
  const plateRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Focus the close button on open; trap Tab/Shift+Tab within the dialog;
  // Escape closes.
  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Decorative blinking/iris-tracking eye, only relevant when there's no
  // scan image to show. Pinned to a single static pose under reduced
  // motion (docs/05) -- one paint, no rAF loop, no pointer tracking.
  useEffect(() => {
    if (!isOpen || imageSrc) return;

    function paint(t: number) {
      if (eyeShapeRef.current) eyeShapeRef.current.setAttribute('d', EYE_SHAPE_D);
      if (eyeBrowRef.current) eyeBrowRef.current.setAttribute('d', EYE_BROW_D);
      // Idle ambient iris drift when no pointer position is tracked inside
      // the modal (this port doesn't wire up global pointer tracking for
      // the lightbox the way the decoded source's shared `this.mx/my` did
      // -- the eye only shows when there's no scan to look at anyway, so an
      // idle wander reads the same as source's own no-mouse-yet fallback:
      // `dx = Math.sin(t * 0.6) * 12, dy = Math.cos(t * 0.45) * 6`).
      const dx = reducedMotion ? 0 : Math.sin(t * 0.6) * 12;
      const dy = reducedMotion ? 0 : Math.cos(t * 0.45) * 6;
      if (irisRef.current) {
        irisRef.current.setAttribute('cx', String(130 + dx * 0.62));
        irisRef.current.setAttribute('cy', String(75 + dy * 0.62));
      }
      if (glintRef.current) {
        glintRef.current.setAttribute('cx', String(130 + dx * 0.62 - 9));
        glintRef.current.setAttribute('cy', String(75 + dy * 0.62 - 10));
      }
      // Eyelid blink: scale the whole lid group vertically around its own
      // center (template.html line 800: `translate(130 75) scale(1 k)
      // translate(-130 -75)`), not a per-shape hack.
      const k = reducedMotion ? 1 : blink(t);
      if (lidRef.current) {
        lidRef.current.setAttribute('transform', `translate(130 75) scale(1 ${k.toFixed(3)}) translate(-130 -75)`);
      }
    }

    if (reducedMotion) {
      paint(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      paint((now - start) / 1000);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, imageSrc, reducedMotion]);

  if (!isOpen) return null;

  function handleOverlayClick() {
    onClose();
  }

  function handleDialogClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <div className="distinctions-modal-overlay" onClick={handleOverlayClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="distinctions-modal-title"
        className="distinctions-modal"
        onClick={handleDialogClick}
      >
        <div className="distinctions-modal__header">
          <h3 id="distinctions-modal-title" className="distinctions-modal__title">
            {title}
          </h3>
          <span className="distinctions-modal__meta">{meta}</span>
        </div>

        <div ref={plateRef} className="distinctions-modal__plate">
          {imageSrc ? (
            <img src={imageSrc} alt={imageAlt} className="distinctions-modal__scan" />
          ) : (
            <>
              {/* The "Drop the scan" placeholder is always visible (not
                  hover-gated) -- that hover-reveal in the decoded source was
                  the DC bundler's own content-authoring affordance, not a
                  real end-user interaction on the shipped site, so hiding
                  informational text behind hover here would be a real a11y
                  regression rather than a faithful port (judgment call,
                  disclosed in the final report). */}
              <p className="distinctions-modal__placeholder-text">Scan not yet available</p>
              <svg viewBox="0 0 260 150" className="distinctions-modal__eye" aria-hidden="true" focusable="false">
                <g ref={lidRef}>
                  <path
                    ref={eyeShapeRef}
                    d={EYE_SHAPE_D}
                    fill="#efece1"
                    stroke={DOODLE_EYE_COLOR}
                    strokeWidth={4.5}
                    strokeLinejoin="round"
                  />
                  <circle ref={irisRef} cx={130} cy={75} r={27} fill={DOODLE_EYE_COLOR} />
                  <circle ref={glintRef} cx={121} cy={65} r={8} fill="#f4f1e6" />
                </g>
                <path ref={eyeBrowRef} d={EYE_BROW_D} fill="none" stroke={DOODLE_EYE_COLOR} strokeWidth={4.5} strokeLinecap="round" />
              </svg>
            </>
          )}
        </div>

        <div className="distinctions-modal__footer">
          <span className="distinctions-modal__footer-label">scan viewer</span>
          {/* Real, native <button> -- Enter/Space activation needs no
              custom key handling, matching this repo's established Contact
              -card precedent for native interactive elements (docs/05). */}
          <button
            ref={closeButtonRef}
            type="button"
            className="distinctions-modal__close"
            aria-label="Close scan viewer"
            onClick={onClose}
          >
            close · esc
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScanModal;
