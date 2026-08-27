/**
 * Theme registry.
 *
 * A theme is a palette AND a logo. The three supplied logo sets are drawn in
 * colours that only work on their matching ground — the whimsigoth lockup has
 * a cream wordmark that vanishes on parchment, and the cottagecore lockup is
 * dark brown, which vanishes on near-black plum. So selecting a theme must
 * select its artwork too.
 *
 * No file is ever recoloured. This picks between supplied variants.
 */

import cottagecoreLockup from '../../assets/images/cottagecore-2a-lockup.png';
import cottagecoreWordmark from '../../assets/images/cottagecore-2a-wordmark.png';
import cottagecoreAvatar from '../../assets/images/cottagecore-2a-avatar.png';

import whimsigothLockup from '../../assets/images/whimsigoth-1b-lockup.png';
import whimsigothWordmark from '../../assets/images/whimsigoth-1b-wordmark.png';
import whimsigothAvatar from '../../assets/images/whimsigoth-1b-avatar.png';

import woodlandLockup from '../../assets/images/woodland-3c-lockup.png';
import woodlandWordmark from '../../assets/images/woodland-3c-wordmark.png';
import woodlandAvatar from '../../assets/images/woodland-3c-avatar.png';

export const THEMES = ['hearth', 'plum', 'grove'] as const;
export type Theme = (typeof THEMES)[number];

export const themes = {
  hearth: {
    label: 'Hearth & Dried Herb',
    /** Drives <meta name="theme-color"> and the browser UI. */
    pageColor: '#F6EEDD',
    colorScheme: 'light',
    lockup: cottagecoreLockup,
    wordmark: cottagecoreWordmark,
    avatar: cottagecoreAvatar,
  },
  plum: {
    label: 'Plum & Starlight',
    pageColor: '#1C1220',
    colorScheme: 'dark',
    lockup: whimsigothLockup,
    wordmark: whimsigothWordmark,
    avatar: whimsigothAvatar,
  },
  grove: {
    label: 'Enchanted Twilight Grove',
    pageColor: '#E4E9DA',
    colorScheme: 'light',
    lockup: woodlandLockup,
    wordmark: woodlandWordmark,
    avatar: woodlandAvatar,
  },
} as const satisfies Record<
  Theme,
  {
    label: string;
    pageColor: string;
    colorScheme: 'light' | 'dark';
    lockup: ImageMetadata;
    wordmark: ImageMetadata;
    avatar: ImageMetadata;
  }
>;

export const DEFAULT_THEME: Theme = 'hearth';
