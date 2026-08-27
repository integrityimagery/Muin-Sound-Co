/**
 * Single source of truth for brand facts.
 *
 * Everything here is consumed by BOTH the visible page and the JSON-LD in
 * <head>. That is deliberate: structured data cannot drift from what the
 * page says, because there is only one copy of each fact.
 */

export const site = {
  name: 'Muin Sound Co.',
  // PLACEHOLDER — replace with the real production domain.
  url: 'https://muinsound.co',

  // PLACEHOLDER — one-line positioning, used as the default meta description.
  tagline: 'Original songs written for your wedding, from your own story.',

  // PLACEHOLDER — service area copy. Appears in the footer and in JSON-LD.
  serviceArea: 'Working with couples anywhere, remotely.',

  // PLACEHOLDER — replace with the real contact address.
  email: 'hello@example.com',

  // PLACEHOLDER — replace with real profiles, or delete the ones that
  // will not exist. These become `sameAs` in the Organization schema, so
  // leaving a dead URL here would publish a false claim.
  social: [
    { label: 'Instagram', href: 'https://instagram.com/example' },
    { label: 'YouTube', href: 'https://youtube.com/@example' },
    { label: 'Bandcamp', href: 'https://example.bandcamp.com' },
  ],

  // PLACEHOLDER — founding year, used in the footer copyright line.
  founded: 2024,
} as const;

/** Ogham note used in the About stub and the footer. Brand-true, not placeholder. */
export const muinMeaning =
  'Muin is the Ogham letter for vine — growth through connection, and things that grow stronger by intertwining.';

export type NavItem = {
  label: string;
  href: string;
  /** Only "Start Here" is styled as a primary button. */
  primary?: boolean;
};

export const nav: NavItem[] = [
  { label: 'Stories', href: '/stories/' },
  { label: 'Listen', href: '/listen/' },
  { label: 'Packages', href: '/packages/' },
  { label: 'For Photographers', href: '/photographers/' },
  { label: 'About', href: '/about/' },
  { label: 'Start Here', href: '/start/', primary: true },
];

/**
 * True when `href` is the page currently being rendered, for aria-current.
 * Compares on normalised trailing slashes so `/about` and `/about/` agree.
 */
export const isCurrent = (href: string, pathname: string): boolean => {
  const norm = (s: string) => (s.endsWith('/') ? s : s + '/');
  return norm(href) === norm(pathname);
};
