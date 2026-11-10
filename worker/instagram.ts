// A small client for the Instagram API with Unified login (graph.facebook.com):
// list one Instagram account's media. Only what the reels sync needs.
//
// The token is a system-user access token (starts with EAA, never expires) of
// the business portfolio that owns voxford.official, from the Worker secret
// INSTAGRAM_TOKEN; the account is the one Instagram account assigned to that
// system user (or the secret INSTAGRAM_USER_ID, when set). Meta no longer
// offers new apps the Instagram Login variant (graph.instagram.com, 60-day
// IGAA tokens): docs/adr/0004.
// https://developers.facebook.com/docs/instagram-platform/reference/instagram-media

export const IG_GRAPH = 'https://graph.facebook.com';
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

/** An Instagram user id is numeric; anything else would change the request path. */
export const isInstagramUserId = (id: string) => /^\d+$/.test(id);

async function getJson<T>(fetchFn: Fetch, url: string): Promise<T> {
  const res = await fetchFn(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    // Meta's error body names the problem (revoked token, rate limit); never echo the URL, it holds the token.
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

/**
 * The Instagram user id of the one Instagram account assigned to the token's
 * system user. Fails when there is none or more than one (then set INSTAGRAM_USER_ID).
 * https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/system-user/assigned_instagram_accounts
 */
export async function assignedInstagramAccount(fetchFn: Fetch, token: string): Promise<string> {
  const body = await getJson<{ data?: { id?: string }[] }>(
    fetchFn,
    `${IG_GRAPH}/${IG_VERSION}/me/assigned_instagram_accounts?fields=id,username&access_token=${encodeURIComponent(token)}`,
  );
  const ids = (body.data ?? []).map((a) => a.id).filter((id): id is string => !!id && isInstagramUserId(id));
  if (ids.length !== 1) {
    throw new InstagramError(
      `the token's system user has ${ids.length} Instagram accounts assigned; assign exactly one or set INSTAGRAM_USER_ID`,
      0,
    );
  }
  return ids[0]!;
}

/**
 * The newest `count` reels of the Instagram account `userId`, newest first.
 * Follows paging until it has enough (at most `maxPages`).
 */
export async function latestReels(
  fetchFn: Fetch,
  token: string,
  userId: string,
  count: number,
  maxPages = 4,
): Promise<IgMedia[]> {
  if (!isInstagramUserId(userId)) throw new InstagramError('INSTAGRAM_USER_ID is not a numeric Instagram user id', 0);
  const reels: IgMedia[] = [];
  let url: string | undefined =
    `${IG_GRAPH}/${IG_VERSION}/${userId}/media?fields=${MEDIA_FIELDS}&limit=25&access_token=${encodeURIComponent(token)}`;
  for (let page = 0; url && page < maxPages && reels.length < count; page++) {
    const body: IgPage = await getJson<IgPage>(fetchFn, url);
    reels.push(...body.data.filter(isReel));
    url = body.paging?.next;
  }
  return reels.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, count);
}
