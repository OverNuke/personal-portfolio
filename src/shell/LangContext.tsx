import { createContext, useContext } from 'react';

export type Lang = 'en' | 'es';

interface LangContextValue {
  lang: Lang;
  toggleLang: () => void;
}

// Held at the shell level (App.tsx), above <Shell/>, per docs/03: both the
// decoded mockup's own `state.lang` and the old quarantined Shell.tsx kept
// this above any individual screen so toggling it survives navigation.
// Context (not a prop) because the shell renders the five screens as opaque
// components (no router any more), so it can't pass a prop to each one.
export const LangContext = createContext<LangContextValue | null>(null);

export function useLang(): LangContextValue {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error('useLang must be called within LangContext.Provider (see App.tsx).');
  }
  return context;
}
