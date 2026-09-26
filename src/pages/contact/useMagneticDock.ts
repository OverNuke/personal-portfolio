import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '../../shell/usePrefersReducedMotion';

// Per-card Gaussian falloff, verified verbatim at
// docs/_decoded/contact-section-v2-standalone/template.html lines 574-589
// (`dockStrength` default 22%, `dockSpread` default 260px). This is NOT the
// pre-reset useDockFollow.ts math (since deleted) -- that
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
// Height the DOCK_SPREAD/DOCK_SPREAD_Y_FACTOR tuning above was calibrated
// against -- the original fixed 900px-tall contact-screen. Container
// heights other than this baseline scale the vertical spread
// proportionally so the falloff keeps responding across the section's
// *actual* rendered height instead of clustering inside the old fixed-900
// card band. See sdd/continuous-scroll-and-doodles/spec,
// `continuous-scroll-layout` capability, "Contact falloff across full
// rendered height" scenario.
const DOCK_SPREAD_BASELINE_HEIGHT = 900;

/**
 * Pure Gaussian falloff for the magnetic-dock hover effect, extracted from
 * `paint()` so it can be exercised without touching the DOM
 * (useMagneticDock.test.ts). `containerHeight` defaults to the historical
 * 900px baseline the constants above were tuned against, so callers that
 * don't pass it reproduce the exact previously shipped response.
 */
export function computeMagneticFalloff(
  pointer: { x: number; y: number },
  cardCenter: { x: number; y: number },
  containerHeight: number = DOCK_SPREAD_BASELINE_HEIGHT,
): number {
  const heightScale = containerHeight / DOCK_SPREAD_BASELINE_HEIGHT;
  const dx = (pointer.x - cardCenter.x) / DOCK_SPREAD;
  const dy = (pointer.y - cardCenter.y) / (DOCK_SPREAD * DOCK_SPREAD_Y_FACTOR * heightScale);
  return Math.exp(-(dx * dx + dy * dy));
}

/**
 * A continuous, non-committing hover effect (same rationale the pre-reset
 * hook's own comment gave: no state machine, no gesture-inertia
 * requirements) -- writes `transform`/`zIndex` directly to each card's style
 * on `pointermove`/`pointerleave`, never through `setState`, so a re-render
 * never happens on mousemove.
 *
 * Reduced-motion short-circuit (missing from the pre-reset version, added
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
      // Read the container's *actual* rendered height on every paint --
      // once the shell rewrite (Phase 7) makes section height fluid, this
      // is no longer a constant 900.
      const containerHeight = container!.offsetHeight || DOCK_SPREAD_BASELINE_HEIGHT;
      cardRefs.current.forEach((card) => {
        if (!card) return;
        if (!pointer) {
          card.style.transform = 'translateY(0) scale(1)';
          card.style.zIndex = '1';
          return;
        }
        const cardCenter = {
          x: card.offsetLeft + card.offsetWidth / 2,
          y: card.offsetTop + card.offsetHeight / 2,
        };
        const falloff = computeMagneticFalloff(pointer, cardCenter, containerHeight);
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
