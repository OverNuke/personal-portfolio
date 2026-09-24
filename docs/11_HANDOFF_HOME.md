# 11. Handoff — Home

> Full rewrite, 2026-09-21 (Phase 6). The prior `11_HANDOFF_HOME.md` is
> quarantined and describes the old dashboard-grid Home — **do not** carry
> any of its layout, copy, or interaction claims forward. Everything below
> is read directly from `docs/_decoded/index/template.html` (the canonical
> Home source — see `02_DESIGN_SYSTEM.MD`'s note on why `index/` wins over
> the older `main-page-standalone/` variant) plus the architecture decisions
> already made in `03_UX_ARCHITECTURE.MD`. Where this doc makes a call the
> source left ambiguous, that call is stated explicitly, not left open.

> **Corrected 2026-09-21 (post-build):** every "Flag 1 / Fix 1" reference
> below, and every literal `#0e0f0b`/`#f3f2ef` pairing tied to it, is
> **retired** — see `02_DESIGN_SYSTEM.MD`'s "Fix 1 — RETIRED" entry for the
> full account. In short: the Ink Flow Background `dc-import` is its own
> nested `ext_resources` entry (inside `main-page-standalone`'s manifest,
> not one of the six top-level decoded files), and `decode-mockup.mjs`
> writes such nested entries out as an opaque `.html` asset that nobody had
> opened — so its real, fully **opaque** surface was unknown when Fix 1 was
> computed, and `#0e0f0b` was wrongly treated as the effective background
> under Home's text. The real surface is cream paper (`#f6f4ea`); the
> decoded literal ink `#14150f` is correct as-is (**≈16.6:1** on that paper)
> and needs no substitute. Read every `#14150f`/`#0e0f0b`/`#f3f2ef` mention
> below as historical (what the doc originally reasoned from), not current.

## Stage and layer order

Home is one `position:absolute;inset:0` layer inside the shared
1440×900 stage (`background:#0e0f0b`), with two z-index bands:

