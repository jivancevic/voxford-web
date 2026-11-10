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
  /** Turnstile secret key: a Worker secret (`wrangler secret put TURNSTILE_SECRET`); `.dev.vars` locally. */
  TURNSTILE_SECRET?: string;
  /** Optional comma-separated hostnames the widget may be solved on; default: the request's own host. */
  TURNSTILE_HOSTNAMES?: string;
  /** Cloudflare Email Sending (`send_email` in wrangler.jsonc), once the domain is onboarded. Absent: mailto fallback. */
  EMAIL?: SendEmail;
  /** Sender on the onboarded domain, e.g. `inquiry@<domain>`. Absent: mailto fallback. */
  INQUIRY_FROM?: string;

  // --- ticket E: reels ---
  /** R2 bucket `voxford-media`: top videos (top/<slug>/…) and the synced reels (reels/…), served at /media/. */
  MEDIA: R2Bucket;
  /** Secret: system-user token (Instagram API with Unified login, never expires). Unset: the reels sync does nothing. */
  INSTAGRAM_TOKEN?: string;
  /** Secret: voxford.official's Instagram user id (numeric), whose reels the sync reads. Unset: the sync does nothing. */
  INSTAGRAM_USER_ID?: string;
  /** Secret: Workers Builds deploy hook URL, POSTed when the reels feed changed. */
  DEPLOY_HOOK_URL?: string;
}
