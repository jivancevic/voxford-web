// Sitemap lastmod per page: the date of the last commit that touched the
// page's view or its copy, so a daily rebuild (the reels cron) does not make
// every page look changed every day. Build-time only (runs git). Falls back to
// the build date when git has no answer (no .git, or a shallow clone that does
// not reach the file).
import { execFileSync } from 'node:child_process';
import type { PageKey } from '@/i18n/routes';
import { LOCALES } from '@/i18n/locales';

const today = () => new Date().toISOString().slice(0, 10);

/** YYYY-MM-DD of the newest commit touching any of `files`, or the build date. */
export function lastCommitDate(files: readonly string[]): string {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...files], { encoding: 'utf8' }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : today();
  } catch {
    return today();
  }
}

/** The files that make up a page: its view and its copy in every language. */
export function pageFiles(page: PageKey): string[] {
  const view = `${page.charAt(0).toUpperCase()}${page.slice(1)}View.astro`;
  return [`src/views/${view}`, ...LOCALES.map((l) => `src/content/pages/${l}/${page}.md`)];
}
