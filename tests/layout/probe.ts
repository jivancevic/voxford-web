// The measurements, run inside the page through page.evaluate(). Playwright
// sends each function as source text, so every function here is
// self-contained: no imports and no module-level helpers inside them.

export interface Finding {
  rule: string;
  /** The element as a tag.class path. */
  el: string;
  detail: string;
}

export interface ProbeResult {
  fails: Finding[];
  reports: Finding[];
}

/** Scroll behaviour off, lazy images eager, fonts and images in, reveals done. */
export async function preparePage(motion: boolean): Promise<void> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (const el of [document.documentElement, document.body]) el.style.scrollBehavior = 'auto';
  for (const img of document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) img.loading = 'eager';
  await document.fonts.ready;
  if (motion) {
    // Reveal-on-scroll (.is-in) fires once per element: walk the page so every one has.
    const step = Math.round(innerHeight * 0.6);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await sleep(40);
    }
  }
  scrollTo(0, 0);
  const images = [...document.images].filter((i) => !i.complete).map((i) => i.decode().catch(() => undefined));
  await Promise.race([Promise.all(images), sleep(8000)]);
  // Reveal transitions run 900ms.
  await sleep(motion ? 1000 : 120);
}

/**
 * Rules 1 to 3 (overflow, text overlap, stretched buttons) and the report-only
 * ones (small text, empty vertical gaps), measured at the page's current scroll.
 */
