import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

// GitHub Pages has no server-side rewrite. Serving a copy of the built
// index.html as 404.html is the standard SPA-on-Pages fallback: any
// unmatched path (e.g. a direct load of /profile) gets this file, and
// the router then reads the real path from location and renders client-side.
const dist = join(process.cwd(), 'dist');
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
