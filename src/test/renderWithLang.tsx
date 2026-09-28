import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { Lang } from '../i18n/types';
import { LangProvider } from '../shell/LangContext';

interface RenderWithLangOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Defaults to `"en"`, matching `LangProvider`'s own default. */
  lang?: Lang;
}

/**
 * `render()` pre-wrapped in a `LangProvider`, for any component/page that
 * calls `useLang()` (directly or through a descendant). Without this, such
 * a render throws `useLang must be called within LangProvider`.
 *
 * `renderWithLang(<Profile />, { lang: 'es' })` renders straight into the
 * Spanish locale -- no toggle click needed first.
 */
export function renderWithLang(
  ui: ReactElement,
  { lang, ...options }: RenderWithLangOptions = {},
): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => <LangProvider initialLang={lang}>{children}</LangProvider>,
    ...options,
  });
}
