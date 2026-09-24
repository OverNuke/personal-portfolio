import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

import { resolveBase } from './vite.base.ts';

export default defineConfig({
  base: resolveBase(process.env.VITE_BASE),
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules/**', 'e2e/**', '_quarantine/**'],
    // Originally added because the rebuilt component tree had no Vitest unit
    // tests (post-reset verification relied on Playwright e2e/a11y checks).
    // That gap is closed (`pnpm test` now runs a real suite -- see
    // docs/09_IMPLEMENTATION_ROADMAP.md); the flag is kept as a harmless
    // safety net, not because tests are missing.
    passWithNoTests: true,
  },
});
