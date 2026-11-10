# Deploy: Cloudflare Workers

The site is one Worker, `voxford-web`, with the Astro build (`dist/`) as static assets (ADR 0001). Cloudflare Workers Builds is connected to this repo: every push to `main` builds and deploys to production; every other branch gets a preview version URL. There is no staging.

## What a deploy runs

| Step | Command | Where it is set |
|---|---|---|
| Build | `npm run build` (first bakes `WORKERS_CI_COMMIT_SHA` into `worker/build-info.ts`) | Workers Builds › Settings › Build › Build command |
| Deploy (`main`) | `npm run deploy` or the dashboard default `npx wrangler deploy`; both report the commit | Deploy command |
| Preview (other branches) | the dashboard default `npx wrangler preview` (needs the `previews` block in `wrangler.jsonc`) or `npx wrangler versions upload` | Non-production branch deploy command |

Build variables (Workers Builds › Settings › Build › Variables): `SITE_URL` = the production origin without a trailing slash (until ticket G `https://voxford-web.josip-ivancevic00.workers.dev`), `SITE_INDEXABLE` unset until the domain is live, `NODE_VERSION` = `26`.

`/healthz` reports the deployed commit, which the `smoke` workflow compares with the merged commit. Workers Builds sets `WORKERS_CI_COMMIT_SHA`; `scripts/build-info.mjs` writes it into `worker/build-info.ts` before the Astro build, so the commit is in the bundle whichever deploy command runs (`COMMIT_SHA` from `npm run deploy` wins when set). Locally the file stays empty and `/healthz` says `"commit": null`.

## Setup (once, by Josip)

1. Log wrangler in to the Cloudflare account that should own the site: `npx wrangler logout && npx wrangler login`, then `npx wrangler whoami` shows that account.
2. Create the R2 bucket the Worker binds (`MEDIA`), or every deploy fails: `npx wrangler r2 bucket create voxford-media` (see *Media and the reels sync*).
3. Dashboard › Workers & Pages › Create › Import a repository › `jivancevic/voxford-web`, project name `voxford-web`, production branch `main`, the commands and variables above.
4. After the first deploy, copy the `workers.dev` URL into the build variable `SITE_URL` and into the GitHub repository variable `PRODUCTION_URL` (`gh variable set PRODUCTION_URL --repo jivancevic/voxford-web --body "https://voxford-web.josip-ivancevic00.workers.dev"`, with the scheme: `smoke` calls `$PRODUCTION_URL/healthz` as is), then redeploy.
5. Branch protection, auto-merge and the merge permission: see *Ready for auto-merge* below.

## Ready for auto-merge

STANDARDS' order: this runbook merged, then branch protection with the required checks, then `allow_auto_merge`, then the human's allow entry. Josip runs these; `/ship` merges nothing until all of them read back as below.

```bash
# 1. Branch protection: the required checks, no review count (the review is /ship's round 2).
#    The second context is the Workers Builds check's exact name, from a PR's checks list
#    after step 2 of Setup (typically "Workers Builds: voxford-web").
gh api -X PUT repos/jivancevic/voxford-web/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": false, "contexts": ["ci", "Workers Builds: voxford-web"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
JSON

# 2. Allow auto-merge on the repo
gh api -X PATCH repos/jivancevic/voxford-web -F allow_auto_merge=true
```

3. The allow entry, added by hand to `.claude/settings.json` and committed (exact string, no wildcard):

```json
{
  "worktree": { "bgIsolation": "worktree" },
  "permissions": { "allow": ["Bash(gh pr merge --auto --squash)"] }
}
```

Read-back (what `/ship` checks):

```bash
gh api repos/jivancevic/voxford-web/branches/main/protection \
  --jq '{contexts: .required_status_checks.contexts, strict: .required_status_checks.strict, enforce_admins: .enforce_admins.enabled}'
gh api repos/jivancevic/voxford-web --jq .allow_auto_merge
jq -e '.permissions.allow | index("Bash(gh pr merge --auto --squash)")' .claude/settings.json
```

State on 2026-11-10, read back after ticket A: Workers Builds connected on Josip's Cloudflare account (workers.dev subdomain `josip-ivancevic00`); branch protection requires `ci` and `Workers Builds: voxford-web` (`strict: false`, `enforce_admins: false`); `allow_auto_merge: true`; the allow entry is in `.claude/settings.json` (#16). Ready for `/ship`.

