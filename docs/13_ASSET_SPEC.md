# 13. Asset Spec

Reconciled manifest of every binary asset shipped under `src/assets/`, its
origin, and how it got there. Written _after_ the Phase 3 asset-reconciliation
pass against the decoded mockup exports (`docs/_decoded/`, produced by
`scripts/decode-mockup.mjs` from `mockup/*.html`). This document replaces an
earlier version that documented a `tools/halftone.py` preset pipeline —
that tool was never built; drop any reference to it as stale.

Provenance columns:

- **Origin** — which decoded mockup source (`docs/_decoded/<slug>/`) and
  asset UUID the file was extracted from, or `pre-existing` if it predates
  this reconciliation pass and was verified against mockup content instead
  of re-extracted.
- **Destination** — path under `src/assets/`.

## Fonts (`src/assets/fonts/`)

Five families are actually used across the six decoded screens (verified by
grepping every `@font-face` block and every corresponding `font-family`
usage in each `docs/_decoded/*/template.html` — not assumed from the brief).

| Family           | Style / Weight(s) used       | Screens                                                                                       | Origin (slug / UUID)                             | Destination                     |
| ---------------- | ---------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------- |
| Archivo Black    | normal 400                   | `index` (shell), `main-page-standalone` (secondary reference)                                 | `index` / `b3f2e76e-0a19-4f53-8ce6-2b8b6daad640` | `ArchivoBlack-Regular.woff2`    |
| Space Grotesk    | normal 400 / 500 / 700       | `index`, `main-page-standalone`                                                               | `index` / `8600dd8e-09d5-410c-ac3f-01d55a017b0c` | `SpaceGrotesk-Variable.woff2`   |
| JetBrains Mono   | normal 400 / 500             | `contact`, `distinction`, `index`, `profile`, `projects` (not used in `main-page-standalone`) | `index` / `ee414ceb-2b5b-4fc8-97a7-8b4e8977da89` | `JetBrainsMono-Variable.woff2`  |
| Instrument Serif | normal 400                   | `contact`, `distinction`, `index`, `profile`, `projects`                                      | `index` / `d87d58ae-c831-4f5a-acca-f59895160a04` | `InstrumentSerif-Regular.woff2` |
| Instrument Serif | italic 400                   | same screens as above                                                                         | `index` / `cf22e14d-be36-4c59-aeb7-11a41b188aa3` | `InstrumentSerif-Italic.woff2`  |
| Manrope          | normal 400 / 500 / 600 / 700 | `contact`, `distinction`, `index`, `profile`, `projects`                                      | `index` / `c663a964-1f51-4e46-b3d7-c604d14c2326` | `Manrope-Variable.woff2`        |

All six screens declare many more `@font-face` blocks than this table shows
per family (each is Google's own unicode-range subsetting — cyrillic,
cyrillic-ext, greek, vietnamese, latin-ext, latin — up to ~10 blocks per
family per screen). Only the Latin-range block was kept per family/style;
exact glyph coverage beyond Latin doesn't matter for an English/Spanish
portfolio. `index` was used as the canonical source for every family since
it's the app shell that imports the other four sections and declares all
five families itself.

**Discovery — variable-font weight duplication.** Space Grotesk, JetBrains
Mono, and Manrope are variable fonts. Google's CSS2 API, when asked for
several explicit static weights of a variable family, returns **the same
woff2 binary** for every requested weight (confirmed: identical asset UUIDs
appear across the 400/500/700 Space Grotesk blocks, the 400/500 JetBrains
Mono blocks, and the 400/500/600/700 Manrope blocks, both within a single
decoded screen and across screens). This isn't a decode bug — it's expected
behavior for VF families, and the browser applies the requested weight via
the font's own `wght` axis regardless of which single-weight `@font-face`
rule matched. `src/styles/fonts.css` mirrors this: one physical file per
family, multiple `@font-face` blocks (one per used weight) all pointing at
it. Archivo Black and both Instrument Serif faces are true single-instance
statics, so each gets its own distinct file.

**Discovery — unused `Permanent Marker` family.** Both `index` and
`main-page-standalone` declare `@font-face` blocks for `Permanent Marker`,
but the family name never appears anywhere else in either template (no
selector sets `font-family: 'Permanent Marker'`) — it's dead CSS, likely a
leftover from an earlier design iteration that got its usage removed but
not its font import. **Not extracted** — it isn't part of the shipped
design. If a future screen genuinely needs a hand-lettered marker face,
re-decode is trivial (`index` assets `0d7604cf-a686-4dd0-8139-7e235e72f7f1`
or `main-page-standalone` `88103aef-6c52-4346-80c7-b4926c44a1f4`), but don't
wire it up speculatively.

