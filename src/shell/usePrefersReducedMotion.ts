import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Shared `prefers-reduced-motion` check -- every ambient/decorative effect
 * and the REFORM/ENTER crossfade (docs/14) needs this same short-circuit.
 * Lives in src/shell/ rather than a generic src/hooks/ bucket since the
 * shell's own crossfade is its only consumer today; per-effect components
 * built in Phase 8 (Ink Flow Background, ink-bloom canvas, etc.) each own
 * their own reduced-motion check per docs/04's component-internal-effect
 * contract, they don't share this one.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(QUERY);
    function handleChange(event: MediaQueryListEvent) {
      setReduced(event.matches);
    }
    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, []);

  return reduced;
}
