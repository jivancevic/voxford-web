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
import hakStage from '@/assets/photos/hak-stage.jpg';
import popupCrkva from '@/assets/photos/popup-crkva.jpg';
import shootCasaSat from '@/assets/photos/shoot-casa-sat.jpg';
import shootCrnoFotelja from '@/assets/photos/shoot-crno-fotelja.jpg';
import shootSetnja from '@/assets/photos/shoot-setnja.jpg';
import unisportBlizu from '@/assets/photos/unisport-blizu.jpg';
// Home (ticket B): the hero's depth planes and the chord's five portraits.
import heroFar from '@/assets/photos/home/hero-far.jpg';
import heroFront from '@/assets/photos/home/hero-front.webp';
import heroSubject from '@/assets/photos/home/hero-subject.webp';
import portraitAnte from '@/assets/photos/home/portrait-ante.jpg';
import portraitDavid from '@/assets/photos/home/portrait-david.jpg';
import portraitDora from '@/assets/photos/home/portrait-dora.jpg';
import portraitJosip from '@/assets/photos/home/portrait-josip.jpg';
import portraitVita from '@/assets/photos/home/portrait-vita.jpg';
// Stages and artists (ReferencesWall, #33): our own photos. The files carry no
// photographer in their metadata; credits are Josip's (2026-11-11). The two
// Tvornica frames have no known author yet, so they show no credit.
import stageArena from '@/assets/photos/stages/arena-zagreb-2025.jpg';
import stageKutlic from '@/assets/photos/stages/marko-kutlic-2023.jpg';
import stageTvornica from '@/assets/photos/stages/tvornica-kulture-2023.jpg';
import type { MemberKey } from '@/data/site-facts';

