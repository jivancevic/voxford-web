import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from './env';
import worker from './index';

// POST /api/inquiry through the Worker's public fetch handler. The email
// binding is a fake (records what it would send); siteverify is a stubbed fetch.

const NOW = new Date('2026-11-10T12:00:00Z');
const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} } as unknown as ExecutionContext;

const VALID = {
  lang: 'en',
  type: 'conference',
  date: '2027-03-14',
  city: 'Zagreb, The Westin',
  guests: '150-400',
  package: 'gold',
  name: 'Ana Horvat',
  email: 'ana@example.com',
  phone: '',
  message: 'Opening of our annual summit.',
  website: '',
};

function fakeEmail() {
  const sent: unknown[] = [];
  return {
    sent,
    binding: { send: vi.fn(async (msg: unknown) => (sent.push(msg), { messageId: 'm-1' })) },
  };
}

type Fields = Partial<Record<keyof typeof VALID | 'flexible' | 'cf-turnstile-response', string>>;

function post(fields: Fields, opts: { json?: boolean; env?: Partial<Env>; headers?: Record<string, string> } = {}) {
  const body = new URLSearchParams(Object.entries({ ...VALID, ...fields }).filter(([, v]) => v !== undefined) as [string, string][]);
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'CF-Connecting-IP': '203.0.113.7',
    ...(opts.json ? { Accept: 'application/json' } : { Accept: 'text/html' }),
    ...opts.headers,
  };
  const request = new Request('https://voxford.example/api/inquiry', { method: 'POST', headers, body });
  const env = { ASSETS: { fetch: vi.fn() }, ...opts.env } as unknown as Env;
  return worker.fetch!(request as never, env, ctx);
}

const siteverify = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  siteverify.mockReset();
  siteverify.mockResolvedValue(Response.json({ success: true, hostname: 'voxford.example', action: 'inquiry' }));
  vi.stubGlobal('fetch', siteverify);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const emailMode = (email = fakeEmail()) => ({
  EMAIL: email.binding as unknown as SendEmail,
  INQUIRY_FROM: 'inquiry@voxford.example',
  TURNSTILE_SECRET: 'real-secret',
});

describe('POST /api/inquiry before the domain exists (mailto fallback)', () => {
  it('redirects a plain form POST to a prefilled mailto: to the group', async () => {
    const res = await post({});
    expect(res.status).toBe(303);
    const location = res.headers.get('Location')!;
    expect(location.startsWith('mailto:voxford.official@gmail.com?')).toBe(true);
    const params = new URLSearchParams(location.slice(location.indexOf('?') + 1));
    expect(params.get('subject')).toContain('Zagreb, The Westin');
    expect(params.get('body')).toContain('Ana Horvat');
    expect(params.get('body')).toContain('ana@example.com');
    expect(params.get('body')).toContain('GOLD');
    expect(siteverify).not.toHaveBeenCalled();
  });

  it('answers JSON with the mailto link when the page asks for JSON', async () => {
    const res = await post({}, { json: true });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; via: string; mailto: string };
    expect(data.ok).toBe(true);
    expect(data.via).toBe('mailto');
    expect(data.mailto).toMatch(/^mailto:voxford\.official@gmail\.com\?subject=/);
  });

  it('encodes spaces as %20, not +, so mail apps show them', async () => {
    const data = (await (await post({}, { json: true })).json()) as { mailto: string };
    expect(data.mailto).not.toContain('+');
    expect(data.mailto).toContain('%20');
  });

  it('writes the mail in the visitor language', async () => {
    const data = (await (await post({ lang: 'hr' }, { json: true })).json()) as { mailto: string };
    const body = decodeURIComponent(data.mailto.split('body=')[1]!);
    expect(body).toContain('Konferencija');
    expect(body).toContain('nedjelja, 14. ožujka 2027.');
  });
});

