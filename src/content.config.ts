import { defineCollection } from 'astro:content';
// `z` from 'astro:content' is deprecated and goes away in Astro 8.
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { THEMES } from './data/themes';

/**
 * Story pages.
 *
 * The brief allows the Story layout exactly four knobs, and says not to add
 * more without asking. `z.strictObject` makes that a build failure rather than
 * a matter of discipline: any frontmatter key not listed here stops the build
 * with the offending file named. Adding a fifth knob is then a deliberate,
 * reviewable edit to this schema.
 *
 * The payoff is the one the constraint was for — a new story page is a
 * markdown file with four settings, not a design project.
 */
const stories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stories' }),
  schema: z.strictObject({
    /* --- The four knobs -------------------------------------------------- */

    /** Palette AND logo variant. */
    theme: z.enum(THEMES),

    /** How the top of the page opens. */
    hero: z.enum(['photo', 'type', 'audio']),

    /** Rescales display type, leading and whitespace. */
    weight: z.enum(['loud', 'standard', 'quiet']),

    /** The song for this page, with the text that makes it indexable. */
    song: z
      .strictObject({
        src: z.string(),
        title: z.string(),
        description: z.string().optional(),
        lyric: z.string().optional(),
      })
      .optional(),

    /* --- Per-page copy and metadata -------------------------------------- */

    /** <h1>. */
    title: z.string(),
    /** <title> when it should differ from the h1. */
    metaTitle: z.string().optional(),
    /** Meta description. Required — every page gets a unique one. */
    description: z.string(),
    eyebrow: z.string().optional(),
    lede: z.string().optional(),

    /** Photo hero only. Omit `src` to render the marked placeholder. */
    photo: z
      .strictObject({
        src: z.string().optional(),
        alt: z.string().optional(),
        note: z.string().optional(),
      })
      .optional(),

    ctaHref: z.string().optional(),
    ctaLabel: z.string().optional(),
    ctaBody: z.string().optional(),

    /** Stubs are still real pages; this only affects listing order. */
    order: z.number().default(99),
  }),
});

export const collections = { stories };
