import type { Env } from './env';
import { handleHealthz } from './healthz';
import { handleInquiry } from './inquiry';
import { handleRootRedirect } from './lang-redirect';
import { handleMedia, MEDIA_PREFIX } from './media';
import { syncReels } from './reels';

// The Worker in front of the static site. wrangler.jsonc routes only the paths
// in `assets.run_worker_first` here; every other request is served straight
// from the Astro build. Route table is ticket A's; handlers live in their own
// files, one owner each (AGENTS.md › Seams).
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/') return handleRootRedirect(request);
    if (pathname === '/healthz' || pathname === '/healthz/') return handleHealthz(env);
    if (pathname === '/api/inquiry' || pathname === '/api/inquiry/') return handleInquiry(request, env, ctx);
    if (pathname.startsWith(MEDIA_PREFIX)) return handleMedia(request, env, ctx);
    if (pathname.startsWith('/api/')) {
      return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(syncReels(env, ctx));
  },
} satisfies ExportedHandler<Env>;
