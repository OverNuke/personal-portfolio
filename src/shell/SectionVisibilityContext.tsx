import { createContext, useContext } from 'react';

// Whether THIS screen's section is on (or within a hair of) the viewport. Held
// per section by <Shell/>, which owns the observer; every screen is always
// mounted (docs/03), so this is the only thing telling a continuous effect loop
// that nobody can see it and it should stop scheduling frames.
//
// The default is `true` -- fail open. A screen rendered outside the shell (a
// test, a story) or before the observer's first callback simply animates; the
// worst case of a missing signal is the old always-running behaviour, never a
// frozen screen.
export const SectionVisibilityContext = createContext(true);

/** `false` only while the enclosing section is fully off-screen. Pause effect loops on it; never unmount. */
export function useSectionVisible(): boolean {
  return useContext(SectionVisibilityContext);
}
