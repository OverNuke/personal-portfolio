import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import type { Dictionary, Lang } from '../i18n/types';

export type { Lang } from '../i18n/types';

const DICTIONARIES: Record<Lang, Dictionary> = { en, es };

interface LangContextValue {
  lang: Lang;
  /** Sets the site-wide locale directly (replaces the old binary `toggleLang`). */
  setLang: (lang: Lang) => void;
  /** The active locale's central UI/page-copy dictionary (`src/i18n`). */
  t: Dictionary;
}

// Held at the shell level (App.tsx), above <Shell/>, per docs/03 -- both the
// decoded mockup's own `state.lang` and the old pre-reset Shell.tsx held it
// above any individual screen so it survives navigation. Context (not a
// prop) because the shell renders the five screens as opaque components (no
// router any more), so it can't pass a prop to each one.
export const LangContext = createContext<LangContextValue | null>(null);

export function useLang(): LangContextValue {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error('useLang must be called within LangProvider (see App.tsx).');
  }
  return context;
}

interface LangProviderProps {
  /** Defaults to `"en"`, matching `index.html`'s static `lang="en"` for first paint. */
  initialLang?: Lang;
  children: ReactNode;
}

/**
 * Owns the site-wide EN/ES locale plus the `<html lang>` sync (one owner --
 * `index.html` only needs to be correct for first paint, per design). Wraps
 * `en`/`es` (`src/i18n`) so `t` always reflects the active locale.
 */
export function LangProvider({ initialLang = 'en', children }: LangProviderProps) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t: DICTIONARIES[lang] }}>
      {children}
    </LangContext.Provider>
  );
}
