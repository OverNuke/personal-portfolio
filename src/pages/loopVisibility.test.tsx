import { render } from '@testing-library/react';
import { createRef } from 'react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installLayoutStubs, restoreLayoutStubs } from '../test/layoutStubs';
import type { LayoutStubs } from '../test/layoutStubs';
import { installRafSpy } from '../test/rafSpy';
import type { RafSpy } from '../test/rafSpy';
import { SectionVisibilityContext } from '../shell/SectionVisibilityContext';
import VoronoiCellField from './distinctions/VoronoiCellField';
import InkBloomCanvas from './profile/InkBloomCanvas';
import CrayonMascot from './projects/CrayonMascot';
import { MASCOT_PATH_IDS } from './projects/mascotStrokes';
import StrokeGlyphTitle from './projects/StrokeGlyphTitle';
import { useCardHover } from './projects/useCardHover';

// W8 (docs/09): all five screens are mounted at once (docs/03), so every
// continuous effect loop used to run at 60fps whether or not its section was on
// screen. The contract, per loop owner: while the enclosing section is hidden
// (`useSectionVisible() === false`) NO frame is scheduled, hiding cancels the
// pending one, and showing again resumes. Pause, never unmount.

let raf: RafSpy;
let stubs: LayoutStubs;

// A canvas 2D context that accepts any call/property (jsdom has no canvas).
const fakeContext: unknown = new Proxy(function () {}, {
  get: () => fakeContext,
  apply: () => fakeContext,
  set: () => true,
});

beforeEach(() => {
  stubs = installLayoutStubs({ reducedMotion: false }); // motion ON: the loops run
  raf = installRafSpy();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeContext as CanvasRenderingContext2D);
});

afterEach(() => {
  restoreLayoutStubs();
});

const IDS = ['a', 'b'];
function CardHoverProbe() {
  useCardHover(IDS);
  return null;
}

function mascot(): ReactElement {
  const containerRef = createRef<HTMLDivElement>();
  const valuesRef = { current: { p1: 0, p2: 0, p3: 0 } };
  return (
    <div>
      <div ref={containerRef} />
      <CrayonMascot containerRef={containerRef} valuesRef={valuesRef} blueColor="#586a30" hotColor="#c9351d" />
    </div>
  );
}

const OWNERS: Array<[string, () => ReactElement]> = [
  ['Projects: CrayonMascot', mascot],
  ['Projects: StrokeGlyphTitle', () => <StrokeGlyphTitle color="#586a30" />],
  ['Projects: useCardHover', () => <CardHoverProbe />],
  ['Profile: InkBloomCanvas', () => <InkBloomCanvas />],
  ['Distinctions: VoronoiCellField', () => <VoronoiCellField onOpenCell={() => {}} />],
];

const inSection = (ui: ReactElement, visible: boolean) => (
  <SectionVisibilityContext.Provider value={visible}>{ui}</SectionVisibilityContext.Provider>
);

describe.each(OWNERS)('%s', (_name, make) => {
  it('runs its loop while visible (and by default, outside a shell)', () => {
    render(make());
    expect(raf.pending()).toBe(1);
  });

  it('never schedules a frame when it mounts hidden', () => {
    render(inSection(make(), false));
    expect(raf.scheduled).not.toHaveBeenCalled();
    expect(raf.pending()).toBe(0);
  });

  it('cancels its pending frame when the section scrolls out of view, and stays quiet', () => {
    const ui = make();
    const { rerender } = render(inSection(ui, true));
    // (a loop may legitimately go idle after a frame -- useCardHover does once
    // it settles -- so the pending frame is checked straight after mount)
    expect(raf.pending()).toBe(1);

    rerender(inSection(ui, false));
    expect(raf.pending()).toBe(0);
    raf.frame();
    expect(raf.pending()).toBe(0);
  });

  it('resumes when the section scrolls back into view', () => {
    const ui = make();
    const { rerender } = render(inSection(ui, false));
    expect(raf.pending()).toBe(0);
    rerender(inSection(ui, true));
    expect(raf.pending()).toBe(1);
  });
});

describe('a paused screen still tracks its geometry', () => {
  it('CrayonMascot re-anchors its paths when the section is resized while hidden', () => {
    // In motion mode the mascot is painted ONLY by its loop, so a hidden mount
    // must paint once itself, or a height change while off-screen leaves the
    // paths on the old geometry (the viewBox, being React state, would still move).
    stubs.setHeight(900);
    const { container } = render(inSection(mascot(), false));
    const bodyD = () => {
      const paths = Array.from((container.querySelector('svg.projects-mascot') as SVGSVGElement).querySelectorAll('path'));
      return paths[MASCOT_PATH_IDS.indexOf('body')].getAttribute('d') as string;
    };
    expect(bodyD().startsWith('M476.0 790.4C')).toBe(true);

    stubs.resize(1400);
    expect(bodyD().startsWith('M476.0 1241.5C')).toBe(true);
    expect(raf.scheduled).not.toHaveBeenCalled(); // and it still schedules nothing
  });
});

describe('resuming is seamless (a pause must not be visible)', () => {
  it('InkBloomCanvas keeps its blooms across a pause instead of re-rolling them', () => {
    const random = vi.spyOn(Math, 'random');
    const ui = <InkBloomCanvas />;
    const { rerender } = render(inSection(ui, true));
    const afterMount = random.mock.calls.length;
    expect(afterMount).toBeGreaterThan(0); // the initial blooms were rolled

    rerender(inSection(ui, false));
    rerender(inSection(ui, true));
    expect(random.mock.calls.length).toBe(afterMount);
  });

  it('VoronoiCellField keeps its animation clock across a pause instead of restarting at t=0', () => {
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(1000);
    const ui = <VoronoiCellField onOpenCell={() => {}} />;
    const { container, rerender } = render(inSection(ui, true));

    raf.frame(3000); // t = (3000 - 1000) / 1000 = 2s
    const atTwoSeconds = container.innerHTML;
    raf.frame(4000);
    // sanity: the picture really depends on t, otherwise this test proves nothing
    expect(container.innerHTML).not.toBe(atTwoSeconds);

    rerender(inSection(ui, false));
    now.mockReturnValue(50_000); // a long pause: the wall clock moved on
    rerender(inSection(ui, true));

    raf.frame(3000);
    expect(container.innerHTML).toBe(atTwoSeconds);
  });
});