## Post-merge check

`.github/workflows/smoke.yml` polls `$PRODUCTION_URL/healthz` for up to 10 minutes until it answers 200 with the merged commit. Red means prod stopped answering or the merge never reached prod (a failed build leaves the previous version answering with the previous commit).

## Rollback

Every merge to `main` goes to production with no staging, so this is the undo. Reach for it first when `smoke` is red or the site misbehaves after a merge.

**1. Find the bad and the last good version.**

    npx wrangler deployments list --name voxford-web

(or the dashboard: Workers & Pages › voxford-web › Deployments). Each row shows the version id and, for Workers Builds deploys, the commit.

**2. Put the last good version back.**

    npx wrangler rollback --name voxford-web                 # to the previous version
    npx wrangler rollback <version-id> --name voxford-web    # to a specific one

By hand: dashboard › voxford-web › Deployments › the last good version › ⋯ › *Rollback*. `curl -s $PRODUCTION_URL/healthz` shows that version's commit when it took. A rollback does not change bindings or secrets; if the bad deploy changed those, put them back too.

**3. Revert on `main`, always.** Step 2 only swaps what runs; `main` still holds the bad commit and the next merge deploys it again.

    git fetch origin
    git switch -c revert-<short-sha> origin/main
    git revert --no-edit <bad-sha>
    git push -u origin HEAD
    gh pr create --fill
    gh pr merge --auto --squash

## Inquiry (ticket D)

`POST /api/inquiry` (`worker/inquiry.ts`) has two modes, picked at runtime:

- **mailto fallback** (now): no email binding. The form hands the written-out inquiry to the visitor's own mail app, addressed to `voxford.official@gmail.com`. Nothing is sent from the Worker, so nothing here can be abused.
- **Email Sending** (once the domain is on Cloudflare): with the `EMAIL` binding and `INQUIRY_FROM` set, a submission that passes Turnstile is emailed to `voxford.official@gmail.com` with Reply-To the visitor. A submission without a Turnstile token (no JavaScript, widget blocked) still gets the mailto fallback; a failed check or a failed send gets it too, with an error message.

Names only here; values never go in a file or a PR.

| Name | Kind | Where | Value |
|---|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | build variable (public) | Workers Builds › Settings › Build › Variables | the widget's site key. Unset = Cloudflare's test key, which a real secret rejects: harmless in mailto mode, but once `EMAIL` is bound every submission ends in the error state (with the prefilled mailto link). Set it first. |
| `TURNSTILE_SECRET` | Worker secret | `wrangler secret put` | the widget's secret key |
| `TURNSTILE_HOSTNAMES` | Worker var, optional | `.dev.vars` locally | unset in production: the Worker accepts the host the request came to |
| `EMAIL` | `send_email` binding | `wrangler.jsonc` | added with the domain (below) |
| `INQUIRY_FROM` | Worker var | `wrangler.jsonc` `vars` | `inquiry@<domain>`, added with the domain |

Locally: `cp .dev.vars.example .dev.vars` gives Cloudflare's always-pass test secret, so `npm run preview` runs the whole path with the mailto fallback. To try the email path locally, add a `send_email` binding to a copy of the config and `INQUIRY_FROM` to `.dev.vars`; `wrangler dev` then simulates the send and prints where it saved the message.

### Turnstile (Josip, once Workers Builds is connected)

1. Create an invisible widget for the `workers.dev` host and store its secret on the Worker without printing it:

   ```bash
   ( set +x
     out=$(npx wrangler turnstile widget create "voxford-web inquiry" \
       --domain voxford-web.josip-ivancevic00.workers.dev --mode invisible --json)
     printf '%s' "$out" | jq -r .sitekey
     printf '%s' "$out" | jq -r .secret | npx wrangler secret put TURNSTILE_SECRET --name voxford-web
     unset out )
   ```

   (Or in the dashboard: Turnstile › Add widget, mode *Invisible*, then `npx wrangler secret put TURNSTILE_SECRET --name voxford-web` and paste the secret at the prompt.)
2. Put the printed site key in the Workers Builds build variable `PUBLIC_TURNSTILE_SITE_KEY` and redeploy (it is baked into the static page).
3. Check: `npx wrangler secret list --name voxford-web` lists `TURNSTILE_SECRET`.

Preview version URLs (`<version>-voxford-web.josip-ivancevic00.workers.dev`) are not on the widget, so their form always takes the mailto fallback. That is expected.

