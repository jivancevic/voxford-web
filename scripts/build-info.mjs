// Bakes the deployed commit into the Worker at build time, so /healthz reports
// it whatever deploy command Workers Builds runs (the dashboard default is a
// bare `npx wrangler deploy`, which cannot pass --var COMMIT_SHA).
// Workers Builds sets WORKERS_CI_COMMIT_SHA; locally it is unset and this
// script leaves worker/build-info.ts as committed.
import { writeFileSync } from 'node:fs';

const sha = process.env.WORKERS_CI_COMMIT_SHA ?? '';
if (/^[0-9a-f]{7,40}$/.test(sha)) {
  writeFileSync(
    new URL('../worker/build-info.ts', import.meta.url),
    `// Written by scripts/build-info.mjs during Workers Builds.\nexport const BUILD_COMMIT: string = '${sha}';\n`,
  );
}
