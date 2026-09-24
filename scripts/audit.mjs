/* global document, getComputedStyle, NodeFilter, Node, requestAnimationFrame */

/**
 * scripts/audit.mjs -- the collage audit gate (`pnpm run audit:collage`).
 *
 * Rebuilt against the React port's real shell (docs/00, docs/03) after the
 * full-reset rebuild from the decoded mockups, then updated for the
 * continuous-scroll shell (change `continuous-scroll-and-doodles`). Reuses the
 * check *logic* from `_quarantine/scripts/audit.mjs` /
 * `_quarantine/scripts/audit-checks.mjs` (occlusion, WCAG 2.5.8 target-size,
 * clipped-text, horizontal containment) and adapts the sweep strategy to this
 * app's real, load-bearing difference from the old design:
 *
 *   The old shell was RESPONSIVE -- `.shell-frame`'s CSS Grid genuinely
 *   reflowed at each of 1440/1280/1100/390px, so sweeping all four widths
 *   for every check made sense: each width was a distinct layout to audit.
 *
 *   This shell is NOT responsive (docs/00's explicit decision): the five
 *   screens are stacked `min-height: 900px` sections inside one 1440px-wide
 *   `.stage`, which is uniformly SCALED via `transform: scale()` from the
 *   viewport WIDTH alone (src/shell/useStageScale.ts). The page itself
 *   scrolls; the DOM layout inside `.stage` never reflows, it only shrinks or
 *   grows as a rigid image.
 *
 * Consequences, all implemented below:
 *
 *   0. There are no per-screen routes any more -- only URL hashes
 *      (`#home #profile #distinctions #projects #contact`). The section list
 *      is READ FROM src/routes/registry.ts (through Vite's module loader) so
 *      it cannot drift, and each section is audited by loading its hash URL
 *      on a FRESH page (a hash-only `goto` on a live page is a same-document
 *      navigation, not a load) and waiting until that section's top edge has
 *      landed at the viewport top.
 *   1. Occlusion / target-size / clipped-text run once per section at exactly
 *      ONE viewport, `STAGE_WIDTH x STAGE_HEIGHT` (1440x900) -- the stage's
 *      own native size, where `--stage-scale` resolves to 1 and
 *      `getBoundingClientRect()` reports real, unscaled design pixels.
 *      (1440x900 is also exactly one section tall, so every section, Contact
 *      included, can sit flush with the viewport top.) Running these at e.g.
 *      390px would just measure the same layout shrunk by the width-derived
 *      scale -- every interactive element would "fail" WCAG 2.5.8 purely
 *      because the whole stage got smaller, which is a property of the scale,
 *      not a real target-size defect. `assertNativeScale` below makes this a
 *      hard precondition (exit code 2) rather than a silent assumption -- if
 *      `.stage` isn't measured at scale 1, the numbers this script would
 *      produce are meaningless, so it refuses to report findings from them.
 *      Scope of each section's pass: that section's subtree PLUS the fixed
 *      pill nav (it overlays whichever section is scrolled to the top, so it
 *      is the one element that can genuinely occlude another section's
 *      content). The other four sections are off-screen and excluded --
 *      including them would re-report the same findings five times.
 *   2. The old "horizontal-scroll at 390px" check becomes "the scaled stage
 *      never leaks horizontally at ANY viewport width" -- swept across the
 *      same four reference widths as before (1440/1280/1100/390) for every
 *      section's hash URL. `.stage-viewport` ships `overflow-x: clip`, which
 *      also hides a mis-scaled stage's overflow from the document's own
 *      scrollWidth, so the check has three parts: (a) the document does not
 *      overflow (the real invariant), (b) the PAINTED stage's right edge fits
 *      inside the viewport (catches a broken scale, which the clip would
 *      otherwise hide) and (c) `.stage-viewport` still satisfies the shipped
 *      overflow contract (`meetsStageViewportOverflowContract`: clip on x,
 *      never a scroll container on y) -- a static guard, defense in depth, not
 *      a measured leak.
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
 * (ephemeral port) and a headless Chromium instance (via @playwright/test,
 * already a devDependency) and tears both down before exiting. The
 * `audit:collage` npm script stays a bare `node scripts/audit.mjs` -- no
 * `pnpm build`/`pnpm preview` prerequisite, and no base-URL override.
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
  meetsStageViewportOverflowContract,
  parseScale,
  rectsIntersect,
  unrotateElementRect,
} from './audit-checks.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The section DOM id convention of src/shell/SectionNavContext.tsx's
// `sectionDomId` (`section-${pageId}`). Mirrored, not imported: that module
// pulls in React, and this is one template string.
const sectionDomId = (pageId) => `section-${pageId}`;

/**
 * The audited sections, read from src/routes/registry.ts (single source of
 * truth for hashes/pageIds) through Vite's own module loader, since this
 * script runs under plain Node and cannot import .ts directly.
 */
