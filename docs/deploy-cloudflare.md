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
4. Branch protection, auto-merge and the merge permission: see *Ready for auto-merge* below.

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

State on 2026-11-10 (ticket A): no branch protection (404), `allow_auto_merge: false`, no allow entry, Workers Builds not connected.

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
| `PUBLIC_TURNSTILE_SITE_KEY` | build variable (public) | Workers Builds › Settings › Build › Variables | the widget's site key; unset = Cloudflare's test key, which a real secret rejects (mailto fallback) |
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
       --domain voxford-web.<subdomain>.workers.dev --mode invisible --json)
     printf '%s' "$out" | jq -r .sitekey
     printf '%s' "$out" | jq -r .secret | npx wrangler secret put TURNSTILE_SECRET --name voxford-web
     unset out )
   ```

   (Or in the dashboard: Turnstile › Add widget, mode *Invisible*, then `npx wrangler secret put TURNSTILE_SECRET --name voxford-web` and paste the secret at the prompt.)
2. Put the printed site key in the Workers Builds build variable `PUBLIC_TURNSTILE_SITE_KEY` and redeploy (it is baked into the static page).
3. Check: `npx wrangler secret list --name voxford-web` lists `TURNSTILE_SECRET`.

Preview version URLs (`<version>-voxford-web.<subdomain>.workers.dev`) are not on the widget, so their form always takes the mailto fallback. That is expected.

### Email Sending (with ticket G, after the domain is on Cloudflare)

Sending only to a verified address in the account is free on every plan, so the binding is pinned to the group's address.

```bash
npx wrangler email sending enable <domain>
npx wrangler email routing addresses create voxford.official@gmail.com   # then click the link in that inbox
npx wrangler email sending list                                         # <domain> is listed
npx wrangler turnstile widget update <sitekey> --domain <domain> --domain voxford-web.<subdomain>.workers.dev --mode invisible
```

Then, in a PR, add to `wrangler.jsonc`:

```jsonc
"send_email": [{ "name": "EMAIL", "destination_address": "voxford.official@gmail.com" }],
"vars": { "INQUIRY_FROM": "inquiry@<domain>" }
```

After that deploy, send one inquiry from the live page and check that it arrives, with Reply-To set to the address typed in the form.

## Domain (ticket G)

Not chosen yet. When it is: add the domain to the Cloudflare account, add `routes` with `custom_domain: true` to `wrangler.jsonc`, `www` → apex redirect, set `SITE_URL` and `SITE_INDEXABLE=true`, update `PRODUCTION_URL`, turn the zone's AI-crawler block off (Security › Bots), and submit the sitemap in Search Console and Bing Webmaster Tools.
