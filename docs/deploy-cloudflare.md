# Deploy: Cloudflare Workers

The site is one Worker, `voxford-web`, with the Astro build (`dist/`) as static assets (ADR 0001). Cloudflare Workers Builds is connected to this repo: every push to `main` builds and deploys to production; every other branch gets a preview version URL. There is no staging.

## What a deploy runs

| Step | Command | Where it is set |
|---|---|---|
| Build | `npm run build` | Workers Builds › Settings › Build › Build command |
| Deploy (`main`) | `npm run deploy` (= `wrangler deploy --var COMMIT_SHA:$WORKERS_CI_COMMIT_SHA`) | Deploy command |
| Preview (other branches) | `npx wrangler versions upload` | Non-production branch deploy command |

Build variables (Workers Builds › Settings › Build › Variables): `SITE_URL` = the production origin without a trailing slash (until ticket G the `https://voxford-web.<subdomain>.workers.dev` URL), `SITE_INDEXABLE` unset until the domain is live, `NODE_VERSION` = `26`.

`COMMIT_SHA` is what `/healthz` reports and what the `smoke` workflow compares with the merged commit. Workers Builds sets `WORKERS_CI_COMMIT_SHA` during the build; locally it is empty and `/healthz` says `"commit": null`.

## Setup (once, by Josip)

1. Log wrangler in to the Cloudflare account that should own the site: `npx wrangler logout && npx wrangler login`, then `npx wrangler whoami` shows that account.
2. Dashboard › Workers & Pages › Create › Import a repository › `jivancevic/voxford-web`, project name `voxford-web`, production branch `main`, the commands and variables above.
3. After the first deploy, copy the `workers.dev` URL into the build variable `SITE_URL` and into the GitHub repository variable `PRODUCTION_URL` (`gh variable set PRODUCTION_URL --repo jivancevic/voxford-web --body https://voxford-web.<subdomain>.workers.dev`), then redeploy.
4. Branch protection requires `ci` and the Workers Builds check (its exact name is on the first PR's checks list).

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

## Domain (ticket G)

Not chosen yet. When it is: add the domain to the Cloudflare account, add `routes` with `custom_domain: true` to `wrangler.jsonc`, `www` → apex redirect, set `SITE_URL` and `SITE_INDEXABLE=true`, update `PRODUCTION_URL`, turn the zone's AI-crawler block off (Security › Bots), and submit the sitemap in Search Console and Bing Webmaster Tools.
