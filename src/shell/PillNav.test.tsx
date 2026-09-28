import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLang } from '../test/renderWithLang';
import PillNav from './PillNav';

describe('PillNav', () => {
  it('renders one real button per screen, in order, with the pill labels from the dictionary', () => {
    renderWithLang(<PillNav activeId="home" onNavigate={() => {}} />);
    const buttons = within(screen.getByRole('navigation', { name: 'Screens' })).getAllByRole(
      'button',
    );
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Home',
      'Profile',
      'Distinctions',
      'Projects',
      'Contact',
    ]);
  });

  it('renders the Spanish pill labels and landmark name when mounted in the es locale', () => {
    renderWithLang(<PillNav activeId="home" onNavigate={() => {}} />, { lang: 'es' });
    const buttons = within(screen.getByRole('navigation', { name: 'Pantallas' })).getAllByRole(
      'button',
    );
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Inicio',
      'Perfil',
      'Distinciones',
      'Proyectos',
      'Contacto',
    ]);
  });

  it('marks only the active section with aria-current and data-active', () => {
    renderWithLang(<PillNav activeId="projects" onNavigate={() => {}} />);
    const projects = screen.getByRole('button', { name: 'Projects' });
    const contact = screen.getByRole('button', { name: 'Contact' });

    expect(projects).toHaveAttribute('aria-current', 'page');
    expect(projects).toHaveAttribute('data-active');
    expect(contact).not.toHaveAttribute('aria-current');
    expect(contact).not.toHaveAttribute('data-active');
  });

  it('activating a pill asks to scroll to THAT section (click, Enter and Space all work on a native button)', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderWithLang(<PillNav activeId="home" onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: 'Distinctions' }));
    expect(onNavigate).toHaveBeenLastCalledWith('distinction');

    screen.getByRole('button', { name: 'Contact' }).focus();
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenLastCalledWith('contact');

    screen.getByRole('button', { name: 'Profile' }).focus();
    await user.keyboard(' ');
    expect(onNavigate).toHaveBeenLastCalledWith('profile');
    expect(onNavigate).toHaveBeenCalledTimes(3);
  });

  describe('language toggle (pill chrome)', () => {
    it('renders a group of 2 aria-pressed buttons outside the Screens nav, EN active by default', () => {
      renderWithLang(<PillNav activeId="home" onNavigate={() => {}} />);
      const group = screen.getByRole('group', { name: 'Language' });
      const nav = screen.getByRole('navigation');
      // The toggle is a SIBLING of the nav, not nested inside it -- Shell's
      // and the audit script's "5 pill buttons inside .pill-nav" scoping
      // must not pick up these 2 extra buttons.
      expect(nav.contains(group)).toBe(false);

      expect(within(group).getByRole('button', { name: 'EN' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(within(group).getByRole('button', { name: 'ES' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('clicking ES flips the toggle AND translates the Screens pill labels and landmark name', async () => {
      const user = userEvent.setup();
      renderWithLang(<PillNav activeId="home" onNavigate={() => {}} />);

      await user.click(screen.getByRole('button', { name: 'ES' }));

      expect(screen.getByRole('button', { name: 'ES' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false');
      expect(
        within(screen.getByRole('navigation', { name: 'Pantallas' }))
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['Inicio', 'Perfil', 'Distinciones', 'Proyectos', 'Contacto']);
    });

    it('clicking EN while already EN is a no-op (mirrors the guard in Home\'s own toggle)', async () => {
      const user = userEvent.setup();
      renderWithLang(<PillNav activeId="home" onNavigate={() => {}} />);

      await user.click(screen.getByRole('button', { name: 'EN' }));

      expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
