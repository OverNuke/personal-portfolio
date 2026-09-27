import { defineConfig, devices } from '@playwright/test';

// Touch-emulated specs live in `e2e/mobile-*.spec.ts` and run ONLY under the
// `mobile` project; the desktop project must never pick them up.
const MOBILE_SPECS = /[\\/]mobile-[^\\/]*\.spec\.ts$/;

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: MOBILE_SPECS },
    // Pixel 7 (Chromium) rather than an iPhone: CI installs only Chromium.
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: MOBILE_SPECS },
  ],
});
