import { useState } from 'react';
import { useSectionNav } from '../shell/SectionNavContext';
import { sectionHash } from '../shell/sectionHash';
import InkBloomCanvas from './profile/InkBloomCanvas';
import Chamber from './profile/Chamber';
import type { ChamberState } from './profile/Chamber';
import { CHAMBERS } from './profile/chambersData';
import './profile/profile.css';

// Real Profile screen (Phase 8). Layout, copy, and effect math verified
// against docs/_decoded/profile-section-v4-standalone/template.html in full
// -- see src/pages/profile/chambersData.ts and InkBloomCanvas.tsx for the
// per-value citations. Heading level is h2, matching this repo's
// established Contact/Projects precedent (both use h2 for their real
// screen headline, one level below a document h1 that doesn't exist in this
// single-page scroll shell).
//
// Hover/bonded state lives here (bucket-2-adjacent: Chamber itself stays
// render-only per docs/04, all state transitions are owned by the parent),
// mirroring the decoded source's own single-component `state = { hover,
// locked }` (template.html line 398) split across React's per-screen state
// instead of one class field.
function Profile() {
  const { goToSection } = useSectionNav();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [bonded, setBonded] = useState<Record<number, boolean>>({});

  function chamberState(index: number): ChamberState {
    if (bonded[index]) return 'bonded';
    if (hoveredIndex === index) return 'binding';
    return 'separate';
  }

  return (
    <div data-testid="screen-profile" className="profile-screen">
      {/* Ink-bloom canvas + its radial-glow overlay -- one fully decorative
          subtree per docs/05 (never partially aria-hidden). */}
      <div className="profile-bg" aria-hidden="true">
        <InkBloomCanvas />
        <div className="profile-bg__glow" />
      </div>

      <div className="profile-intro">
        {/* Matches the decoded source exactly: a rule with no adjacent
            label text (template.html line 341-344 has an empty second
            child) -- not a gap to fill in, the mockup itself ships this
            eyebrow blank. */}
        <div className="profile-eyebrow">
          <span className="profile-eyebrow__rule" aria-hidden="true" />
        </div>

        <h2 data-screen-heading tabIndex={-1} className="profile-headline">
          Junior
          <br />
          software
          <br />
          engineer
        </h2>

        <p className="profile-bio">
          Just graduated from Universidad Veracruzana. Small projects so far — and the appetite for one that makes a
          change.
        </p>

        <div className="profile-footer">
          <span className="profile-footer__rule" aria-hidden="true" />
          <span className="profile-footer__note">Always learning · open to travel</span>
          {/* Decoded source is a plain `<a href="#">` placeholder (a
              standalone mockup has nowhere real to link to) -- in this
              scrolling app "Get in touch" has a real destination, so this is
              ported as a real anchor to the Contact section (activated
              through the shell's scroll-to-section) rather than a dead one, matching the Contact-build precedent of upgrading
              placeholder mockup affordances into real functional ones. */}
          <a
            href={sectionHash('contact')}
            onClick={(event) => {
              event.preventDefault();
              goToSection('contact');
            }}
            className="profile-footer__cta"
          >
            Get in touch →
          </a>
        </div>
      </div>

      {/* "Looking for an opportunity" -- the pulsing dot is decorative, the
          label text is real content and stays reachable (docs/05). */}
      <div className="profile-status">
        <span className="profile-status__dot" aria-hidden="true" />
        <span>Looking for an opportunity</span>
      </div>

      {/* Shared SVG goo filter (docs/04: "defined once at the Profile page
          level... each Chamber applies it via CSS filter, it does not own
          or duplicate the filter definition itself"). stdDeviation is the
          decoded default: goo = (4 + (gooiness/100)*8).toFixed(1) with
          gooiness's own default of 60 -> 4 + 0.6*8 = 8.8 (template.html
          line 402/396's data-props default). */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="profileGoo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8.8" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" />
          </filter>
        </defs>
      </svg>

      <div className="profile-chambers">
        {CHAMBERS.map((chamber, index) => (
          <Chamber
            key={chamber.index}
            chamber={chamber}
            state={chamberState(index)}
            onEnter={() => setHoveredIndex(index)}
            onLeave={() => setHoveredIndex((current) => (current === index ? null : current))}
            onToggleBonded={() => setBonded((current) => ({ ...current, [index]: !current[index] }))}
          />
        ))}
      </div>
    </div>
  );
}

export default Profile;
