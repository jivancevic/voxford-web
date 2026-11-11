// The layout sweep (issue #102): every page of the built site at the
// viewports where layout bugs reached review (short windows, phones on their
// side, tablets), with reduced motion and with it, and the home's pinned
// stages forced small. Fails on the six rules in probe.ts; small text and
// empty gaps are only printed. Run: `npm run build && npm run test:layout`.
// A failing case leaves a half-scale screenshot and summary.json in
// test-results/layout/.

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type Browser, type BrowserContext, chromium, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Case, CASES, KNOWN, PIN_POSITIONS, type Route, routes, STAGES } from './matrix';
import { type Finding, preparePage, probeLayout, probeStage, probeTaps, stageGeometry } from './probe';
import { type DistServer, serveDist } from './server';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
if (!existsSync(dist)) throw new Error('dist/ is missing: run `npm run build` first');
const out = fileURLToPath(new URL('../../test-results/layout/', import.meta.url));

interface Result {
  case: string;
  route: string;
  path: string;
  fails: Finding[];
  reports: Finding[];
  /** Failures declared in KNOWN, with their issue. */
  known: (Finding & { issue: number })[];
}
const results: Result[] = [];

let server: DistServer;
let browser: Browser;

beforeAll(async () => {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  server = await serveDist(dist);
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
  writeFileSync(`${out}summary.json`, `${JSON.stringify(results.filter((r) => r.fails.length || r.reports.length || r.known.length), null, 1)}\n`);
  const known = results.flatMap((r) => r.known.map((f) => `  ${r.route} ${r.case} ${f.rule} ${f.el}: ${f.detail} (#${f.issue})`));
  if (known.length) process.stdout.write(`Layout sweep, known (not failing):\n${known.join('\n')}\n`);
  // Report-only findings, one line per rule and element: how often, and the first case it showed in.
  const lines = new Map<string, { n: number; first: string }>();
  for (const r of results)
    for (const f of r.reports) {
      const key = `${f.rule} ${f.el}`;
      const seen = lines.get(key);
      lines.set(key, { n: (seen?.n ?? 0) + 1, first: seen?.first ?? `${r.route} ${r.case}: ${f.detail}` });
    }
  const report = [...lines].map(([k, { n, first }]) => `  ${k} ×${n}, first ${first}`);
  if (report.length) process.stdout.write(`Layout sweep, report only (summary.json has every case):\n${report.join('\n')}\n`);
});

async function open(c: Case, scale = 1): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: { width: c.viewport.width, height: c.viewport.height },
    isMobile: c.viewport.mobile,
    hasTouch: c.viewport.touch,
    deviceScaleFactor: scale,
    reducedMotion: c.reducedMotion,
  });
  // Only the site itself: third parties (Turnstile on /inquiry) would make the run depend on the network.
  await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => route.abort());
  return context;
}

async function load(page: Page, c: Case, route: Route): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.split('\n')[0]}`));
  try {
    const res = await page.goto(server.origin + route.path, { waitUntil: 'load', timeout: 30_000 });
    if (res?.status() !== route.status) errors.push(`status ${res?.status()}, expected ${route.status}`);
  } catch (e) {
    errors.push(`navigation: ${(e as Error).message.split('\n')[0]}`);
    return errors;
  }
  if (c.stageH) {
    await page.evaluate((h) => {
      for (const el of document.querySelectorAll<HTMLElement>('.hero, .chord')) el.style.setProperty('--stage-h', h);
      dispatchEvent(new Event('resize'));
    }, c.stageH);
  }
  await page.evaluate(preparePage, c.reducedMotion === 'no-preference');
  return errors;
}

async function settle(page: Page, y: number): Promise<void> {
  await page.evaluate(async (top) => {
    scrollTo(0, top);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 60));
  }, y);
}

async function measure(page: Page, c: Case): Promise<{ fails: Finding[]; reports: Finding[] }> {
  const { fails, reports } = await page.evaluate(probeLayout);
  // 5 · The pinned stages, at rest and through the pin.
  for (const spec of STAGES) {
    const g = await page.evaluate(stageGeometry, spec);
    if (!g) continue;
    const travel = Math.max(0, g.height - g.stageHeight);
    const positions = g.sticky ? PIN_POSITIONS : [0];
    for (const p of positions) {
      await settle(page, Math.max(0, g.top - g.stickTop + p * travel));
      fails.push(...(await page.evaluate(probeStage, { spec, label: g.sticky ? `pinned at ${p}` : 'at rest' })));
    }
  }
  if (c.viewport.touch) fails.push(...(await page.evaluate(probeTaps)));
  return { fails, reports };
}

function format(r: Result, c: Case): string {
  return r.fails.map((f) => `${r.route} ${c.name} ${f.rule} ${f.el}: ${f.detail}`).join('\n');
}

const ROUTES = routes(dist);

describe.concurrent.each(CASES)('$name', (c) => {
  it.each(ROUTES.filter((r) => !c.only || c.only.includes(r.name)))('$name', async (route) => {
    const context = await open(c);
    const page = await context.newPage();
    const result: Result = { case: c.name, route: route.name, path: route.path, fails: [], reports: [], known: [] };
    try {
      const errors = await load(page, c, route);
      if (!errors.some((e) => e.startsWith('navigation'))) {
        const m = await measure(page, c);
        result.fails.push(...m.fails);
        result.reports.push(...m.reports);
      }
      // 6 · Page errors and failed navigation.
      result.fails.unshift(...errors.map((detail) => ({ rule: 'page-error', el: 'page', detail })));
      const declared = (f: Finding) =>
        KNOWN.find((k) => k.route === route.name && k.case === c.name && k.rule === f.rule && f.el.includes(k.el));
      result.known = result.fails.flatMap((f) => {
        const k = declared(f);
        return k ? [{ ...f, issue: k.issue }] : [];
      });
      result.fails = result.fails.filter((f) => !declared(f));
    } finally {
      await context.close();
    }
    results.push(result);
    if (result.fails.length) {
      // Half scale: a CSS-pixel layout at device pixel ratio 0.5.
      const shot = await open(c, 0.5);
      const shotPage = await shot.newPage();
      try {
        await load(shotPage, c, route);
        await shotPage.screenshot({ path: `${out}${c.name}-${route.name}.jpg`, fullPage: true, type: 'jpeg', quality: 60 });
      } finally {
        await shot.close();
      }
    }
    expect(result.fails, format(result, c)).toEqual([]);
  });
});
