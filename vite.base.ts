/**
 * Resolves Vite's `base` from the `VITE_BASE` env var.
 *
 * GitHub Pages serves this repo as a *project* site
 * (https://<user>.github.io/<repo>/), so the deploy build must emit asset URLs
 * under that sub-path. `.github/workflows/deploy.yml` feeds it
 * `actions/configure-pages`' `base_path` output, which is '' for a user/org or
 * custom-domain site. Unset/empty keeps '/', which is what the dev server,
 * `pnpm preview`, `pnpm e2e` and `pnpm run audit:collage` all rely on.
 */
export function resolveBase(raw: string | undefined): string {
  const segments = (raw ?? '').split('/').filter((s) => s.trim() !== '');
  if (segments.length === 0) return '/';
  return `/${segments.map((s) => s.trim()).join('/')}/`;
}
