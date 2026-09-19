# Personal Portfolio

Static portfolio site, deployed via GitHub Pages using GitHub Actions.

## About `index.html`

This is a self-contained export from Claude Design: a small static shell
plus inline `<script type="__bundler/manifest">` / `<script
type="__bundler/template">` data blocks that unpack into the real page
(HTML, CSS, JS, images) client-side on load. Everything — including
`image-slot.js` and `support.js` — is bundled inside this one file; there
are no separate `css/`/`js`/`assets` folders.

Don't hand-edit the manifest/template blocks — they're generated data, not
authored markup. To update the site, re-export from the Claude Design
project and replace `index.html` wholesale.

## Deploy

`.github/workflows/deploy.yml` builds nothing — it just uploads the repo
root as a Pages artifact. For it to run:

1. Push this repo to GitHub.
2. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually) to deploy.
