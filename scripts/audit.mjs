/* global document, getComputedStyle, NodeFilter, Node, requestAnimationFrame */

/**
 * scripts/audit.mjs -- the collage audit gate (`pnpm run audit:collage`).
 *
 * Rebuilt against the React port's real shell (docs/00, docs/03, docs/14)
 * after the full-reset rebuild from the decoded mockups. Reuses the check
 * *logic* from `_quarantine/scripts/audit.mjs` /
 * `_quarantine/scripts/audit-checks.mjs` (occlusion, WCAG 2.5.8 target-size,
 * clipped-text, horizontal-scroll) but points it at the new routes/selectors
 * and adapts the viewport-sweep strategy to this app's real, load-bearing
 * difference from the old design:
 *
 *   The old shell was RESPONSIVE -- `.shell-frame`'s CSS Grid genuinely
 *   reflowed at each of 1440/1280/1100/390px, so sweeping all four widths
 *   for every check made sense: each width was a distinct layout to audit.
 *
 *   This shell is NOT responsive (docs/00's explicit decision, restated in
 *   `03_UX_ARCHITECTURE.MD`): every screen is a fixed 1440x900 stage that
 *   gets letterboxed and uniformly SCALED via `transform: scale()` on
 *   smaller viewports (src/shell/useStageScale.ts) -- the DOM layout inside
 *   `.stage` never reflows, it only shrinks or grows as a rigid image.
 *
 * Two consequences, both implemented below:
 *
 *   1. Occlusion / target-size / clipped-text now run at exactly ONE
 *      viewport, `STAGE_WIDTH x STAGE_HEIGHT` (1440x900) -- the stage's own
 *      native size, where `--stage-scale` resolves to 1 and
 *      `getBoundingClientRect()` reports real, unscaled design pixels.
 *      Running these at e.g. 390px would just measure the same layout
 *      shrunk by `useStageScale`'s contain-fit factor -- every interactive
 *      element would "fail" WCAG 2.5.8 purely because the whole stage got
 *      smaller, which is a property of the letterbox, not a real target-size
 *      defect. `assertNativeScale` below makes this a hard precondition
 *      (exit code 2) rather than a silent assumption -- if `.stage` isn't
 *      measured at scale 1, the numbers this script would produce are
 *      meaningless, so it refuses to report findings from them.
 *   2. The old "horizontal-scroll at 390px" check becomes "the letterboxed
 *      stage never leaks a scrollbar at ANY viewport size" -- swept across
 *      the same four reference widths as before (1440/1280/1100/390) for
 *      continuity, but now asking a narrower, still-meaningful question:
 *      does `.stage-viewport`'s `overflow:hidden` + `useStageScale`'s
 *      contain-fit math actually hold at every size, rather than "does
 *      content reflow correctly", which no longer applies (content doesn't
 *      reflow at all).
 *
 * Dropped from the quarantined version: the `keep-out` check
 * (`.profile-ink-field` doesn't exist in this rebuild -- Profile's ink-bloom
 * canvas has an audited-independent contrast fix instead, see docs/02 Fix 1
 * applied to Home and the equivalent Profile treatment) and the
 * `shell-layout` check (`.nav-module`/`.main-content` don't exist -- this
 * shell has no sidebar-grid layout to guard). Both checks were selector-
 * specific to the old overlay-dashboard shell.
 *
 * Self-contained invocation: this script brings up its own Vite dev server
 * and a headless Chromium instance (via @playwright/test, already a
 * devDependency) and tears both down before exiting. The `audit:collage`
 * npm script stays a bare `node scripts/audit.mjs` -- no `pnpm build`/
 * `pnpm preview` prerequisite.
 *
 * Exit codes: 0 = no findings, 1 = findings reported, 2 = tool/infra error
 * (so CI/tasks can tell "the gate ran and found problems" apart from
 * "the gate itself is broken").
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import {
  MIN_TARGET_SIZE,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTHS,
  hasHorizontalOverflow,
  isTextClipped,
  meetsMinTargetSize,
  parseScale,
  rectsIntersect,
  unrotateElementRect,
} from './audit-checks.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Matches src/routes/registry.ts exactly -- kept as a literal list (not
// imported) since this script runs standalone under plain Node, outside
// Vite/TS module resolution.
const ROUTES = ['/', '/profile', '/distinction', '/projects', '/contact'];

async function main() {
  let server;
  let browser;
  const findings = [];

  try {
    server = await createServer({
      root: projectRoot,
      configFile: path.join(projectRoot, 'vite.config.ts'),
      server: { port: 0, watch: null },
      logLevel: 'error',
    });
    await server.listen();

    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') {
      throw new Error('Vite dev server did not report a usable address.');
    }
    // Vite's default dev server binds the IPv6 loopback (`::1`); connect via
    // the `localhost` hostname rather than assuming an IPv4 `127.0.0.1`.
    const baseUrl = `http://localhost:${address.port}`;

    try {
      browser = await chromium.launch();
    } catch (error) {
      console.error(
        'Failed to launch Chromium. If browsers are not installed, run ' +
          '`pnpm exec playwright install chromium` and retry.',
      );
      throw error;
    }

    const page = await browser.newPage();

    // Pass 1: occlusion / target-size / clipped-text, once per route, at the
    // stage's native 1440x900 size (scale === 1 -- see module doc comment).
    for (const route of ROUTES) {
      await page.setViewportSize({ width: STAGE_WIDTH, height: STAGE_HEIGHT });
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'load' });
      await waitForStable(page);
      await assertNativeScale(page, route);

      const snapshot = await page.evaluate(collectSnapshot);
      findings.push(...runContentChecks(route, snapshot));
    }

    // Pass 2: letterbox/overflow sweep across the reference viewport widths
    // -- cheap (no DOM snapshot walk), just document-level overflow.
    for (const route of ROUTES) {
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'load' });
        await waitForStable(page);

        const overflow = await page.evaluate(collectOverflowSnapshot);
        findings.push(...runOverflowChecks(route, width, overflow));
      }
    }
  } finally {
    await browser?.close();
    await server?.close();
  }

  report(findings);
  process.exitCode = findings.some((f) => !f.skipped) ? 1 : 0;
}

async function waitForStable(page) {
  // The Tailwind dev compile lands after first paint; wait until a real,
  // universal design token has resolved (defined once on :root, present on
  // every screen -- unlike the per-screen `--color-*-bg` tokens) so we
  // measure styled layout, not raw flow.
  await page
    .waitForFunction(
      () => getComputedStyle(document.documentElement).getPropertyValue('--stage-letterbox-bg').trim().length > 0,
      undefined,
      { timeout: 5000 },
    )
    .catch(() => {});

  // Wait for Shell's route-change focus-management effect to have run --
  // its target selector existing is a reliable signal the new screen has
  // actually mounted into `.screen-layer--enter` (src/shell/Shell.tsx),
  // replacing the old `.page-layer[data-phase="open"]` wait (that selector
  // no longer exists in this shell).
  await page.waitForSelector('.screen-layer--enter [data-screen-heading]', { timeout: 5000 }).catch(() => {});

  // Wait for real fonts to finish loading before measuring. Until they do,
  // text renders in a fallback font with different metrics, which can wrap
  // a heading differently and briefly sit closer to (or overlap) adjacent
  // text than it does once the real font's metrics apply (root-caused in
  // the original quarantined investigation this wait was ported from).
  await page.evaluate(() => document.fonts.ready).catch(() => {});

  // Give layout two animation frames to settle after the font-load reflow
  // above before measuring -- a single frame is not always enough for the
  // browser to have committed the reflowed layout.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

/**
 * Hard precondition for pass 1: refuses to trust any measured rect unless
 * `.stage` is actually rendering at scale 1 (see module doc comment). A
 * scrollbar, an off-by-one viewport, or a future change to
 * `useStageScale`'s contain-fit math could otherwise silently produce
 * bogus sub-24px target-size findings that have nothing to do with a real
 * defect. Throws (caught by `main`, surfaced as exit code 2) rather than
 * reporting a `finding`, since this is an audit-infrastructure failure, not
 * a layout defect the audit is designed to catch.
 */
