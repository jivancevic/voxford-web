import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAGE_KEYS } from '@/i18n/routes';
import { lastCommitDate, pageFiles } from './lastmod';

describe('pageFiles', () => {
  it('names files that exist for every page', () => {
    for (const page of PAGE_KEYS) for (const file of pageFiles(page)) expect(existsSync(file), file).toBe(true);
  });
});

describe('lastCommitDate', () => {
  it('returns a date for a committed file', () => {
    expect(lastCommitDate(['package.json'])).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('falls back to a date for an unknown file', () => {
    expect(lastCommitDate(['no/such/file.md'])).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
