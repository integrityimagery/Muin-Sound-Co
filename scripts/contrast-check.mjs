/**
 * WCAG 2.1 contrast verification for the three Muin Sound Co. palettes.
 *
 * This is real relative-luminance math, not eyeballing. It runs via
 * `npm run contrast` and exits non-zero on any REQUIRED failure, so a palette
 * edit that breaks accessibility fails loudly instead of shipping.
 *
 * Thresholds (WCAG 2.1):
 *   1.4.3  4.5:1  normal body text
 *   1.4.3  3.0:1  large text (>=24px regular, or >=18.66px bold)
 *   1.4.11 3.0:1  non-text UI: borders, focus indicators, meaningful graphics
 *
 * Some pairings are deliberately reported as EXEMPT or INFO rather than
 * enforced. Each one says why. Nothing is exempted for convenience.
 */

const srgbToLinear = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const luminance = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
  );
};

const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/* ------------------------------------------------------------------ */
/* The palettes. These MUST stay in sync with src/styles/global.css.   */
/* ------------------------------------------------------------------ */

const palettes = {
  'Hearth & Dried Herb (default, light)': {
    bg: '#F6EEDD',
    surface: '#FBF6EC',
    text: '#3E2A18',
    muted: '#6B5238',
    heading: '#5A3A24',
    link: '#8A4A1E',
    btnBg: '#A8461E',
    btnText: '#FBF6EC',
    btnHoverBg: '#8A3616',
    border: '#8A6E42',
    focus: '#5A3A24',
    disabledBg: '#D8C9A8',
    disabledText: '#8A7454',
    // Introduced by this build (the signature vine), sampled from the
    // cottagecore logo art so mark and vine agree.
    vineStem: '#5A3A24',
    vineLeaf: '#5F7247',
  },
  'Plum & Starlight (dark)': {
    bg: '#1C1220',
    surface: '#251A2B',
    text: '#EFE6D6',
    muted: '#B9ACC4',
    heading: '#EFE6D6',
    link: '#C9A85E',
    btnBg: '#8B4A6E',
    btnText: '#EFE6D6',
    btnHoverBg: '#753D5C',
    // Brief specified #7A5C87. That measures 2.94:1 on the card surface —
    // just under the 3:1 non-text minimum. Lightened the minimum amount
    // needed to clear it on BOTH grounds; the shift is imperceptible.
    border: '#836790',
    focus: '#D9BE7E',
    disabledBg: '#4A3654',
    disabledText: '#8C7B9E',
    vineStem: '#D8CDB8',
    vineLeaf: '#A85B85',
  },
  'Enchanted Twilight Grove (light)': {
    bg: '#E4E9DA',
    surface: '#EEF1E6',
    text: '#26331F',
    muted: '#4E5C44',
    heading: '#2E3D28',
    link: '#5C3D7E',
    btnBg: '#3E5033',
    btnText: '#EEF1E6',
    btnHoverBg: '#2E4026',
    border: '#5E7A52',
    focus: '#2E3D28',
    disabledBg: '#C9D0BE',
    disabledText: '#6E7C60',
    vineStem: '#2E3D28',
    vineLeaf: '#6A4F94',
  },
};

/* ------------------------------------------------------------------ */
/* Every pairing the stylesheet can actually produce.                  */
/* [label, foreground, background, minRatio, level]                    */
/*   REQUIRED -> failure exits non-zero                                */
/*   EXEMPT   -> WCAG does not apply; reported for visibility only      */
/*   INFO     -> measured for design awareness, not a conformance test  */
/* ------------------------------------------------------------------ */

const R = 'REQUIRED';
const E = 'EXEMPT';
const I = 'INFO';