| z-index | Content |
|---|---|
| `0` | Ink Flow Background — `dc-import`, `position:absolute;inset:0`, fills the entire 1440×900 stage |
| `10` | Real content column (wordmark, EN/ES toggle, nav list) |
| `9000` | Pill nav (persistent chrome, outside Home's own layer — see `03_UX_ARCHITECTURE.MD`) |

There is no left-side content at all. The entire left ~900px of the stage is
given to the Ink Flow Background alone — confirmed by the content column's
own geometry below, which is right-anchored with nothing positioned left of
it.

## Content column geometry

`position:absolute; right:80px; top:104px; width:520px; z-index:10;
display:flex; flex-direction:column; align-items:flex-end; gap:52px;
text-align:right`

Two direct children, stacked with 52px of gap between them:

1. The wordmark + EN/ES toggle row.
2. The 4-item numbered nav list.

## Wordmark + EN/ES toggle row

`display:flex; align-items:flex-end; justify-content:space-between;
gap:24px; flex-direction:row-reverse` — the `row-reverse` means the toggle
renders visually on the left of this row and the wordmark on the right,
despite the toggle being the second child in markup order.

- **Wordmark:** `<h1>Kevin.<span style="color:{{accentInk}}">.</span></h1>` —
  wait, precisely: `Kevin` then a `<span>` holding only the period, colored
  with the `accentInk` prop (`#6f7f45` default). `font-family:'Archivo
  Black',sans-serif; font-size:76px; line-height:.88;
  letter-spacing:-.035em; text-transform:uppercase`. This is genuinely the
  entire headline — one word, period-stopped, no subtitle or role line
  rendered anywhere in this template (see the note below on the
  unshipped `main-page-standalone` role string).
- **EN/ES toggle:** a bordered two-cell control —
  `display:flex; align-items:center; gap:0; border:2px solid #14150f;
  padding:0; flex:none` wrapping:
  - EN cell: `data-lang="EN"`, `role="button"`, click → `setLang`.
    `padding:7px 12px 8px; font-family:'Archivo Black',sans-serif;
    font-size:11px; letter-spacing:.1em; cursor:pointer;
    background:{{enBg}}; color:{{enFg}}`.
  - A static 2px-wide divider between the two cells: `background:#14150f`,
    `align-self:stretch`.
  - ES cell: identical shape, `data-lang="ES"`, `background:{{esBg}}`,
    `color:{{esFg}}`.
  - State logic (`renderVals()`): `lang === 'EN' ? { bg:'#14150f',
    fg:'#f6f4ea' } : { bg:'transparent', fg:'#14150f' }`, and the mirror for
    ES. So the **active** language renders as a solid dark box with light
    text (unaffected by any contrast fix — that pairing is already safe);
    the **inactive** language renders as transparent with `#14150f` text
    sitting directly on the raw Home background.
  - **This inactive-state text color, the outer 2px border, and the 2px
    divider are all part of the same Flag 1 / Fix 1 failure documented in
    `02_DESIGN_SYSTEM.MD`** (ink `#14150f` directly on `#0e0f0b` ≈1.05:1) —
    all three must use the corrected `#f3f2ef` instead, not just the toggle
    label text, so the box doesn't visually fragment into "one corrected
    element next to two uncorrected ones." See Fix 1's full rationale in
    `02_DESIGN_SYSTEM.MD` and `05_ACCESSIBILITY.MD`.
  - **A real accessibility gap in the source, not carried forward:** the
    decoded markup gives each language cell `role="button"` and a click
    handler but **no `tabindex`**. A `role="button"` `<div>` with no
    `tabindex="0"` is not keyboard-focusable — this control is currently
    mouse-only in the mockup. The React port must not reproduce this gap:
    implement each cell as a real `<button type="button">` (natively
    focusable, natively `Enter`/`Space`-activatable, no manual `tabIndex`
    or `onKeyDown` bookkeeping needed) rather than a `role="button"` div.
    This is a source defect being fixed on port, not a new feature — per
    this repo's accessibility-first conflict order, faithfully reproducing
    a keyboard-inaccessible control is not an option.

## Numbered nav list

`display:flex; flex-direction:column; gap:2px`, one `<a>` per item from
`ORDER` (4 items — Home is deliberately excluded from its own list, see
`03_UX_ARCHITECTURE.MD`):

```
ORDER = [
  { key: 'about',       screen: 'profile' },
  { key: 'distinction', screen: 'distinction' },
  { key: 'projects',    screen: 'projects' },
  { key: 'contact',     screen: 'contact' }
];
```

Each row: `<a href="#" onClick=go(screen)>` —
`display:flex; align-items:baseline; justify-content:flex-end; gap:18px;
padding:11px 0 13px; border-bottom:2px solid rgba(20,21,15,.4);
color:{{it.color}}; transform:{{it.shift}}; transition:transform .22s
cubic-bezier(.2,.85,.2,1), color .22s ease` — three child spans:

| Span | Content | Style | Color source |
|---|---|---|---|
| Number | `01`–`04` | `font-size:11px; font-weight:700; letter-spacing:.16em` | **Always `#14150f`, regardless of focus state** — this span sets its own explicit color, not inherited from the `<a>`. This means the number is *also* subject to Fix 1 (it sits on the raw `#0e0f0b` background at all times, focused or not) and must switch to the corrected `#f3f2ef` unconditionally — there is no accent variant for the number in the source. |
| Label | localized text (see Copy below) | `font-family:'Archivo Black',sans-serif; font-size:34px; line-height:1; letter-spacing:-.028em; text-transform:uppercase` | Inherits `{{it.color}}` from the `<a>`: accent (`#6f7f45` default) if this item currently holds the simulated focus, else ink — corrected to `#f3f2ef` per Fix 1 when not focused. At 34px this clears the AA large-text (≥24px) threshold at both colors. |
| Arrow (`→`) | | `width:22px; flex:none; font-size:19px; opacity:{{it.arrow}}; transition:opacity .22s ease` | Same `{{it.color}}` as the label, but only visible (`opacity:1`) when focused — at `opacity:0` it renders nothing, so its own borderline contrast note in `02_DESIGN_SYSTEM.MD` (accent-on-bg at 19px, ≈4.39:1) only ever matters in the one state where it's visible; see that doc for the optional tighter fix. |

### Hover-shift + arrow-reveal — exact interaction

Verified directly from `renderVals()`'s `items` mapping:

| Property | Not focused | Focused |
|---|---|---|
| Label + arrow color | corrected ink `#f3f2ef` | accent, `#6f7f45` default |
| Row horizontal position | `translateX(0)` | `translateX(10px)` |
| Arrow opacity | `0` | `1` |

`this.state.focus` (an index into `ORDER`, default `0`) drives all three.
Both `onMouseEnter` on a row and the arrow-key cycling below write to the
exact same `state.focus` — hover and arrow-cycling are one shared piece of
state, not two independent mechanisms.

### Real activation vs. simulated focus — the gap, stated plainly

This is the single most important nuance to get right on port, per
`03_UX_ARCHITECTURE.MD`'s own explicit flag:

- **Real activation** happens via a genuine click, or via `Tab` to reach one
  of the four `<a>` elements (real DOM focus) followed by `Enter` (native
  anchor activation) — both call `go(screen)`, which `preventDefault()`s and
  navigates.
- **The simulated highlight** (`state.focus`, driven by hover or the
  arrow keys below) is a **visual-only** preview state. It does **not**
  move `document.activeElement`, is **not** what `Tab` traverses, and can
  independently disagree with whichever item real keyboard focus is
  currently on. Pressing an arrow key does not "navigate the list" in any
  screen-reader-relevant sense — it only changes which row looks
  highlighted to a sighted mouse-adjacent user.
- **Port this gap as-is; do not silently merge the two states.** Making
  arrow-key cycling drive real focus would be a legitimate *future*
  enhancement, but it's a new interaction decision, not a faithful port —
  `03_UX_ARCHITECTURE.MD` deliberately flags this for `05_ACCESSIBILITY.MD`
  rather than fixing it unilaterally, and `05_ACCESSIBILITY.MD`'s keyboard
  table documents both paths side by side so a build agent can't
  accidentally collapse them into one.

## Keyboard arrow-key cycling — exact mapping

A `window`-level `keydown` listener, attached in `componentDidMount` and
removed in `componentWillUnmount` (i.e. active only while Home is the
mounted screen). **Updated 2026-09-23:** Home is now always mounted, so the
port (`useNavFocusCycle(itemCount, enabled)`) attaches the listener only
while Home is the **active section** (`enabled = activeSection === 'home'`);
while it is, ArrowUp/ArrowDown are `preventDefault()`ed and do not scroll
the page (a known, disclosed limitation — `05_ACCESSIBILITY.MD`):

| Key | Effect |
|---|---|
| `ArrowRight` or `ArrowDown` | `move(+1)` |
| `ArrowLeft` or `ArrowUp` | `move(-1)` |

Both call `e.preventDefault()`. `move(d)` advances with wraparound:
`focus = (focus + d + ORDER.length) % ORDER.length` — pressing `ArrowRight`
from the last item (`contact`, index 3) wraps to the first (`about`, index
0), and `ArrowLeft` from index 0 wraps to index 3. `ORDER.length` is 4
throughout (Home is never a cyclable target of its own list).

## Copy — EN/ES, and the two-dictionary discrepancy

Two separate dictionaries exist in source, and they do not agree with each
other — this is confirmed, not a typo to silently reconcile:

```js
NAV  = [ 'Home', 'Profile', 'Distinctions', 'Projects', 'Contact' ]   // pill nav — English only
COPY = {
  EN: { about:'Who me?', distinction:'Distinction', projects:'Projects', contact:'Reach out' },
  ES: { about:'¿Yo?',    distinction:'Distinción',  projects:'Proyectos', contact:'Contacto' }
};
```

- `NAV` labels the persistent pill nav (all five screens, including Home
  itself) — **English only, no Spanish strings exist for it anywhere in the
  decoded source.**
- `COPY` labels Home's own 4-item numbered list — bilingual, toggled by
  `state.lang`.
- **Discrepancy:** `NAV` says **"Distinctions"** (plural) for the pill-nav
  button; `COPY.EN.distinction` says **"Distinction"** (singular) for the
  same screen's entry in Home's list. Two different display strings for one
  screen, not a bug — reproduce both exactly as-is, don't unify them into
  one string.

### Decision: pill nav stays English-only

**This rebuild does not add Spanish labels to the pill nav.** Localizing
chrome that the mockup itself never localized would be a deliberate feature
addition beyond mockup fidelity, not a faithful port, and it isn't required
by this repo's accessibility-first conflict order (an English-only nav label
is understandable, not a barrier — this is a scope call, not an a11y fix).
If bilingual chrome becomes a real product requirement later, it's a new
UX decision that belongs in `03_UX_ARCHITECTURE.MD` first, with its own
translation strings and a decision about whether `NAV`'s "Distinctions" or
`COPY`'s "Distinction" wins as the canonical English form — not something to
back into silently while building Home.

