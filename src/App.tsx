import { useState } from 'react';
import type { ComponentType } from 'react';
import Contact from './pages/Contact';
import Distinctions from './pages/Distinctions';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Projects from './pages/Projects';
import type { PageId } from './routes/registry';
import { LangContext } from './shell/LangContext';
import type { Lang } from './shell/LangContext';
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
 * -- both the decoded mockup's own `state.lang` and the old quarantined
 * Shell.tsx held it above any individual screen so it survives navigation.
 * Passed down via React context rather than props: only 5 leaf pages need
 * it, and the shell renders them as opaque components.
 *
 * There is no router any more: the 5 screens are stacked sections of one
 * scrolling page (spec `continuous-scroll-layout`), rendered by <Shell/> in
 * the order of the registry (src/routes/registry.ts), which stays the single
 * source of truth for the section list and nav labels.
 */
function App() {
  const [lang, setLang] = useState<Lang>('en');
  const toggleLang = () => setLang((current) => (current === 'en' ? 'es' : 'en'));

  return (
    <LangContext.Provider value={{ lang, toggleLang }}>
      <Shell pages={PAGES} />
    </LangContext.Provider>
  );
}

export default App;
