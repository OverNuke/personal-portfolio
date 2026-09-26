import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '../../shell/usePrefersReducedMotion';
import { useSectionVisible } from '../../shell/SectionVisibilityContext';

// Canvas ink-bloom background -- docs/04_COMPONENT_RULES.MD's bucket-1
// contract: a component-internal ref+useEffect effect, tightly coupled to
// Profile and non-reusable, so it owns its own rAF loop rather than exposing
// a shared hook. Ported verbatim (not simplified) from
// docs/_decoded/profile-section-v4-standalone/template.html lines 459-515
// (the `boot()`/`frame()` methods on the decoded Component class) -- 6
// procedurally-regenerated "bloom" shapes, each a noise-perturbed closed
// path (`lobe()` / the per-frame path trace) redrawn every frame with
// `mix-blend-mode:exclusion` and an age-dependent blur that sharpens then
// dissolves (docs/07: outer lobe `blur(3 + 13*t)px` fading to
// `rgba(152,148,134, 0.5*fade)`, inner lobe `blur(1.4 + 5*t)px` fading to
// `rgba(168,164,150, 0.42*fade)`).
//
// Native canvas resolution is 480x300, matching the decoded
// `<canvas width="480" height="300">` exactly, then scaled to fill the
// stage via CSS (see profile.css `.profile-ink-canvas`) -- upscaling a
// low-res canvas is a deliberate part of the bloom's soft-focus look in the
// source, not an oversight to "fix" on port.
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 300;
const BLOOM_COUNT = 6;
// docs/_decoded/.../template.html line 494: `this.props.motion ?? 50`. This
// component isn't exposed as an editable DC prop in the React port (no
// props-panel equivalent exists here), so the decoded default value (50) is
// hardcoded as a constant rather than wired to a prop nobody sets --
// judgment call, stated explicitly per the task's ambiguity-reporting rule.
const MOTION = 50;

function rnd(a: number, b: number) {
  return a + Math.random() * (b - a);
}

interface Bloom {
  x: number;
  y: number;
  rMax: number;
  sx: number;
  sy: number;
  rot: number;
  life: number;
  age: number;
  phase: number;
  k1: number;
  k2: number;
  k3: number;
  h1: number;
  h2: number;
  h3: number;
  drift: number;
  rise: number;
}

// `seed` mirrors the decoded `make(seed)` -- only the initial batch (seed =
// true) gets a randomized starting age, so blooms don't all begin/end their
// lifecycle in sync; a bloom regenerated mid-loop (seed = false) always
// restarts at age 0.
function makeBloom(seed: boolean, width: number, height: number): Bloom {
  return {
    x: rnd(0.14, 0.6) * width,
    y: rnd(0.12, 0.9) * height,
    rMax: rnd(46, 128),
    sx: rnd(0.82, 1.5),
    sy: rnd(0.6, 1.18),
    rot: rnd(0, Math.PI * 2),
    life: rnd(9, 18),
    age: seed ? rnd(0, 9) : 0,
    phase: rnd(0, 10),
    k1: rnd(0.14, 0.3),
    k2: rnd(0.07, 0.18),
    k3: rnd(0.04, 0.11),
    h1: 3 + Math.floor(rnd(0, 3)),
    h2: 5 + Math.floor(rnd(0, 3)),
    h3: 8 + Math.floor(rnd(0, 4)),
    drift: rnd(-5, 5),
    rise: rnd(-7, 3),
  };
}

// Noise-perturbed radius multiplier -- three mismatched harmonics
// (h1/h2/h3) layered on top of each other, exactly as decoded, so each
// bloom's outline is an irregular, organic blob rather than a circle.
function lobe(bloom: Bloom, t: number, ang: number) {
  const p = bloom.phase + t * 1.1;
  return (
    1 +
    bloom.k1 * Math.sin(bloom.h1 * ang + p) +
    bloom.k2 * Math.sin(bloom.h2 * ang - p * 1.4) +
    bloom.k3 * Math.sin(bloom.h3 * ang + p * 0.7)
  );
}

