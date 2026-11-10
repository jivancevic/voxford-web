// Turnstile server-side verification (siteverify), fail closed: anything but a
// clear "success, right action, right hostname" is a no. Ticket D.
// Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Cloudflare's published test secrets (always pass / always fail / already
 * spent). They answer with hostname `example.com` and no `action`, so the
 * action check is skipped for them; the hostname check still applies, and
 * production's hostnames never include example.com.
 */
const TEST_SECRET = /^[123]x0{31}AA$/;

export interface VerifyInput {
  secret: string | undefined;
  token: string;
  /** Visitor IP (CF-Connecting-IP), passed on to siteverify. */
  remoteIp: string | null;
  /** Hostnames the widget may have been solved on. */
  hostnames: ReadonlySet<string>;
  action: string;
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export async function verifyTurnstile(input: VerifyInput): Promise<VerifyResult> {
  const { secret, token, remoteIp, hostnames, action } = input;
  if (!secret) return { ok: false, reason: 'no_secret' };
  if (!token || token.length > 2048) return { ok: false, reason: 'bad_token' };
  if (hostnames.size === 0) return { ok: false, reason: 'no_hostnames' };

  let result: { success?: unknown; hostname?: unknown; action?: unknown; 'error-codes'?: unknown };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, reason: `siteverify_${res.status}` };
    const parsed: unknown = await res.json();
    if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'siteverify_malformed' };
    result = parsed;
  } catch {
    return { ok: false, reason: 'siteverify_unreachable' };
  }

  if (result.success !== true) return { ok: false, reason: 'rejected' };
  if (typeof result.hostname !== 'string' || !hostnames.has(result.hostname)) return { ok: false, reason: 'hostname' };
  if (!TEST_SECRET.test(secret) && result.action !== action) return { ok: false, reason: 'action' };
  return { ok: true };
}

/** TURNSTILE_HOSTNAMES (comma-separated) when set, else the host the request came to. */
export function expectedHostnames(configured: string | undefined, requestUrl: URL): Set<string> {
  const list = (configured ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return new Set(list.length > 0 ? list : [requestUrl.hostname]);
}
