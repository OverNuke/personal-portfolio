import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Chamber from './Chamber';
import { CHAMBERS } from './chambersData';

// Chamber itself never calls useLang() -- its accessible name is computed by
// the caller (Profile.tsx, via chamberAriaLabel) and passed in as a prop, so
// these two strings stand in for the en/es values without needing a
// LangProvider wrapper here.
const EN_LABEL = 'Programming languages — Java, JavaScript, TypeScript, Python';
const ES_LABEL = 'Lenguajes de programación — Java, JavaScript, TypeScript, Python';

const chamber = CHAMBERS[0]; // fused: "Key languages"
const EN_DOT_LABELS = Object.fromEntries(chamber.dots.map((dot) => [dot.id, dot.label.en]));

function renderChamber(
  ariaLabel: string,
  overrides: Partial<{ dotLabels: Record<string, string>; statusLabel: string }> = {},
) {
  return render(
    <Chamber
      chamber={chamber}
      ariaLabel={ariaLabel}
      dotLabels={overrides.dotLabels ?? EN_DOT_LABELS}
      statusLabel={overrides.statusLabel ?? 'separate'}
      state="separate"
      onEnter={vi.fn()}
      onLeave={vi.fn()}
      onToggleBonded={vi.fn()}
    />,
  );
}

describe('Chamber', () => {
  it('wraps the fused word in an aria-hidden element and uses the ariaLabel prop as the accessible name', () => {
    renderChamber(EN_LABEL);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', EN_LABEL);

    const fusedEl = button.querySelector('.profile-chamber__fused');
    expect(fusedEl).toHaveAttribute('aria-hidden', 'true');
    expect(fusedEl?.textContent).toBe(chamber.fused);
  });

  it("wraps the fused word's first letter in .profile-chamber__initial (spec profile-acrostic)", () => {
    renderChamber(EN_LABEL);
    const fusedEl = document.querySelector('.profile-chamber__fused');
    const initialEl = fusedEl?.querySelector('.profile-chamber__initial');
    expect(initialEl).not.toBeNull();
    expect(initialEl?.textContent).toBe(chamber.fused[0]);
    // The initial plus the rest of the word reconstitute the full fused word
    // exactly -- no character lost or duplicated by the wrap.
    expect(fusedEl?.textContent).toBe(chamber.fused);
  });

  it('keeps the fused word (and its initial) identical across locales -- only ariaLabel translates', () => {
    const { container: enContainer } = renderChamber(EN_LABEL);
    const { container: esContainer } = renderChamber(ES_LABEL);

    const enFused = enContainer.querySelector('.profile-chamber__fused')?.textContent;
    const esFused = esContainer.querySelector('.profile-chamber__fused')?.textContent;
    expect(enFused).toBe(chamber.fused);
    expect(esFused).toBe(chamber.fused);
    expect(enFused).toBe(esFused);

    const enButton = enContainer.querySelector('[role="button"]');
    const esButton = esContainer.querySelector('[role="button"]');
    expect(enButton).toHaveAttribute('aria-label', EN_LABEL);
    expect(esButton).toHaveAttribute('aria-label', ES_LABEL);
    expect(EN_LABEL).not.toBe(ES_LABEL);
  });

  it('renders each dot label from the dotLabels prop, not a hardcoded chamber.dots value (Phase 4.1)', () => {
    const esLabels = Object.fromEntries(
      chamber.dots.map((dot) => [dot.id, `${dot.label.en} (ES)`]),
    );
    renderChamber(EN_LABEL, { dotLabels: esLabels });
    chamber.dots.forEach((dot) => {
      expect(screen.getByText(`${dot.label.en} (ES)`)).toBeInTheDocument();
    });
  });

  it('renders the statusLabel prop as the (aria-hidden) visible status text', () => {
    renderChamber(EN_LABEL, { statusLabel: 'separado' });
    expect(document.querySelector('.profile-chamber__status')).toHaveTextContent('separado');
  });
});
