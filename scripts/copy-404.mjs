import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

// GitHub Pages has no server-side rewrite. Serving a copy of the built
// index.html as 404.html is the standard SPA-on-Pages fallback: any
// unmatched path (e.g. a direct load of /profile) gets this file, so the app
// shell loads instead of GitHub's own 404 page. There is no router any more
// (docs/03): sections are addressed by URL hash (#profile), so such a path
// simply renders Home rather than the screen the path names.
const dist = join(process.cwd(), 'dist');
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
