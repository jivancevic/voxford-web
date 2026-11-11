import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import sharp from 'sharp';

// The share image of a video's watch page, 1200×630. Posters are vertical
// (9:16), and a 1200×630 crop of one keeps a third of its height and cuts the
// faces, so the card shows the whole poster in the middle, over a blurred,
// darkened copy of itself. Built once per video at build time; sharp is the
// image service Astro already builds with.

const WIDTH = 1200;
const HEIGHT = 630;

export const getStaticPaths = (async () =>
  (await getCollection('videos')).map((video) => ({ params: { video: video.id } }))) satisfies GetStaticPaths;

/** The poster's file on disk, read from the entry's JSON (the collection's `poster` is already an optimised image). */
function posterFile(id: string): string {
  const entry = resolve(process.cwd(), 'src/content/videos', `${id}.json`);
  const { poster } = JSON.parse(readFileSync(entry, 'utf8')) as { poster: string };
  return resolve(dirname(entry), poster);
}

export const GET: APIRoute = async ({ params }) => {
  const file = posterFile(params.video!);
  const background = await sharp(file)
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .blur(40)
    .modulate({ brightness: 0.45 })
    .toBuffer();
  const poster = await sharp(file).resize({ height: HEIGHT }).toBuffer();
  const { width = 0 } = await sharp(poster).metadata();
  const card = await sharp(background)
    .composite([{ input: poster, left: Math.round((WIDTH - width) / 2), top: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(card), { headers: { 'Content-Type': 'image/jpeg' } });
};
