import { useEffect, useRef } from 'react';

const STAGE_WIDTH = 1440;
const STAGE_HEIGHT = 900;

/**
 * Letterboxes the fixed 1440x900 stage to the viewport (docs/00: "letterboxed
 * / scaled fixed-size stage on smaller viewports", no responsive redesign).
 * Computes a uniform "contain" scale factor and writes it straight to a CSS
 * custom property (`--stage-scale`) on the returned ref's element instead of
 * driving it through React state -- avoids a re-render on every resize.
 *
 * Interpretation note (docs/00 names two candidate mechanisms --
 * `aspect-ratio` or `transform: scale()` -- without picking one): this uses
 * `transform: scale()` on a fixed 1440x900 box centered by its flex-centered
 * parent, since flexbox centers the box's untransformed layout size and the
 * transform's default center origin keeps it centered after scaling.
 */
export function useStageScale() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // TS doesn't carry the non-null narrowing above across this nested
    // function's boundary, even though `element` is a `const` -- assert it
    // explicitly rather than re-checking on every resize event.
    function updateScale() {
      const scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
      element!.style.setProperty('--stage-scale', String(scale));
    }

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return ref;
}
