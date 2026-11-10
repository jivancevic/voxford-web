// A small client for the Instagram API with Instagram Login (graph.instagram.com):
// list the account's media and refresh the long-lived token. Only what the
// reels sync needs. The token comes from the Worker secret INSTAGRAM_TOKEN.
// https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login

export const IG_GRAPH = 'https://graph.instagram.com';
/** Pinned Graph API version; bump when Meta retires it (they give two years). */
export const IG_VERSION = 'v24.0';

export type Fetch = typeof fetch;

export interface IgMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_product_type?: 'AD' | 'FEED' | 'STORY' | 'REELS';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

interface IgPage {
  data: IgMedia[];
  paging?: { next?: string };
}

export class InstagramError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'InstagramError';
  }
}

const MEDIA_FIELDS = 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp';

async function getJson<T>(fetchFn: Fetch, url: string): Promise<T> {
  const res = await fetchFn(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    // Meta's error body names the problem (expired token, rate limit); never echo the URL, it holds the token.
    let detail = '';
    try {
      const body = (await res.json()) as { error?: { message?: string; code?: number } };
      detail = body.error ? `${body.error.code ?? ''} ${body.error.message ?? ''}`.trim() : '';
    } catch {
      /* not JSON */
    }
    throw new InstagramError(`Instagram API ${res.status}${detail ? `: ${detail}` : ''}`, res.status);
  }
  return (await res.json()) as T;
}

/** A reel the site can show: a video with both its file and its thumbnail. */
const isReel = (m: IgMedia) =>
  m.media_type === 'VIDEO' &&
  (m.media_product_type === 'REELS' || m.media_product_type === undefined) &&
  !!m.media_url &&
  !!m.thumbnail_url;

/** The newest `count` reels, newest first. Follows paging until it has enough (at most `maxPages`). */
export async function latestReels(fetchFn: Fetch, token: string, count: number, maxPages = 4): Promise<IgMedia[]> {
  const reels: IgMedia[] = [];
  let url: string | undefined =
    `${IG_GRAPH}/${IG_VERSION}/me/media?fields=${MEDIA_FIELDS}&limit=25&access_token=${encodeURIComponent(token)}`;
  for (let page = 0; url && page < maxPages && reels.length < count; page++) {
    const body: IgPage = await getJson<IgPage>(fetchFn, url);
    reels.push(...body.data.filter(isReel));
    url = body.paging?.next;
  }
  return reels.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, count);
}

export interface RefreshedToken {
  access_token: string;
  expires_in: number;
}

/** Extend the long-lived token by 60 days (allowed once it is 24 hours old). */
export async function refreshToken(fetchFn: Fetch, token: string): Promise<RefreshedToken> {
  return getJson<RefreshedToken>(
    fetchFn,
    `${IG_GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
  );
}
