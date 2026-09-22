# 02. Design System

> Rewritten 2026-09-21 from the decoded mockup. **Every hex value below was
> read directly from `docs/_decoded/*/template.html`** (inline styles,
> `@keyframes`, and the `data-props` JSON blob each screen's `dc-props`
> script embeds) — none are copied from the prior (quarantined) doc without
> re-verification. Contrast ratios were computed by hand with the standard
> WCAG relative-luminance formula; see the flags at the bottom before treating
> any pairing as settled.
>
> **Correction vs. the old flat-palette doc:** this project does not have one
> global palette. Each screen owns its own bg/surface/accent/ink set. Do not
> collapse these back into a single `:root` token set without re-checking
> every pairing below still holds.
>
> **Updated 2026-09-21 (Phase 6 accessibility pass) — 3 corrected values:**
> writing this doc surfaced 3 real WCAG AA contrast failures in the mockup's
> own default colors (Flags 1–3 below, originally logged as open flags in the
> same-day initial version of this doc). They are now fixed, not just
> flagged — see the "Corrected Contrast Pairings" subsection at the bottom of
> the Contrast section for the before/after values and computed ratios, and
> `05_ACCESSIBILITY.MD` for the full rationale and the decorative-animation
> pattern these fixes interact with. The Home and Contact palette rows below
> already reflect the corrected values, not the mockup's as-decoded ones.

## Per-screen palette

