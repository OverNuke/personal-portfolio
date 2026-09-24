// Render-only per docs/04_COMPONENT_RULES.MD's bucket-3 contract -- all
// glyph/jitter math lives in glyphStrokes.ts, this component only owns the
// rAF loop and writes the resulting `d` strings onto pre-rendered <path>
// nodes (no per-frame setState/re-render, same non-committing-effect
// rationale as useMagneticDock.ts).
//
// Decorative lettering, not real text (docs/04, docs/05): the word
// "PROJECTS" is single-stroke SVG paths that redraw with jitter every
// frame, so a screen reader gets nothing from this SVG. It is `aria-hidden`
// and paired with a real, visually-hidden <h2>Projects</h2> rendered by
// Projects.tsx (Shell.tsx's `data-screen-heading` focus-management target)
// -- matching the decoded template's own choice of a clipped <h2> for this
// exact purpose (template.html line 383).
import { useEffect, useRef } from 'react';
import { getTitleStrokePaths } from './glyphStrokes';
import { layerViewBox } from './projectsLayout';
import { useLayerHeight } from './useLayerHeight';
import { usePrefersReducedMotion } from '../../shell/usePrefersReducedMotion';

const FRAME_RATE = 7.5; // Math.floor(t * 7.5), verified at template.html line 600.

interface StrokeGlyphTitleProps {
  color: string;
}

function StrokeGlyphTitle({ color }: StrokeGlyphTitleProps) {
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const svgRef = useRef<SVGSVGElement>(null);
  // The overlay covers its parent (`.projects-screen`), not itself.
  const layerHeight = useLayerHeight(() => svgRef.current?.parentElement);
  const reducedMotion = usePrefersReducedMotion();
  const initialPaths = getTitleStrokePaths(0, color);

  useEffect(() => {
    function paint(frame: number) {
      getTitleStrokePaths(frame, color).forEach((datum) => {
        pathRefs.current.get(datum.id)?.setAttribute('d', datum.d);
      });
    }

    if (reducedMotion) {
      // Static single frame -- no continuous jitter under
      // prefers-reduced-motion (docs/05/docs/07's general governance rule).
      paint(0);
      return;
    }

    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      paint(Math.floor(((now - start) / 1000) * FRAME_RATE));
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [color, reducedMotion]);

  return (
    // viewBox tracks the real section height (1 unit = 1 CSS px, top-left
    // anchored) so the default `meet` letterboxing can't shift or shrink the
    // title once the section is no longer exactly 900px tall. The strokes
    // themselves stay at their absolute design coordinates (TITLE_STROKES at
    // (76, 74)) on purpose -- they pair with `.projects-eyebrow top:78px`,
    // both top-anchored -- see projectsLayout.ts.
    <svg
      ref={svgRef}
      className="projects-title-glyphs"
      viewBox={layerViewBox(layerHeight)}
      preserveAspectRatio="xMinYMin meet"
      aria-hidden="true"
      focusable="false"
    >
      {initialPaths.map((datum) => (
        <path
          key={datum.id}
          ref={(el) => {
            if (el) pathRefs.current.set(datum.id, el);
          }}
          d={datum.d}
          fill="none"
          stroke={datum.stroke}
          strokeWidth={datum.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export default StrokeGlyphTitle;