function tracePath(ctx: CanvasRenderingContext2D, bloom: Bloom, r: number, t: number) {
  ctx.beginPath();
  const segments = 120;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const rr = r * lobe(bloom, t, a);
    const x = Math.cos(a) * rr * bloom.sx;
    const y = Math.sin(a) * rr * bloom.sy;
    const rotatedX = bloom.x + x * Math.cos(bloom.rot) - y * Math.sin(bloom.rot);
    const rotatedY = bloom.y + x * Math.sin(bloom.rot) + y * Math.cos(bloom.rot);
    if (i === 0) ctx.moveTo(rotatedX, rotatedY);
    else ctx.lineTo(rotatedX, rotatedY);
  }
  ctx.closePath();
}

// Draws one bloom's two lobes (outer soft halo + inner sharper core) at its
// current age -- shared between the animated loop and the reduced-motion
// static frame so both paths render identically.
function drawBloom(ctx: CanvasRenderingContext2D, bloom: Bloom) {
  const t = bloom.age / bloom.life;
  const r = 8 + bloom.rMax * (1 - Math.pow(1 - t, 2.6));
  const fade = Math.min(1, t / 0.16) * Math.pow(1 - t, 1.5);

  ctx.filter = `blur(${(3 + 13 * t).toFixed(1)}px)`;
  ctx.fillStyle = `rgba(152,148,134,${(0.5 * fade).toFixed(3)})`;
  tracePath(ctx, bloom, r, bloom.age);
  ctx.fill();

  ctx.filter = `blur(${(1.4 + 5 * t).toFixed(1)}px)`;
  ctx.fillStyle = `rgba(168,164,150,${(0.42 * fade).toFixed(3)})`;
  tracePath(ctx, bloom, r * 0.54, bloom.age * 1.3);
  ctx.fill();
}

/**
 * Fully decorative -- `aria-hidden`, never a tab stop, carries no
 * information a screen-reader user needs (docs/05). Under
 * `prefers-reduced-motion: reduce` this renders one static frame and never
 * schedules a `requestAnimationFrame`, rather than animating a suppressed
 * loop in the background.
 */
function InkBloomCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const visible = useSectionVisible();
  // Owned by the component, not the effect: the effect re-runs on every
  // visibility change, and re-rolling the blooms would visibly restart the ink.
  const bloomsRef = useRef<Bloom[] | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context2d = canvas.getContext('2d');
    if (!context2d) return;
    // Re-bind to a non-nullable const so the `frame` closure below doesn't
    // need a non-null assertion on every use -- `getContext` legitimately
    // returns `CanvasRenderingContext2D | null`, but we've already checked.
    const context: CanvasRenderingContext2D = context2d;

    const width = canvas.width;
    const height = canvas.height;
    if (!bloomsRef.current) {
      bloomsRef.current = Array.from({ length: BLOOM_COUNT }, () => makeBloom(true, width, height));
    }
    const blooms = bloomsRef.current;

    if (reducedMotion) {
      context.clearRect(0, 0, width, height);
      for (const bloom of blooms) drawBloom(context, bloom);
      context.filter = 'none';
      return;
    }

    // Off-screen (W8): keep the last pose, schedule no frames. The effect
    // re-runs when the section comes back, and the loop resumes.
    if (!visible) return;

    let raf = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const speed = 0.25 + (MOTION / 100) * 1.5;
      context.clearRect(0, 0, width, height);
      for (const bloom of blooms) {
        bloom.age += dt * speed;
        if (bloom.age > bloom.life) Object.assign(bloom, makeBloom(false, width, height));
        bloom.x += bloom.drift * dt * speed * 0.6;
        bloom.y += bloom.rise * dt * speed * 0.6;
        drawBloom(context, bloom);
      }
      context.filter = 'none';
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, visible]);

  return (
    <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="profile-ink-canvas" aria-hidden="true" />
  );
}

export default InkBloomCanvas;