export interface Photo {
  src: ImageMetadata;
  alt: Record<Locale, string>;
  /** Location label shown on the photo, e.g. "AWARDS GALA · ZAGREB · 2026". Latin caps, so it can be set in any face. */
  label?: Record<Locale, string>;
  /** Photographer or agency, when known. */
  credit?: string;
  /** `object-position` when the photo is cropped hard (e.g. a portrait in a wide tile); default centre. */
  focus?: string;
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
  hakStage: {
    // Pre-cropped to 16:9 for the band on the Conferences page; same event as hakEsplanade.
    src: hakStage,
    alt: {
      en: 'Voxford, five singers in black, on stage in front of an LED wall showing an island in a blue sea, guests standing in the foreground',
      hr: 'Voxford, petero pjevača u crnom, na pozornici ispred LED zida s prizorom otoka u plavom moru, a u prvom planu stoje gosti',
    },
    label: { en: 'CORPORATE EVENT · ZAGREB · 2026', hr: 'POSLOVNI DOGAĐAJ · ZAGREB · 2026' },
    source: 'Drive › 2026 HAK Esplanade › hak-120-full-373.jpg (1l9QnXjAUcmSZ-f5wSWgn4-c07nIwXbso)',
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
  stageArenaZagreb: {
    src: stageArena,
    alt: {
      en: 'Voxford taking a bow on the stage of Arena Zagreb under two blue spotlights',
      hr: 'Voxford se klanja na pozornici Arene Zagreb pod dva plava reflektora',
    },
    label: { en: 'WITH DALMATINO · 2025', hr: 'S DALMATINOM · 2025' },
    credit: 'Jurica Cvitanić',
    // Portrait 4:5 in a wide tile: keep the bow, low in the frame, in view.
    focus: '50% 78%',
    source: 'From Josip, 2026-11-11 (WhatsApp Image 2026-11-11 at 00.22.39 (1).jpeg): the bow at Dalmatino\'s Arena Zagreb concert',
  },
  stageTvornica: {
    src: stageTvornica,
    alt: {
      en: 'The five singers of Voxford at microphones on the stage of Tvornica kulture, in blue light',
      hr: 'Petorka Voxforda za mikrofonima na pozornici Tvornice kulture, u plavom svjetlu',
    },
    label: { en: 'WITH MARKO KUTLIĆ · 2023', hr: 'S MARKOM KUTLIĆEM · 2023' },
    source: 'Drive › Photo › 2023 Tvornica Marko Kutlić › PHOTO-2023-11-28-10-21-06.jpg',
  },
  stageKutlic: {
    src: stageKutlic,
    alt: {
      en: 'Marko Kutlić singing at the front of the stage, Voxford at their microphones behind him',
      hr: 'Marko Kutlić pjeva na rubu pozornice, a Voxford za mikrofonima iza njega',
    },
    label: { en: 'TVORNICA KULTURE · 2023', hr: 'TVORNICA KULTURE · 2023' },
    source: 'Drive › Photo › 2023 Tvornica Marko Kutlić › PHOTO-2023-11-28-10-21-06 (7).jpg',
  },
} as const satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;

/** The photo used for social previews (og:image) and the default JSON-LD image. */
export const SHARE_PHOTO: PhotoKey = 'unisportStage';

/**
 * The home hero as depth planes, all cut from one Unisport Stars 2026 frame
 * (Westin, Zagreb; Drive `2026 Hrvatski Akademski Sportski Savez` ›
 * `Unisport_stars_R1JC7655_JC.jpg`, all five singing) and sharing its
 * 1800×1200 crop (3:2), so they line up by stacking. `far` is the whole crop
 * at 1600 px, defocused and dimmed, `subject` the five singers on alpha (Apple Vision
 * person matte, one tile per singer), `front` the audience below the stage
 * line. Recipe: docs/home/BRIEF.md › Hero planes.
 */
export const HERO_PLANES = {
  far: heroFar,
  subject: heroSubject,
  front: heroFront,
  alt: {
    en: 'The five singers of Voxford singing at microphones on the Unisport Stars gala stage, the audience in silhouette in front',
    hr: 'Petorka Voxforda pjeva za mikrofonima na pozornici gala večeri Unisport Stars, ispred njih publika u silueti',
  },
  // Same gala as unisportStage. The credit is the file's own mandatory credit
  // ("© Jozo Cabraja / kolektiff"), confirmed for #31.
  label: PHOTOS.unisportStage.label,
  credit: 'Jozo Cabraja / kolektiff',
  source: 'Drive › Photo › 2026 Hrvatski Akademski Sportski Savez › Unisport_stars_R1JC7655_JC.jpg (Unisport Stars, Westin)',
} as const;

/**
 * One portrait per member, for the chord on the home page (KB brand/media-kit.md
 * › Gavella: the 2024 Journal.hr shoot has each member alone). Names come from
 * site-facts MEMBERS by key. The first mapping (from the stage order in the
 * Unisport frames) had Josip/David and Dora/Vita swapped; Josip corrected it on
 * 2026-11-10 (jivancevic/voxford-web#32).
 */
export const PORTRAITS: Record<MemberKey, { src: ImageMetadata; credit: string; source: string }> = {
  josip: { src: portraitJosip, credit: 'Marko Lopac', source: 'Journal.hr 2024 › Voxford_Journal_Marko-Lopac-13.jpg' },
  dora: { src: portraitDora, credit: 'Marko Lopac', source: 'Journal.hr 2024 › Voxford_Journal_Marko-Lopac-12.jpg' },
  ante: { src: portraitAnte, credit: 'Marko Lopac', source: 'Journal.hr 2024 › Voxford_Journal_Marko-Lopac-15.jpg' },
  vita: { src: portraitVita, credit: 'Marko Lopac', source: 'Journal.hr 2024 › Voxford_Journal_Marko-Lopac-11.jpg' },
  david: { src: portraitDavid, credit: 'Marko Lopac', source: 'Journal.hr 2024 › Voxford_Journal_Marko-Lopac-14.jpg' },
};
