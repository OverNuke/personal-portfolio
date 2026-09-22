// Bucket-2 hook (docs/04_COMPONENT_RULES.MD) -- ProjectCard stays
// render-only, all effect logic lives here, writing `transform`/`opacity`
// directly to each marked DOM node (no setState in the hot path, same
// rationale as src/pages/contact/useMagneticDock.ts: a continuous,
// non-committing hover effect).
//
// Math verified verbatim at
// docs/_decoded/projects-section-v2-standalone/template.html:
// - line 798: `next = current + (target - current) * 0.14` -- the
//   exponential ease-toward-target driving every card's hover-lerp.
// - lines 723-734 (`applyGroups`): each `[data-mk="group"]` node's
//   transform is `rotate(dataRot) translateY(-dataLift * hov)`, and its
//   opacity crossfades against whichever project currently has the hover
//   "peak" (`1 - 0.5 * max(0, peak - hov)`), so a non-hovered card recedes
//   slightly while another project is focused.
// - line 753 (`paint`): each `[data-mk="note"]` node's opacity is
//   `min(1, max(0, hov * 1.6 - 0.25))` -- the annotation only starts
//   fading in once its project's hover value clears ~0.16.
//
// This is the ONE shared per-project value docs/07 requires: lift, opacity,
// the mascot's doodle-aim (mascotStrokes.ts reads the same `valuesRef`),
// and the annotation reveal above all move off it, so they can never drift
// out of sync (docs' own comment: "lift + focus are driven here, on the
// same lerp as the doodles").
import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { usePrefersReducedMotion } from '../../shell/usePrefersReducedMotion';

const LERP_FACTOR = 0.14;
const SETTLE_EPSILON = 0.002;

interface FocusHandlers {
  onFocus: () => void;
  onBlur: () => void;
}

export interface CardHoverEngine {
  /** Attach to the container that wraps every project's marked elements --
   *  hover is delegated here via `closest('[data-pid]')`, matching the
   *  decoded source's own delegation strategy (over/out on the whole
   *  layer, not per-card listeners). */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Live per-project 0..1 values -- read (never written) by
   *  CrayonMascot's own rAF loop so the mascot's aim/rings move off the
   *  exact same lerp as the card lift/opacity below. */
  valuesRef: MutableRefObject<Record<string, number>>;
  handlePointerOver: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handlePointerOut: (event: ReactPointerEvent<HTMLDivElement>) => void;
  /** Keyboard-equivalence enhancement (docs/05: no information only
   *  available to mouse users) -- the decoded source's own hover-zone
   *  delegation only reacts to elements physically inside a
   *  `[data-pid]` box, and the Repository link sits just outside that box
   *  (see ProjectCard.tsx / the final report for the verified line
   *  numbers). Binding focus/blur on that link directly is a deliberate,
   *  documented addition beyond the mockup's literal mouse-only zones. */
  bindFocus: (id: string) => FocusHandlers;
}

function applyGroupStyles(container: HTMLElement, values: Record<string, number>, peak: number) {
  container.querySelectorAll<HTMLElement>('[data-mk="group"]').forEach((node) => {
    const mark = node.dataset.mark;
    if (!mark) return;
    const h = values[mark] ?? 0;
    const rot = parseFloat(node.dataset.rot ?? '0') || 0;
    const lift = parseFloat(node.dataset.lift ?? '0') || 0;
    node.style.transform = `${rot ? `rotate(${rot}deg) ` : ''}translateY(${(-lift * h).toFixed(2)}px)`;
    node.style.opacity = (1 - 0.5 * Math.max(0, peak - h)).toFixed(3);
  });
  container.querySelectorAll<HTMLElement>('[data-mk="note"]').forEach((node) => {
    const mark = node.dataset.mark;
    if (!mark) return;
    const h = values[mark] ?? 0;
    node.style.opacity = Math.min(1, Math.max(0, h * 1.6 - 0.25)).toFixed(2);
  });
}

export function useCardHover(ids: string[]): CardHoverEngine {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const hoverIdRef = useRef<string | null>(null);
  const valuesRef = useRef<Record<string, number>>(Object.fromEntries(ids.map((id) => [id, 0])));
  const peakRef = useRef(0);

  const snapInstant = useCallback(() => {
    ids.forEach((id) => {
      valuesRef.current[id] = hoverIdRef.current === id ? 1 : 0;
    });
    peakRef.current = hoverIdRef.current ? 1 : 0;
    const container = containerRef.current;
    if (container) applyGroupStyles(container, valuesRef.current, peakRef.current);
  }, [ids]);

  const setHover = useCallback(
    (id: string | null) => {
      hoverIdRef.current = id;
      if (reducedMotion) snapInstant();
    },
    [reducedMotion, snapInstant],
  );

  // The continuous rAF lerp -- reduced motion skips this entirely (per
  // docs/05's contract for the magnetic dock, extended here) and snaps to
  // the resting/final state instead via snapInstant above.
  useEffect(() => {
    if (reducedMotion) {
      snapInstant();
      return;
    }
    let raf = 0;
    function tick() {
      raf = requestAnimationFrame(tick);
      const container = containerRef.current;
      let peak = 0;
      ids.forEach((id) => {
        const target = hoverIdRef.current === id ? 1 : 0;
        const cur = valuesRef.current[id] ?? 0;
        const next = cur + (target - cur) * LERP_FACTOR;
        const settled = Math.abs(next - target) < SETTLE_EPSILON ? target : next;
        valuesRef.current[id] = settled;
        if (settled > peak) peak = settled;
      });
      peakRef.current = peak;
      if (container) applyGroupStyles(container, valuesRef.current, peak);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ids, reducedMotion, snapInstant]);

  const handlePointerOver = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const zone = (event.target as HTMLElement).closest?.('[data-pid]') as HTMLElement | null;
      setHover(zone?.dataset.pid ?? null);
    },
    [setHover],
  );

  const handlePointerOut = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const zone = (event.target as HTMLElement).closest?.('[data-pid]') as HTMLElement | null;
      if (!zone) return;
      const related = event.relatedTarget as HTMLElement | null;
      const nextZone = related?.closest?.('[data-pid]') as HTMLElement | null;
      if (nextZone && nextZone.dataset.pid === zone.dataset.pid) return;
      if (hoverIdRef.current === zone.dataset.pid) setHover(nextZone?.dataset.pid ?? null);
    },
    [setHover],
  );

  const bindFocus = useCallback(
    (id: string): FocusHandlers => ({
      onFocus: () => setHover(id),
      onBlur: () => {
        if (hoverIdRef.current === id) setHover(null);
      },
    }),
    [setHover],
  );

  return { containerRef, valuesRef, handlePointerOver, handlePointerOut, bindFocus };
}
