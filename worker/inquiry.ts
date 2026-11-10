import type { Env } from './env';

// POST /api/inquiry: ticket D owns this file. Until then the endpoint answers
// 501 and the form falls back to a prefilled mailto: link (spec › Stack).
// Keep the signature: worker/index.ts routes to it.
export function handleInquiry(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> | Response {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });
  }
  return Response.json({ ok: false, error: 'not_implemented' }, { status: 501 });
}
