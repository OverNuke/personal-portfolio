// Bucket-2 hook (docs/04_COMPONENT_RULES.MD): measures the real rendered
// height of the element an overlay SVG covers, so its viewBox can stay 1:1
// with CSS px (see projectsLayout.ts for why). Deliberately `clientHeight`,
// not `getBoundingClientRect`: the latter includes the Shell's outer uniform
// `transform: scale()` (src/shell/useStageScale.ts) and would mix a
// post-transform size into the pre-transform 1440-wide coordinate space the
// overlays share -- same choice as Distinctions' VoronoiCellField.
import { useLayoutEffect, useState } from 'react';
import { DESIGN_HEIGHT, resolveLayerHeight } from './projectsLayout';

/** `getTarget` runs inside the layout effect (after refs attach), so callers
 *  can hand back `ref.current` or `ref.current?.parentElement`. Seeded with
 *  DESIGN_HEIGHT so the first paint matches the shipped 900px layout. */
export function useLayerHeight(getTarget: () => HTMLElement | null | undefined): number {
  const [height, setHeight] = useState(DESIGN_HEIGHT);

  useLayoutEffect(() => {
    const target = getTarget();
    if (!target) return;
    const measure = () => {
      const next = resolveLayerHeight(target.clientHeight);
      setHeight((prev) => (prev === next ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
    // `getTarget` is a fresh closure each render by design; the target
    // element itself is stable for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return height;
}
