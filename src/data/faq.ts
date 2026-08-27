/**
 * FAQ content.
 *
 * Rendered as native <details>/<summary> disclosure AND emitted as
 * schema.org FAQPage. Google requires the structured data to mirror the
 * visible text exactly, which is why both read from this array.
 *
 * PLACEHOLDER — all seven answers are stand-in copy pending Robert's real
 * policies. Topics and structure are correct; wording is not final.
 */

export type FaqItem = { q: string; a: string };

export const faq: FaqItem[] = [
  {
    q: 'Do we have to be local to work with you?',
    a: 'No. Everything happens remotely. The consult is a video call, drafts arrive by email, and the finished files are delivered online. Couples anywhere can work with us, and most do.',
  },
  {
    q: 'How many revisions do we get?',
    a: 'Every package includes at least two rounds of revisions. In practice, the video consult does most of the work — when the song is built from your actual story, the first draft is usually close. PLACEHOLDER: confirm revision policy per tier.',
  },
  {
    q: 'How long does it take?',
    a: 'Plan on roughly X–X weeks from the video consult to the final files. Booking further ahead is better, but rush timelines are sometimes possible. PLACEHOLDER: confirm standard turnaround.',
  },
  {
    q: 'Can you write for a handfasting or a non-religious ceremony?',
    a: 'Yes, and often. Handfastings, humanist ceremonies, pagan and earth-centred rites, and entirely secular weddings are all regular work here. Nothing about the writing assumes a religious frame unless you want one.',
  },
  {
    q: 'What do you need from us?',
    a: 'One video conversation, an hour or so, about how you met and what you are actually promising each other. Beyond that: a few songs you both love, so the arrangement lands in a world you recognise. No writing homework.',
  },
  {
    q: 'Who owns the song?',
    a: 'You get unlimited personal use of your song forever — play it, share it, put it in your wedding film. Underlying composition rights stay with Muin Sound Co. PLACEHOLDER: confirm licensing and rights language with counsel before launch.',
  },
  {
    q: 'Do you take rush bookings?',
    a: 'Sometimes, depending on what is already on the calendar. A rush fee applies. Ask before you assume the answer is no — a short timeline is not automatically a problem.',
  },
];