## Ink Flow Background — import contract

```
<dc-import name="Ink Flow Background"
  ink="{{ accentInk }}" speed="{{ flowSpeed }}"
  ring-gap="{{ ringGap }}" animate="{{ animate }}" />
```

Prop surface, from the decoded `data-props` block (`docs/_decoded/index/
template.html`'s script tag):

| Prop | Default | Range | Notes |
|---|---|---|---|
| `accent` (→ `ink`) | `#6f7f45` | options: `#14150f`, `#0c0d0a`, `#3a3f2a`, `#6f7f45` | Also colors the "." in "Kevin." — one prop, two usages |
| `flowSpeed` | `1.3` | `0.2`–`3`, step `0.1` | |
| `ringGap` | `7` (px) | `4`–`14`, step `0.5` | |
| `animate` | `true` | boolean | Must be forced `false` (static frame) under `prefers-reduced-motion: reduce` — see `05_ACCESSIBILITY.MD` |

This component is **not** one of the six top-level decoded mockup slugs, but
it *is* fully decoded: it's an `ext_resources` entry nested inside
`main-page-standalone`'s own manifest, and `decode-mockup.mjs` writes such
nested entries out as a readable `.html` asset file
(`docs/_decoded/main-page-standalone/assets/ffce4155-*.html`) — it was simply
never opened during the initial build (see the correction above). Its real
rendering technique is plain layered CSS: two SVG `feTurbulence` +
`feDisplacementMap` warp filters; an animated lower-left "ink mass"
(4-gradient `radial-gradient` field, `ifDrift` keyframe); a "dark ring field"
(6 masked, warped `repeating-radial-gradient` dot rings, `mix-blend-mode:
multiply`, `ifA`–`ifD` keyframes); a "light ring field" (3 of the same rings
reversed to `#e9e6d8`, `mix-blend-mode: screen`); halftone dust; a paper-lift
highlight gradient (`paperLift` prop, unused at this call site, default `1`);
and a static print-grain noise overlay. It must be fully `aria-hidden`, never
a tab stop, and — since real text sits at a higher z-index and never depends
on this layer rendering at all — legibility never depends on its state.

> **Updated 2026-09-21 (post-build correction):** built as `src/pages/home/
> InkFlowBackground.tsx`, near-1:1 against the real decoded component above
> (not the original canvas-ripple implementation this doc previously
> described, which was an invented stand-in — see `04_COMPONENT_RULES.MD`'s
> matching correction). `animate=false` / `prefers-reduced-motion: reduce`
> pauses every layer's animation via a `[data-static]` CSS rule rather than
> removing anything, so the frozen composition still looks correct.
> `ifWarp`/`ifWarpSoft` filter ids are scoped per-instance with `useId()`
> since the REFORM/ENTER crossfade can briefly mount two screen layers (and
> two copies of this component) at once. **(Updated 2026-09-23: that
> crossfade is gone — `14_REFORM_MOTION.md`. The scoping is still needed: all
> five screens are now mounted simultaneously, and Home is one of five
> always-live effect trees; ids stay per-instance via `useId()` regardless.)** `inkMass` and `paperLift` are
> exposed as optional props (defaults `#0c0d0a` and `1`, matching the
> decoded component) but not wired at the Home call site, matching the
> decoded `dc-import` exactly.

## Section entry — focus and announcement

> **Rewritten 2026-09-23.** This section was "Route entry": "when a route
> change lands on Home (`/`), focus moves immediately to Home's primary
> heading … independent of whether the REFORM/ENTER crossfade is running".
> **SUPERSEDED** — there are no routes and no crossfade
> (`03_UX_ARCHITECTURE.MD`, `14_REFORM_MOTION.md`), and Home is mounted
> permanently, not "on entry".

Per `03_UX_ARCHITECTURE.MD` (new architecture decided in that doc, not
recovered from the mockup): when Home is reached by **explicit activation**
(the pill's Home button, or `#home` via a page-load deep link, Back/Forward,
or a hand-edited hash), the shell scrolls Home to the viewport top, focus
moves to Home's primary heading (the `<h1>Kevin.</h1>` wordmark, which keeps
its stable `tabIndex={-1}` and carries `data-screen-heading`; the shell
focuses it with `preventScroll`), and the shared `aria-live="polite"` region
announces "Home." in the same tick. Merely *scrolling* onto Home moves
neither focus nor the announcement, and an ordinary load with no hash does
neither. This is the same rule every other screen follows — Home has no
special-cased entry behavior beyond owning the arrow-key listener described
above, which is now attached only while Home is the active section (below the
`enabled` scope note in `03_UX_ARCHITECTURE.MD`), not "on mount".

## What this doc is not

This doc is Home's own implementation spec — its exact layout, copy,
interaction, and prop contracts. It does not own the pill nav's own visual
design or cross-screen behavior in general (`03_UX_ARCHITECTURE.MD` /
`01_ART_DIRECTION.MD`, referenced here only where Home-specific detail is
needed), the corrected color values themselves (`02_DESIGN_SYSTEM.MD`), the
decorative-animation accessibility contract (`05_ACCESSIBILITY.MD`), or the
pill's transition mechanics (`14_REFORM_MOTION.md`; the route crossfade this
line used to reference is retired).
