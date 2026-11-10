import type { Env } from './env';

// Liveness for the post-merge `smoke` workflow: 200 whenever the Worker runs,
// with the commit it was deployed from. `smoke` waits until `commit` equals the
// merge commit, so a failed deploy that left the old version answering is red.
// Reads no binding and no secret.
export function handleHealthz(env: Env): Response {
  return Response.json(
    { ok: true, commit: env.COMMIT_SHA || null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
