// Mechanical rule (CLAUDE.md "Re-skinnable shell", #10): colours and type come from
// `src/styles/tokens.css`. Outside it, src/ has no hex or rgb()/hsl()/oklch()-style colour
// literal, every `font-family` is a var(), and every `font-size` is a var() (alone, or inside
// calc/min/max/clamp) or relative (em, %). `color-mix()` of vars, `currentColor` and
// `transparent` are fine. Exceptions go in the allow lists below, one reason each.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cssBlocks, lineOf, REPO, rel, walk } from '../../tests/helpers/css-source';
import { join } from 'node:path';

/** file → reason. A literal colour may live in these files. */
const COLOR_FILES: Record<string, string> = {
  'src/styles/tokens.css': 'the one place tokens are defined',
  'src/styles/theme.ts': '<meta theme-color> cannot read a CSS var; contrast.test.ts checks it equals --ink-950',
};

/** "file: declaration text" → reason. A font-size/font-family that is not token-based. */
const TYPE_DECLS: Record<string, string> = {
  'src/views/HomeView.astro: font-size: min(var(--text-display), 12.5vw)': 'caps the display token at 12.5vw so a no-wrap word never overflows a narrow phone; the token still sets the size above that',
};

const COLOR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/;
const HEX = /(?<![&\w-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/;

const stripComments = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:\w"'`])\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));

/** Value with every var(...) removed (nested parens handled). */
function withoutVars(v: string): string {
  let out = '';
  for (let i = 0; i < v.length; ) {
    if (v.startsWith('var(', i)) {
      let depth = 0;
      do {
        if (v[i] === '(') depth++;
        else if (v[i] === ')') depth--;
        i++;
      } while (depth > 0 && i < v.length);
      out += ' ';
    } else out += v[i++];
  }
  return out;
}

export const fontFamilyOk = (v: string) => /^(?:var\(.*\)|inherit|initial|unset)$/.test(v.trim());
/** Absolute units outside a var() make a size that tokens.css does not control. */
export const fontSizeOk = (v: string) => !/\d(?:rem|px|pt|vw|vh|svh|lvh|dvh|vmin|vmax|cqw|cqh|ch|ex)\b/.test(withoutVars(v));

const sources = () => walk(join(REPO, 'src'), ['.astro', '.css', '.ts']);

describe('colours and type come from tokens.css (#10)', () => {
  it('no hex or rgb()/hsl()/oklch() colour literal outside the allow list', () => {
    const out: string[] = [];
    for (const abs of sources()) {
      const file = rel(abs);
      if (file in COLOR_FILES) continue;
      stripComments(readFileSync(abs, 'utf8')).split('\n').forEach((line, i) => {
        const hit = HEX.exec(line) ?? COLOR_FN.exec(line);
        if (hit) out.push(`${file}:${i + 1}: colour literal \`${hit[0]}\`. Add or reuse a token in src/styles/tokens.css and use var(--…).`);
      });
    }
    expect(out).toEqual([]);
  });

  it('every font-family is a var(), every font-size is token-based or relative', () => {
    const out: string[] = [];
    const check = (file: string, line: number, prop: string, value: string) => {
      const key = `${file}: ${prop}: ${value}`;
      if (key in TYPE_DECLS) return;
      const ok = prop === 'font-family' ? fontFamilyOk(value) : fontSizeOk(value);
      if (!ok) out.push(`${file}:${line}: \`${prop}: ${value}\` is not token-based. Use a --font-* / --text-* var from src/styles/tokens.css.`);
    };
    for (const b of cssBlocks()) {
      if (b.file === 'src/styles/tokens.css') continue;
      b.root.walkDecls(/^font-(family|size)$/, (d) => check(b.file, lineOf(b, d.source?.start?.line), d.prop, d.value));
    }
    // style="" attributes and CSS strings outside <style> blocks
    for (const abs of sources().filter((f) => !f.endsWith('.css'))) {
      const text = stripComments(readFileSync(abs, 'utf8')).replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, (m) => m.replace(/[^\n]/g, ' '));
      text.split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/\bfont-(family|size)\s*:\s*([^;"'`}]+)/g)) check(rel(abs), i + 1, `font-${m[1]}`, (m[2] ?? '').trim());
      });
    }
    expect(out).toEqual([]);
  });

  it('allow lists carry a reason per entry', () => {
    for (const [k, v] of [...Object.entries(COLOR_FILES), ...Object.entries(TYPE_DECLS)]) expect(v.length, k).toBeGreaterThan(10);
  });

  it('catches the old bugs (self-check)', () => {
    expect(HEX.test('color: #fff;')).toBe(true);
    expect(HEX.test('<a href="#hero">')).toBe(false);
    expect(COLOR_FN.test('background: rgba(0,0,0,.5)')).toBe(true);
    expect(COLOR_FN.test('color-mix(in oklab, var(--a) 40%, transparent)')).toBe(false);
    expect(fontFamilyOk('Georgia, serif')).toBe(false);
    expect(fontFamilyOk('var(--font-body)')).toBe(true);
    expect(fontSizeOk('1.25rem')).toBe(false);
    expect(fontSizeOk('min(var(--text-display), 12.5vw)')).toBe(false);
    expect(fontSizeOk('clamp(var(--a), var(--b), var(--c))')).toBe(true);
    expect(fontSizeOk('0.8em')).toBe(true);
  });
});
