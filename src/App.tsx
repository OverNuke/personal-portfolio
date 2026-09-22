import { useState } from 'react';
import type { ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import Contact from './pages/Contact';
import Distinctions from './pages/Distinctions';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Projects from './pages/Projects';
import { routes } from './routes/registry';
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
 * `lang` (EN/ES) lives here, at the shell level above <Routes>, per docs/03 --
 * both the decoded mockup's own `state.lang` and the old quarantined
 * Shell.tsx held it above any individual screen so it survives navigation.
 * Passed down via React context rather than props: only 5 leaf pages need
 * it, but they're rendered by React Router via <Outlet/> (inside Shell),
 * which can't receive a prop from its layout route -- context is the only
 * option here, not just the more idiomatic one.
 *
 * Routes are generated from the registry (src/routes/registry.ts) rather
 * than hard-coded, so the 5-route table stays a single source of truth.
 */
function App() {
  const [lang, setLang] = useState<Lang>('en');
  const toggleLang = () => setLang((current) => (current === 'en' ? 'es' : 'en'));

  return (
    <LangContext.Provider value={{ lang, toggleLang }}>
      <Routes>
        <Route element={<Shell />}>
          {routes.map((route) => {
            const Page = PAGES[route.pageId];
            return <Route key={route.pageId} path={route.path} element={<Page />} />;
          })}
        </Route>
      </Routes>
    </LangContext.Provider>
  );
}

export default App;
