import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '../../shell/usePrefersReducedMotion';

// Per-card Gaussian falloff, verified verbatim at
// docs/_decoded/contact-section-v2-standalone/template.html lines 574-589
// (`dockStrength` default 22%, `dockSpread` default 260px). This is NOT the
// quarantined _quarantine/src/pages/contact/useDockFollow.ts math -- that
// version computed dx/dy from the *container's* center and applied a flat
// per-card-index parallax factor. Per docs/04_COMPONENT_RULES.MD, the real
// effect computes dx/dy from each card's OWN center and drives lift/scale
// through f = exp(-(dx^2 + dy^2)), so nearby cards react strongly and far
// cards barely move at all.
const DOCK_STRENGTH = 0.22;
const DOCK_SPREAD = 260;
// Anisotropic falloff -- the decoded template divides dy by spread*2.2, so
// the effect is roughly twice as forgiving vertically as horizontally.
const DOCK_SPREAD_Y_FACTOR = 2.2;

/**
 * A continuous, non-committing hover effect (same rationale the quarantined
 * hook's own comment gave: no state machine, no gesture-inertia
 * requirements) -- writes `transform`/`zIndex` directly to each card's style
 * on `pointermove`/`pointerleave`, never through `setState`, so a re-render
 * never happens on mousemove.
 *
 * Reduced-motion short-circuit (missing from the quarantined version, added
 * here per docs/05_ACCESSIBILITY.MD): the `pointermove` listener is never
 * attached at all when the user prefers reduced motion, not just suppressed
 * after computing -- cards stay at their untransformed resting state and no
 * per-frame work happens in the background.
 */
export function useMagneticDock(cardCount: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>(Array(cardCount).fill(null));
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (reducedMotion) {
      cardRefs.current.forEach((card) => {
        if (!card) return;
        card.style.transform = '';
        card.style.zIndex = '';
      });
      return;
    }

    let raf = 0;
    let pointer: { x: number; y: number } | null = null;

    function paint() {
      cardRefs.current.forEach((card) => {
        if (!card) return;
        if (!pointer) {
          card.style.transform = 'translateY(0) scale(1)';
          card.style.zIndex = '1';
          return;
        }
        const cx = card.offsetLeft + card.offsetWidth / 2;
        const cy = card.offsetTop + card.offsetHeight / 2;
        const dx = (pointer.x - cx) / DOCK_SPREAD;
        const dy = (pointer.y - cy) / (DOCK_SPREAD * DOCK_SPREAD_Y_FACTOR);
        const falloff = Math.exp(-(dx * dx + dy * dy));
        card.style.transform =
          `translateY(${(-40 * DOCK_STRENGTH * falloff).toFixed(2)}px) ` +
          `scale(${(1 + DOCK_STRENGTH * falloff).toFixed(3)})`;
        card.style.zIndex = String(10 + Math.round(falloff * 12));
      });
    }

    function schedule() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    }

    // Convert the pointer's real (post-stage-scale) viewport position back
    // into the dock's own unscaled coordinate space, the same way the
    // decoded template does -- this project's Shell also applies a
    // `transform: scale(--stage-scale)` to the whole 1440x900 stage
    // (src/shell/useStageScale.ts), so `getBoundingClientRect()` returns a
    // scaled box while `offsetLeft`/`offsetTop`/`offsetWidth` on each card
    // stay in unscaled logical pixels. Without this correction the falloff
    // would be computed against the wrong scale below/above 1440x900.
    function handlePointerMove(event: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      const scale = container!.offsetWidth ? rect.width / container!.offsetWidth : 1;
      pointer = {
        x: (event.clientX - rect.left) / (scale || 1),
        y: (event.clientY - rect.top) / (scale || 1),
      };
      schedule();
    }

    function handlePointerLeave() {
      pointer = null;
      schedule();
    }

    paint();
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [reducedMotion]);

  return { containerRef, cardRefs };
}