const pairings = (p) => [
  // --- Text, 4.5:1. Checked on BOTH page and card grounds, because the
  // brief's tables only cover page bg and every card re-tests here.
  ['body text on page bg', p.text, p.bg, 4.5, R],
  ['body text on surface', p.text, p.surface, 4.5, R],
  ['muted text on page bg', p.muted, p.bg, 4.5, R],
  ['muted text on surface', p.muted, p.surface, 4.5, R],
  ['heading on page bg', p.heading, p.bg, 4.5, R],
  ['heading on surface', p.heading, p.surface, 4.5, R],
  ['link on page bg', p.link, p.bg, 4.5, R],
  ['link on surface', p.link, p.surface, 4.5, R],

  // --- Buttons. Labels are normal-size text, so 4.5:1, not 3:1.
  ['button text on button bg', p.btnText, p.btnBg, 4.5, R],
  ['button text on button hover bg', p.btnText, p.btnHoverBg, 4.5, R],

  // --- Focus indicator.
  //
  // The focus ring is drawn with `outline-offset`, so it lands on whatever
  // the button SITS ON, never on the button fill. Those are the two grounds
  // that matter, and both are enforced.
  //
  // Testing focus-vs-button-fill would be testing a pairing the CSS never
  // renders: in hearth that reads 1.72:1 and in grove 1.32:1, which is
  // exactly why the offset is mandatory rather than cosmetic. Primary
  // buttons additionally carry an inner ring in --btn-text, asserted below,
  // so the indicator is separated from the fill on any ground whatsoever.
  ['focus ring on page bg', p.focus, p.bg, 3, R],
  ['focus ring on surface', p.focus, p.surface, 3, R],
  ['inner focus ring on button fill', p.btnText, p.btnBg, 3, R],

  // --- Other non-text UI, 3:1.
  ['border on page bg', p.border, p.bg, 3, R],
  ['border on surface', p.border, p.surface, 3, R],
  ['vine stem on page bg', p.vineStem, p.bg, 3, R],
  ['vine leaf on page bg', p.vineLeaf, p.bg, 3, R],

  // --- Disabled controls.
  //
  // WCAG 1.4.3 and 1.4.11 both explicitly exempt disabled/inactive controls.
  // These land ~2.8:1 in all three palettes, which is the supplied palette
  // working as intended: a disabled button that met 4.5:1 would not read as
  // disabled. Left at the briefed values on purpose.
  //
  // Because the state therefore IS signalled partly by colour, the CSS never
  // relies on colour alone for it: disabled controls carry the native
  // `disabled` attribute (announced by assistive tech), `cursor: not-allowed`,
  // and a flattened border.
  ['disabled text on disabled bg', p.disabledText, p.disabledBg, 4.5, E],

  // --- Card fill against page fill.
  //
  // Deliberately near-identical parchment tones (~1.08:1). No WCAG rule
  // covers this, but it means a card's FILL cannot delineate it — the
  // double-hairline border does that work, and that border is enforced
  // above at 3:1. Measured here so the dependency stays visible.
  ['surface fill vs page fill', p.surface, p.bg, 1.0, I],
];

/* ------------------------------------------------------------------ */

let failures = 0;
const counts = { REQUIRED: 0, EXEMPT: 0, INFO: 0 };
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));

const mark = (ok, level) => {
  if (level === R) return ok ? '\x1b[32mPASS\x1b[0m  ' : '\x1b[31mFAIL\x1b[0m  ';
  if (level === E) return '\x1b[33mEXEMPT\x1b[0m';
  return '\x1b[36mINFO\x1b[0m  ';
};

for (const [name, p] of Object.entries(palettes)) {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
  for (const [label, fg, bg, min, level] of pairings(p)) {
    const ratio = contrast(fg, bg);
    const ok = ratio >= min;
    counts[level]++;
    if (level === R && !ok) failures++;
    const need = level === R ? `needs ${min}:1` : level === E ? 'not required' : 'measured';
    console.log(
      `  ${mark(ok, level)}${pad(label, 33)} ${pad(ratio.toFixed(2) + ':1', 9)} (${pad(need, 12)}) ${fg} on ${bg}`
    );
  }
}

/* ------------------------------------------------------------------ */
/* Type-size guard for the story `weight` knob.                        */
/*                                                                     */
/* The knob rescales display type, so heading sizes must be re-checked  */
/* after scaling. Every heading and body colour above clears 4.5:1      */
/* outright, so none of them fall back to the 3:1 large-text threshold  */
/* and none are size-dependent — which is what makes the knob safe.     */
/* What still needs guarding is the floor: `quiet` must not shrink body */
/* copy, and no heading may end up smaller than the body it leads.      */
/* Values mirror src/styles/global.css.                                 */
/* ------------------------------------------------------------------ */

const weights = {
  loud: { bodyPx: 17, minHeadingPx: 25.6 },
  standard: { bodyPx: 17, minHeadingPx: 22.4 },
  quiet: { bodyPx: 17, minHeadingPx: 20.8 },
};

console.log('\n\x1b[1mType-size floors (story `weight` knob)\x1b[0m');
for (const [weight, v] of Object.entries(weights)) {
  const bodyOk = v.bodyPx >= 16;
  const headOk = v.minHeadingPx > v.bodyPx;
  if (!bodyOk || !headOk) failures++;
  console.log(
    `  ${mark(bodyOk && headOk, R)}weight="${pad(weight + '"', 11)} body ${v.bodyPx}px (floor 16px), smallest heading ${v.minHeadingPx}px`
  );
}

console.log(
  `\n${counts.REQUIRED * 1} enforced, ${counts.EXEMPT} exempt, ${counts.INFO} informational.`
);
console.log(
  failures === 0
    ? '\x1b[32mAll required contrast and type-size checks passed.\x1b[0m\n'
    : `\x1b[31m${failures} required check(s) failed.\x1b[0m\n`
);
process.exit(failures === 0 ? 0 : 1);
