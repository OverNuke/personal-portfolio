import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PillNav from './PillNav';

describe('PillNav', () => {
  it('renders one real button per screen, in order, with the English-only labels', () => {
    render(<PillNav activeId="home" onNavigate={() => {}} />);
    const buttons = within(screen.getByRole('navigation', { name: 'Screens' })).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Home', 'Profile', 'Distinctions', 'Projects', 'Contact']);
  });

  it('marks only the active section with aria-current and data-active', () => {
    render(<PillNav activeId="projects" onNavigate={() => {}} />);
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
    render(<PillNav activeId="home" onNavigate={onNavigate} />);

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
});
