// Render-only-ish cell-field component per docs/04_COMPONENT_RULES.MD:
// "Bucket: pure module (bucket 3) for the geometry, render-only component
// for the cells." The geometry itself lives in voronoi.ts /
// doodleStrokes.ts (no DOM access); this component owns the
// ref+useEffect rAF loop that calls those pure functions every frame and
// writes the result straight to DOM attributes/styles (no setState in the
// hot path -- same "continuous, non-committing effect" rationale as
// src/pages/contact/useMagneticDock.ts and src/pages/projects/
// useCardHover.ts: a per-frame breathing/hover-grow/doodle-boil loop has no
// business going through React's render cycle).
//
// Every one of the 9 real certification cells is a REAL interactive
// target, ported attribute-for-attribute from the decoded template's own
// `<path role="{{c.role}}" tabindex="{{c.tab}}" aria-label="{{c.aria}}"
// onMouseEnter/onMouseLeave/onFocus/onBlur/onClick onKeyDown="{{keyOpen}}">`
// (docs/_decoded/distinction-section-v4-standalone/template.html line 395;
// docs/04, docs/05). The 3 non-interactive cells (title, and the two
// decorative "colony eye" cells `count`/`span`) get `role="presentation"
// tabIndex={-1}`, matching the decoded `renderVals()`'s own
// `interactive = c.kind === 'rec'` gate exactly.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { usePrefersReducedMotion } from '../../shell/usePrefersReducedMotion';
import {
  CELL_SEEDS,
  CERT_CELL_IDS,
  DEFAULT_GAP,
  DEFAULT_HOVER_GROWTH,
  DEFAULT_ROUNDNESS,
  DESIGN_HEIGHT,
  HOVER_LERP,
  STAGE_WIDTH,
  computeCellGeometry,
  computeLiveSeeds,
} from './voronoi';
import type { CellGeometry } from './voronoi';
import { CERTIFICATIONS_BY_ID, TITLE_CELL } from './distinctionsData';
import { computeLabelSizing } from './labelSizing';
import { buildAllDoodleStrokes } from './doodleFrame';
import DoodleLayer from './DoodleLayer';
import { blink } from './strokeMath';
import eyeLeftPaper from '../../assets/doodle/eye-left-paper.png';
import eyeRight from '../../assets/doodle/eye-right.png';

const PAPER = '#f4f1e6';
const INK = '#14150f';
const ACCENT = '#586a30';
// App-shell override (docs/01/docs/02): `#e0452b`, not the standalone
// default `#2b39c7`.
const DOODLE_COLOR = '#e0452b';

/** `count`/`span` are the two decorative "colony eye" cells -- carry no
 *  certification data, so (per the same reasoning docs/05 applies to the
 *  crayon mascot) they're treated as a fully decorative subtree: unlike the
 *  decoded source's own bare `role="presentation" tabindex="-1"`, this port
 *  also adds `aria-hidden` to their label wrapper, since nothing about them
 *  is informational -- explicit, disclosed extension of the pattern, not a
 *  literal decoded attribute. */
const EYE_CELL_IMAGES: Record<string, string> = {
  count: eyeLeftPaper,
  span: eyeRight,
};

function mixColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const A = parse(a);
  const B = parse(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

/** SVG cell paths are the trigger elements here, not HTML nodes -- both
 *  `SVGElement` and `HTMLElement` implement `focus()`/`blur()` (the DOM's
 *  `HTMLOrSVGElement` mixin), so the shared type only needs what
 *  Distinctions.tsx's focus-restoration actually calls. */
export type FocusableTrigger = HTMLElement | SVGElement;

interface VoronoiCellFieldProps {
  onOpenCell: (id: string, trigger: FocusableTrigger) => void;
}

function VoronoiCellField({ onOpenCell }: VoronoiCellFieldProps) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cellPathRefs = useRef(new Map<string, SVGPathElement>());
  const doodlePathRefs = useRef(new Map<string, SVGPathElement>());
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  const eyeImgRefs = useRef(new Map<string, HTMLImageElement>());

  const hoverIdRef = useRef<string | null>(null);
  const hoverValuesRef = useRef<Record<string, number>>(Object.fromEntries(CERT_CELL_IDS.map((id) => [id, 0])));
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  // Section height is no longer the fixed STAGE_HEIGHT=900 constant that
  // voronoi.ts used to export -- once the shell reflows to fluid content
  // height (`sdd/continuous-scroll-and-doodles` Phase 7), this container
  // renders at whatever height its content naturally takes. Seeded with
  // DESIGN_HEIGHT (900) so the very first render matches today's shipped
  // layout instead of collapsing to 0 before the first measurement.
  // `clientHeight` (not `getBoundingClientRect`, which `paint()` below uses
  // for a DIFFERENT purpose -- pointer un-projection) deliberately excludes
  // the Shell's own outer uniform `transform: scale()`, so this stays in
  // the same 1440-wide "design space" coordinate frame computeCellGeometry
  // and the SVG viewBoxes below both use -- mixing a post-transform size
  // into a pre-transform coordinate space is exactly the kind of
  // non-uniform-stretch bug this fixes (task 1.3).
  const [height, setHeight] = useState(DESIGN_HEIGHT);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const next = container.clientHeight;
      if (next > 0) setHeight((prev) => (prev === next ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Label box width / cert-name font-size are derived from each cell's
  // RESTING area (breathe: false, no hover growth), recomputed only when
  // `height` changes -- not on every animation frame, matching docs/07's
  // "breathing never reflows copy" intent. Before Phase 1
  // (`sdd/continuous-scroll-and-doodles`), this stage never resized at
  // runtime (the shell's `useStageScale` scaled the whole fixed 1440x900
  // box via a CSS transform, not a layout resize), so a one-time
  // measurement was sufficient; now that the section's actual height is
  // measured via ResizeObserver (above, in preparation for Phase 7's fluid
  // -height shell), this recomputes on the rare occasions `height` itself
  // changes, same as `paint` below.
  const labelSizing = useMemo(() => computeLabelSizing(height), [height]);

  const paint = useCallback(
    (t: number, jitterOn: boolean) => {
      const liveSeeds = computeLiveSeeds(t, height, {
        breathe: jitterOn,
        hoverGrowth: DEFAULT_HOVER_GROWTH,
        hoverValues: hoverValuesRef.current,
      });
      const cells: CellGeometry[] = computeCellGeometry(liveSeeds, height, {
        gap: DEFAULT_GAP,
        roundness: DEFAULT_ROUNDNESS,
      });

      const container = containerRef.current;
      const rect = container ? container.getBoundingClientRect() : null;
      const scale = rect && container && container.offsetWidth ? rect.width / container.offsetWidth : 1;
      const k = jitterOn ? blink(t) : 1;

      cells.forEach((cell) => {
        const h = hoverValuesRef.current[cell.id] ?? 0;

        const pathNode = cellPathRefs.current.get(cell.id);
        if (pathNode) {
          pathNode.setAttribute('d', cell.d);
          if (cell.kind === 'accent') pathNode.setAttribute('fill', ACCENT);
          else if (cell.kind === 'rec') pathNode.setAttribute('fill', h > 0.02 ? mixColor(PAPER, ACCENT, h) : PAPER);
          else pathNode.setAttribute('fill', PAPER);
        }

        const labelNode = labelRefs.current.get(cell.id);
        if (labelNode) {
          labelNode.style.left = `${cell.cx}px`;
          labelNode.style.top = `${cell.cy}px`;
          labelNode.style.transform = `translate(-50%, -50%) scale(${(1 + h * 0.05).toFixed(3)})`;
          if (cell.kind === 'rec') labelNode.style.color = h > 0.5 ? '#f6f4ea' : INK;
        }

        const eyeImg = eyeImgRefs.current.get(cell.id);
        if (eyeImg) {
          let dx = 0;
          let dy = 0;
          if (rect && pointerRef.current) {
            dx = clamp(-10, 10, ((pointerRef.current.x - rect.left) / scale - cell.cx) / 24);
            dy = clamp(-7, 7, ((pointerRef.current.y - rect.top) / scale - cell.cy) / 28);
          }
          eyeImg.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scaleY(${k.toFixed(3)})`;
        }
      });

      const doodleColor = DOODLE_COLOR;
      const strokes = buildAllDoodleStrokes({
        t,
        jitterOn,
        hoverValues: hoverValuesRef.current,
        cells,
        height,
        color: doodleColor,
      });
      strokes.forEach((stroke) => {
        const node = doodlePathRefs.current.get(stroke.id);
        if (!node) return;
        node.setAttribute('d', stroke.d);
        node.setAttribute('fill', stroke.fill);
        node.setAttribute('stroke', stroke.stroke);
        node.setAttribute('stroke-width', String(stroke.w));
      });
    },
    [height],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Paint once synchronously so cells aren't invisible/mis-sized on the
    // very first frame (matches the decoded source's own "paint positions
    // synchronously -- no first-frame pile-up"). `paint` already closes
    // over the latest `height` (useCallback dep above), and the
    // useLayoutEffect measuring `height` runs before this passive effect,
    // so this reflects the real measured height, not the DESIGN_HEIGHT
    // fallback, except on the very first commit before layout has run.
    paint(0, !reducedMotion);

    if (reducedMotion) {
      // No continuous rAF loop, no pointermove listener -- cells settle to
      // their resting (non-jittered) shape and the doodle is pinned to a
      // single static pose (docs/05). Hover-driven cell growth and the
      // mascot's arrow-aim still react to real hover/focus events (see the
      // event handlers below), just snapped instantly rather than eased.
      return;
    }

    let raf = 0;
    const start = performance.now();

    function handlePointerMove(event: PointerEvent) {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    }
    function handlePointerLeave() {
      pointerRef.current = null;
    }
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      const t = (now - start) / 1000;
      CERT_CELL_IDS.forEach((id) => {
        const target = hoverIdRef.current === id ? 1 : 0;
        const cur = hoverValuesRef.current[id] ?? 0;
        hoverValuesRef.current[id] = cur + (target - cur) * HOVER_LERP;
      });
      paint(t, true);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [paint, reducedMotion]);

  const setHover = useCallback(
    (id: string | null) => {
      hoverIdRef.current = id;
      if (reducedMotion) {
        CERT_CELL_IDS.forEach((certId) => {
          hoverValuesRef.current[certId] = hoverIdRef.current === certId ? 1 : 0;
        });
        paint(0, false);
      }
    },
    [paint, reducedMotion],
  );

  const handleEnter = useCallback((id: string) => setHover(id), [setHover]);
  const handleLeave = useCallback(
    (id: string) => {
      if (hoverIdRef.current === id) setHover(null);
    },
    [setHover],
  );
  const handleOpen = useCallback(
    (event: MouseEvent<SVGPathElement> | KeyboardEvent<SVGPathElement>) => {
      const target = event.currentTarget;
      const id = target.dataset.card;
      if (!id) return;
      onOpenCell(id, target);
    },
    [onOpenCell],
  );
  const handleKeyOpen = useCallback(
    (event: KeyboardEvent<SVGPathElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleOpen(event);
      }
    },
    [handleOpen],
  );

  return (
    <div ref={containerRef} className="distinctions-stage">
      {/* viewBox height is the REAL measured `height` state, not a fixed
          900 -- the CSS box (distinctions.css's width:100%/height:100% on
          `.distinctions-cells-svg`) is always exactly `STAGE_WIDTH x
          height` in this same pre-Shell-transform coordinate frame, so the
          viewBox and the actual box now always share the same aspect
          ratio. `preserveAspectRatio="none"` is kept for defensive
          idempotence (a same-aspect-ratio viewBox is a no-op stretch
          either way), not because it's doing the scaling work here. */}
      <svg viewBox={`0 0 ${STAGE_WIDTH} ${height}`} preserveAspectRatio="none" className="distinctions-cells-svg">
        {CELL_SEEDS.map((seed) => {
          const interactive = seed.kind === 'rec';
          const cert = interactive ? CERTIFICATIONS_BY_ID[seed.id] : undefined;
          return (
            <path
              key={seed.id}
              ref={(el) => {
                if (el) cellPathRefs.current.set(seed.id, el);
              }}
              data-cid={seed.id}
              data-card={interactive ? seed.id : undefined}
              className="distinctions-cell"
              d=""
              fill={PAPER}
              stroke={INK}
              strokeWidth={0.9}
              role={interactive ? 'button' : 'presentation'}
              tabIndex={interactive ? 0 : -1}
              aria-label={interactive && cert ? `Open scan — ${cert.title}` : undefined}
              aria-hidden={interactive ? undefined : true}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              onMouseEnter={interactive ? () => handleEnter(seed.id) : undefined}
              onMouseLeave={interactive ? () => handleLeave(seed.id) : undefined}
              onFocus={interactive ? () => handleEnter(seed.id) : undefined}
              onBlur={interactive ? () => handleLeave(seed.id) : undefined}
              onClick={interactive ? handleOpen : undefined}
              onKeyDown={interactive ? handleKeyOpen : undefined}
            />
          );
        })}
      </svg>

      <div className="distinctions-labels-layer">
        <div
          ref={(el) => {
            if (el) labelRefs.current.set('title', el);
          }}
          className="distinctions-label distinctions-label--title"
          style={{ width: labelSizing.title?.width }}
        >
          <h2 data-screen-heading tabIndex={-1} className="distinctions-heading">
            {TITLE_CELL.heading}
          </h2>
          <p className="distinctions-intro">{TITLE_CELL.intro}</p>
        </div>

        {CERT_CELL_IDS.map((id) => {
            const cert = CERTIFICATIONS_BY_ID[id];
            const sizing = labelSizing[id];
            return (
              <div
                key={id}
                ref={(el) => {
                  if (el) labelRefs.current.set(id, el);
                }}
                className="distinctions-label distinctions-label--cert"
                style={{ width: sizing?.width }}
              >
                <span className="distinctions-label__number">{cert.number}</span>
                <span className="distinctions-label__name" style={{ fontSize: sizing?.fontSize }}>
                  {cert.title}
                </span>
                <span className="distinctions-label__meta">{cert.labelMeta}</span>
              </div>
            );
          })}

        {(['count', 'span'] as const).map((id) => (
          <div
            key={id}
            ref={(el) => {
              if (el) labelRefs.current.set(id, el);
            }}
            className="distinctions-label distinctions-label--eye"
            style={{ width: labelSizing[id]?.width }}
            aria-hidden="true"
          >
            <img
              ref={(el) => {
                if (el) eyeImgRefs.current.set(id, el);
              }}
              src={EYE_CELL_IMAGES[id]}
              alt=""
              className="distinctions-eye-img"
            />
          </div>
        ))}
      </div>

      <DoodleLayer height={height} pathRefs={doodlePathRefs} />
    </div>
  );
}

export default VoronoiCellField;