describe('POST /api/inquiry validation', () => {
  it('rejects missing required fields with one code per field', async () => {
    const res = await post({ type: '', city: ' ', guests: '', name: '', email: 'not-an-email', date: '' }, { json: true });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      ok: false,
      error: 'invalid',
      fields: { type: 'required', date: 'required', city: 'required', guests: 'required', name: 'required', email: 'invalid' },
    });
  });

  it('accepts a flexible date instead of a date', async () => {
    const res = await post({ date: '', flexible: '1' }, { json: true });
    expect(res.status).toBe(200);
  });

  it('rejects a date in the past and a malformed date', async () => {
    const past = await post({ date: '2026-11-01' }, { json: true });
    expect(((await past.json()) as { fields: object }).fields).toEqual({ date: 'past' });
    const bad = await post({ date: '2027-02-30' }, { json: true });
    expect(((await bad.json()) as { fields: object }).fields).toEqual({ date: 'invalid' });
  });

  it.each(['abc', '2027-13-01', '2027-02-30'])('answers a malformed date %s with 422, and a plain POST with a mailto without it', async (date) => {
    const json = await post({ date }, { json: true });
    expect(json.status).toBe(422);
    expect(((await json.json()) as { fields: object }).fields).toEqual({ date: 'invalid' });

    const plain = await post({ date });
    expect(plain.status).toBe(303);
    const location = plain.headers.get('Location')!;
    expect(location).toMatch(/^mailto:/);
    expect(decodeURIComponent(location)).not.toMatch(/March|Date:/);
  });

  it('rejects values outside the contract and over-long text', async () => {
    const res = await post(
      { type: 'party', guests: 'thousands', package: 'platinum', phone: 'call me', message: 'x'.repeat(2001) },
      { json: true },
    );
    expect(((await res.json()) as { fields: object }).fields).toEqual({
      type: 'invalid',
      guests: 'invalid',
      package: 'invalid',
      phone: 'invalid',
      message: 'too_long',
    });
  });

  it('still hands a plain (no-JS) POST to the mail app, where the visitor can fix it', async () => {
    const res = await post({ name: '' });
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toMatch(/^mailto:/);
  });
});

describe('POST /api/inquiry spam defences', () => {
  it('pretends success to a bot that fills the honeypot, and sends nothing', async () => {
    const email = fakeEmail();
    const res = await post({ website: 'http://spam.example', 'cf-turnstile-response': 'tok' }, { json: true, env: emailMode(email) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, via: 'email' });
    expect(email.binding.send).not.toHaveBeenCalled();
    expect(siteverify).not.toHaveBeenCalled();
  });

  it('refuses bodies over 32 KB', async () => {
    const res = await post({ message: 'x'.repeat(40_000) }, { json: true });
    expect(res.status).toBe(413);
  });

  it('refuses anything that is not a form post', async () => {
    const request = new Request('https://voxford.example/api/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID),
    });
    const res = await worker.fetch!(request as never, { ASSETS: { fetch: vi.fn() } } as unknown as Env, ctx);
    expect(res.status).toBe(415);
  });

  it('still answers 405 to GET', async () => {
    const request = new Request('https://voxford.example/api/inquiry');
    const res = await worker.fetch!(request as never, { ASSETS: { fetch: vi.fn() } } as unknown as Env, ctx);
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
  });
});

