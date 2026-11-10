import { composeInquiryMail, inquiryMailto, INQUIRY_TO, senderName, type DraftInquiry } from '../src/lib/inquiry-mail';
import { FIELD, isoDayUtc, TURNSTILE_ACTION, validateInquiry, type FieldErrors, type Inquiry } from '../src/lib/inquiry';
import { pathFor } from '../src/i18n/routes';
import type { Env } from './env';
import { expectedHostnames, verifyTurnstile } from './turnstile';

// POST /api/inquiry (ticket D). Every inquiry goes to the group's address.
//
//   honeypot filled            → pretend success, send nothing
//   invalid                    → 422 with a code per field (JSON); a plain POST goes to the mail app
//   no email transport yet     → the mailto: fallback (spec: until the domain exists)
//   no Turnstile token         → the mailto: fallback (no JS, or the widget was blocked):
//                                the visitor's own mail app sends it, so nothing here can be abused
//   token fails siteverify     → 403 + mailto, nothing sent (fail closed)
//   Email Sending throws       → 502 + mailto
//   sent                       → 200 (JSON) / 303 to the page's thank-you state
//
// The page asks for JSON (Accept: application/json); a plain HTML form POST
// gets a 303 instead, so the form works without JavaScript.

const MAX_BODY_BYTES = 32 * 1024;
const NO_STORE = { 'Cache-Control': 'no-store' };

/** How an inquiry leaves the Worker. Cloudflare Email Sending in production, a fake in tests. */
export interface InquiryTransport {
  send(mail: { to: string; fromName: string; replyTo: { name: string; email: string }; subject: string; text: string }): Promise<void>;
}

/** Email Sending once the binding and sender exist (docs/deploy-cloudflare.md › Inquiry); otherwise null = mailto. */
export function emailTransport(env: Env): InquiryTransport | null {
  const binding = env.EMAIL;
  const from = env.INQUIRY_FROM?.trim();
  if (!binding || !from) return null;
  return {
    async send(mail) {
      await binding.send({
        from: { email: from, name: mail.fromName },
        to: mail.to,
        replyTo: mail.replyTo,
        subject: mail.subject,
        text: mail.text,
      });
    },
  };
}

type Outcome =
  | { kind: 'sent' }
  | { kind: 'mailto'; mailto: string }
  | { kind: 'invalid'; fields: FieldErrors; mailto: string }
  | { kind: 'verification_failed'; mailto: string }
  | { kind: 'send_failed'; mailto: string };

export async function handleInquiry(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST', ...NO_STORE } });
  }

  const contentType = request.headers.get('Content-Type') ?? '';
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)\b/i.test(contentType)) {
    return Response.json({ ok: false, error: 'unsupported_media_type' }, { status: 415, headers: NO_STORE });
  }
  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > MAX_BODY_BYTES) return tooLarge();
  const raw = await request.arrayBuffer();
  if (raw.byteLength > MAX_BODY_BYTES) return tooLarge();

  let form: FormData;
  try {
    form = await new Response(raw, { headers: { 'Content-Type': contentType } }).formData();
  } catch {
    return Response.json({ ok: false, error: 'bad_request' }, { status: 400, headers: NO_STORE });
  }

  const url = new URL(request.url);
  const yesterday = isoDayUtc(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const validation = validateInquiry(form, yesterday);
  const lang = validation.ok ? validation.inquiry.lang : validation.partial.lang;

  // Bots fill every field they find. Tell them it worked.
  if (fieldText(form, FIELD.honeypot)) return reply(request, lang, { kind: 'sent' });

  const outcome = await deliver(request, env, form, url, validation);
  return reply(request, lang, outcome);
}

async function deliver(
  request: Request,
  env: Env,
  form: FormData,
  url: URL,
  validation: ReturnType<typeof validateInquiry>,
): Promise<Outcome> {
  if (!validation.ok) {
    return { kind: 'invalid', fields: validation.errors, mailto: inquiryMailto(validation.partial as DraftInquiry) };
  }
  const inquiry: Inquiry = validation.inquiry;
  const mailto = inquiryMailto(inquiry);

  const transport = emailTransport(env);
  const token = fieldText(form, FIELD.turnstile);
  if (!transport || !token) return { kind: 'mailto', mailto };

  const verdict = await verifyTurnstile({
    secret: env.TURNSTILE_SECRET,
    token,
    remoteIp: request.headers.get('CF-Connecting-IP'),
    hostnames: expectedHostnames(env.TURNSTILE_HOSTNAMES, url),
    action: TURNSTILE_ACTION,
  });
  if (!verdict.ok) {
    console.warn(JSON.stringify({ event: 'inquiry_verification_failed', reason: verdict.reason }));
    return { kind: 'verification_failed', mailto };
  }

  const mail = composeInquiryMail(inquiry, { site: url.host });
  try {
    await transport.send({ to: INQUIRY_TO, fromName: senderName(inquiry.lang), replyTo: { name: inquiry.name, email: inquiry.email }, ...mail });
  } catch (error) {
    console.error(JSON.stringify({ event: 'inquiry_send_failed', error: error instanceof Error ? error.message : String(error) }));
    return { kind: 'send_failed', mailto };
  }
  console.log(JSON.stringify({ event: 'inquiry_sent', type: inquiry.type, lang: inquiry.lang }));
  return { kind: 'sent' };
}

function reply(request: Request, lang: Inquiry['lang'], outcome: Outcome): Response {
  if (wantsJson(request)) {
    switch (outcome.kind) {
      case 'sent':
        return Response.json({ ok: true, via: 'email' }, { headers: NO_STORE });
      case 'mailto':
        return Response.json({ ok: true, via: 'mailto', mailto: outcome.mailto }, { headers: NO_STORE });
      case 'invalid':
        return Response.json({ ok: false, error: 'invalid', fields: outcome.fields }, { status: 422, headers: NO_STORE });
      case 'verification_failed':
        return Response.json({ ok: false, error: outcome.kind, mailto: outcome.mailto }, { status: 403, headers: NO_STORE });
      case 'send_failed':
        return Response.json({ ok: false, error: outcome.kind, mailto: outcome.mailto }, { status: 502, headers: NO_STORE });
    }
  }
  // A plain form POST (no JavaScript): the thank-you state, or the visitor's mail app.
  const location =
    outcome.kind === 'sent' ? new URL(`${pathFor('inquiry', lang)}#inquiry-sent`, request.url).href : outcome.mailto;
  return new Response(null, { status: 303, headers: { Location: location, ...NO_STORE } });
}

function wantsJson(request: Request): boolean {
  return (request.headers.get('Accept') ?? '').includes('application/json');
}

function fieldText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function tooLarge(): Response {
  return Response.json({ ok: false, error: 'payload_too_large' }, { status: 413, headers: NO_STORE });
}