| Screen | Background | Surface / card | Accent (default) | Ink / text | Notes |
|---|---|---|---|---|---|
| **Home** | `#f6f4ea` (opaque cream paper, painted by the Ink Flow Background layer — the shell's own `#0e0f0b` never composites under it; **corrected 2026-09-21**, was documented as `#0e0f0b`) | — (no card surfaces) | `#6f7f45` (options: `#14150f`, `#0c0d0a`, `#3a3f2a`, `#6f7f45`) | `#14150f` for all real text/UI elements — the "Kevin." wordmark, nav-list numbers, non-focused nav-list labels, the inactive EN/ES toggle label, and the EN/ES toggle's 2px border — the decoded literal, unmodified (see Corrected Contrast Pairings, Fix 1, now retired). The active EN/ES toggle's own solid dark box paired with `#f6f4ea` text is unaffected either way. | `index/template.html` and `main-page-standalone` agree once you read the *nested* Ink Flow Background component: both `dc-import` the same real, opaque, cream-paper effect — see `01_ART_DIRECTION.MD`. |
| **Profile** | `linear-gradient(97deg, #f6f3e9 0%, #f2eee1 22%, #dfdaca 40%, #a9a59a 47%, #33332d 55%, #101010 64%, #0a0a09 100%)` (paper → near-black, left → right) | — | `#8b9c56` (options: `#8b9c56`, `#6f7f45`, `#f3f1e8`, `#c9d49a`) — note this is a **lighter, more yellow-green olive** than the other screens' accent, used only for the chamber dot fill | `#14150f` (headline), `#25241e` (body copy), `#4d4c44` (eyebrow labels) on the paper side; `#f3f1e8` (chamber labels/status) on the dark side | The `html,body{background:#f4f1e6}` fallback in this file's `<helmet>` is a solid-color fallback behind the real gradient — not itself a rendered color. |
| **Distinctions** | `#f6f4ea` (outer wrapper) | `#f4f1e6` (the `PAPER` JS constant — cell fill, lightbox modal background) | `#586a30` (options: `#586a30`, `#6f7f45`, `#4f5c2f`, `#8a9a55`) — used as the fill for the one "accent"-kind cell | `#14150f` | **Two distinct near-identical paper tones coexist** (`#f6f4ea` wrapper vs. `#f4f1e6` cell/lightbox) — confirm this is intentional layering (a slightly warmer cell-paper on a slightly cooler page-paper) before unifying them into one token. Doodle ink defaults to `#2b39c7` (blue) **but the app shell overrides it to `#e0452b`** (warm red-orange) via `doodle-color="#e0452b"` in `docs/_decoded/index/template.html` — `#e0452b` is the color that actually ships; `#2b39c7` only appears in the standalone/default state. |
| **Projects** | `#f6f4ea` (+ subtle repeating-linear-gradient paper-grain hatch) | `#f4f1e6` (polaroid card fill) | `#586a30` (link/doodle color — the app shell import passes `doodle-color="#586a30" hot-color="#c9351d"`, matching this screen's own internal defaults exactly, no override) | `#14150f` | Secondary "hot" annotation color `#c9351d` (options: `#e0452b`, `#c9351d`, `#e07b2b`, `#2b39c7`) is used for the doodle arrows/rings/underlines that point at hovered project details. |
| **Contact** | `#0a0a0a` | `#f4f1e6` (light cards: Email, WhatsApp, LinkedIn, Book a call) | `#6f7f45` (options: `#6f7f45`, `#b9c98a`, `#4f5c2f`, `#8a9a55`) — also used as the GitHub card's own background (`background: var(--olive, #6f7f45)`) | `#14150f` (text on light cards), `#f6f4ea` (text on the accent-colored GitHub card), `#f3f2ef` (headline/quote on dark bg), `#9c9b94` (secondary labels) | The background photo is shown desaturated/dimmed (`filter:grayscale(1) contrast(1.32) brightness(.52)`, default opacity 30%) under a dot-grid overlay (`radial-gradient` dots, `24px` grid) and two darkening gradients — I could not identify the specific source photo asset from the template alone (that's the parallel asset-extraction phase's job, not this doc's). |

## Typography

Five real font families are loaded across the five screens, plus one
declared-but-apparently-unused family. Confirmed by grepping every
`@font-face` block and every `font-family:` usage in the six decoded
templates:

| Family | Weights/styles loaded | Used on | Role |
|---|---|---|---|
| **Archivo Black** | 400 normal only | Home (and the older `main-page-standalone`) | Display/headline only — the "Kevin." wordmark (76px), the EN/ES toggle labels, and every nav-list item's number/label/arrow. Always uppercase, tight negative letter-spacing (`-.028em` to `-.035em`). |
| **Space Grotesk** | 400/500/700 | Home (and `main-page-standalone`) | Set as the screen's base `font-family` on the outermost Home container, but every piece of visible Home text overrides to Archivo Black or JetBrains Mono — so in practice Space Grotesk is Home's **fallback face**, not something you'll see rendered directly today. |
| **Instrument Serif** | 400, both `italic` and `normal` styles loaded | Profile, Distinctions, Projects, Contact | Display/headline face, used **exclusively in italic** everywhere I found it rendered: Profile's "Junior software engineer" (88px) and chamber fused-word reveals; Distinctions' "Distinctions" H2 (72px) and every certificate name; Projects' project titles ("Barbershop", "Acopiatech", "Odoo Custom Module"); Contact's "Reach out" H2 (92px), card headline words ("Email", "GitHub", etc.), and the closing quote. **The `normal` (non-italic) cut is loaded on every one of these screens but I found no place it's actually applied** — flag as a declared-but-unused style until proven otherwise. |
| **JetBrains Mono** | 400/500 | All five screens | The universal metadata/label face: eyebrow captions, `01`/`02`-style numbering, uppercase small-caps tags, nav-pill labels, tech-stack pill tags (Projects), institution/date lines (Distinctions), card labels like "(01)"/"send message" (Contact). Never used for headline or body copy. |
| **Manrope** | 400/500/600 (700 also loaded on Distinctions/Projects/Contact) | Profile, Distinctions, Projects, Contact | Body/paragraph face — the actual sentence-length copy (Profile's bio paragraph, Distinctions' intro line, Projects' project descriptions, base `font-family` on all four of these screens' outer containers). Not used on Home at all. |
| **Permanent Marker** | 400 | *(declared only)* | `@font-face` is loaded in both `docs/_decoded/index/template.html` and the older `main-page-standalone/template.html`, but **no `font-family:'Permanent Marker'` usage exists in either template's rendered markup.** All of the "hand-drawn" content on Distinctions/Projects is actually SVG stroke paths (the crayon mascot, the hand-lettered "PROJECTS" glyphs), not this font. Treat this as a leftover/reserved declaration, not an active part of the type system, unless a future revision starts using it for real handwritten-style copy. |

## Contrast — verified pairings and flags

Ratios below are computed via the standard WCAG 2.x relative-luminance
formula directly from the hex values above (AA normal text = 4.5:1, AA large
text ≥24px/≥18.66px-bold = 3:1).

**Solid, verified-safe pairings:**

- Ink `#14150f` on paper `#f4f1e6` (Distinctions cells, Contact light cards,
  Projects polaroid cards) → **≈16.2:1** — comfortably AAA.
- Headline `#f3f2ef` on Contact's dark background `#0a0a0a` → **≈17.7:1** —
  comfortably AAA.

**Flag 1, 2, 3 — status: RESOLVED 2026-09-21.** All three were real, computed
AA failures under the mockup's own default prop values, not hypothetical. Each
is now fixed below with a specific corrected value — computed via the same
WCAG relative-luminance formula, not estimated — rather than left open. Full
rationale, the decorative-animation interaction for Fix 1, and the worked
accessibility examples live in `05_ACCESSIBILITY.MD`; this section is the
color-value record.

## Corrected Contrast Pairings

**Fix 1 — RETIRED 2026-09-21 (was Flag 1) — Home headline/nav text vs. page
background.** This fix assumed Home's headline/nav text (`#14150f`) sat, at
the CSS level, directly on top of the raw `#0e0f0b` page background, computed
that pairing at **≈1.05:1**, and "corrected" it to `#f3f2ef`. That assumption
was wrong: the "Ink Flow Background" `dc-import` is its own nested
`ext_resources` entry (inside `main-page-standalone`'s manifest, not one of
the six top-level decoded files), and `decode-mockup.mjs` writes such nested
entries out as an opaque `.html` asset that nobody had opened — so its real
composited surface was unknown at the time, not merely decorative/absent as
assumed. That real component (`docs/_decoded/main-page-standalone/assets/
ffce4155-*.html`) is a fully **opaque** `inset:0` layer, cream paper
(`#f6f4ea`) at its base, sitting *between* the `#0e0f0b` shell background and
Home's text (z-index 0 vs. 10) — the shell's `#0e0f0b` never actually
composites under the text at all, regardless of the animation's play state,
load state, or `prefers-reduced-motion`. Against the real paper background,
the decoded literal `#14150f` computes to **≈16.6:1** (comfortably AAA) — no
fix was ever needed. Home's text has been reverted to the decoded literal
`#14150f`; `#f3f2ef` is no longer used on this screen. See
`00_PROJECT_VISION.MD` and `01_ART_DIRECTION.MD` for the matching "dark
identity hero" retraction, and `05_ACCESSIBILITY.MD`'s Home worked example
for the updated effect description.
  - The focused nav-list item's accent-colored (`#6f7f45` default) num/label
    text computes to **≈3.97:1** on `#f6f4ea` paper (recomputed against the
    correct background) — clears the 3:1 AA large-text threshold (its label
    is 34px) but falls short of the 4.5:1 normal-text threshold. Its 19px
    trailing arrow glyph is the same ≈3.97:1 pairing and *is* below the
    normal-text threshold at that size — but it's a decorative, redundant
    indicator (the label already conveys focus via position-shift and
    color), not the sole carrier of the "focused" state, so this doesn't
    independently require a fix. Left as-is (the decoded literal), not
    escalated to a fourth token.

**Fix 2 (was Flag 2) — pill-nav active-state text on accent.** The floating
pill-nav's *active* state sets `color:#14150f` on `background: accent`
(`#6f7f45` default) at 11px, uppercase JetBrains Mono — normal-size text by
WCAG's definition, needing 4.5:1.
  - **Before:** ink `#14150f` on accent `#6f7f45` → **≈4.20:1** (fails AA)
  - **After:** ink `#14150f` on `#8b9c56` → **≈6.11:1** (passes AA
    comfortably) — `#8b9c56` is not a new color either: it was already
    cataloged in this same design system as a Profile accent option (the
    "lighter, more yellow-green olive" used for the chamber dot fill). This
    fix extends its role from "Profile chamber dot fill only" to "the
    text-safe accent variant for any ink-on-accent chrome surface," since it
    was verified to already read as a legitimate step within the existing
    accent family, not an out-of-palette invention. Darkening the accent
    instead (the other "smallest change" direction) was tried and computed
    to make this specific pairing *worse* — dark ink on a darker background
    loses contrast — so lightening, not darkening, is the correct direction
    here.
  - Applies to the pill-nav's active-state background specifically (persistent
    chrome, all five screens). The default `#6f7f45` accent remains correct
    everywhere else it's used today (links, doodle colors, large-text
    surfaces ≥24px) — this is a targeted swap for one small-text-on-accent
    UI surface, not a global accent change.