**Not an asset — Projects' hand-lettered title.** The Projects screen's
"PROJECTS" hero title is not a static image or font glyph at all: it's
drawn procedurally by a `layoutWord('PROJECTS', 76, 74, 1.18, 9)` call in
`docs/_decoded/projects-section-v2-standalone/template.html`, which builds
SVG `<path>` stroke data at runtime from a stroke-glyph coordinate table.
`projects-section-v2-standalone`'s asset manifest confirms this — it
contains zero image assets, only fonts and JS. This gets ported as **code**
(the glyph-stroke module) in a later implementation phase, not as a binary
asset — nothing to extract here.

## Certificates (`src/assets/plates/certificates/`)

The first five files are pre-existing, verified against mockup content — not
re-extracted. Filenames match the certificate scans referenced by the
Distinctions Voronoi cells in
`docs/_decoded/distinction-section-v4-standalone/template.html`. The next
four were added 2026-09-26 (change `mobile-visibility-scanmodal`) from the
owner's own PDFs under `raw/certificates/`.

| File              | Cell          | Origin                                                                       | Size (px) |
| ----------------- | ------------- | ---------------------------------------------------------------------------- | --------- |
| `anfeca.png`      | `anfeca`      | pre-existing, verified against mockup content                                | 1440x920  |
| `anglo.png`       | `english`     | pre-existing, verified against mockup content                                | 1440x920  |
| `exaver.png`      | `exaver`      | pre-existing, verified against mockup content                                | 920x1301  |
| `nota.png`        | `nota`        | pre-existing, verified against mockup content                                | 920x1301  |
| `sepToelf.png`    | `toefl`       | pre-existing, verified against mockup content                                | 920x1301  |
| `powerbi.png`     | `powerbi`     | `raw/certificates/CONISOFT25 Taller Kevin Sebastián.pdf`                     | 1440x920  |
| `ai.png`          | `ai`          | `raw/certificates/AI Fundamentals - DataCamp.pdf`                            | 1440x920  |
| `aiinit.png`      | `aiinit`      | `raw/certificates/Certificado-BIG-School-Kevin-Sebastian-Frias-Garcia.pdf`   | 1440x920  |
| `propadeutic.png` | `propadeutic` | `raw/certificates/Certificado TecNM CPFCDE-CPF _ Cursos MOOC TecNM 2026.pdf` | 920x1301  |

Convention for the new plates: PDF page 1 rasterized at 3x, fitted (never
cropped or stretched) and centred on a white 1440x920 (landscape) or 920x1301
(portrait) canvas, then written as an indexed PNG (median-cut palette, 20-256
colours) to stay at or under ~150 KB each. The conversion is throwaway
tooling kept outside the repo (PyMuPDF for the raster, Pillow for the fit and
palette); only the PNG outputs are committed and no dependency was added.
`aiinit.png` is the one exception: it comes from the PDF's embedded image, on a
black canvas, with a bright-weighted 24-colour palette (see the note below).

