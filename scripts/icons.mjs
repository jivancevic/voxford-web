// Writes the site's icons into public/ from one source, the crest's shield
// (src/assets/brand/crest-shield.svg), in the colours of src/styles/tokens.css.
// Run it by hand after changing either, and commit what it writes:
//
//   node scripts/icons.mjs
//
// - favicon.svg: the shield alone, ink on light browser chrome and light on
//   dark chrome (prefers-color-scheme inside the SVG).
// - favicon.ico (16, 32, 48): for browsers without SVG favicons, where the
//   chrome's theme is unknown, so the shield is the crest's purple, readable on
//   both (the KB's purple crest, brand/assets/grb-ljubicasti.png).
// - apple-touch-icon.png (180), icon-192.png, icon-512.png: an opaque tile, the
//   hall (ink with the corner glow) and the light shield. The shield stays
//   inside the maskable safe zone (the centre circle, 80 % of the side), so one
//   file serves both `any` and `maskable` in the manifest.
//
// sharp comes with Astro (its image service); it renders the SVGs.
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const tokens = read('src/styles/tokens.css');
const token = (name) => {
  const value = new RegExp(`${name}:\\s*(#[0-9a-f]{6});`, 'i').exec(tokens)?.[1];
  if (!value) throw new Error(`token ${name} not found in tokens.css`);
  return value;
};
const INK = token('--ink-950');
const LIGHT = token('--ink-100');
const PINK = token('--brand-pink');
const PURPLE = token('--brand-purple');
const BLUE = token('--brand-blue');

const source = read('src/assets/brand/crest-shield.svg');
const [, vbW, vbH] = /viewBox="0 0 (\d+) (\d+)"/.exec(source).map(Number);
const shieldPath = /<path [^>]*\/>/.exec(source)[0];

/** The shield, `height` tall, centred in a `size` square; extra attributes go on its group. */
const shield = (size, height, attrs = '') => {
  const k = height / vbH;
  const x = (size - vbW * k) / 2;
  const y = (size - height) / 2;
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(5)})"${attrs}>${shieldPath}</g>`;
};

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<style>g{fill:${INK}}@media (prefers-color-scheme:dark){g{fill:${LIGHT}}}</style>
${shield(64, 63)}
</svg>
`;

const plain = (size, height, fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${shield(size, height, ` fill="${fill}"`)}</svg>`;

// The tile: the hall at night, a glow from the top-left corner (as --glow-corner), the shield in light.
const tile = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<defs><radialGradient id="glow" cx=".15" cy=".05" r=".95">
<stop offset="0" stop-color="${PINK}" stop-opacity=".4"/><stop offset=".45" stop-color="${PURPLE}" stop-opacity=".22"/><stop offset="1" stop-color="${BLUE}" stop-opacity="0"/>
</radialGradient></defs>
<rect width="${size}" height="${size}" fill="${INK}"/><rect width="${size}" height="${size}" fill="url(#glow)"/>
${shield(size, size * 0.58, ` fill="${LIGHT}"`)}
</svg>`;

const png = (svg, size) => sharp(Buffer.from(svg), { density: 72 * 4 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

/** An ICO file whose entries are PNGs (supported everywhere ICO is read today). */
const ico = (images) => {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size % 256, e);
    header.writeUInt8(size % 256, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((im) => im.data)]);
};

const out = (name, data) => {
  writeFileSync(new URL(`public/${name}`, root), data);
  console.log(`public/${name}`);
};

out('favicon.svg', favicon);
// At 16 px the shield takes the full height; the 1 px margin of the SVG would only blur it.
const icoSizes = [16, 32, 48];
out('favicon.ico', ico(await Promise.all(icoSizes.map(async (size) => ({ size, data: await png(plain(64, 64, PURPLE), size) })))));
out('apple-touch-icon.png', await png(tile(180), 180));
out('icon-192.png', await png(tile(192), 192));
out('icon-512.png', await png(tile(512), 512));
