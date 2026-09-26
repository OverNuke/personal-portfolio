import { useEffect, useState } from 'react';

// Slightly NEGATIVE top/bottom margin (the viewport shrinks by 4px each way).
// Sections are 900 design-px tall, so parked on one section its neighbours sit
// exactly on the viewport's top and bottom edges, and `isIntersecting` is true
// for a target that merely touches the root. With a zero or positive margin
// those neighbours would count as visible and nothing would ever pause. 4px is
// far above sub-pixel scale rounding and far below anything a person can see.
export const VIEWPORT_ROOT_MARGIN = '-4px 0px -4px 0px';

/**
 * Which sections are on screen right now, keyed by DOM id, so each screen's
 * continuous effect loop can stop while nobody can see it (W8). This is NOT
 * `useActiveSection`: that marks the one section under the viewport midline
 * (for the pill highlight); mid-scroll two sections share the screen and both
 * must keep animating.
 *
 * Fails open: every section starts visible, and stays so if the browser has no
 * IntersectionObserver -- a missing signal means "animate", never "freeze".
 * The observer's first callback then turns the off-screen ones off.
 *
 * `ids` must be stable (module constant or memoised) or the observer is rebuilt
 * each render.
 */
export function useSectionVisibility(ids: readonly string[]): Record<string, boolean> {
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ids.map((id) => [id, true])),
  );

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((current) => {
          let next = current;
          for (const entry of entries) {
            const id = entry.target.id;
            if (current[id] === entry.isIntersecting) continue;
            if (next === current) next = { ...current };
            next[id] = entry.isIntersecting;
          }
          return next; // same object when nothing changed: no re-render of five screens
        });
      },
      { rootMargin: VIEWPORT_ROOT_MARGIN },
    );
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [ids]);

  return visible;
}
