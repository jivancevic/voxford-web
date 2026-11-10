// The photo set: every photo the site uses, with alt text in both languages,
// the stage label shown on it and the credit. Components get photos from here
// by key, never by importing a file directly, so a swap is one line.
// Files: src/assets/photos/, resized to ≤2400px from the KB (brand/assets/fotke/,
// origin in brand/assets/fotke.md); Astro turns them into AVIF/WebP at build.
//
// Gaps (spec › Media): the Gavella portraits (one per member) and more of the
// Westin sport set are on Drive, not yet here; tickets B and C add them.

import type { ImageMetadata } from 'astro';
import type { Locale } from '@/i18n/locales';

import crikvenicaPiano from '@/assets/photos/crikvenica-piano.jpg';
import hakMore from '@/assets/photos/hak-more.jpg';
import popupCrkva from '@/assets/photos/popup-crkva.jpg';
import shootCasaSat from '@/assets/photos/shoot-casa-sat.jpg';
import shootCrnoFotelja from '@/assets/photos/shoot-crno-fotelja.jpg';
import shootSetnja from '@/assets/photos/shoot-setnja.jpg';
import unisportBlizu from '@/assets/photos/unisport-blizu.jpg';

export interface Photo {
  src: ImageMetadata;
  alt: Record<Locale, string>;
  /** Location label shown on the photo, e.g. "AWARDS GALA · ZAGREB · 2026". Latin caps, so it can be set in any face. */
  label?: Record<Locale, string>;
  /** Photographer or agency, when known. */
  credit?: string;
  /** Where in the KB / Drive media kit it came from. */
  source: string;
}

export const PHOTOS = {
  unisportStage: {
    src: unisportBlizu,
    alt: {
      en: 'Voxford singing at microphones on stage at the Unisport Stars awards gala, lit in blue and purple',
      hr: 'Voxford pjeva za mikrofonima na pozornici gala večeri Unisport Stars, u plavom i ljubičastom svjetlu',
    },
    label: { en: 'AWARDS GALA · ZAGREB · 2026', hr: 'DODJELA NAGRADA · ZAGREB · 2026' },
    credit: 'kolektiff',
    source: 'Media kit › 2026 Unisport Westin',
  },
  hakEsplanade: {
    src: hakMore,
    alt: {
      en: 'The five singers in black in front of a blue LED wall at a corporate event, guests seated in the foreground',
      hr: 'Petorka u crnom ispred plavog LED zida na poslovnom događaju, gosti sjede u prvom planu',
    },
    label: { en: 'CORPORATE EVENT · ZAGREB · 2026', hr: 'POSLOVNI DOGAĐAJ · ZAGREB · 2026' },
    source: 'Media kit › 2026 HAK Esplanade',
  },
  crikvenicaPiano: {
    src: crikvenicaPiano,
    alt: {
      en: 'Voxford performing outdoors under string lights, with a stage piano beside them',
      hr: 'Voxford nastupa na otvorenom pod lampicama, uz stage piano',
    },
    label: { en: 'SUMMER CONCERT · CRIKVENICA · 2026', hr: 'LJETNI KONCERT · CRIKVENICA · 2026' },
    source: 'Media kit › 2026 Crikvenica',
  },
  churchPopUp: {
    src: popupCrkva,
    alt: {
      en: 'The five singers standing in a row in front of a church altar',
      hr: 'Petorka stoji u redu ispred crkvenog oltara',
    },
    source: 'Frame from the “Amazing Grace” video (brand/assets/fotke.md)',
  },
  shootArmchair: {
    src: shootCrnoFotelja,
    alt: {
      en: 'The five members of Voxford dressed in black, one seated in a leather armchair, in a room with a stone wall',
      hr: 'Petorka Voxforda u crnom, jedan sjedi u kožnoj fotelji, u sobi s kamenim zidom',
    },
    credit: 'Mirta Cindrić',
    source: 'Media kit › 2025 Photoshoot Mirta',
  },
  shootUpperTown: {
    src: shootSetnja,
    alt: {
      en: 'The five members of Voxford walking down a cobbled street in Zagreb’s Upper Town',
      hr: 'Petorka Voxforda hoda kaldrmom zagrebačkog Gornjeg grada',
    },
    credit: 'Mirta Cindrić',
    source: 'Media kit › 2025 Photoshoot Mirta',
  },
  shootGlass: {
    src: shootCasaSat,
    alt: {
      en: 'Close-up of a hand in a black suit sleeve holding a glass, a wristwatch catching the light',
      hr: 'Krupni kadar ruke u crnom rukavu koja drži čašu, sat hvata svjetlo',
    },
    credit: 'Mirta Cindrić',
    source: 'Media kit › 2025 Photoshoot Mirta',
  },
} as const satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;

/** The photo used for social previews (og:image) and the default JSON-LD image. */
export const SHARE_PHOTO: PhotoKey = 'unisportStage';
