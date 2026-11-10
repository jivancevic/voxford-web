// Measures the WCAG 2.x contrast of the semantic token pairs in tokens.css, in
// both the dark base and the .surface-light scope. Text over photos is measured
// on composited frames in the audit (ticket F); this guards the token layer.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block`);
  const body = css.slice(start, css.indexOf('\n}', start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[m[1]!] = m[2]!.trim();
  return vars;
}

const root = block(':root');
const light = { ...root, ...block('.surface-light') };

function resolve(vars: Record<string, string>, name: string): string {
  let value = vars[name];
  for (let i = 0; value?.startsWith('var(') && i < 10; i++) value = vars[value.slice(4, -1).trim()];
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} does not resolve to a hex colour: ${value}`);
  return value;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** [foreground, background, minimum ratio] */
const PAIRS: [string, string, number][] = [
  ['--color-text', '--color-bg', 7],
  ['--color-text', '--color-bg-surface', 7],
  ['--color-text', '--color-bg-raised', 7],
  ['--color-text-secondary', '--color-bg', 4.5],
  ['--color-text-secondary', '--color-bg-raised', 4.5],
  ['--color-text-muted', '--color-bg', 4.5],
  ['--color-text-muted', '--color-bg-surface', 4.5],
  ['--color-text-accent', '--color-bg', 4.5],
  ['--color-text-accent', '--color-bg-raised', 4.5],
  ['--color-link', '--color-bg', 4.5],
  ['--color-action-text', '--color-action-bg', 4.5],
  ['--color-focus', '--color-bg', 3],
  ['--color-border-strong', '--color-bg', 3],
];

describe.each([
  ['dark base (:root)', root],
  ['.surface-light', light],
])('%s', (_name, vars) => {
  it.each(PAIRS)('%s on %s ≥ %s:1', (fg, bg, min) => {
    expect(contrast(resolve(vars, fg), resolve(vars, bg))).toBeGreaterThanOrEqual(min);
  });
});