### Email Sending (with ticket G, after the domain is on Cloudflare)

Sending only to a verified address in the account is free on every plan, so the binding is pinned to the group's address.

```bash
npx wrangler email sending enable <domain>
npx wrangler email routing addresses create voxford.official@gmail.com   # then click the link in that inbox
npx wrangler email sending list                                         # <domain> is listed
npx wrangler turnstile widget update <sitekey> --domain <domain> --domain voxford-web.josip-ivancevic00.workers.dev --mode invisible
```

Then, in a PR, add to `wrangler.jsonc`:

```jsonc
"send_email": [{ "name": "EMAIL", "destination_address": "voxford.official@gmail.com" }],
"vars": { "INQUIRY_FROM": "inquiry@<domain>" }
```

After that deploy, send one inquiry from the live page and check that it arrives, with Reply-To set to the address typed in the form.

## Media and the reels sync (ticket E)

Videos never go in git. The encoded top videos and the synced reels live in the R2 bucket `voxford-media` (binding `MEDIA`), and the Worker serves them from the site's own origin at `/media/top/…` and `/media/reels/…` (`worker/media.ts`, byte ranges included). `wrangler dev` uses a local bucket under `.wrangler/state`, so the same URLs work locally.

**Once, before the first deploy that carries the binding** (a deploy fails while the bucket is missing):

    npx wrangler r2 bucket create voxford-media

**Top videos.** The originals are on Drive (Ante › Voxford › Video › Najgledaniji videi) and in `~/Downloads/voxford-top-videos/`; `scripts/top-videos.tsv` maps each to its slug.

    scripts/encode-top-videos.sh            # → ~/voxford-media/top/<slug>/ and src/assets/videos/<slug>.jpg (posters, committed)
    scripts/upload-media.sh --remote        # → voxford-media/top/<slug>/… in production
    scripts/upload-media.sh --local         # the same into wrangler dev's local bucket

A new top video: add a row to `scripts/top-videos.tsv`, encode, upload, add `src/content/videos/<slug>.json`.

**Reels sync.** `worker/reels.ts` runs on the cron (04:17 UTC daily): it copies the newest 6 reels from the Instagram API with Instagram Login into `reels/`, writes `reels/manifest.json` and, when the feed changed, POSTs the Workers Builds deploy hook. The build reads `<SITE_URL>/media/reels/manifest.json` (`src/lib/reels.ts`); build variable `REELS_MANIFEST_URL` overrides it, `off` skips it. If anything fails the last good feed stays, and a build that cannot read the manifest renders the Videos page without the reels.

Secrets (Worker › Settings › Variables & Secrets), set by the wizard, never in a file:

| Secret | What | Set by |
|---|---|---|
| `INSTAGRAM_TOKEN` | long-lived token, 60 days, extended by every sync run | `scripts/instagram-wizard.sh` (stages 5–6) |
| `DEPLOY_HOOK_URL` | Workers Builds › Settings › Builds › Deploy Hooks, branch `main` | `scripts/instagram-wizard.sh` (stage 7) |

    scripts/instagram-wizard.sh             # first time: Meta app, tester role, token, deploy hook
    scripts/instagram-wizard.sh token       # a new token only (the log says "Instagram API 400: 190 …")
    npx wrangler tail voxford-web           # watch a run: "reels: updated, 6 reels, rebuild triggered"

**Test the sync locally** against the real API and the local bucket (the token stays in this shell):

    read -rs INSTAGRAM_TOKEN && export INSTAGRAM_TOKEN
    npm run build && CLOUDFLARE_INCLUDE_PROCESS_ENV=true npx wrangler dev --test-scheduled
    curl "http://localhost:8787/__scheduled?cron=17+4+*+*+*"     # then: curl localhost:8787/media/reels/manifest.json
    REELS_MANIFEST_URL=http://localhost:8787/media/reels/manifest.json npm run build   # the page with the reels

## Domain (ticket G)

Not chosen yet. When it is: add the domain to the Cloudflare account, add `routes` with `custom_domain: true` to `wrangler.jsonc`, `www` → apex redirect, set `SITE_URL` and `SITE_INDEXABLE=true`, update `PRODUCTION_URL`, turn the zone's AI-crawler block off (Security › Bots), and submit the sitemap in Search Console and Bing Webmaster Tools.
