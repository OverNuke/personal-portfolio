import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { routes } from '../routes/registry';
import PillNav from './PillNav';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { useStageScale } from './useStageScale';
import './shell.css';

const REFORM_DURATION_MS = 120;

interface DisplayedScreen {
  pathname: string;
  element: ReactNode;
}

/**
 * Fixed 1440x900 stage + persistent chrome, rendered as the layout route's
 * element in App.tsx (docs/00, docs/03, docs/14).
 *
 * React Router's <Outlet/> only ever renders the *current* route match --
 * there's no built-in way to keep the outgoing screen mounted for its own
 * REFORM exit fade while the incoming screen's ENTER fade plays on top
 * (docs/14's crossfade needs both, briefly overlapping). So this component
 * captures `useOutlet()`'s element into local state and manages that overlap
 * itself, rather than relying on React Router to provide it.
 *
 * The `current`/`exiting` state sync happens directly in the render body
 * (guarded by a pathname comparison), not in a useEffect -- same convention
 * the quarantined Shell.tsx used for `mountedPath`. This matters here
 * specifically: it guarantees the new screen is already in the DOM by the
 * time this component commits, so the focus-management effect below (which
 * runs after commit) queries the *new* screen's heading, not the outgoing
 * one from a stale render.
 */
function Shell() {
  const location = useLocation();
  const outlet = useOutlet();
  const reducedMotion = usePrefersReducedMotion();
  const stageRef = useStageScale();
  const [current, setCurrent] = useState<DisplayedScreen>({
    pathname: location.pathname,
    element: outlet,
  });
  const [exiting, setExiting] = useState<DisplayedScreen | null>(null);

  if (location.pathname !== current.pathname) {
    if (!reducedMotion) {
      setExiting(current);
    }
    setCurrent({ pathname: location.pathname, element: outlet });
  }

  const activeRoute = routes.find((r) => r.path === location.pathname);
  const liveMessage = activeRoute ? `${activeRoute.navLabel}.` : '';

  // Drop the exiting layer once its REFORM fade has had time to finish.
  // Under reduced motion `exiting` is never set in the first place (hard
  // cut, matching the mockup's own literal instantaneous swap -- docs/14).
  useEffect(() => {
    if (!exiting) return;
    const timeout = window.setTimeout(() => setExiting(null), REFORM_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [exiting]);

  // Focus moves immediately on every route change, in the same tick, never
  // gated behind the crossfade -- docs/14's explicit sequencing rule ("motion
  // never gates function"). The live-region announcement doesn't need an
  // effect at all: `liveMessage` above is derived straight from
  // `location.pathname` during render, so the aria-live text updates the
  // instant this component re-renders for the new route.
  //
  // Scoped to `.screen-layer--enter` specifically, not a bare
  // `[data-screen-heading]` lookup -- while the REFORM/ENTER crossfade is
  // running (motion not reduced), the outgoing screen's `screen-layer--reform`
  // layer is still mounted *and rendered before* the incoming
  // `screen-layer--enter` layer in DOM order (see the JSX below), so an
  // unscoped querySelector would match the outgoing screen's own
  // `[data-screen-heading]` first and focus that instead of the new screen's
  // heading -- discovered via this phase's end-to-end 5-route click-through,
  // where navigating into a screen while an exit fade was still in flight
  // left focus on the *previous* screen's heading, then on <body> once that
  // exiting layer unmounted ~120ms later and carried the stale focus away
  // with it.
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('.screen-layer--enter [data-screen-heading]');
    heading?.focus();
  }, [location.pathname]);

  return (
    <div className="stage-viewport">
      <div className="stage" ref={stageRef}>
        {exiting && (
          <div className="screen-layer screen-layer--reform" key={exiting.pathname}>
            {exiting.element}
          </div>
        )}
        <div className="screen-layer screen-layer--enter" key={current.pathname}>
          {current.element}
        </div>
        <PillNav />
      </div>
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
}

export default Shell;
