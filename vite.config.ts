import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules/**', 'e2e/**', '_quarantine/**'],
    // Rebuilt component tree has no Vitest unit tests yet (post-reset
    // verification relied on Playwright e2e/a11y checks instead) -- don't
    // fail CI on that gap, but it's a real gap, not a deliberate omission.
    passWithNoTests: true,
  },
});