async function assertNativeScale(page, route) {
  const scale = await page.evaluate(() => {
    const stage = document.querySelector('.stage');
    if (!stage) return null;
    return getComputedStyle(stage).transform;
  });
  if (scale === null) {
    throw new Error(`[${route}] .stage element not found -- cannot verify native (scale=1) rendering.`);
  }
  const factor = parseScale(scale);
  if (Math.abs(factor - 1) > 0.01) {
    throw new Error(
      `[${route}] .stage is rendering at scale ${factor.toFixed(3)}, not 1 -- ` +
        `refusing to run occlusion/target-size/clipped-text checks against scaled rects. ` +
        `Expected viewport ${STAGE_WIDTH}x${STAGE_HEIGHT} to produce --stage-scale: 1 exactly.`,
    );
  }
}

// Runs inside the browser via page.evaluate -- no access to the outer
// module scope, so it stays a plain, fully self-contained function body.
function collectSnapshot() {
  function isAncestorHidden(el) {
    let node = el;
    while (node) {
      if (node.hasAttribute?.('inert')) return true;
      if (node.getAttribute?.('aria-hidden') === 'true') return true;
      node = node.parentElement;
    }
    return false;
  }

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right };
  }

  function isRendered(el) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    // Excludes deliberately opacity:0 content -- e.g. `.projects-annotation`
    // (src/pages/projects/ProjectCard.tsx), which ships at `opacity: 0` by
    // default and is only revealed by useCardHover.ts writing a live
    // `style.opacity` on hover/focus. Without this, every unhovered
    // annotation would be measured as if visible and could false-positive
    // an occlusion/clipped-text finding against content it never visually
    // overlaps.
    if (parseFloat(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function describe(el) {
    if (el.id) return `#${el.id}`;
    if (typeof el.className === 'string' && el.className.trim()) {
      return `${el.tagName.toLowerCase()}.${el.className.trim().split(/\s+/).join('.')}`;
    }
    return el.tagName.toLowerCase();
  }

  // parseRotationDegrees from audit-checks.mjs can't be imported into this
  // browser-evaluated function (same constraint as isVisuallyHiddenRect
  // below -- it has to be a self-contained closure), so it is duplicated
  // here deliberately. Keep in sync with audit-checks.mjs's exported
  // version.
  function parseRotationDegreesLocal(transformValue) {
    if (!transformValue || transformValue === 'none') return 0;
    const match = /^matrix\(([^)]+)\)$/.exec(transformValue);
    if (!match) return 0;
    const [a, b] = match[1].split(',').map((part) => parseFloat(part.trim()));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return (Math.atan2(b, a) * 180) / Math.PI;
  }

  // Walking upward from a text element toward `scope`, finds the nearest
  // ancestor carrying a genuine (non-zero) rotation -- still load-bearing:
  // `.projects-card` / `.projects-flagship-badge` (src/pages/projects/
  // projects.css) carry real `transform: rotate(...)` values. Reuses a
  // shared ancestor-node -> group-index map so two siblings under the SAME
  // rotated ancestor are grouped together (their pair gets compared in
  // that ancestor's local coordinate space -- see runContentChecks'
  // occlusion check), while unrelated rotated ancestors elsewhere on the
  // page do not get conflated.
  const rotationGroups = [];
  const rotationGroupIndexByNode = new Map();
  function rotationGroupFor(el) {
    let node = el.parentElement;
    while (node) {
      const transform = getComputedStyle(node).transform;
      const angle = parseRotationDegreesLocal(transform);
      if (angle !== 0) {
        if (rotationGroupIndexByNode.has(node)) return rotationGroupIndexByNode.get(node);
        const ancestorRect = node.getBoundingClientRect();
        const index = rotationGroups.length;
        rotationGroups.push({
          angle,
          cx: ancestorRect.x + ancestorRect.width / 2,
          cy: ancestorRect.y + ancestorRect.height / 2,
        });
        rotationGroupIndexByNode.set(node, index);
        return index;
      }
      if (node === scope) break;
      node = node.parentElement;
    }
    return null;
  }

  // The whole document is one screen's worth of content -- unlike the old
  // shell (which kept Home mounted inert behind an open module), this
  // shell only ever mounts the current route's screen (plus the briefly
  // co-mounted REFORM/ENTER crossfade pair, which `waitForStable` already
  // waits out). No dialog-scoping is needed for the routes this script
  // visits (the Distinctions lightbox is never opened here).
  const scope = document.body;

  // Text-bearing elements: elements whose OWN direct text (not a
  // descendant's) is non-empty. Normal in-flow layout never overlaps two
  // of these, so any intersection found below is a genuine hazard --
  // EXCEPT an ancestor/descendant pair (e.g. an <h1> with a nested
  // decorative "<span>." dot: the parent owns "Kevin", the child owns
  // "."), which is nesting, not occlusion. relatedPairs records those
  // index pairs (computed here, where real DOM node refs are available)
  // so the Node-side occlusion check can skip them. `rotationGroup`
  // records the index into `rotationGroups` of the nearest shared rotated
  // ancestor, if any -- see runContentChecks' occlusion check.
  const textEls = [];
  const textElRefs = [];
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    const el = current;
    current = walker.nextNode();
    if (isAncestorHidden(el) || !isRendered(el)) continue;
    const ownText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? '')
      .join('')
      .trim();
    if (!ownText) continue;
    const rect = rectOf(el);
    if (isVisuallyHiddenRect(rect)) continue;
    textEls.push({
      selector: describe(el),
      rect,
      offsetWidth: el.offsetWidth,
      offsetHeight: el.offsetHeight,
      rotationGroup: rotationGroupFor(el),
    });
    textElRefs.push(el);
  }

  const relatedPairs = [];
  for (let i = 0; i < textElRefs.length; i++) {
    for (let j = i + 1; j < textElRefs.length; j++) {
      if (textElRefs[i].contains(textElRefs[j]) || textElRefs[j].contains(textElRefs[i])) {
        relatedPairs.push([i, j]);
      }
    }
  }

  // Interactive elements, for the target-size check. Includes real
  // interactive SVG cells (Distinctions' `<path role="button">`), which
  // `querySelectorAll('[role="button"]')` already covers.
  const interactiveEls = [];
  for (const el of Array.from(scope.querySelectorAll('a, button, [role="button"], input, select, textarea'))) {
    if (isAncestorHidden(el) || !isRendered(el)) continue;
    const rect = rectOf(el);
    if (isVisuallyHiddenRect(rect)) continue;
    interactiveEls.push({ selector: describe(el), rect });
  }

  // Clipped-text candidates: reuse the same own-text leaf elements as the
  // occlusion check (not "every element whose subtree contains text
  // somewhere" -- a large ancestor container's scrollWidth/scrollHeight
  // reflects its whole subtree, including content far outside its own
  // rendered text, and would false-positive on any overflow:hidden
  // ancestor used for animation/clip-path purposes).
  const clipCandidates = textElRefs.map((el, i) => {
    const style = getComputedStyle(el);
    return {
      selector: textEls[i].selector,
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth,
      scrollHeight: el.scrollHeight,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
    };
  });

  // isVisuallyHidden from audit-checks.mjs can't be imported into this
  // browser-evaluated function (it has to be a self-contained closure), so
  // its ~1px sr-only rule is duplicated here deliberately. Covers both
  // `.sr-only` (shell.css) and `.projects-sr-heading` (clip-path variant).
  function isVisuallyHiddenRect(rect) {
    return rect.width <= 1 && rect.height <= 1;
  }

  return { textEls, relatedPairs, rotationGroups, interactiveEls, clipCandidates };
}

