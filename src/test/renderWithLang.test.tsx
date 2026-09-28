import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLang } from '../shell/LangContext';
import { renderWithLang } from './renderWithLang';

function Consumer() {
  const { lang, t } = useLang();
  return <span data-testid="lang">{`${lang}:${t.shell.language}`}</span>;
}

describe('renderWithLang', () => {
  it('renders inside a LangProvider defaulting to "en"', () => {
    renderWithLang(<Consumer />);
    expect(screen.getByTestId('lang')).toHaveTextContent('en:Language');
  });

  it('accepts a lang option to render straight into "es"', () => {
    renderWithLang(<Consumer />, { lang: 'es' });
    expect(screen.getByTestId('lang')).toHaveTextContent('es:Idioma');
  });
});
