import { useId } from 'react';
import type { CSSProperties } from 'react';
import { usePrefersReducedMotion } from '../../shell/usePrefersReducedMotion';

// Static print-grain texture -- copied verbatim (byte-for-byte data URI) from
// the decoded nested component, not regenerated.
const GRAIN_DATA_URI =
  "url(data:image/svg+xml;utf8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27220%27%20height=%27220%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.85%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27220%27%20height=%27220%27%20filter=%27url%28%23n%29%27%20opacity=%270.55%27/%3E%3C/svg%3E)";

interface RingSpec {
  left: string;
  top: string;
  width: string;
  height: string;
  animation: 'ifA' | 'ifB' | 'ifC' | 'ifD';
  durationMultiplier: number;
  /** `circle` or an `ellipse <rx>% <ry>%` shape for the repeating-radial-gradient. */
  shape: string;
  dotRadius: number;
  maskRadius: string;
}

// The "dark ring field" -- ink-colored dot rings over the paper, masked by a
// diagonal fade. Every left/top/width/height/animation/dot-radius/mask value
// below is copied verbatim from the decoded nested component
// (docs/_decoded/main-page-standalone/assets/ffce4155-*.html) -- pure literal
// geometry, not derived, so it's kept as plain data rather than "computed."
const DARK_RINGS: RingSpec[] = [
  { left: '20%', top: '34%', width: '44%', height: '52%', animation: 'ifA', durationMultiplier: 38, shape: 'circle', dotRadius: 1.5, maskRadius: '58%' },
  { left: '-6%', top: '52%', width: '34%', height: '44%', animation: 'ifB', durationMultiplier: 31, shape: 'ellipse 62% 48%', dotRadius: 1.45, maskRadius: '56%' },
  { left: '46%', top: '58%', width: '38%', height: '46%', animation: 'ifC', durationMultiplier: 44, shape: 'circle', dotRadius: 1.4, maskRadius: '54%' },
  { left: '4%', top: '14%', width: '30%', height: '38%', animation: 'ifD', durationMultiplier: 27, shape: 'ellipse 54% 62%', dotRadius: 1.45, maskRadius: '52%' },
  { left: '60%', top: '22%', width: '34%', height: '40%', animation: 'ifB', durationMultiplier: 35, shape: 'circle', dotRadius: 1.35, maskRadius: '46%' },
  { left: '28%', top: '74%', width: '30%', height: '34%', animation: 'ifA', durationMultiplier: 24, shape: 'ellipse 58% 52%', dotRadius: 1.4, maskRadius: '54%' },
];

// The "light ring field" -- the same swirl geometry reversed out (lighter
// dots) inside the black ink mass, screen-blended. A 3-item subset of
// DARK_RINGS's geometry, per the decoded source.
const LIGHT_RINGS: RingSpec[] = [
  { left: '-6%', top: '52%', width: '34%', height: '44%', animation: 'ifB', durationMultiplier: 31, shape: 'ellipse 62% 48%', dotRadius: 1.45, maskRadius: '56%' },
  { left: '20%', top: '34%', width: '44%', height: '52%', animation: 'ifA', durationMultiplier: 38, shape: 'circle', dotRadius: 1.15, maskRadius: '58%' },
  { left: '28%', top: '74%', width: '30%', height: '34%', animation: 'ifA', durationMultiplier: 24, shape: 'ellipse 58% 52%', dotRadius: 1.4, maskRadius: '54%' },
];

// Design-time stage the ring geometry above was hand-tuned against. Width is a
// fixed 1440px letterbox in the continuous-scroll layout; height is fluid
// (spec: continuous-scroll-layout). `width` and `height` percentages are
// independent, so at a container taller than 1440x900 the old "height: N%"
// stretched every swirl vertically (verified by screenshot at 1400px). Each
// ring's height is therefore a fixed px length -- exactly what the decoded
// source's `height%` resolves to at 1440x900 -- so it no longer tracks the
// container's height: identical at 1440x900, proportionate at every other
// height. (`aspect-ratio` was tried first and rounds to 467.98px instead of
// 468px -- a sub-pixel raster drift at the shipped size.)
// `top`/`left` stay percentages of the container so the swirls still spread
// across the full section instead of clustering in the top 900px.
const DESIGN_STAGE_HEIGHT = 900;

/** A ring's `height%`, resolved against the 900px design stage and frozen as px. */
function ringHeight(ring: RingSpec): string {
  return `${(parseFloat(ring.height) / 100) * DESIGN_STAGE_HEIGHT}px`;
}

function ringStyle(ring: RingSpec, dotColor: string): CSSProperties {
  return {
    position: 'absolute',
    left: ring.left,
    top: ring.top,
    width: ring.width,
    height: ringHeight(ring),
    animationName: ring.animation,
    animationDuration: `calc(var(--if-spd, 1) * ${ring.durationMultiplier}s)`,
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    backgroundImage: `repeating-radial-gradient(${ring.shape} at 50% 50%, ${dotColor} 0 ${ring.dotRadius}px, transparent ${ring.dotRadius}px var(--if-gap, 7px))`,
    WebkitMaskImage: `radial-gradient(closest-side, #000 ${ring.maskRadius}, transparent 100%)`,
    maskImage: `radial-gradient(closest-side, #000 ${ring.maskRadius}, transparent 100%)`,
  };
}