async function loadSections(server) {
  const { routes } = await server.ssrLoadModule('/src/routes/registry.ts');
  if (!Array.isArray(routes) || routes.length === 0) {
    throw new Error('src/routes/registry.ts exported no sections.');
  }
  return routes.map((entry) => ({
    hash: entry.hash,
    pageId: entry.pageId,
    sectionId: sectionDomId(entry.pageId),
    url: `/${entry.hash}`,
  }));
}

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

    const sections = await loadSections(server);
    const page = await browser.newPage();

    // Pass 1: occlusion / target-size / clipped-text, once per section, at the
    // stage's native 1440x900 size (scale === 1 -- see module doc comment).
    for (const section of sections) {
      await page.setViewportSize({ width: STAGE_WIDTH, height: STAGE_HEIGHT });
      await loadFresh(page, `${baseUrl}${section.url}`);
      await waitForStable(page, section);
      await assertNativeScale(page, section.hash);
      await assertSectionAtTop(page, section);

      const snapshot = await page.evaluate(collectSnapshot, section.sectionId);
      findings.push(...runContentChecks(section.hash, snapshot));
    }

    // Pass 2: horizontal-containment sweep across the reference viewport
    // widths -- cheap (no DOM snapshot walk), just overflow signals.
    for (const section of sections) {
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        await loadFresh(page, `${baseUrl}${section.url}`);
        await waitForStable(page, section);

        const overflow = await page.evaluate(collectOverflowSnapshot);
        findings.push(...runOverflowChecks(section.hash, width, overflow));
      }
    }
  } finally {
    await browser?.close();
    await server?.close();
  }

  report(findings);
  process.exitCode = findings.some((f) => !f.skipped) ? 1 : 0;
}

/**
 * Loads `url` as a REAL page load. Navigating a live page between two URLs that
 * differ only by hash is a same-document navigation: the app would receive a
 * `hashchange` (an animated scroll from the previous section) instead of the
 * deep-link-on-load path this audit means to measure. Going through
 * about:blank guarantees the latter.
 */
async function loadFresh(page, url) {
  await page.goto('about:blank');
  await page.goto(url, { waitUntil: 'load' });
}

