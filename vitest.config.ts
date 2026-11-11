import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // `npm run test:dist` (DIST_CHECKS=1) checks the built HTML in dist/ instead,
    // `npm run test:layout` (LAYOUT_CHECKS=1) sweeps the built pages in Chromium.
    include: process.env.LAYOUT_CHECKS
      ? ['tests/layout/**/*.test.ts']
      : process.env.DIST_CHECKS
        ? ['tests/dist/**/*.test.ts']
        : ['src/**/*.test.ts', 'worker/**/*.test.ts'],
    environment: 'node',
    // The sweep: a page load and its measurements per test, a few at a time.
    ...(process.env.LAYOUT_CHECKS && { testTimeout: 90_000, hookTimeout: 60_000, maxConcurrency: 4 }),
  },
});