// Lightweight overflow-only snapshot for pass 2 (letterbox sweep) -- no DOM
// walk, just the signals that matter for "does the letterboxed stage ever
// leak a scrollbar".
//
// NOTE on why this does NOT compare `.stage-viewport`'s own
// scrollWidth/clientWidth (unlike the document-level check below): `.stage`
// is a fixed-size 1440x900 flex child scaled down via
// `transform: scale()` (src/shell/useStageScale.ts). Per the CSS Overflow
// spec, `scrollWidth` reports the scrollable overflow region computed from
// the element's PRE-transform layout box, not its scaled-down painted
// size -- so at any viewport narrower than 1440px, `.stage-viewport`'s
// scrollWidth genuinely exceeds its clientWidth even though nothing is
// visually cut off or scrollable (`.stage-viewport` is `overflow:hidden`,
// not `scroll`/`auto`, so that computed-but-clipped region never produces
// an actual scrollbar or user-visible overflow). Comparing those two
// numbers here would be a guaranteed false positive at every non-1440
// width, not a real regression signal -- confirmed by first shipping that
// version of this check and observing findings at every route/width
// combination, with the document-level check (the one that DOES reflect
// something a user could ever see or scroll) clean throughout. What
// actually matters -- that the letterbox never becomes visible/scrollable
// -- is: (1) the document itself never overflows (checked below), and (2)
// `.stage-viewport` still declares `overflow: hidden` (a static regression
// guard against someone loosening that rule in shell.css and turning the
// pre-transform overflow region above into a real, user-visible scrollbar).
function collectOverflowSnapshot() {
  const stageViewport = document.querySelector('.stage-viewport');
  const stageViewportStyle = stageViewport ? getComputedStyle(stageViewport) : null;
  return {
    documentScrollWidth: document.documentElement.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    stageViewportExists: !!stageViewport,
    stageViewportOverflowX: stageViewportStyle?.overflowX ?? null,
    stageViewportOverflowY: stageViewportStyle?.overflowY ?? null,
  };
}

