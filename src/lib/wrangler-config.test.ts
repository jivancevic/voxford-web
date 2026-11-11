import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GROUP } from '@/data/site-facts';

// wrangler.jsonc is JSONC: drop line and block comments (outside strings) and trailing commas.
const parseJsonc = (text: string): unknown => {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j;
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2) + 1;
    } else out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
};

const config = parseJsonc(
  readFileSync(fileURLToPath(new URL('../../wrangler.jsonc', import.meta.url)), 'utf8'),
) as { send_email?: { name: string; destination_address?: string }[] };

describe('wrangler.jsonc send_email', () => {
  it('has a send_email binding to check', () => {
    expect(config.send_email?.length).toBeGreaterThan(0);
  });

  it.each(config.send_email ?? [])('binding $name sends to GROUP.email', (binding) => {
    expect(
      binding.destination_address,
      `wrangler.jsonc send_email "${binding.name}" destination_address must equal GROUP.email in ` +
        `src/data/site-facts.ts (${GROUP.email}). Change both together: if they drift, Email Routing ` +
        'refuses every send and every inquiry falls back to 502 + mailto.',
    ).toBe(GROUP.email);
  });
});
