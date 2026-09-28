import type { KeyboardEvent } from 'react';
import type { ChamberData } from './chambersData';

// Verified state machine, matching both the decoded template's `status`
// field (`locked ? 'bonded' : on ? 'binding' : 'separate'`, template.html
// line 443) and docs/04_COMPONENT_RULES.MD's contract exactly.
export type ChamberState = 'separate' | 'binding' | 'bonded';

interface ChamberProps {
  chamber: ChamberData;
  /** The chamber's accessible name, e.g. `"Programming languages — Java,
   *  JavaScript, TypeScript, Python"`. Computed by the caller via
   *  `chamberAriaLabel(chamber, lang)` (chambersData.ts) so this component
   *  itself stays lang-agnostic -- it never calls `useLang()`. */
  ariaLabel: string;
  /** Each dot's localized label, keyed by `dot.id` (Phase 4.1). Computed by
   *  the caller via `chamberDotLabels`/`pick` -- Chamber itself stays
   *  `useLang()`-free, same reasoning as `ariaLabel` above. */
  dotLabels: Record<string, string>;
  /** The chamber's localized `separate`/`binding`/`bonded` status word
   *  (`t.profile.chamberStatus[state]`), rendered as the small aria-hidden
   *  corner label -- visible chrome text, so it needs translating too
   *  (Phase 4.1), even though it's redundant with `aria-pressed` for
   *  assistive tech. */
  statusLabel: string;
  state: ChamberState;
  onEnter: () => void;
  onLeave: () => void;
  onToggleBonded: () => void;
}

/**
 * Real, keyboard-operable UI -- NOT a decorative effect (docs/04). Each
 * chamber is `role="button" tabIndex={0} aria-pressed={state === 'bonded'}`,
 * activated by click or Enter/Space, exactly matching the decoded template's
 * `onClick`/`onKeyDown` pair (`if (e.key === 'Enter' || e.key === ' ')
 * { e.preventDefault(); ...toggle } `, template.html line 448) and the
 * pre-reset `Chamber.tsx` precedent's contract.
 *
 * Visual fusion (dots merging into the fused word) tracks the decoded
 * source's own `on = hover === i || locked` (template.html line 421) --
 * i.e. it previews on hover/focus (`binding`) and stays fused once toggled
 * (`bonded`), not just on `bonded` alone. `aria-pressed` still only reflects
 * the committed `bonded` state, matching the toggle-button semantics the
 * decoded template's own `aria-pressed="{{ cell.pressed }}"` uses (`pressed`
 * is driven by `locked`, never by hover alone).
 *
 * The always-derivable text equivalent for the fusion effect lives in the
 * `ariaLabel` prop (`"<fused> — <dot>, <dot>, ..."`) on the button root,
 * independent of hover/bonded state -- the dot labels and fused word inside
 * are marked `aria-hidden` so they never double- or conflict-announce
 * against that single accessible name. **Corrected 2026-09-27
 * (`profile-acrostic-i18n`, Phase 5):** this used to read `chamber.ariaLabel`,
 * as if it were a static field on the chamber data object -- stale since the
 * i18n work made it a caller-computed prop instead (`chamberAriaLabel(chamber,
 * lang)`, `chambersData.ts`), because a lang-dependent string can't be
 * precomputed at import time. `dotLabels` and `statusLabel` (see the prop
 * doc comments above) follow the exact same caller-computes pattern for the
 * same reason -- `Chamber` itself never calls `useLang()`.
 */
function Chamber({
  chamber,
  ariaLabel,
  dotLabels,
  statusLabel,
  state,
  onEnter,
  onLeave,
  onToggleBonded,
}: ChamberProps) {
  const bonded = state === 'bonded';
  const fused = state !== 'separate';

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleBonded();
    }
  }

  return (
    <div
      className="profile-chamber"
      role="button"
      tabIndex={0}
      aria-pressed={bonded}
      aria-label={ariaLabel}
      onClick={onToggleBonded}
      onKeyDown={handleKeyDown}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      {/* Goo-filtered dot layer -- shared <filter id="profileGoo"> applied
          via CSS, defined once at the Profile page level (docs/04), not
          duplicated per chamber. */}
      <div className="profile-chamber__dots" aria-hidden="true">
        {chamber.dots.map((dot) => {
          const restLeft = dot.baseX - dot.size / 2;
          const restTop = dot.baseY - dot.size / 2;
          const translateX = fused ? dot.fusedX - dot.baseX : 0;
          const translateY = fused ? dot.fusedY - dot.baseY : 0;
          const scale = fused ? 1.14 : 1;
          return (
            <span
              key={dot.id}
              className="profile-chamber__dot-wrap"
              style={{ left: restLeft, top: restTop, animation: dot.drift }}
            >
              <span
                className="profile-chamber__dot"
                style={{
                  width: dot.size,
                  height: dot.size,
                  background: fused ? 'var(--color-profile-accent)' : '#f3f1e8',
                  animation: dot.wobble,
                  transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                }}
              />
            </span>
          );
        })}
      </div>

      {/* Per-dot mouse-hover zones (template.html lines 374-376) -- hovering
          anywhere in this 156px-560px band previews the fusion; clicking
          anywhere in the whole chamber (the outer div's own onClick above)
          toggles it, which is a deliberate, verified asymmetry in the
          decoded source, not a simplification. */}
      {chamber.zones.map((zone, zoneIndex) => (
        <span
          key={zoneIndex}
          className="profile-chamber__zone"
          style={{ left: zone.left, width: zone.width }}
          onPointerEnter={onEnter}
          onPointerLeave={onLeave}
        />
      ))}

      <div className="profile-chamber__meta" aria-hidden="true">
        <span className="profile-chamber__index">({chamber.index})</span>
        <div className="profile-chamber__labels" style={{ opacity: fused ? 0 : 1 }}>
          {chamber.dots.map((dot) => (
            <span key={dot.id} className="profile-chamber__label">
              {dotLabels[dot.id]}
            </span>
          ))}
        </div>
      </div>

      {/* Spec `profile-acrostic`: the fused word's first letter is wrapped so
          the 5 chambers' initials read K-E-V-I-N top-to-bottom. Still inside
          the aria-hidden fused word -- the initial has no independent
          accessible meaning, it's a visual-only accent on decorative text
          (docs/05); the real accessible name is `ariaLabel` above, unaffected
          by this span. Colored via `.profile-chamber__initial` in profile.css
          (`--color-profile-initial`, decision #522) -- see that file's
          comment and contrast.test.ts for the measured ratios. */}
      <div
        className="profile-chamber__fused"
        aria-hidden="true"
        style={{ opacity: fused ? 1 : 0, transform: fused ? 'translateY(0)' : 'translateY(10px)' }}
      >
        <span className="profile-chamber__initial">{chamber.fused[0]}</span>
        {chamber.fused.slice(1)}
      </div>

      <div className="profile-chamber__status" aria-hidden="true">
        {statusLabel}
      </div>
    </div>
  );
}

export default Chamber;
