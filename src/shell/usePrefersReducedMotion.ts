import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Shared `prefers-reduced-motion` check. Lives in src/shell/ rather than a
 * generic src/hooks/ bucket since the shell is its main consumer (Shell.tsx
 * downgrades smooth scrolling to `auto` under it; the pill nav's own
 * transition is a plain CSS `prefers-reduced-motion` override, docs/14). The
 * REFORM/ENTER route crossfade this comment used to name was retired when the
 * screens became scroll sections (docs/14). Per-effect components (Ink Flow
 * Background, ink-bloom canvas, etc.) each own their own reduced-motion check
 * per docs/04's component-internal-effect contract; a few (e.g.
 * VoronoiCellField) import this hook.
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
