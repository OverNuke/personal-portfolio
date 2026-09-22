import { useEffect, useState } from 'react';

// Home's own arrow-key nav-focus cycling -- docs/04_COMPONENT_RULES.MD
// bucket-2 contract ("reusable/testable interaction logic -> custom hook,
// component stays render-only"), same shape as the precedent
// src/pages/contact/useMagneticDock.ts. Verified verbatim from the decoded
// `Component` class (docs/_decoded/index/template.html lines 579-588,
// restated in docs/11_HANDOFF_HOME.md's "Keyboard arrow-key cycling" table
// and docs/03_UX_ARCHITECTURE.MD):
//
//   componentDidMount() attaches a window-level keydown listener, removed in
//   componentWillUnmount() -- i.e. active only while Home is mounted.
//   ArrowRight/ArrowDown -> move(+1); ArrowLeft/ArrowUp -> move(-1); both
//   preventDefault(). move(d) advances with wraparound:
//   focus = (focus + d + ORDER.length) % ORDER.length.
//
// This is a *simulated* highlight only (docs/11's "Real activation vs.
// simulated focus" section) -- it never touches document.activeElement or
// tabIndex. onMouseEnter on each row writes to this exact same state (see
// Home.tsx), matching the decoded source's single shared `state.focus`.
// Deliberately a plain useState, not a useMagneticDock-style direct-DOM-write
// hook: there's no per-frame/mousemove work here, just a handful of
// discrete keydown/hover events, so a normal re-render per change is fine
// and keeps the three CSS-driven visual properties (color, translateX,
// arrow opacity) simple to express as plain JSX/CSS in Home.tsx.
export function useNavFocusCycle(itemCount: number) {
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusIndex((current) => (current + 1 + itemCount) % itemCount);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusIndex((current) => (current - 1 + itemCount) % itemCount);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itemCount]);

  return [focusIndex, setFocusIndex] as const;
}
