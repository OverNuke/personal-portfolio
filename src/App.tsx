import type { ComponentType } from 'react';
import Contact from './pages/Contact';
import Distinctions from './pages/Distinctions';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Projects from './pages/Projects';
import type { PageId } from './routes/registry';
import { LangProvider } from './shell/LangContext';
import Shell from './shell/Shell';

const PAGES: Record<PageId, ComponentType> = {
  home: Home,
  profile: Profile,
  distinction: Distinctions,
  projects: Projects,
  contact: Contact,
};

/**
 * `lang` (EN/ES) lives here, at the shell level above the screens, per docs/03
 * -- both the decoded mockup's own `state.lang` and the old pre-reset
 * Shell.tsx held it above any individual screen so it survives navigation.
 * Passed down via React context (`LangProvider`, `src/shell/LangContext.tsx`)
 * rather than props: only leaf pages need it, and the shell renders them as
 * opaque components. `LangProvider` also owns the `<html lang>` sync;
 * `index.html` keeps a static `lang="en"` for first paint.
 *
 * There is no router any more: the 5 screens are stacked sections of one
 * scrolling page (spec `continuous-scroll-layout`), rendered by <Shell/> in
 * the order of the registry (src/routes/registry.ts), which stays the single
 * source of truth for the section list and order -- nav/section labels live
 * in the central dictionary (src/i18n) as of Phase 2 of
 * `sdd/profile-acrostic-i18n`.
 */
function App() {
  return (
    <LangProvider>
      <Shell pages={PAGES} />
    </LangProvider>
  );
}

export default App;