interface InkFlowBackgroundProps {
  /** `accentInk` per docs/11 -- also colors the "." in "Kevin." (one prop, two usages, wired at the Home.tsx call site). */
  ink: string;
  /** `flowSpeed`, default 1.3, range 0.2-3. Multiplies every layer's animation rate. */
  speed: number;
  /** `ringGap` (px), default 7, range 4-14. */
  ringGap: number;
  /** `inkMass` -- the lower-left ink field's own color. Not wired at the Home call site (decoded source never overrides it there), default `#0c0d0a`. */
  inkMass?: string;
  /** `paperLift` -- intensity of the two upper-right paper highlight gradients, default 1. Not wired at the Home call site. */
  paperLift?: number;
  /** Default `true`. Forced to a static single frame under `prefers-reduced-motion: reduce` regardless of this prop (docs/05). */
  animate?: boolean;
}

/**
 * Home's `dc-import name="Ink Flow Background"`. Originally implemented here
 * as an invented canvas ripple effect because this component was never one
 * of the six top-level decoded mockup slugs -- it turned out to be an
 * `ext_resources` entry *inside* `main-page-standalone`'s own manifest
 * (`docs/_decoded/main-page-standalone/assets/ffce4155-*.html`), itself
 * plain readable `<x-dc>` markup, not a further-nested bundler payload.
 * `decode-mockup.mjs` writes such entries out as an opaque `.html` asset
 * file, and nobody had opened it -- see docs/11's dated correction.
 *
 * Ported here near-1:1 as layered CSS/DOM (docs/04_COMPONENT_RULES.MD
 * bucket 1: component-internal, no imperative canvas drawing needed since
 * the source itself is pure CSS: SVG turbulence+displacement filters, an
 * animated lower-left "ink mass" radial-gradient field, two masked/blended
 * dot-ring fields (dark-on-paper + light-reversed-in-ink), halftone dust,
 * a paper-highlight gradient, and a static print-grain overlay). The real
 * base surface is opaque cream paper (`#f6f4ea`), not the app shell's own
 * `#0e0f0b` -- that shell background is fully covered by this layer and
 * never actually composites under Home's text (docs/02's dated correction).
 *
 * `ifWarp`/`ifWarpSoft` filter ids are scoped per-instance via `useId()`
 * so two copies of this component could never collide on the same SVG
 * filter ids. (This used to be needed because the REFORM/ENTER crossfade
 * could briefly mount two screen layers at once; that crossfade is gone --
 * docs/14 -- and all five screens are now mounted together, but the scoping
 * is kept as a cheap safeguard.)
 *
 * Fully decorative (docs/05): `aria-hidden`, never a tab stop. Home's real
 * text (wordmark/toggle/nav list) lives entirely outside this component, at
 * a higher z-index, with its own backdrop-independent contrast -- nothing
 * here is required for legibility, whether this component is absent,
 * unloaded, or statically framed (`animate=false` pauses every animation via
 * `[data-static]`'s CSS rule rather than removing any layer).
 */
function InkFlowBackground({ ink, speed, ringGap, inkMass = '#0c0d0a', paperLift = 1, animate = true }: InkFlowBackgroundProps) {
  const reducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animate && !reducedMotion;
  const rawId = useId();
  const warpId = `ifWarp-${rawId}`;
  const warpSoftId = `ifWarpSoft-${rawId}`;

  const rootVars = {
    '--if-ink': ink,
    '--if-black': inkMass,
    '--if-gap': `${Math.max(1, ringGap)}px`,
    '--if-spd': speed <= 0 ? '1' : (1 / speed).toFixed(3),
  } as CSSProperties;

  const liftAlpha1 = (0.8 * paperLift).toFixed(3);
  const liftAlpha2 = (0.45 * paperLift).toFixed(3);

  return (
    <div className="ink-flow" style={rootVars} data-static={!shouldAnimate || undefined} aria-hidden="true">
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
        <filter id={warpId} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0055 0.0085" numOctaves={3} seed={9} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={120} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={warpSoftId} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.007 0.006" numOctaves={2} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={90} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div
        className="ink-flow__anim ink-flow__mass"
        style={{ animationDuration: 'calc(var(--if-spd, 1) * 46s)' }}
      />

      <div className="ink-flow__dark-rings" style={{ filter: `url(#${warpId})` }}>
        {DARK_RINGS.map((ring, index) => (
          <div key={index} className="ink-flow__anim" style={ringStyle(ring, 'var(--if-ink, #14150f)')} />
        ))}
      </div>

      <div className="ink-flow__light-rings" style={{ filter: `url(#${warpSoftId})` }}>
        {LIGHT_RINGS.map((ring, index) => (
          <div key={index} className="ink-flow__anim" style={ringStyle(ring, '#e9e6d8')} />
        ))}
      </div>

      <div className="ink-flow__dust" />

      <div
        className="ink-flow__lift"
        style={{
          backgroundImage: [
            `radial-gradient(54% 46% at 82% 20%, rgba(255,253,246,${liftAlpha1}), transparent 76%)`,
            `radial-gradient(42% 36% at 96% 66%, rgba(255,253,246,${liftAlpha2}), transparent 78%)`,
          ].join(','),
        }}
      />

      <div className="ink-flow__grain" style={{ backgroundImage: GRAIN_DATA_URI }} />
    </div>
  );
}

export default InkFlowBackground;
