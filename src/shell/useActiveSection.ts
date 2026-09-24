import { useCallback, useEffect, useRef, useState } from 'react';

// A 1px-tall band on the viewport's vertical midline: -50% top and bottom
// leaves a zero-height root, so a section "intersects" exactly while it is
// under the middle of the screen. One active section at a time, no threshold
// tuning, and it stays correct for sections of any height.
const MIDLINE_ROOT_MARGIN = '-50% 0px -50% 0px';

// How long an explicit pill activation may suppress scroll-driven updates.
// Smooth scrolling across 4 sections takes well under a second; this is only
// the backstop for a target that can never reach the midline.
const LOCK_TIMEOUT_MS = 1000;

/**
 * Tracks which section is under the viewport midline, for the pill nav's
 * visual active state (spec `nav-model`: scroll-driven, visual-only -- this
 * hook never touches focus or the live region).
 *
 * `lockTo(id)` is for explicit activation: it marks the target active
 * immediately and ignores intermediate sections the scroll animation passes
 * through (otherwise the highlight would flicker across every pill in
 * between), until the target itself is reported, or `LOCK_TIMEOUT_MS` passes.
 *
 * Generic over DOM ids so it knows nothing about routes/pages; `ids` must be
 * stable (module constant or memoised) or the observer is rebuilt each render.
 */
export function useActiveSection(ids: readonly string[]) {
  const [activeId, setActiveId] = useState(ids[0]);
  const lockRef = useRef<{ id: string; timer: number } | null>(null);

  const releaseLock = useCallback(() => {
    if (lockRef.current) window.clearTimeout(lockRef.current.timer);
    lockRef.current = null;
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id;
          const lock = lockRef.current;
          if (lock) {
            if (id !== lock.id) continue; // still travelling to the target
            releaseLock();
          }
          setActiveId(id);
        }
      },
      { rootMargin: MIDLINE_ROOT_MARGIN },
    );
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [ids, releaseLock]);

  useEffect(() => releaseLock, [releaseLock]);

  const lockTo = useCallback(
    (id: string) => {
      releaseLock();
      lockRef.current = { id, timer: window.setTimeout(releaseLock, LOCK_TIMEOUT_MS) };
      setActiveId(id);
    },
    [releaseLock],
  );

  return { activeId, lockTo };
}