> **Updated 2026-09-26:** the "four cells have no file" statement from the
> 2026-09-21 close-out is dropped. All nine cells now have a real scan. `aiinit`
> was the last: its source,
> `raw/certificates/Certificado-BIG-School-Kevin-Sebastian-Frias-Garcia.pdf`,
> is an image-only PDF, and the owner **confirmed on 2026-09-26** that it is the
> "Certificado de Iniciación al Desarrollo con IA" (mouredev + BIG school,
> 26/06/2026). Its embedded 2000x1545 image was extracted (not page-rasterized),
> fitted with LANCZOS (no crop/stretch) and centred on a **black** 1440x920
> canvas: the certificate is a dark sci-fi design whose own edge is pure black,
> so black bars read as part of the document, where white bars would frame it
> like a foreign object. The dark, gradient-heavy art does not survive a plain
> median-cut palette (a 256-colour version is ~650 KB and 8 colours washes the
> text to grey), so the palette was built from a bright-weighted sample after
> Gaussian-smoothing the dark background away from text/lines: 24 colours,
> 140,960 B, with names, signatures and small print legible. The
> `ScanModal` "Scan not yet available" placeholder
> (`src/pages/distinctions/ScanModal.tsx`, mirroring the decoded template's
> empty `<image-slot placeholder="Drop the scan">` state) stays as the
> fallback for any future cell without a scan. The mapping (including the
> `english`→`anglo.png` and `toefl`→`sepToelf.png` reconciliations) is a
> judgment call documented inline in `distinctionsData.ts`, and
> `distinctionsData.test.ts` pins an empty scan-less allow-list so a cell
> added without a scan cannot go unnoticed.
>
> The `sepToelf.png` scan is the SEP English-specialty diploma (Coatzacoalcos,
> 4 Dec 2018), not a TOEFL/ETS document, so the `toefl` cell's copy now reads
> "SEP English Diploma" / "SEP · 2018" — a deliberate departure from the
> mockup's "TOEFL Certificate" / "ETS · 2018" (the id is unchanged).
>
> **Updated 2026-09-26 (user-decided):** likewise `anglo.png` is not an English
> certificate. It is a SEV/DGB "Diploma" from Colegio Anglo-Mexicano de
> Coatzacoalcos for the "Capacitación para el Trabajo: Tecnologías de la
> Información y la Comunicación" (9 Jul 2021). The `english` cell's copy now
> reads "ICT Training Diploma" / "Anglo Mexicano · 2021" (lightbox: "Colegio
> Anglo-Mexicano · Coatzacoalcos · 2021") — a deliberate departure from the
> mockup's "English Certificate". The id, the `anglo.png` filename and the
> raw→plate origin are unchanged.

> **Note 2026-09-26 — plates render in real pixels.** `ScanModal` is portaled
> outside `.stage`, so unlike everything else in the fixed-1440 design it is
> NOT scaled by viewport width: a plate is drawn at its own pixel size, capped
> by the modal. That is why the plates keep the 920/1440-wide conventions
> rather than a smaller phone-sized variant, and why the modal gets its own
> `max-width: 640px` rules (one recorded exception to the fixed-design-width
> rule).

## Project photos (`src/assets/plates/projects/`)

Pre-existing, verified against mockup content — not re-extracted. One
subfolder per project card referenced by Projects' polaroid stack.

| Folder        | Files                                      | Origin                                        |
| ------------- | ------------------------------------------ | --------------------------------------------- |
| `acopiatech/` | `main.png`, `pickup.png`, `profile.png`    | pre-existing, verified against mockup content |
| `barbershop/` | `notification.png`, `test.png`, `user.png` | pre-existing, verified against mockup content |
| `odoo/`       | `access.png`, `info.png`, `trash.png`      | pre-existing, verified against mockup content |

## Portrait / profile photos (`src/assets/plates/portrait/`)

Pre-existing, verified against mockup content — not re-extracted. Used by
the Profile screen's chamber panels and Contact's figure treatment.

| File                         | Origin                                        |
| ---------------------------- | --------------------------------------------- |
| `contact-figure.jpg`         | pre-existing, verified against mockup content |
| `profile-animate-sit.png`    | pre-existing, verified against mockup content |
| `profile-animate-stand.png`  | pre-existing, verified against mockup content |
| `profile-panel-alien.jpg`    | pre-existing, verified against mockup content |
| `profile-panel-cold.jpg`     | pre-existing, verified against mockup content |
| `profile-panel-keff.jpg`     | pre-existing, verified against mockup content |
| `profile-panel-overnuke.jpg` | pre-existing, verified against mockup content |
| `sitting.png`                | pre-existing, verified against mockup content |
| `standing.png`               | pre-existing, verified against mockup content |

## Doodle / decorative (`src/assets/doodle/`)

Pre-existing, verified against mockup content — not re-extracted. Cross-checked
pixel-for-pixel against the Distinctions lightbox's eye doodles:
`docs/_decoded/distinction-section-v4-standalone/assets/3ab712c2-87f8-4b1a-a3a5-e43046d8dab4.png`
matches `eye-right.png` (solid, transparent background) and
`docs/_decoded/distinction-section-v4-standalone/assets/41c7fded-fd41-432e-b73c-f09375d6f881.png`
matches `eye-left-paper.png` (cream, noise-textured background) exactly — no
new doodle assets exist in the decoded manifest beyond these two.

| File                 | Origin                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `eye-left.png`       | pre-existing, verified against mockup content                                                                                           |
| `eye-left-paper.png` | pre-existing, verified against mockup content (matches `distinction-section-v4-standalone` UUID `41c7fded-fd41-432e-b73c-f09375d6f881`) |
| `eye-right.png`      | pre-existing, verified against mockup content (matches `distinction-section-v4-standalone` UUID `3ab712c2-87f8-4b1a-a3a5-e43046d8dab4`) |

## Contact (`src/assets/contact/`)

Net-new extraction — this asset did not exist anywhere in the repo before
this pass.

| File                     | Origin                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `background.jpg`         | `contact-section-v2-standalone` / `31d70d56-bfd5-4a7e-aaa1-d379268b3469` | Full-bleed background photo behind the Contact screen's dock. Rendered dimmed in the mockup via `filter: grayscale(1) contrast(1.32) brightness(.52)` plus two gradient overlays — the source file itself is a full-color illustration; apply the same filter/gradient treatment in the component rather than pre-processing the file, so the effect stays tunable. |
| `Whatsapp_contact.jpeg`  | Owner-supplied, 2026-09-27 — not from a decoded mockup manifest          | Real WhatsApp QR code for the Contact dock's WhatsApp card (`channels.ts`'s `qrImage`), replacing the empty `qrPlaceholder` box the mockup shipped with no asset for.                                                                                                                                                                                              |

## Assets checked and confirmed to not need extraction

- `profile-section-v4-standalone`, `main-page-standalone`, and `index` asset
  manifests contain zero image entries (fonts + JS + HTML/CSS only) — the
  ink-bloom canvas and ink-flow background are pure JS/canvas-drawn, no
  static image backs them.
- `projects-section-v2-standalone` asset manifest contains zero image
  entries — see the "Not an asset" note under Fonts above.
