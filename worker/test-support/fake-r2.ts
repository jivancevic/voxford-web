// An in-memory stand-in for an R2 bucket binding, covering what worker/media.ts
// and worker/reels.ts use: get (with Range and If-None-Match), head, put,
// delete, list. Enough to test the Worker without Miniflare.

interface Stored {
  bytes: Uint8Array;
  etag: string;
  httpMetadata: R2HTTPMetadata;
  uploaded: Date;
}

let etagCounter = 0;

function parseRange(header: string | null, size: number): R2Range | undefined {
  const m = header ? /^bytes=(\d*)-(\d*)$/.exec(header) : null;
  if (!m) return undefined;
  const [, a, b] = m;
  if (a === '' && b) return { suffix: Number(b) };
  const offset = Number(a);
  if (offset >= size) throw new Error('InvalidRange');
  return b ? { offset, length: Number(b) - offset + 1 } : { offset };
}

function slice(bytes: Uint8Array, range: R2Range | undefined): Uint8Array {
  if (!range) return bytes;
  if ('suffix' in range) return bytes.slice(Math.max(0, bytes.length - range.suffix));
  const start = range.offset ?? 0;
  return bytes.slice(start, range.length === undefined ? undefined : start + range.length);
}

export class FakeR2 {
  readonly objects = new Map<string, Stored>();

  private meta(key: string, s: Stored, range?: R2Range): R2Object {
    return {
      key,
      version: s.etag,
      size: s.bytes.length,
      etag: s.etag,
      httpEtag: `"${s.etag}"`,
      uploaded: s.uploaded,
      httpMetadata: s.httpMetadata,
      customMetadata: {},
      range,
      checksums: {} as R2Checksums,
      storageClass: 'Standard',
      writeHttpMetadata: (headers: Headers) => {
        if (s.httpMetadata.contentType) headers.set('Content-Type', s.httpMetadata.contentType);
        if (s.httpMetadata.cacheControl) headers.set('Cache-Control', s.httpMetadata.cacheControl);
      },
    } as R2Object;
  }

  async head(key: string): Promise<R2Object | null> {
    const s = this.objects.get(key);
    return s ? this.meta(key, s) : null;
  }

  async get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | R2Object | null> {
    const s = this.objects.get(key);
    if (!s) return null;
    const onlyIf = options?.onlyIf instanceof Headers ? options.onlyIf : undefined;
    if (onlyIf?.get('If-None-Match') === `"${s.etag}"`) return this.meta(key, s);
    const range =
      options?.range instanceof Headers
        ? parseRange(options.range.get('Range'), s.bytes.length)
        : (options?.range as R2Range | undefined);
    if (range && 'offset' in range && (range.offset ?? 0) >= s.bytes.length) throw new Error('InvalidRange');
    const bytes = slice(s.bytes, range);
    return {
      ...this.meta(key, s, range),
      writeHttpMetadata: this.meta(key, s).writeHttpMetadata,
      body: new Response(bytes).body!,
      bodyUsed: false,
      arrayBuffer: async () => bytes.buffer as ArrayBuffer,
      text: async () => new TextDecoder().decode(bytes),
      json: async <T>() => JSON.parse(new TextDecoder().decode(bytes)) as T,
      blob: async () => new Blob([bytes]),
      bytes: async () => bytes,
    } as unknown as R2ObjectBody;
  }

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob,
    options?: R2PutOptions,
  ): Promise<R2Object> {
    const bytes = new Uint8Array(await new Response(value as BodyInit).arrayBuffer());
    const httpMetadata = options?.httpMetadata instanceof Headers ? {} : (options?.httpMetadata ?? {});
    const stored: Stored = { bytes, etag: `etag-${++etagCounter}`, httpMetadata, uploaded: new Date() };
    this.objects.set(key, stored);
    return this.meta(key, stored);
  }

  async delete(keys: string | string[]): Promise<void> {
    for (const k of Array.isArray(keys) ? keys : [keys]) this.objects.delete(k);
  }

  async list(options?: R2ListOptions): Promise<R2Objects> {
    const keys = [...this.objects.keys()].filter((k) => !options?.prefix || k.startsWith(options.prefix)).sort();
    return { objects: keys.map((k) => this.meta(k, this.objects.get(k)!)), truncated: false, delimitedPrefixes: [] } as R2Objects;
  }

  /** Test helper: the stored text of a key. */
  text(key: string): string | undefined {
    const s = this.objects.get(key);
    return s ? new TextDecoder().decode(s.bytes) : undefined;
  }

  asBinding(): R2Bucket {
    return this as unknown as R2Bucket;
  }
}