// If `a` and `b` share the same detected rotated ancestor (rotationGroup),
// reconstruct each into that ancestor's pre-rotation local coordinate
// space before comparing -- see unrotateElementRect's doc comment in
// audit-checks.mjs for why this is not a plain "un-rotate the rect"
// operation. Otherwise, compare the raw measured rects unchanged.
function comparableRects(a, b, rotationGroups) {
  if (a.rotationGroup == null || a.rotationGroup !== b.rotationGroup) {
    return [a.rect, b.rect];
  }
  const group = rotationGroups[a.rotationGroup];
  return [
    unrotateElementRect(a.rect, a.offsetWidth, a.offsetHeight, group.angle, group.cx, group.cy),
    unrotateElementRect(b.rect, b.offsetWidth, b.offsetHeight, group.angle, group.cx, group.cy),
  ];
}

function runContentChecks(route, snapshot) {
  const results = [];
  const at = (message) => `[${route} @ ${STAGE_WIDTH}x${STAGE_HEIGHT} (native)] ${message}`;

  const relatedPairKeys = new Set((snapshot.relatedPairs ?? []).map(([i, j]) => `${i}-${j}`));
  for (let i = 0; i < snapshot.textEls.length; i++) {
    for (let j = i + 1; j < snapshot.textEls.length; j++) {
      if (relatedPairKeys.has(`${i}-${j}`)) continue; // ancestor/descendant nesting, not occlusion
      const a = snapshot.textEls[i];
      const b = snapshot.textEls[j];
      const [rectA, rectB] = comparableRects(a, b, snapshot.rotationGroups ?? []);
      if (rectsIntersect(rectA, rectB)) {
        results.push({ type: 'occlusion', message: at(`"${a.selector}" overlaps "${b.selector}"`) });
      }
    }
  }

  for (const el of snapshot.interactiveEls) {
    if (!meetsMinTargetSize(el.rect, MIN_TARGET_SIZE)) {
      results.push({
        type: 'target-size',
        message: at(
          `"${el.selector}" is ${Math.round(el.rect.width)}x${Math.round(el.rect.height)}px, ` +
            `below ${MIN_TARGET_SIZE}x${MIN_TARGET_SIZE}px`,
        ),
      });
    }
  }

  for (const el of snapshot.clipCandidates) {
    if (isTextClipped(el)) {
      results.push({
        type: 'clipped-text',
        message: at(`"${el.selector}" clips its own text (overflow ${el.overflowX}/${el.overflowY})`),
      });
    }
  }

  return results;
}

