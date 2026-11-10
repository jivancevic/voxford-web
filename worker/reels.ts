import type { Env } from './env';

// Daily reels sync (cron in wrangler.jsonc): ticket E owns this file. It will
// pull the latest reels from the Instagram API, store them in R2 and trigger a
// rebuild. Until then it does nothing. Keep the signature: worker/index.ts
// calls it from `scheduled`.
export async function syncReels(_env: Env, _ctx: ExecutionContext): Promise<void> {
  // intentionally empty until ticket E
}