**Fix 3 (was Flag 3) — Contact's GitHub card.** The card uses the accent
color as its own background (`background: var(--olive, #6f7f45)`) with
`#f6f4ea` text. The italic serif headline ("GitHub", 34px) cleared AA's 3:1
large-text threshold at ≈3.97:1, but the same pairing on the card's 11px
JetBrains Mono metadata lines (`@overnuke`, `(02)`, `source`) is normal-size
text needing 4.5:1 and fell short.
  - **Before:** `#f6f4ea` text on accent `#6f7f45` background → **≈3.97:1**
    (passes large-text 3:1, fails normal-text 4.5:1)
  - **After:** `#f6f4ea` text on `#4f5c2f` background → **≈6.56:1** (passes
    AA at every text size on the card, headline included) — `#4f5c2f` is
    likewise not invented: it was already cataloged as one of Contact's own
    accent options (`#6f7f45`, `#b9c98a`, `#4f5c2f`, `#8a9a55`). Unlike Fix 2,
    this needed only a background swap, not a split-by-size treatment,
    because Contact's existing accent options already include a step dark
    enough to clear 4.5:1 uniformly.
  - This is scoped to the GitHub card's own background override — Contact's
    default accent (`#6f7f45`) is unaffected everywhere else it's used
    (the "open to work" pulse dot, the other four cards' arrow-badge fill,
    etc., none of which pair it with small text directly on top of it).

None of these three were eligible to ship "faithfully as designed" — per this
repo's non-negotiable conflict order (Accessibility → Project Vision →
Architecture → Developer Experience → Implementation Speed), mockup fidelity
does not override an AA failure. All three fixes above reuse a value already
present somewhere in this same design system rather than introducing a new
color, per this rebuild's stated preference for the smallest correct change.