function runOverflowChecks(route, width, snapshot) {
  const results = [];
  const at = (message) => `[${route} @ ${width}px] ${message}`;

  const { documentScrollWidth, documentClientWidth, stageViewportExists, stageViewportOverflowX, stageViewportOverflowY } =
    snapshot;
  if (hasHorizontalOverflow(documentScrollWidth, documentClientWidth)) {
    results.push({
      type: 'horizontal-scroll',
      message: at(`document scrollWidth ${documentScrollWidth} > clientWidth ${documentClientWidth}`),
    });
  }
  if (!stageViewportExists) {
    results.push({ type: 'horizontal-scroll', message: at('.stage-viewport not found') });
  } else if (stageViewportOverflowX !== 'hidden' || stageViewportOverflowY !== 'hidden') {
    results.push({
      type: 'horizontal-scroll',
      message: at(
        `.stage-viewport overflow is "${stageViewportOverflowX}/${stageViewportOverflowY}", not "hidden/hidden" -- ` +
          `the letterboxed stage's pre-transform 1440x900 layout box (src/shell/useStageScale.ts) would leak a real, ` +
          `user-visible scrollbar at this width without that rule (see src/shell/shell.css .stage-viewport)`,
      ),
    });
  }

  return results;
}

function report(findings) {
  const real = findings.filter((f) => !f.skipped);
  const skipped = findings.filter((f) => f.skipped);

  console.log(`\nCollage audit — ${real.length} finding(s), ${skipped.length} check(s) skipped\n`);

  for (const type of ['occlusion', 'target-size', 'clipped-text', 'horizontal-scroll']) {
    const group = real.filter((f) => f.type === type);
    if (group.length === 0) continue;
    console.log(`${type} (${group.length}):`);
    for (const f of group) console.log(`  - ${f.message}`);
  }

  for (const f of skipped) {
    console.log(`(skipped) ${f.message}`);
  }

  if (real.length === 0) {
    console.log('No occlusion/target-size/clipped-text/horizontal-scroll findings.');
  }
  console.log('');
}

main().catch((error) => {
  console.error('audit.mjs failed to run:', error);
  process.exitCode = 2;
});
