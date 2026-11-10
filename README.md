# Voxford website

The website of [Voxford](https://www.instagram.com/voxford.official/), a five-voice a cappella group from Zagreb, Croatia: who they are, their videos, and one way to book them (send an inquiry). In English and Croatian.

## Stack

Astro 7 (static) · TypeScript · Cloudflare Workers (static assets + a small Worker) · Vitest

## Run

```bash
npm install
npm run dev       # localhost:4321
npm run preview   # build + wrangler dev on localhost:8787, Worker included
npm test
```

Node 26 (`.nvmrc`).

## Docs

- [`CONTEXT.md`](CONTEXT.md): the words the site uses
- [`AGENTS.md`](AGENTS.md): seams, who edits what, how work ships
- [`CLAUDE.md`](CLAUDE.md): map, commands, hard rules
- [`docs/spec.md`](docs/spec.md): what v1 is · [`docs/tickets.md`](docs/tickets.md): how it is built
- [`docs/adr/`](docs/adr/): decisions · [`docs/deploy-cloudflare.md`](docs/deploy-cloudflare.md): deploy and rollback
