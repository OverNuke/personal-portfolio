// Component-internal effect (docs/04_COMPONENT_RULES.MD bucket 1) -- owns
// its own ref + rAF loop and measures the marked DOM nodes ProjectCard
// renders (`data-mark`/`data-mk`/`data-pid`) the same way the decoded
// source's `measure()` method does (template.html lines 574-590), then
// paints mascotStrokes.ts's pure output onto a pre-rendered pool of <path>
// nodes every frame.
//
// Fully decorative (docs/05): the mascot "points at" whichever project has
// the current hover peak, but that project is already independently
// identified by its own always-visible title/tags/repo-link -- the mascot
// itself is `aria-hidden`, never a tab stop, and pinned to a static resting
// pose under prefers-reduced-motion (noise jitter and idle sway/blink/spore
// -drift all freeze; the ring/arrow/underline reveal around a hovered
// project still snaps instantly, matching useCardHover's own reduced
// -motion contract for the same shared value).
import { useEffect, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { usePrefersReducedMotion } from '../../shell/usePrefersReducedMotion';
import { buildMascotStrokes, MASCOT_PATH_IDS, MAXTAGS } from './mascotStrokes';
import type { ProjectMeasure, Rect } from './mascotStrokes';

interface CrayonMascotProps {
  containerRef: RefObject<HTMLDivElement | null>;
  valuesRef: MutableRefObject<Record<string, number>>;
  blueColor: string;
  hotColor: string;
}

// Converts a real, stage-scaled getBoundingClientRect back into the layer's
// own unscaled 1440x900 logical space -- same correction
// src/pages/contact/useMagneticDock.ts already established for this repo's
// scaled-stage shell (src/shell/useStageScale.ts).
function measureRect(container: HTMLElement, node: HTMLElement): Rect {
  const containerRect = container.getBoundingClientRect();
  const scale = container.offsetWidth ? containerRect.width / container.offsetWidth : 1;
  const nodeRect = node.getBoundingClientRect();
  const x = (nodeRect.left - containerRect.left) / (scale || 1);
  const y = (nodeRect.top - containerRect.top) / (scale || 1);
  const w = nodeRect.width / (scale || 1);
  const h = nodeRect.height / (scale || 1);
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

function measureProjects(container: HTMLElement): Record<string, ProjectMeasure> {
  const result: Record<string, ProjectMeasure> = {};
  container.querySelectorAll<HTMLElement>('[data-mark][data-mk]').forEach((node) => {
    const pid = node.dataset.mark;
    const kind = node.dataset.mk;
    if (!pid || !kind || kind === 'group') return;
    if (!node.offsetWidth && !node.offsetHeight) return;
    const entry = result[pid] ?? (result[pid] = { tags: [] });
    const rect = measureRect(container, node);
    if (kind === 'tag') {
      if (entry.tags.length < MAXTAGS) entry.tags.push(rect);
    } else if (kind === 'photo') {
      entry.photo = rect;
    } else if (kind === 'title') {
      entry.title = rect;
    } else if (kind === 'note') {
      entry.note = rect;
    }
  });
  return result;
}

function CrayonMascot({ containerRef, valuesRef, blueColor, hotColor }: CrayonMascotProps) {
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function paint(t: number, jitterOn: boolean) {
      const measures = measureProjects(container as HTMLElement);
      const strokes = buildMascotStrokes({
        t,
        jitterOn,
        hov: valuesRef.current,
        measures,
        blue: blueColor,
        hot: hotColor,
      });
      strokes.forEach((stroke) => {
        const node = pathRefs.current.get(stroke.id);
        if (!node) return;
        node.setAttribute('d', stroke.d);
        node.setAttribute('fill', stroke.fill);
        node.setAttribute('stroke', stroke.stroke);
        node.setAttribute('stroke-width', String(stroke.w));
      });
    }

    if (reducedMotion) {
      // Static resting pose, per docs/05's "settle into resting shape,
      // pinned to a static pose" contract. The hover-driven ring/arrow
      // /underline reveal still needs to repaint when hover state changes
      // (useCardHover snaps `valuesRef` instantly on focus/pointer events
      // under reduced motion) -- watched here via the same style mutations
      // useCardHover writes onto the marked nodes, rather than running a
      // continuous rAF loop just to poll for that.
      paint(0, false);
      const observer = new MutationObserver(() => paint(0, false));
      observer.observe(container, { attributes: true, subtree: true, attributeFilter: ['style'] });
      return () => observer.disconnect();
    }

    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      paint((now - start) / 1000, true);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [containerRef, valuesRef, blueColor, hotColor, reducedMotion]);

  return (
    <svg className="projects-mascot" viewBox="0 0 1440 900" aria-hidden="true" focusable="false">
      {MASCOT_PATH_IDS.map((id) => (
        <path
          key={id}
          ref={(el) => {
            if (el) pathRefs.current.set(id, el);
          }}
          d=""
          fill="none"
          stroke="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export default CrayonMascot;
