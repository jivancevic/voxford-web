// Mechanical rule (CODING_STANDARDS.md, #81): a `@media (pointer: coarse)` or `(hover: none)` rule
// has the same specificity as its base rule, so written BEFORE it, the base rule wins
// and the touch size silently never applies. Fails when a later rule outside such a media
// query sets the same property on the same selector.
import postcss, { type AtRule, type Container, type Declaration, type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';
import { cssBlocks, lineOf, type CssBlock } from '../../tests/helpers/css-source';

const TOUCH = /\(\s*(pointer\s*:\s*coarse|hover\s*:\s*none)\s*\)/;
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

const inAnyAtRule = (rule: Rule) => {
  for (let p = rule.parent as Container | undefined; p; p = p.parent as Container | undefined) {
    if (p.type === 'atrule' && ['media', 'supports', 'container'].includes((p as AtRule).name)) return true;
  }
  return false;
};

const inTouchMedia = (rule: Rule) => {
  for (let p: Container | undefined = rule.parent; p; p = p.parent as Container | undefined) {
    if (p.type === 'atrule' && (p as AtRule).name === 'media' && TOUCH.test((p as AtRule).params)) return true;
  }
  return false;
};

/** Each selector of a list, prefixed with the parent selectors of nested rules (a comma list is compared per selector). */
const selectorsOf = (rule: Rule): string[] => {
  let out = rule.selectors.map(norm);
  for (let n = rule.parent as Container | undefined; n; n = n.parent as Container | undefined) {
    if (n.type === 'rule') out = (n as Rule).selectors.flatMap((p) => out.map((s) => `${norm(p)} ${s}`));
  }
  return out;
};
const sharedSelector = (a: Rule, b: Rule) => {
  const bs = selectorsOf(b);
  return selectorsOf(a).find((s) => bs.includes(s));
};

export function touchOrderBreaches(blocks: CssBlock[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    const rules: Rule[] = [];
    b.root.walkRules((r) => void rules.push(r));
    for (const touch of rules.filter(inTouchMedia)) {
      for (const decl of touch.nodes.filter((n): n is Declaration => n.type === 'decl')) {
        const later = rules.find(
          (r) =>
            !inAnyAtRule(r) &&
            (r.source?.start?.offset ?? 0) > (touch.source?.start?.offset ?? 0) &&
            sharedSelector(r, touch) !== undefined &&
            r.nodes.some((n) => n.type === 'decl' && n.prop === decl.prop),
        );
        if (later) {
          out.push(
            `${b.file}:${lineOf(b, touch.source?.start?.line)}: \`${sharedSelector(later, touch)} { ${decl.prop} }\` in a touch media query is written before its base rule at line ${lineOf(b, later.source?.start?.line)}, which wins at equal specificity. Move the @media block after the base rule.`,
          );
        }
      }
    }
  }
  return [...new Set(out)];
}

describe('touch media rules come after their base rule (#81)', () => {
  it('no @media (pointer: coarse) / (hover: none) rule precedes its same-selector base rule', () => {
    expect(touchOrderBreaches(cssBlocks())).toEqual([]);
  });

  it('catches the #81 shape and passes the fixed order (self-check)', () => {
    const block = (css: string): CssBlock => ({ file: 'x.css', root: postcss.parse(css), firstLine: 1 });
    const bad = '@media (pointer: coarse) { .c { min-height: 2.75rem } } .c { min-height: 2rem }';
    const list = '@media (pointer: coarse) { .a, .b .c { min-height: 2.75rem } } .b .c { min-height: 2rem }';
    const good = '.c { min-height: 2rem } @media (pointer: coarse) { .c { min-height: 2.75rem } }';
    expect(touchOrderBreaches([block(bad)])).toHaveLength(1);
    expect(touchOrderBreaches([block(list)])).toHaveLength(1);
    expect(touchOrderBreaches([block(good)])).toEqual([]);
  });
});
