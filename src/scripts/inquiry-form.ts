// Progressive enhancement for the inquiry form in InquiryView.astro. The form
// already works as a plain POST; this adds the prefill from the URL, inline
// validation with an error summary, Turnstile, and the sent / mailto / error
// states without leaving the page. All text comes from the static HTML.

import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import {
  FIELD,
  localIsoDate,
  TURNSTILE_ACTION,
  VALIDATED_FIELDS,
  validateInquiry,
  type FieldErrors,
  type InquiryField,
} from '@/lib/inquiry';
import { inquiryMailto } from '@/lib/inquiry-mail';
import { parseInquiryPrefill, type InquiryPrefill } from '@/lib/inquiry-url';

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
}

type ApiReply =
  | { ok: true; via: 'email' }
  | { ok: true; via: 'mailto'; mailto: string }
  | { ok: false; error: 'invalid'; fields: FieldErrors }
  | { ok: false; error: string; mailto?: string };

type State = 'form' | 'sent' | 'mailto' | 'error';

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TOKEN_WAIT_MS = 8000;

export function enhanceInquiryForm(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('[data-inquiry-form]');
  if (form) enhance(root, form);
}

function enhance(root: HTMLElement, form: HTMLFormElement): void {
  const lang = isLocale(root.dataset.lang) ? root.dataset.lang : DEFAULT_LOCALE;
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const submitLabel = form.querySelector<HTMLElement>('[data-submit-label]')!;
  const idleLabel = submitLabel.textContent ?? '';
  const summary = form.querySelector<HTMLElement>('[data-error-summary]')!;
  const panels = new Map<State, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-state]').forEach((el) => panels.set(el.dataset.state as State, el));

  // The script validates and explains; the browser's own bubbles would compete with it.
  form.noValidate = true;
  const dateInput = form.elements.namedItem(FIELD.date) as HTMLInputElement;
  dateInput.min = localIsoDate();

  applyPrefill(form, parseInquiryPrefill(window.location.search));

  // ---- Turnstile (explicit render; invisible or interaction-only) ----
  const turnstileBox = form.querySelector<HTMLElement>('[data-turnstile]');
  let widgetId: string | undefined;
  let token = '';
  let waiters: ((t: string) => void)[] = [];
  const settle = (t: string) => {
    token = t;
    waiters.forEach((resolve) => resolve(t));
    waiters = [];
  };
  const turnstile = () => (window as Window & { turnstile?: TurnstileApi }).turnstile;

  if (turnstileBox?.dataset.sitekey) {
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.addEventListener('load', () => {
      widgetId = turnstile()?.render(turnstileBox, {
        sitekey: turnstileBox.dataset.sitekey,
        action: TURNSTILE_ACTION,
        appearance: 'interaction-only',
        theme: 'dark',
        language: lang,
        'response-field': false,
        callback: (t: string) => settle(t),
        'expired-callback': () => (token = ''),
        'error-callback': () => {
          settle('');
          return true;
        },
      });
    });
    // Blocked or offline: submit without a token; the Worker answers with the mailto fallback.
    script.addEventListener('error', () => settle(''));
    document.head.append(script);
  }

  function getToken(): Promise<string> {
    if (token || !turnstileBox) return Promise.resolve(token);
    return new Promise((resolve) => {
      waiters.push(resolve);
      setTimeout(() => resolve(token), TOKEN_WAIT_MS);
    });
  }

  function resetTurnstile() {
    token = '';
    if (widgetId !== undefined) turnstile()?.reset(widgetId);
  }

  // ---- Validation ----
  const fieldBox = (name: InquiryField) => form.querySelector<HTMLElement>(`[data-field="${name}"]`);

  /** A chip group is described as a whole (its fieldset); a text field through its input. */
  function fieldParts(box: HTMLElement) {
    const isGroup = box.matches('fieldset');
    const described = isGroup ? box : box.querySelector<HTMLElement>('input, textarea')!;
    const inputs = [...box.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')];
    return { described, inputs, focusTarget: inputs[0]! };
  }

  function setFieldError(name: InquiryField, invalid: boolean) {
    const box = fieldBox(name);
    if (!box) return;
    const error = box.querySelector<HTMLElement>('.field__error');
    const { described, inputs } = fieldParts(box);
    if (error) error.hidden = !invalid;
    box.toggleAttribute('data-invalid', invalid);
    const describedBy = [described.dataset.describedby ?? '', invalid && error ? error.id : ''].filter(Boolean).join(' ');
    if (describedBy) described.setAttribute('aria-describedby', describedBy);
    else described.removeAttribute('aria-describedby');
    for (const input of inputs) input.setAttribute('aria-invalid', String(invalid));
  }

  function showErrors(errors: FieldErrors) {
    const names = VALIDATED_FIELDS.filter((name) => errors[name]);
    for (const name of VALIDATED_FIELDS) setFieldError(name, Boolean(errors[name]));

    const list = summary.querySelector<HTMLUListElement>('[data-summary-list]')!;
    const heading = summary.querySelector<HTMLElement>('[data-summary-heading]')!;
    list.replaceChildren(
      ...names.map((name) => {
        const box = fieldBox(name)!;
        const message = box.querySelector('.field__error')?.textContent ?? '';
        const target = fieldParts(box).focusTarget;
        const link = document.createElement('a');
        link.href = `#${target.id}`;
        link.textContent = message;
        link.addEventListener('click', (event) => {
          event.preventDefault();
          target.focus();
        });
        const item = document.createElement('li');
        item.append(link);
        return item;
      }),
    );
    heading.textContent =
      names.length === 1
        ? (summary.dataset.headingOne ?? '')
        : (summary.dataset.headingMany ?? '').replace('{count}', String(names.length));
    summary.hidden = names.length === 0;
    if (names.length > 0) summary.focus();
  }

  // Once a field has been flagged, re-check it as the visitor fixes it.
  form.addEventListener('input', (event) => recheck(event.target));
  form.addEventListener('change', (event) => recheck(event.target));
  function recheck(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return;
    const box = target.closest<HTMLElement>('[data-field]');
    const flexible = target instanceof HTMLInputElement && target.name === FIELD.flexible;
    const name = (flexible ? 'date' : box?.dataset.field) as InquiryField | undefined;
    if (!name || !fieldBox(name)?.hasAttribute('data-invalid')) return;
    const result = validateInquiry(new FormData(form), localIsoDate());
    const stillInvalid = !result.ok && Boolean(result.errors[name]);
    if (!stillInvalid) setFieldError(name, false);
    if (!form.querySelector('[data-field][data-invalid]')) summary.hidden = true;
  }

  // ---- States ----
  function show(state: State) {
    form.hidden = state !== 'form';
    for (const [name, panel] of panels) panel.hidden = name !== state;
    if (state === 'form') return;
    panels.get(state)?.querySelector<HTMLElement>('[data-state-heading]')?.focus();
    panels.get(state)?.scrollIntoView({ block: 'start' });
  }

  function setMailto(href: string | undefined) {
    if (!href?.startsWith('mailto:')) return;
    root.querySelectorAll<HTMLAnchorElement>('[data-mailto-link]').forEach((a) => (a.href = href));
  }

  function setBusy(busy: boolean) {
    submit.setAttribute('aria-disabled', String(busy));
    form.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? (submit.dataset.labelBusy ?? idleLabel) : idleLabel;
  }

  let busy = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(form);
    const result = validateInquiry(data, localIsoDate());
    if (!result.ok) {
      showErrors(result.errors);
      return;
    }
    showErrors({});

    busy = true;
    setBusy(true);
    try {
      const t = await getToken();
      if (t) data.set(FIELD.turnstile, t);
      const body = new URLSearchParams();
      data.forEach((value, key) => typeof value === 'string' && body.append(key, value));
      const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body });
      const reply = (await res.json().catch(() => null)) as ApiReply | null;

      if (reply?.ok && reply.via === 'email') {
        const sentBody = root.querySelector<HTMLElement>('[data-sent-body]');
        if (sentBody?.dataset.template) sentBody.textContent = sentBody.dataset.template.replace('{email}', result.inquiry.email);
        show('sent');
      } else if (reply?.ok && reply.via === 'mailto') {
        setMailto(reply.mailto);
        show('mailto');
      } else if (reply && !reply.ok && reply.error === 'invalid' && 'fields' in reply) {
        showErrors(reply.fields);
      } else {
        setMailto(reply && 'mailto' in reply ? reply.mailto : undefined);
        show('error');
      }
    } catch {
      // The Worker could not be reached: write the mail here so nothing typed is lost.
      setMailto(inquiryMailto(result.inquiry));
      show('error');
    } finally {
      busy = false;
      setBusy(false);
      resetTurnstile();
    }
  });

  root.addEventListener('click', (event) => {
    const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'again') {
      event.preventDefault();
      form.reset();
      show('form');
      dateInput.focus();
    } else if (action === 'back') {
      show('form');
      submit.focus();
    } else if (action === 'retry') {
      show('form');
      form.requestSubmit();
    }
  });
}

function applyPrefill(form: HTMLFormElement, prefill: InquiryPrefill): void {
  const check = (name: string, value: string | undefined) => {
    if (!value) return;
    const radio = form.querySelector<HTMLInputElement>(`input[type="radio"][name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
  };
  check(FIELD.type, prefill.type);
  check(FIELD.package, prefill.package);
  const date = form.elements.namedItem(FIELD.date) as HTMLInputElement | null;
  if (date && prefill.date && prefill.date >= localIsoDate()) date.value = prefill.date;
  const city = form.elements.namedItem(FIELD.city) as HTMLInputElement | null;
  if (city && prefill.city) city.value = prefill.city;
}
