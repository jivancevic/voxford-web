import { describe, expect, it } from 'vitest';
import { feedUrl, parseYouTubeFeed, shortTitle, withThumbnails, type YouTubeVideo } from '@/lib/youtube';

const entry = (id: string, published: string, title: string, kind: 'shorts' | 'watch' = 'shorts') => `
 <entry>
  <id>yt:video:${id}</id>
  <yt:videoId>${id}</yt:videoId>
  <yt:channelId>UC6q6MkvWEJBrDIi7jgHeWww</yt:channelId>
  <title>${title}</title>
  <link rel="alternate" href="https://www.youtube.com/${kind === 'shorts' ? `shorts/${id}` : `watch?v=${id}`}"/>
  <published>${published}</published>
  <updated>2026-10-20T02:37:28+00:00</updated>
  <media:group>
   <media:title>${title}</media:title>
   <media:thumbnail url="https://i2.ytimg.com/vi/${id}/hqdefault.jpg" width="480" height="360"/>
  </media:group>
 </entry>`;

const feed = (...entries: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Voxford</title>
 <published>2021-12-19T12:56:48+00:00</published>
${entries.join('\n')}
</feed>`;

describe('parseYouTubeFeed', () => {
  it('reads each upload, newest first, with a watch URL and a thumbnail built from the id', () => {
    const videos = parseYouTubeFeed(
      feed(
        entry('mCcWolBHC1k', '2026-05-07T10:19:30+00:00', 'Voxford - Andromeda'),
        entry('Qa9IbKOigkc', '2026-06-04T10:07:23+00:00', 'Voxford - End of beginning ft. Mr Myles Finn'),
      ),
    );
    expect(videos).toEqual([
      {
        id: 'Qa9IbKOigkc',
        title: 'Voxford - End of beginning ft. Mr Myles Finn',
        published: '2026-06-04T10:07:23.000Z',
        kind: 'short',
        url: 'https://www.youtube.com/shorts/Qa9IbKOigkc',
        thumbnails: [
          { src: 'https://i.ytimg.com/vi/Qa9IbKOigkc/oar2.jpg', width: 1080, height: 1920 },
          { src: 'https://i.ytimg.com/vi/Qa9IbKOigkc/hqdefault.jpg', width: 480, height: 360 },
        ],
      },
      {
        id: 'mCcWolBHC1k',
        title: 'Voxford - Andromeda',
        published: '2026-05-07T10:19:30.000Z',
        kind: 'short',
        url: 'https://www.youtube.com/shorts/mCcWolBHC1k',
        thumbnails: [
          { src: 'https://i.ytimg.com/vi/mCcWolBHC1k/oar2.jpg', width: 1080, height: 1920 },
          { src: 'https://i.ytimg.com/vi/mCcWolBHC1k/hqdefault.jpg', width: 480, height: 360 },
        ],
      },
    ]);
  });

  it('tells a regular upload from a Short by its link', () => {
    const [video] = parseYouTubeFeed(feed(entry('NNNsMF4b2_Y', '2023-07-27T10:00:00+00:00', 'Trag u beskraju', 'watch')));
    expect(video?.kind).toBe('video');
    expect(video?.url).toBe('https://www.youtube.com/watch?v=NNNsMF4b2_Y');
    expect(video?.thumbnails).toEqual([{ src: 'https://i.ytimg.com/vi/NNNsMF4b2_Y/hqdefault.jpg', width: 480, height: 360 }]);
  });

  it('decodes XML entities in titles', () => {
    const [video] = parseYouTubeFeed(feed(entry('6dofALDTilQ', '2026-04-29T11:13:40+00:00', 'Rock &amp; roll &#39;n&#39; &quot;more&quot; &lt;3')));
    expect(video?.title).toBe(`Rock & roll 'n' "more" <3`);
  });

  it('skips entries with a malformed id or date instead of failing', () => {
    const videos = parseYouTubeFeed(
      feed(
        entry('bad id"><script>', '2026-04-29T11:13:40+00:00', 'Broken'),
        entry('429yMs2QOpg', 'yesterday', 'No date'),
        entry('ChYZZB8HXH8', '2026-02-20T12:39:28+00:00', 'Voxford - Where is my husband'),
      ),
    );
    expect(videos.map((v) => v.id)).toEqual(['ChYZZB8HXH8']);
  });

  it('returns nothing for anything that is not a feed', () => {
    expect(parseYouTubeFeed('')).toEqual([]);
    expect(parseYouTubeFeed('<html><body>Error 404</body></html>')).toEqual([]);
  });
});

describe('shortTitle', () => {
  it('drops the channel name in front of the song', () => {
    expect(shortTitle('Voxford - Andromeda')).toBe('Andromeda');
    expect(shortTitle('Voxford – Lazy song')).toBe('Lazy song');
    expect(shortTitle('VOXFORD | Amazing grace')).toBe('Amazing grace');
  });

  it('keeps titles that do not start with it', () => {
    expect(shortTitle('Trag u beskraju ft. Marko Kutlić')).toBe('Trag u beskraju ft. Marko Kutlić');
    expect(shortTitle('Voxford')).toBe('Voxford');
  });
});

describe('feedUrl', () => {
  it('is the channel uploads feed by default', () => {
    expect(feedUrl(undefined)).toBe('https://www.youtube.com/feeds/videos.xml?channel_id=UC6q6MkvWEJBrDIi7jgHeWww');
  });

  it('can be overridden or switched off', () => {
    expect(feedUrl('http://localhost:9999/feed.xml')).toBe('http://localhost:9999/feed.xml');
    expect(feedUrl('off')).toBeUndefined();
  });
});

describe('withThumbnails', () => {
  const video = (id: string, kind: 'short' | 'video' = 'short'): YouTubeVideo =>
    parseYouTubeFeed(feed(entry(id, '2026-01-01T00:00:00+00:00', id, kind === 'short' ? 'shorts' : 'watch')))[0]!;

  it("takes a Short's vertical frame when it answers", async () => {
    const [v] = await withThumbnails([video('Qa9IbKOigkc')], 8, async () => true);
    expect(v?.thumbnail).toEqual({ src: 'https://i.ytimg.com/vi/Qa9IbKOigkc/oar2.jpg', width: 1080, height: 1920 });
  });

  it('falls back to hqdefault when the vertical frame does not answer', async () => {
    const [v] = await withThumbnails([video('Qa9IbKOigkc')], 8, async (url) => !url.endsWith('/oar2.jpg'));
    expect(v?.thumbnail.src).toBe('https://i.ytimg.com/vi/Qa9IbKOigkc/hqdefault.jpg');
  });

  it('leaves out a video with no thumbnail that answers, and keeps the limit', async () => {
    const videos = [video('aaaaaaaaaaa'), video('bbbbbbbbbbb'), video('ccccccccccc'), video('ddddddddddd')];
    const out = await withThumbnails(videos, 2, async (url) => !url.includes('/bbbbbbbbbbb/'));
    expect(out.map((v) => v.id)).toEqual(['aaaaaaaaaaa', 'ccccccccccc']);
  });
});
