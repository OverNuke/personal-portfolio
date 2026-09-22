import { createContext, useContext } from 'react';

export type Lang = 'en' | 'es';

interface LangContextValue {
  lang: Lang;
  toggleLang: () => void;
}

// Held at the shell level (App.tsx), above <Routes>, per docs/03: both the
// decoded mockup's own `state.lang` and the old quarantined Shell.tsx kept
// this above any individual screen so toggling it survives navigation.
// Context (not a prop) because route elements are rendered by React Router
// via <Outlet/>, which can't pass a prop down from the layout route.
export const LangContext = createContext<LangContextValue | null>(null);

export function useLang(): LangContextValue {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error('useLang must be called within LangContext.Provider (see App.tsx).');
  }
  return context;
}
