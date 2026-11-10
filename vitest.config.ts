import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // `npm run test:dist` (DIST_CHECKS=1) checks the built HTML in dist/ instead.
    include: process.env.DIST_CHECKS ? ['tests/dist/**/*.test.ts'] : ['src/**/*.test.ts', 'worker/**/*.test.ts'],
    environment: 'node',
  },
});
