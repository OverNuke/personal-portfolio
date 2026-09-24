import { useEffect, useRef } from 'react';

export const STAGE_WIDTH = 1440;

/**
 * The stage's uniform scale factor: viewport width over the 1440px design
 * width, and nothing else. Viewport height must never enter this -- the stage
 * is now one continuously-scrollable column of 5 stacked sections (spec
 * `continuous-scroll-layout`), so a short window scrolls instead of shrinking
 * the stage, and a tall one has more to scroll past instead of letterboxing.
 * Uncapped on purpose: a viewport wider than 1440px scales the stage up so it
 * always fills the width (there are no side bars any more).
 */
export function computeStageScale(viewportWidth: number): number {
  return viewportWidth / STAGE_WIDTH;
}

/**
 * Scales the 1440px-wide, natural-height stage to the viewport width (docs/00:
 * fixed-width stage, no responsive redesign). Writes two CSS custom
 * properties straight onto the returned `viewportRef` element instead of
 * driving them through React state -- avoids a re-render on every resize:
 *
 *  - `--stage-scale`: `computeStageScale(width)`, applied by shell.css as
 *    `transform: scale()` with a top-left origin on `.stage` (and on the fixed
 *    pill nav, which lives outside the stage so it can stay put while the page
 *    scrolls).
 *  - `--stage-height`: the stage's natural, UNSCALED height in px (a
 *    ResizeObserver on `stageRef`'s element, read from `offsetHeight` -- not
 *    `getBoundingClientRect`, which would already include the scale). A CSS
 *    transform doesn't change layout size, so the `.stage-scaler` wrapper needs
 *    `stage-height * stage-scale` to make the document exactly as tall as the
 *    scaled stage (no dead space below Contact) and `1440 * scale` wide (no
 *    horizontal scrollbar).
 *
 * Width comes from `documentElement.clientWidth` (excludes the vertical
 * scrollbar, which is always present now) with `innerWidth` as the fallback:
 * scaling from `innerWidth` alone would overshoot by the scrollbar's width and
 * force a horizontal scrollbar. The two are identical wherever scrollbars are
 * overlaid.
 */
export function useStageScale() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;

    // TS doesn't carry the non-null narrowing above across these nested
    // functions' boundary, even though both are `const`s -- assert them
    // explicitly rather than re-checking on every event.
    function updateScale() {
      const width = document.documentElement.clientWidth || window.innerWidth;
      viewport!.style.setProperty('--stage-scale', String(computeStageScale(width)));
    }
    function updateHeight() {
      viewport!.style.setProperty('--stage-height', String(stage!.offsetHeight));
    }

    updateScale();
    updateHeight();
    window.addEventListener('resize', updateScale);
    const observer = new ResizeObserver(updateHeight);
    observer.observe(stage);
    return () => {
      window.removeEventListener('resize', updateScale);
      observer.disconnect();
    };
  }, []);

  return { viewportRef, stageRef };
}
