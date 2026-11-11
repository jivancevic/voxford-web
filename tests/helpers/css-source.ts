// Shared by the mechanical-rule tests (token-literals.test.ts, touch-order.test.ts):
// finds every CSS source under src/ (.css files and <style> blocks in .astro files)
// and parses it with postcss, which Astro already brings into the tree.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss, { type Root } from 'postcss';

export const REPO = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(REPO, 'src');

export function walk(dir: string, exts: string[]): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p, exts);
    return exts.some((x) => e.name.endsWith(x)) && !e.name.endsWith('.test.ts') ? [p] : [];
  });
}

export const rel = (abs: string) => relative(REPO, abs);

export type CssBlock = { file: string; root: Root; firstLine: number };

/** One block per .css file, one per <style> element in a .astro file. */
export function cssBlocks(): CssBlock[] {
  const out: CssBlock[] = [];
  for (const abs of walk(SRC, ['.css', '.astro'])) {
    const text = readFileSync(abs, 'utf8');
    if (abs.endsWith('.css')) {
      out.push({ file: rel(abs), root: postcss.parse(text, { from: abs }), firstLine: 1 });
      continue;
    }
    for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
      const start = m.index + m[0].indexOf('>') + 1;
      const firstLine = text.slice(0, start).split('\n').length;
      out.push({ file: rel(abs), root: postcss.parse(m[1] ?? '', { from: abs }), firstLine });
    }
  }
  return out;
}

/** Line in the original file for a postcss node. */
export const lineOf = (b: CssBlock, line: number | undefined) => b.firstLine + (line ?? 1) - 1;
