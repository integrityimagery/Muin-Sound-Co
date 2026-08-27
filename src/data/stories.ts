/**
 * The six story archetypes.
 *
 * `tileVoice` is the homepage tile label, written in the COUPLE'S voice
 * rather than as a category name — "we've both been through some things"
 * rather than "Second Marriages".
 *
 * `weight` is duplicated from each story's own frontmatter so the homepage
 * tiles can preview the destination page's typographic weight. The build
 * asserts the two agree (see src/pages/index.astro), so they cannot drift.
 */

import type { Theme } from './themes';

export type StoryWeight = 'loud' | 'standard' | 'quiet';

export type StoryTile = {
  slug: string;
  /** Canonical archetype name, used as the page <h1>. */
  title: string;
  /** Homepage tile copy, in the couple's voice. PLACEHOLDER wording. */
  tileVoice: string;
  /** One line of supporting copy on the tile. PLACEHOLDER wording. */
  tileSupport: string;
  theme: Theme;
  weight: StoryWeight;
};

export const storyTiles: StoryTile[] = [
  {
    slug: 'been-through-something',
    title: 'The ones who’ve been through something',
    tileVoice: 'We didn’t get here the easy way.',
    tileSupport:
      'For couples whose story has a before and an after, and who want the song to know that.',
    theme: 'hearth',
    weight: 'standard',
  },
  {
    slug: 'the-defiant-ones',
    title: 'The defiant ones',
    tileVoice: 'We were told this wouldn’t happen.',
    tileSupport:
      'For the weddings that had to be argued for. The song can say so out loud.',
    theme: 'plum',
    weight: 'loud',
  },
  {
    slug: 'the-loud-ones',
    title: 'The loud ones',
    tileVoice: 'We want the whole room on its feet.',
    tileSupport:
      'For couples who are not planning a quiet evening, and never were.',
    theme: 'plum',
    weight: 'loud',
  },
  {
    slug: 'the-quiet-ones',
    title: 'The quiet ones',
    tileVoice: 'We’d rather it were small.',
    tileSupport:
      'Twelve people, a short ceremony, and one song that doesn’t raise its voice.',
    theme: 'hearth',
    weight: 'quiet',
  },
  {
    slug: 'the-long-haul',
    title: 'The long haul',
    tileVoice: 'We’ve already been together a long time.',
    tileSupport:
      'Vow renewals, late marriages, and couples who are formalising something that already happened.',
    theme: 'hearth',
    weight: 'standard',
  },
  {
    slug: 'the-woods-called',
    title: 'The ones the woods called',
    tileVoice: 'We’re getting married outside, under something old.',
    tileSupport:
      'Handfastings, forest ceremonies, and earth-centred rites that need music to match.',
    theme: 'grove',
    weight: 'standard',
  },
];

/**
 * The three-step process.
 * Rendered as leaves on the vine, because it genuinely is a sequence.
 */
export const processSteps = [
  {
    n: 1,
    title: 'Tell us the shape of it',
    // PLACEHOLDER
    body: 'A short intake form — who you are, when the wedding is, and what the song is for. Ten minutes, no writing required.',
  },
  {
    n: 2,
    title: 'One video conversation',
    // PLACEHOLDER
    body: 'About an hour on a call, together. How you met, what went wrong, what you are actually promising each other. This is where the song is really written.',
  },
  {
    n: 3,
    title: 'The songs arrive',
    // PLACEHOLDER
    body: 'A first draft for you to sit with, then revisions, then finished files — roughly X–X weeks from the consult. Yours to keep and play forever.',
  },
] as const;
