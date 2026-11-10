// Content collections: the long-form copy and the data lists. Every collection
// is declared here up front (ticket A) so the parallel tickets only add
// entries, never edit this file. A ticket that needs a new field adds it to its
// own collection's schema only (CONTEXT.md › Seams). Localized Markdown lives
// under <collection>/<lang>/<entry>.md with the same file name in both
// languages; parity.test.ts enforces that.

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { FAQ_GROUPS } from './lib/faq-groups';

const localized = z.object({ en: z.string().min(1), hr: z.string().min(1) });
/** A proper name that is the same in both languages, or one per language (a Croatian tourist board is "Tourist Board of Pag" in EN). */
const name = z.union([z.string().min(1), localized]);

/** Page meta and body copy, one entry per page key and language: pages/en/conferences.md. */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    /** <title> and og:title, without the " · Voxford" suffix. */
    title: z.string().min(1).max(70),
    /** Meta description: an answer-shaped sentence, 70–160 characters. */
    description: z.string().min(70).max(160),
    /** Visible page heading. */
    heading: z.string().min(1),
    /** KB file(s) the copy was derived from (spec › Sources of truth). */
    source: z.string().min(1),
  }),
});

/** FAQ entries (ticket C). faq/en/<id>.md: the question in frontmatter, the answer as body. */
const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: z.object({
    question: z.string().min(1),
    order: z.number().int(),
    /** Page keys whose FAQ block shows this entry (the FAQ page shows all). */
    pages: z.array(z.string()).default([]),
    /** Section on the FAQ page (labels in the `content` namespace: content.faq.groups). */
    group: z.enum(FAQ_GROUPS),
    source: z.string().min(1),
  }),
});

/** Public concerts only, never corporate or private (ticket C). concerts/<id>.json. */
const concerts = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/concerts' }),
  schema: z.object({
    name: localized,
    /** ISO 8601 date or date-time. */
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
    /** The venue's proper name; omit when it is not known (never guess one). */
    venue: z.string().min(1).optional(),
    /** Who runs the concert (tourist board, festival), as the KB names it, per language when it differs; omit when not known. Never Voxford by default. */
    organizer: name.optional(),
    city: localized,
    countryCode: z.string().length(2),
    /** One line on what the event is, e.g. a free street performance. */
    description: localized.optional(),
    /** Free entry, open to everyone (schema.org isAccessibleForFree). */
    free: z.boolean().default(false),
    url: z.url().optional(),
    source: z.string().min(1),
  }),
});

/** Top videos with their own watch pages (ticket E). videos/<slug>.json; the slug is the watch page's URL. */
const videos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/videos' }),
  schema: ({ image }) =>
    z.object({
      title: localized,
      description: localized,
      /** A frame of the video, 1080×1920 (scripts/encode-top-videos.sh writes it to src/assets/videos/). */
      poster: image(),
      /** ISO 8601 date: the Instagram post date, or the original file's creation date when that is unknown. */
      uploadDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
      /**
       * What `uploadDate` is: the post date ("Published"), a recording month a
       * second source confirms ("Recorded"), or only the file's date, which the
       * page does not show ('file'; JSON-LD still needs an uploadDate).
       */
      dateKind: z.enum(['published', 'recorded', 'file']),
      /** ISO 8601 duration, e.g. PT38S. */
      duration: z.string().regex(/^PT\d+S$/),
      /**
       * R2 key prefix of the encoded files, top/<slug>/<version> (set by
       * scripts/encode-top-videos.sh), served at /media/<prefix>/: loop.{av1,h264}.mp4
       * (muted loop) and full.{av1,h264}.mp4 (with sound). The version changes with
       * the content, so the files are cached as immutable.
       */
      media: z.string().regex(/^top\/[a-z0-9-]+\/[0-9a-f]{8}$/),
      /** The original post on a social profile, when known. */
      permalink: z.url().optional(),
      /** A view count from site-facts NUMBERS shown with this video (a big number is never alone). */
      viewsFact: z.enum(['carolViews']).optional(),
      order: z.number().int(),
      /** KB file(s) the facts came from. */
      source: z.string().min(1),
    }),
});

/** Organisations Voxford performed for, confirmed rows only, never private clients (ticket E). */
const references = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/references' }),
  schema: ({ image }) =>
    z.object({
      /** Per language when it differs, e.g. a tourist board (read it with `inLang`). */
      name,
      /** `venue` (a stage Voxford was invited onto) and `artist` show as lines of names, never as logos. */
      kind: z.enum(['company', 'city', 'tourist-board', 'institution', 'media', 'festival', 'event', 'venue', 'artist']),
      /** Official logo (src/assets/references/README.md lists each source). Without one the name shows as text. */
      logo: image().optional(),
      /** Monochrome treatment: `silhouette` (one light colour) or `grayscale` (keeps a filled box readable). */
      mono: z.enum(['silhouette', 'grayscale']).default('silhouette'),
      url: z.url().optional(),
      order: z.number().int(),
    }),
});

export const collections = { pages, faq, concerts, videos, references };