export function probeLayout(): ProbeResult {
  const fails: Finding[] = [];
  const reports: Finding[] = [];
  const de = document.documentElement;
  const vw = de.clientWidth;
  const vh = innerHeight;

  const desc = (el: Element) =>
    `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : ''}`;
  const path = (el: Element) => {
    const parts: string[] = [];
    for (let a: Element | null = el, i = 0; a && a !== document.body && i < 3; a = a.parentElement, i++) parts.unshift(desc(a));
    return parts.join('>');
  };
  const visible = (el: Element) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true });
  const clips = (el: Element) => {
    const cs = getComputedStyle(el);
    return cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.contain.includes('paint') || cs.clipPath !== 'none';
  };
  const px = (n: number) => Math.round(n);
  const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 30);

  // 1 · Horizontal overflow: the document, or an element past the viewport's sides with no clipping ancestor.
  if (de.scrollWidth > vw + 1) fails.push({ rule: 'overflow-x', el: 'html', detail: `scrollWidth ${de.scrollWidth} > ${vw}` });
  const wide: Element[] = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || (r.left >= -1 && r.right <= vw + 1)) continue;
    if (wide.some((w) => w.contains(el)) || !visible(el)) continue;
    let clipped = false;
    for (let a = el.parentElement; a && a !== de; a = a.parentElement) {
      if (clips(a)) {
        clipped = true;
        break;
      }
    }
    if (clipped) continue;
    wide.push(el);
    fails.push({ rule: 'overflow-x', el: path(el), detail: `spans x ${px(r.left)}..${px(r.right)} in a ${vw}px viewport` });
    if (wide.length >= 5) break;
  }

  // Text boxes in page coordinates, cut to their nearest clipping ancestor.
  interface Box {
    el: Element;
    l: number;
    t: number;
    r: number;
    b: number;
  }
  const boxes: Box[] = [];
  const clipBox = new Map<Element, DOMRect | null>();
  const clipFor = (el: Element): DOMRect | null => {
    if (clipBox.has(el)) return clipBox.get(el) ?? null;
    let found: DOMRect | null = null;
    for (let a: Element | null = el; a && a !== de && a !== document.body; a = a.parentElement) {
      if (clips(a)) {
        found = a.getBoundingClientRect();
        break;
      }
    }
    clipBox.set(el, found);
    return found;
  };
  const small = new Map<Element, string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent?.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('script, style, noscript, template, svg') || !visible(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const clip = clipFor(el);
    // A text rect is the font's content area, which a display face with tight
    // leading overflows; the line box is what the layout stacks.
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    let any = false;
    for (const rect of range.getClientRects()) {
      let { left: l, top: t, right: r, bottom: b } = rect;
      if (Number.isFinite(lineHeight) && b - t > lineHeight) {
        const mid = (t + b) / 2;
        t = mid - lineHeight / 2;
        b = mid + lineHeight / 2;
      }
      if (clip) {
        l = Math.max(l, clip.left);
        t = Math.max(t, clip.top);
        r = Math.min(r, clip.right);
        b = Math.min(b, clip.bottom);
      }
      // Visually hidden text (a 1px clipped box) and text cut away by its clip.
      if (r - l < 2 || b - t < 2) continue;
      any = true;
      boxes.push({ el, l, t: t + scrollY, r, b: b + scrollY });
    }
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (any && size < 12) small.set(el, `${size}px "${text(el)}"`);
  }
  for (const [el, detail] of small) reports.push({ rule: 'small-text', el: path(el), detail });

  // 2 · Text overlap between two elements, more than 3px both ways. A display
  // numeral (line-height under 1) sitting on its own label is exempt.
  const tight = (el: Element) => {
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight);
    return Number.isFinite(lh) && lh < parseFloat(cs.fontSize);
  };
  const near = (a: Element, b: Element) => {
    const scope = a.parentElement?.parentElement;
    return !!scope && scope.contains(b);
  };
  boxes.sort((a, b) => a.t - b.t);
  const seen = new Set<string>();
  let overlaps = 0;
  for (let i = 0; i < boxes.length && overlaps < 8; i++) {
    const A = boxes[i]!;
    for (let j = i + 1; j < boxes.length; j++) {
      const B = boxes[j]!;
      if (B.t >= A.b - 3) break;
      if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
      const ix = Math.min(A.r, B.r) - Math.max(A.l, B.l);
      const iy = Math.min(A.b, B.b) - Math.max(A.t, B.t);
      if (ix <= 3 || iy <= 3) continue;
      if ((tight(A.el) && near(A.el, B.el)) || (tight(B.el) && near(B.el, A.el))) continue;
      const key = `${path(A.el)}|${path(B.el)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      overlaps++;
      fails.push({
        rule: 'text-overlap',
        el: `${path(A.el)} × ${path(B.el)}`,
        detail: `"${text(A.el)}" × "${text(B.el)}" by ${px(ix)}×${px(iy)} at y ${px(A.t)}`,
      });
    }
  }

  // 3 · Stretched buttons: wider than 3.2 times their height and than 70% of the viewport.
  for (const el of document.querySelectorAll('.pill, button, a[class*="cta"], input[type="submit"]')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 1) continue;
    if (r.width / r.height > 3.2 && r.width > vw * 0.7)
      fails.push({ rule: 'stretched-button', el: path(el), detail: `${px(r.width)}×${px(r.height)} in a ${vw}px viewport` });
  }

  // Report only: vertical gaps with no content taller than 45% of the viewport.
  const spans: [number, number][] = boxes.map((b) => [b.t, b.b]);
  for (const el of document.querySelectorAll('img, video, iframe, svg, picture, canvas, input, select, textarea, button')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width >= 2 && r.height >= 2) spans.push([r.top + scrollY, r.bottom + scrollY]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  let end = 0;
  for (const [t, b] of spans) {
    if (t - end > vh * 0.45) {
      const mid = (end + t) / 2 - scrollY;
      const sections = [...document.querySelectorAll('main section, main > *, body > *, footer')].filter((x) => {
        const r = x.getBoundingClientRect();
        return r.height > 0 && r.top <= mid && r.bottom >= mid;
      });
      const at = sections.at(-1);
      reports.push({ rule: 'empty-gap', el: at ? path(at) : '?', detail: `y ${px(end)}..${px(t)} (${px(t - end)}px)` });
    }
    end = Math.max(end, b);
  }

  return { fails, reports };
}

/**
 * Rule 4 · Tap targets under 44px on touch screens. An invisible ::after hit
 * area does not show in the box, so a small target is probed with
 * elementFromPoint at its centre ±21.5px before it fails. Inline links in
 * running prose are exempt (WCAG 2.5.8). Scrolls the page.
 */
export function probeTaps(): Finding[] {
  const fails: Finding[] = [];
  const desc = (el: Element) =>
    `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : ''}`;
  const path = (el: Element) => {
    const parts: string[] = [];
    for (let a: Element | null = el, i = 0; a && a !== document.body && i < 3; a = a.parentElement, i++) parts.unshift(desc(a));
    return parts.join('>');
  };
  const MIN = 44;
  const REACH = 21.5;
  const targets = document.querySelectorAll<HTMLElement>(
    'a[href], button, summary, input:not([type="hidden"]), select, textarea, [role="button"], [tabindex="0"]',
  );
  for (const el of targets) {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    // Out of the tab order and hidden from assistive tech: a honeypot, not a target.
    if (el.tabIndex < 0 && el.closest('[aria-hidden="true"], [inert]')) continue;
    let target: HTMLElement = el;
    if (el instanceof HTMLInputElement && /^(checkbox|radio)$/.test(el.type)) target = el.labels?.[0] ?? el;
    let r = target.getBoundingClientRect();
    // Visually hidden (skip links until focused).
    if (r.width <= 1 || r.height <= 1) continue;
    if (r.width >= MIN && r.height >= MIN) continue;
    if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') {
      const own = (el.textContent ?? '').trim().length;
      const block = el.parentElement?.closest('p, li, dd, td, figcaption, blockquote');
      if (block && (block.textContent ?? '').trim().length > own + 15) continue;
    }
    // Centre it, also inside a horizontal rail, so every probe point is on screen.
    target.scrollIntoView({ block: 'center', inline: 'center' });
    r = target.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const points: [number, number][] = [];
    if (r.height < MIN) points.push([cx, cy - REACH], [cx, cy + REACH]);
    if (r.width < MIN) points.push([cx - REACH, cy], [cx + REACH, cy]);
    const reaches = points.every(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return !!hit && (target.contains(hit) || el.contains(hit));
    });
    if (reaches) continue;
    const name = (el.textContent?.trim() || el.getAttribute('aria-label') || el.getAttribute('name') || '').slice(0, 30);
    fails.push({ rule: 'tap-target', el: path(el), detail: `${Math.round(r.width)}×${Math.round(r.height)} "${name}"` });
  }
  return fails;
}

export interface StageSpec {
  /** The act (the pinned section) and its stage. */
  act: string;
  stage: string;
  /** What must stay inside the stage box, and inside the viewport while pinned. */
  parts: string[];
  /** What must fit the viewport's height under the header, pinned or not. */
  fit?: string[];
}

/** Where a stage is and whether it sticks, so the caller can scroll through its pin. */
export function stageGeometry(spec: StageSpec) {
  const act = document.querySelector(spec.act);
  const stage = document.querySelector(spec.stage);
  if (!act || !stage) return null;
  const header = document.querySelector('.header');
  return {
    top: act.getBoundingClientRect().top + scrollY,
    height: (act as HTMLElement).offsetHeight,
    stageHeight: (stage as HTMLElement).offsetHeight,
    stickTop: parseFloat(getComputedStyle(stage).top) || (header ? header.getBoundingClientRect().height : 0),
    sticky: getComputedStyle(stage).position === 'sticky',
  };
}

/** Rule 5 · A stage's parts inside its box, and inside the viewport under the header while it is pinned. */
export function probeStage(args: { spec: StageSpec; label: string }): Finding[] {
  const { spec, label } = args;
  const fails: Finding[] = [];
  const stage = document.querySelector(spec.stage);
  if (!stage) return fails;
  const sticky = getComputedStyle(stage).position === 'sticky';
  const s = stage.getBoundingClientRect();
  const header = document.querySelector('.header');
  const top = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
  const px = (n: number) => Math.round(n);
  // What a part shows: its lines of text (line boxes, not the padding around
  // them) and its images and controls; the element's own box when it has neither.
  const content = (el: Element) => {
    const rects: DOMRect[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const parent = n.parentElement;
      if (!n.textContent?.trim() || !parent || parent.closest('.visually-hidden')) continue;
      const lh = parseFloat(getComputedStyle(parent).lineHeight);
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        const h = Number.isFinite(lh) ? Math.min(lh, r.height) : r.height;
        rects.push(new DOMRect(r.left, r.top + (r.height - h) / 2, r.width, h));
      }
    }
    for (const x of el.querySelectorAll('img, video, svg, input, select, button, textarea')) {
      const r = x.getBoundingClientRect();
      if (r.width >= 1 && r.height >= 1) rects.push(r);
    }
    if (!rects.length) return el.getBoundingClientRect();
    const l = Math.min(...rects.map((r) => r.left));
    const t = Math.min(...rects.map((r) => r.top));
    return new DOMRect(l, t, Math.max(...rects.map((r) => r.right)) - l, Math.max(...rects.map((r) => r.bottom)) - t);
  };
  for (const sel of spec.parts) {
    for (const el of document.querySelectorAll(sel)) {
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = content(el);
      if (r.width < 1 || r.height < 1) continue;
      const out: string[] = [];
      if (r.top < s.top - 1 || r.bottom > s.bottom + 1 || r.left < s.left - 1 || r.right > s.right + 1)
        out.push(`leaves the stage (${px(r.top)}..${px(r.bottom)} in ${px(s.top)}..${px(s.bottom)})`);
      if (sticky && (r.top < top - 1 || r.bottom > innerHeight + 1))
        out.push(`leaves the viewport (${px(r.top)}..${px(r.bottom)} in ${px(top)}..${innerHeight})`);
      if (out.length) fails.push({ rule: 'stage', el: sel, detail: `${label}: ${out.join(', ')}` });
    }
  }
  const room = innerHeight - (header ? header.getBoundingClientRect().height : 0);
  for (const sel of spec.fit ?? []) {
    const el = document.querySelector(sel);
    if (!el || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const r = content(el);
    if (r.height > room + 1)
      fails.push({ rule: 'stage', el: sel, detail: `${label}: ${px(r.height)}px tall, taller than the ${px(room)}px under the header` });
  }
  return fails;
}
