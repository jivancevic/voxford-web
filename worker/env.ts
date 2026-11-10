// Bindings and vars the Worker sees. Keep in step with wrangler.jsonc.
// Ticket D adds the inquiry bindings (Turnstile secret, email), ticket E the
// reels bindings (R2 bucket, Instagram token, deploy hook); each adds its own
// lines below its own comment.
export interface Env {
  /** Static assets: the Astro build in dist/. */
  ASSETS: Fetcher;
  /** Git SHA of the deployed commit, set by `npm run deploy` (--var). Empty locally. */
  COMMIT_SHA?: string;

  // --- ticket D: inquiry ---

  // --- ticket E: reels ---
}
