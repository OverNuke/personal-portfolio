import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LangProvider, useLang } from './LangContext';

afterEach(() => {
  // jsdom's document persists across tests in this file.
  document.documentElement.lang = 'en';
});

function Consumer() {
  const { lang, setLang, t } = useLang();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="label">{t.shell.language}</span>
      <button type="button" onClick={() => setLang('es')}>
        go es
      </button>
      <button type="button" onClick={() => setLang('en')}>
        go en
      </button>
    </div>
  );
}

describe('useLang', () => {
  it('throws when called without a LangProvider ancestor', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(/useLang must be called within LangProvider/);
    consoleError.mockRestore();
  });
});

describe('LangProvider', () => {
  it('defaults to "en" and sets document.documentElement.lang on mount', () => {
    render(
      <LangProvider>
        <Consumer />
      </LangProvider>,
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByTestId('label')).toHaveTextContent('Language');
  });

  it('honors an initialLang prop', () => {
    render(
      <LangProvider initialLang="es">
        <Consumer />
      </LangProvider>,
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
    expect(document.documentElement.lang).toBe('es');
    expect(screen.getByTestId('label')).toHaveTextContent('Idioma');
  });

  it('setLang updates both React state and document.documentElement.lang, and flips back', async () => {
    const user = userEvent.setup();
    render(
      <LangProvider>
        <Consumer />
      </LangProvider>,
    );

    await user.click(screen.getByText('go es'));
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
    expect(document.documentElement.lang).toBe('es');

    await user.click(screen.getByText('go en'));
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