async function waitForStable(page, section) {
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

  // All five screens are mounted at once (src/shell/Shell.tsx); the target
  // section's own heading existing is the signal that ITS screen has rendered
  // (the shell's hash navigation then focuses that heading).
  await page.waitForSelector(`#${section.sectionId} [data-screen-heading]`, { timeout: 5000 }).catch(() => {});

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
 * `useStageScale`'s width-derived scale math could otherwise silently produce
 * bogus sub-24px target-size findings that have nothing to do with a real
 * defect. Throws (caught by `main`, surfaced as exit code 2) rather than
 * reporting a `finding`, since this is an audit-infrastructure failure, not
 * a layout defect the audit is designed to catch.
 */
async function assertNativeScale(page, label) {
  const scale = await page.evaluate(() => {
    const stage = document.querySelector('.stage');
    if (!stage) return null;
    return getComputedStyle(stage).transform;
  });
  if (scale === null) {
    throw new Error(`[${label}] .stage element not found -- cannot verify native (scale=1) rendering.`);
  }
  const factor = parseScale(scale);
  if (Math.abs(factor - 1) > 0.01) {
    throw new Error(
      `[${label}] .stage is rendering at scale ${factor.toFixed(3)}, not 1 -- ` +
        `refusing to run occlusion/target-size/clipped-text checks against scaled rects. ` +
        `Expected viewport ${STAGE_WIDTH}x${STAGE_HEIGHT} to produce --stage-scale: 1 exactly.`,
    );
  }
}

/**
 * Hard precondition for pass 1, like `assertNativeScale`: the hash deep link
 * (instant scroll on load) must have landed the section's top edge at the
 * viewport top. At 1440x900 (scale 1, one section per viewport) every section
 * -- Contact's last-section clamp included -- can. Polls, since the landing
 * happens in an effect after first paint. Throws (exit code 2) rather than
 * measuring the wrong part of the page.
 */
async function assertSectionAtTop(page, section) {
  const landed = await page
    .waitForFunction(
      (id) => {
        const el = document.getElementById(id);
        return !!el && Math.abs(el.getBoundingClientRect().top) <= 2;
      },
      section.sectionId,
      { timeout: 5000 },
    )
    .then(() => true)
    .catch(() => false);
  if (!landed) {
    throw new Error(
      `[${section.hash}] #${section.sectionId} did not land at the viewport top within 5s of loading its hash URL -- ` +
        `refusing to audit an unscrolled/mid-scroll page.`,
    );
  }
  // Let any straggling scroll settle before the (atomic) snapshot.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

// Runs inside the browser via page.evaluate -- no access to the outer
// module scope, so it stays a plain, fully self-contained function body.
function collectSnapshot(sectionId) {
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
      if (node === document.body) break;
      node = node.parentElement;
    }
    return null;
  }

  // All five screens are always mounted and stacked in one scrolling page, so
  // the audited scope is ONE section (the one this hash URL scrolled to the
  // viewport top) plus the fixed pill nav, which overlays it. Off-screen
  // sections are skipped: they cannot overlap the section in view, and
  // including them would repeat the same findings for every hash. No
  // dialog-scoping is needed (the Distinctions lightbox is never opened here).
  const sectionRoot = document.getElementById(sectionId);
  const pillNav = document.querySelector('.pill-nav');
  if (!sectionRoot) throw new Error(`#${sectionId} not found -- cannot audit this section.`);
  if (!pillNav) throw new Error('.pill-nav not found -- cannot audit the fixed nav overlay.');
  const scopes = [sectionRoot, pillNav];

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
  for (const scope of scopes) {
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
  for (const scope of scopes) {
    for (const el of Array.from(scope.querySelectorAll('a, button, [role="button"], input, select, textarea'))) {
      if (isAncestorHidden(el) || !isRendered(el)) continue;
      const rect = rectOf(el);
      if (isVisuallyHiddenRect(rect)) continue;
      interactiveEls.push({ selector: describe(el), rect });
    }
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

// Lightweight overflow-only snapshot for pass 2 (horizontal-containment
// sweep) -- no DOM walk, just the signals that matter for "does the scaled
// stage ever leak horizontally".
//
// NOTE on why this does NOT compare `.stage-viewport`'s own
// scrollWidth/clientWidth (unlike the document-level check below): `.stage`
// is a fixed 1440px-wide block scaled down via `transform: scale()`
// (src/shell/useStageScale.ts), and an element's scrollWidth reports its
// PRE-transform layout box, so at any viewport narrower than 1440px
// `.stage-viewport`'s scrollWidth exceeds its clientWidth even though nothing
// is visually cut off or scrollable. Comparing those two numbers here would be
// a guaranteed false positive at every non-1440 width, not a real regression
// signal. What actually matters is: (1) the document itself never overflows
// horizontally -- the real "no horizontal scroll" invariant; (2) the PAINTED
// stage (its transformed bounding box, i.e. what the user sees) fits inside the
// viewport width -- needed because `.stage-viewport` clips (`overflow-x: clip`),
// so a broken scale factor would be hidden from the document's scrollWidth and
// would silently cut content off instead; and (3) `.stage-viewport` still
// declares the overflow contract, a STATIC guard pinning the shipped 7.1 rule
// (see `meetsStageViewportOverflowContract`). Measured: removing the clip does
// not make the page scroll horizontally today (Chromium counts the transformed
// box's scaled extent), so (3) is defense in depth against a future wide
// non-transformed child, not proof of a live leak.
function collectOverflowSnapshot() {
  const stageViewport = document.querySelector('.stage-viewport');
  const stageViewportStyle = stageViewport ? getComputedStyle(stageViewport) : null;
  const stage = document.querySelector('.stage');
  return {
    documentScrollWidth: document.documentElement.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    stageViewportExists: !!stageViewport,
    stageViewportOverflowX: stageViewportStyle?.overflowX ?? null,
    stageViewportOverflowY: stageViewportStyle?.overflowY ?? null,
    stageExists: !!stage,
    stagePaintedRight: stage ? stage.getBoundingClientRect().right : null,
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

function runContentChecks(hash, snapshot) {
  const results = [];
  const at = (message) => `[${hash} @ ${STAGE_WIDTH}x${STAGE_HEIGHT} (native)] ${message}`;

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

function runOverflowChecks(hash, width, snapshot) {
  const results = [];
  const at = (message) => `[${hash} @ ${width}px] ${message}`;

  const {
    documentScrollWidth,
    documentClientWidth,
    stageViewportExists,
    stageViewportOverflowX,
    stageViewportOverflowY,
    stageExists,
    stagePaintedRight,
  } = snapshot;
  if (hasHorizontalOverflow(documentScrollWidth, documentClientWidth)) {
    results.push({
      type: 'horizontal-scroll',
      message: at(`document scrollWidth ${documentScrollWidth} > clientWidth ${documentClientWidth}`),
    });
  }
  if (!stageViewportExists) {
    results.push({ type: 'horizontal-scroll', message: at('.stage-viewport not found') });
  } else if (!meetsStageViewportOverflowContract(stageViewportOverflowX, stageViewportOverflowY)) {
    results.push({
      type: 'horizontal-scroll',
      message: at(
        `.stage-viewport overflow is "${stageViewportOverflowX}/${stageViewportOverflowY}", expected "clip/visible" (or "clip/clip") -- ` +
          `the shipped contract (src/shell/shell.css .stage-viewport, task 7.1): clip horizontally, and never become a scroll ` +
          `container on y (see meetsStageViewportOverflowContract in scripts/audit-checks.mjs; a static guard, not a measured leak)`,
      ),
    });
  }
  if (!stageExists) {
    results.push({ type: 'horizontal-scroll', message: at('.stage not found') });
  } else if (hasHorizontalOverflow(stagePaintedRight, documentClientWidth)) {
    results.push({
      type: 'horizontal-scroll',
      message: at(
        `painted .stage right edge ${Math.round(stagePaintedRight)}px exceeds the viewport width ${documentClientWidth}px -- ` +
          `the width-derived stage scale is not fitting the stage (the clipped wrapper would hide the overflow)`,
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
