import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

// mockup/*.html are exports from a proprietary "bundler" tool, not plain HTML:
// the real markup/CSS/JS is JSON-encoded inside <script type="__bundler/*">
// tags and only unpacks via a runtime loader (opening the file raw shows an
// "Unpacking..." placeholder). This script does what that loader does, so the
// decoded output can be read and used as the source of truth for the React
// port. Output goes to docs/_decoded/ (gitignored — reading aid, not shipped).

const MOCKUP_DIR = join(process.cwd(), 'mockup');
const OUT_DIR = join(process.cwd(), 'docs', '_decoded');

const MIME_EXT = {
  'font/woff2': '.woff2',
  'text/html': '.html',
  'text/css': '.css',
  'text/javascript': '.js',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
};

function slugify(filename) {
  return filename
    .replace(/\.html$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractBundlerScript(html, type) {
  const re = new RegExp(
    `<script[^>]*type=["']__bundler/${type}["'][^>]*>([\\s\\S]*?)</script>`,
    'i',
  );
  const match = html.match(re);
  return match ? JSON.parse(match[1]) : null;
}

function extFor(mime) {
  return MIME_EXT[mime] ?? `.${mime.split('/')[1] ?? 'bin'}`;
}

function decodeFile(filename) {
  const html = readFileSync(join(MOCKUP_DIR, filename), 'utf8');
  const slug = slugify(filename);
  const outDir = join(OUT_DIR, slug);
  const assetsDir = join(outDir, 'assets');
  mkdirSync(assetsDir, { recursive: true });

  const template = extractBundlerScript(html, 'template');
  const manifest = extractBundlerScript(html, 'manifest') ?? {};
  const extResources = extractBundlerScript(html, 'ext_resources') ?? [];

  writeFileSync(join(outDir, 'template.html'), template ?? '', 'utf8');

  const assets = [];
  for (const [uuid, entry] of Object.entries(manifest)) {
    const raw = Buffer.from(entry.data, 'base64');
    const bytes = entry.compressed ? gunzipSync(raw) : raw;
    const ext = extFor(entry.mime);
    writeFileSync(join(assetsDir, `${uuid}${ext}`), bytes);
    assets.push({ uuid, mime: entry.mime, file: `assets/${uuid}${ext}` });
  }

  writeFileSync(
    join(outDir, 'info.json'),
    JSON.stringify({ sourceFile: filename, extResources, assets }, null, 2),
    'utf8',
  );

  console.log(`decoded ${filename} -> docs/_decoded/${slug}/ (${assets.length} assets)`);
}

const files = readdirSync(MOCKUP_DIR).filter((f) => f.toLowerCase().endsWith('.html'));
for (const file of files) {
  decodeFile(file);
}
