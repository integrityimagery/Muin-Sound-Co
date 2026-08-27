/**
 * Sample tracks.
 *
 * The written description and lyric excerpt are load-bearing, not decoration:
 * crawlers cannot hear audio, so the text around the player is the only thing
 * that tells a search engine what these songs are.
 *
 * PLACEHOLDER — titles are deliberately descriptive of STYLE rather than
 * song-like, so none of them can be mistaken for a real couple's song. Audio
 * files are synthesised placeholders; replace with real masters.
 */

export type Track = {
  id: string;
  /** Deliberately a description, not a song title. */
  title: string;
  /** Style and instrumentation, in prose. */
  description: string;
  /** Short excerpt shown as text so it is indexable. */
  lyric: string;
  /** Path under /public. PLACEHOLDER audio. */
  src: string;
  /** Human-readable duration, shown before the audio loads. */
  duration: string;
};

export const tracks: Track[] = [
  {
    id: 'sample-ceremony',
    title: 'Sample: fingerpicked ceremony song',
    description:
      'Nylon-string guitar, upright bass, and a single close-mic’d vocal. Written to be walked to — steady, unhurried, no percussion until the last third. The kind of arrangement that sits under an outdoor ceremony without competing with the wind.',
    lyric:
      '“And I did not know the word for it then, / only that the ground held, / only that you were standing on it too.”',
    src: '/audio/placeholder-ceremony.wav',
    duration: '0:14',
  },
  {
    id: 'sample-celebration',
    title: 'Sample: full-band celebration song',
    description:
      'Drums, electric bass, layered acoustic guitars and a small vocal choir on the last chorus. Built for the room after dinner — it lifts twice and does not come back down.',
    lyric:
      '“Call the whole crooked lot of them in, / every one who carried us here — / there is floor enough.”',
    src: '/audio/placeholder-celebration.wav',
    duration: '0:13',
  },
  {
    id: 'sample-quiet',
    title: 'Sample: quiet first-dance song',
    description:
      'Felted upright piano, a single cello line, and room tone left in. Almost no arrangement — the space is the point. Written for couples who want the song to be smaller than the moment, not bigger.',
    lyric:
      '“You said it plainly, / the way you say everything, / and that is how I knew you meant it.”',
    src: '/audio/placeholder-quiet.wav',
    duration: '0:13',
  },
];

/** The one track that plays in the homepage hero. */
export const heroTrack = tracks[0];
