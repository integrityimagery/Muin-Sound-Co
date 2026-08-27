/**
 * Package tiers.
 *
 * Rendered as the homepage preview cards AND emitted as schema.org Offer
 * entries. Prices are visible on the page by design — never behind a form.
 *
 * PLACEHOLDER — every price and inclusion below is a stand-in. `$X,XXX`
 * is intentionally not a real number so it cannot be mistaken for one.
 */

export type Package = {
  slug: string;
  name: string;
  summary: string;
  /** Visible starting price. Placeholder until real pricing is set. */
  priceLabel: string;
  /** Numeric value for JSON-LD. null while the price is a placeholder, which
   *  keeps a fake number out of structured data. */
  priceValue: number | null;
  includes: string[];
};

export const packages: Package[] = [
  {
    slug: 'one-song',
    name: 'The Vow',
    summary:
      'One original song, written for the ceremony itself — the walk down the aisle, the first dance, or the moment you choose.',
    priceLabel: 'from $X,XXX',
    priceValue: null,
    includes: [
      'One video consult',
      'One original song, fully produced',
      'Two rounds of revisions',
      'Lyric sheet and streaming-quality files',
    ],
  },
  {
    slug: 'the-pair',
    name: 'The Braid',
    summary:
      'Two songs from the same conversation — usually one for the ceremony and one for the party, sharing a musical thread.',
    priceLabel: 'from $X,XXX',
    priceValue: null,
    includes: [
      'One extended video consult',
      'Two original songs, fully produced',
      'Two rounds of revisions on each',
      'Shared musical motif across both',
      'Lyric sheets and streaming-quality files',
    ],
  },
  {
    slug: 'the-whole-story',
    name: 'The Whole Vine',
    summary:
      'A small suite built around your wedding — processional, ceremony song, and a closing piece, arranged as one body of work.',
    priceLabel: 'from $X,XXX',
    priceValue: null,
    includes: [
      'Two video consults',
      'Three original pieces, fully produced',
      'Unlimited revisions within scope',
      'Instrumental versions for the processional',
      'Lyric sheets, stems, and streaming-quality files',
    ],
  },
];

// PLACEHOLDER — currency for JSON-LD once real prices exist.
export const CURRENCY = 'USD';
