# Personal Portfolio

Static portfolio site, deployed via GitHub Pages using GitHub Actions.

## Status

Scaffold only — section placeholders in `index.html` are stand-ins for a
Claude Design project (`Main Page`, `Profile Section`, `Distinction Section`,
`Cell Fusion Section`, `Projects Section`, `Contact Section`, `Ink Flow
Background`, `Design Guidelines`). The design import is pending (needs a
`claudeusercontent.com` bundle URL or `/design-login`); once available, drop
the real markup/styles/scripts into the matching `TODO` spots in
`index.html`, `css/styles.css`, `js/image-slot.js`, and `js/support.js`.

## Deploy

`.github/workflows/deploy.yml` builds nothing — it just uploads the repo
root as a Pages artifact. For it to run:

1. Push this repo to GitHub.
2. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually) to deploy.