describe('POST /api/inquiry with Cloudflare Email Sending (after the domain)', () => {
  it('verifies the Turnstile token, then emails the group with Reply-To the visitor', async () => {
    const email = fakeEmail();
    const res = await post({ 'cf-turnstile-response': 'tok-123' }, { json: true, env: emailMode(email) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, via: 'email' });

    expect(siteverify).toHaveBeenCalledTimes(1);
    const [url, init] = siteverify.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const sent = new URLSearchParams(init.body as string);
    expect(sent.get('secret')).toBe('real-secret');
    expect(sent.get('response')).toBe('tok-123');
    expect(sent.get('remoteip')).toBe('203.0.113.7');

    expect(email.sent).toHaveLength(1);
    const msg = email.sent[0] as { to: string; from: { email: string; name: string }; replyTo: { email: string; name: string }; subject: string; text: string };
    expect(msg.to).toBe('voxford.official@gmail.com');
    expect(msg.from).toEqual({ email: 'inquiry@voxford.example', name: 'Voxford website' });
    expect(msg.replyTo).toEqual({ email: 'ana@example.com', name: 'Ana Horvat' });
    expect(msg.subject).toContain('Zagreb, The Westin');
    expect(msg.text).toContain('Opening of our annual summit.');
    expect(msg.text).toContain('Sunday, 14 March 2027');
  });

  it('redirects a plain POST that was sent to the thank-you state', async () => {
    const res = await post({ 'cf-turnstile-response': 'tok-123' }, { env: emailMode() });
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('https://voxford.example/en/inquiry/#inquiry-sent');
  });

  it('falls back to mailto when there is no token (no JS, or Turnstile blocked)', async () => {
    const email = fakeEmail();
    const res = await post({}, { json: true, env: emailMode(email) });
    expect(((await res.json()) as { via: string }).via).toBe('mailto');
    expect(siteverify).not.toHaveBeenCalled();
    expect(email.binding.send).not.toHaveBeenCalled();
  });

  it.each([
    ['siteverify says no', () => Response.json({ success: false, 'error-codes': ['invalid-input-response'] })],
    ['wrong action', () => Response.json({ success: true, hostname: 'voxford.example', action: 'login' })],
    ['wrong hostname', () => Response.json({ success: true, hostname: 'evil.example', action: 'inquiry' })],
    ['siteverify is down', () => new Response('oops', { status: 500 })],
    ['siteverify answers null', () => Response.json(null)],
  ])('fails closed when %s: 403 with the mailto fallback, nothing sent', async (_name, reply) => {
    siteverify.mockImplementation(async () => reply());
    const email = fakeEmail();
    const res = await post({ 'cf-turnstile-response': 'tok' }, { json: true, env: emailMode(email) });
    expect(res.status).toBe(403);
    const data = (await res.json()) as { ok: boolean; error: string; mailto: string };
    expect(data.ok).toBe(false);
    expect(data.error).toBe('verification_failed');
    expect(data.mailto).toMatch(/^mailto:/);
    expect(email.binding.send).not.toHaveBeenCalled();
  });

  it('fails closed without a secret', async () => {
    const env = { ...emailMode(), TURNSTILE_SECRET: undefined };
    const res = await post({ 'cf-turnstile-response': 'tok' }, { json: true, env });
    expect(res.status).toBe(403);
    expect(siteverify).not.toHaveBeenCalled();
  });

  it('accepts the hostnames listed in TURNSTILE_HOSTNAMES', async () => {
    siteverify.mockResolvedValue(Response.json({ success: true, hostname: 'www.voxford.example', action: 'inquiry' }));
    const env = { ...emailMode(), TURNSTILE_HOSTNAMES: 'voxford.example, www.voxford.example' };
    expect((await post({ 'cf-turnstile-response': 'tok' }, { json: true, env })).status).toBe(200);
  });

  it("works with Cloudflare's test secret, which reports example.com and no action", async () => {
    siteverify.mockResolvedValue(Response.json({ success: true, hostname: 'example.com' }));
    const env = { ...emailMode(), TURNSTILE_SECRET: '1x0000000000000000000000000000000AA', TURNSTILE_HOSTNAMES: 'example.com' };
    expect((await post({ 'cf-turnstile-response': 'XXXX.DUMMY.TOKEN.XXXX' }, { json: true, env })).status).toBe(200);
  });

  it('a real secret still requires the action', async () => {
    siteverify.mockResolvedValue(Response.json({ success: true, hostname: 'example.com' }));
    const env = { ...emailMode(), TURNSTILE_HOSTNAMES: 'example.com' };
    expect((await post({ 'cf-turnstile-response': 'tok' }, { json: true, env })).status).toBe(403);
  });

  it('answers 502 with the mailto fallback when sending fails', async () => {
    const email = fakeEmail();
    email.binding.send.mockRejectedValueOnce(new Error('E_SENDER_NOT_VERIFIED'));
    const res = await post({ 'cf-turnstile-response': 'tok' }, { json: true, env: emailMode(email) });
    expect(res.status).toBe(502);
    const data = (await res.json()) as { error: string; mailto: string };
    expect(data.error).toBe('send_failed');
    expect(data.mailto).toMatch(/^mailto:voxford\.official@gmail\.com/);
  });

  it('keeps line breaks out of the subject (no header injection)', async () => {
    const email = fakeEmail();
    await post({ city: 'Zagreb\r\nBcc: x@evil.example', 'cf-turnstile-response': 'tok' }, { json: true, env: emailMode(email) });
    const msg = email.sent[0] as { subject: string };
    expect(msg.subject).not.toMatch(/[\r\n]/);
  });
});
