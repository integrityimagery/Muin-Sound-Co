/**
 * Post-build audit of dist/.
 *
 * Checks the things this brief actually cares about and that a build succeeding
 * would not catch: heading hierarchy, unique metadata, structured data matching
 * visible text, no dead internal links, alt text, and the rule that no colour
 * is hardcoded outside the palette block.
 *
 * Run:  npm run audit   (after npm run build)
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { faq } from '../src/data/faq.ts';

const DIST = new URL('../dist', import.meta.url).pathname;
const SRC_CSS = new URL('../src/styles/global.css', import.meta.url).pathname;

/* On GitHub Pages the site lives at /<repo>/, so every emitted href carries
   that prefix while the files on disk do not. Strip it before resolving. */
const RAW_BASE = process.env.BASE_PATH ?? '/';
const BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;
const unbase = (href) =>
  BASE && href.startsWith(`${BASE}/`) ? href.slice(BASE.length) : href;

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  \x1b[31mFAIL\x1b[0m  ${msg}`);
};
const pass = (msg) => console.log(`  \x1b[32mPASS\x1b[0m  ${msg}`);

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const pages = walk(DIST)
  .filter((f) => f.endsWith('.html'))
  .map((f) => ({ path: f, rel: '/' + relative(DIST, f), html: readFileSync(f, 'utf8') }));

/* Strip HTML comments so commented-out markup never counts as real markup. */
const strip = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

console.log(`\n\x1b[1mAuditing ${pages.length} built pages\x1b[0m\n`);

/* --- 1. Unique, present title and description ----------------------------- */

console.log('\x1b[1mMetadata\x1b[0m');
{
  const titles = new Map();
  const descs = new Map();
  for (const p of pages) {
    const title = p.html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
    const desc = p.html.match(
      /<meta name="description" content="([\s\S]*?)"/
    )?.[1]?.trim();

    if (!title) fail(`${p.rel} has no <title>`);
    else if (titles.has(title)) fail(`${p.rel} duplicates the title of ${titles.get(title)}`);
    else titles.set(title, p.rel);

    if (!desc) fail(`${p.rel} has no meta description`);
    else if (descs.has(desc)) fail(`${p.rel} duplicates the description of ${descs.get(desc)}`);
    else descs.set(desc, p.rel);

    if (!p.html.includes('<link rel="canonical"')) fail(`${p.rel} has no canonical link`);
  }
  if (failures === 0) pass(`all ${pages.length} pages have a unique title, description and canonical`);
}

/* --- 2. Heading hierarchy -------------------------------------------------- */

console.log('\n\x1b[1mHeading hierarchy\x1b[0m');
{
  let bad = 0;
  for (const p of pages) {
    const levels = [...strip(p.html).matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    const h1s = levels.filter((l) => l === 1).length;
    if (h1s !== 1) {
      fail(`${p.rel} has ${h1s} <h1> elements (must be exactly 1)`);
      bad++;
    }
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        fail(`${p.rel} skips from h${levels[i - 1]} to h${levels[i]}`);
        bad++;
        break;
      }
    }
  }
  if (bad === 0) pass('every page has exactly one h1 and no skipped heading levels');
}

/* --- 3. Structured data ---------------------------------------------------- */

console.log('\n\x1b[1mStructured data\x1b[0m');
{
  let bad = 0;
  for (const p of pages) {
    const raw = p.html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
    )?.[1];
    if (!raw) {
      fail(`${p.rel} has no JSON-LD`);
      bad++;
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/\\u003c/g, '<'));
    } catch (e) {
      fail(`${p.rel} JSON-LD does not parse: ${e.message}`);
      bad++;
      continue;
    }

    const graph = parsed['@graph'] ?? [];
    const types = graph.map((n) => n['@type']);

    if (!types.includes('Organization')) {
      fail(`${p.rel} is missing Organization`);
      bad++;
    }

    // FAQPage must appear exactly where the FAQ is visible, and nowhere else.
    const faqVisible = strip(p.html).includes('class="faq"');
    const faqDeclared = types.includes('FAQPage');
    if (faqVisible !== faqDeclared) {
      fail(
        `${p.rel} FAQ mismatch: visible=${faqVisible} but FAQPage in JSON-LD=${faqDeclared}`
      );
      bad++;
    }

    if (faqDeclared) {
      const node = graph.find((n) => n['@type'] === 'FAQPage');
      const questions = node.mainEntity.map((q) => q.name);
      const expected = faq.map((f) => f.q);
      if (JSON.stringify(questions) !== JSON.stringify(expected)) {
        fail(`${p.rel} FAQPage questions do not match src/data/faq.ts`);
        bad++;
      }
      // Every declared answer must actually be on the page.
      for (const q of node.mainEntity) {
        const answer = q.acceptedAnswer.text;
        const needle = answer.slice(0, 40);
        if (!p.html.includes(needle.replace(/&/g, '&#38;'))
            && !p.html.includes(needle)) {
          fail(`${p.rel} declares an answer not present in the visible text: "${needle}…"`);
          bad++;
        }
      }
    }

    // No invented prices in structured data while priceLabel is a placeholder.
    const serviceNode = graph.find((n) => n['@type'] === 'Service');
    if (serviceNode) {
      const offers = serviceNode.hasOfferCatalog.itemListElement;
      for (const offer of offers) {
        if ('priceSpecification' in offer) {
          fail(`${p.rel} publishes a price for "${offer.name}" while prices are placeholders`);
          bad++;
        }
      }
    }
  }
  if (bad === 0)
    pass('JSON-LD parses, Organization on every page, FAQPage mirrors the visible FAQ exactly');
}

/* --- 4. Internal links resolve --------------------------------------------- */

console.log('\n\x1b[1mInternal links\x1b[0m');
{
  const seen = new Set();
  let bad = 0;
  for (const p of pages) {
    const hrefs = [...strip(p.html).matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]);
    for (const href of hrefs) {
      if (seen.has(href)) continue;
      seen.add(href);
      const local = unbase(href);
      const candidates = [
        join(DIST, local),
        join(DIST, local, 'index.html'),
        join(DIST, local.replace(/\/$/, '') + '.html'),
      ];
      if (!candidates.some((c) => existsSync(c))) {
        fail(`dead internal link: ${href} (first seen on ${p.rel})`);
        bad++;
      } else if (BASE && !href.startsWith(`${BASE}/`)) {
        fail(`link is missing the base path: ${href} (on ${p.rel})`);
        bad++;
      }
    }
  }
  if (bad === 0) pass(`all ${seen.size} distinct internal links resolve to a built file`);
}

/* --- 5. Images have alt text ----------------------------------------------- */

console.log('\n\x1b[1mImages\x1b[0m');
{
  let bad = 0;
  let count = 0;
  for (const p of pages) {
    for (const tag of strip(p.html).match(/<img\b[^>]*>/g) ?? []) {
      count++;
      const alt = tag.match(/\salt="([^"]*)"/);
      if (!alt) {
        fail(`${p.rel} has an <img> with no alt attribute`);
        bad++;
      } else if (alt[1].trim() === '') {
        fail(`${p.rel} has an <img> with empty alt (none here should be decorative)`);
        bad++;
      }
    }
  }
  if (bad === 0) pass(`all ${count} <img> elements carry non-empty alt text`);
}

/* --- 6. Audio is present and never autoplays -------------------------------- */

console.log('\n\x1b[1mAudio\x1b[0m');
{
  let bad = 0;
  let count = 0;
  for (const p of pages) {
    for (const tag of strip(p.html).match(/<audio\b[^>]*>/g) ?? []) {
      count++;
      if (/\bautoplay\b/.test(tag)) {
        fail(`${p.rel} has an autoplaying <audio> element`);
        bad++;
      }
      // Must ship usable without JS.
      if (!/\bcontrols\b/.test(tag)) {
        fail(`${p.rel} has an <audio> without native controls (breaks the no-JS fallback)`);
        bad++;
      }
      const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
      if (src && !existsSync(join(DIST, unbase(src)))) {
        fail(`${p.rel} references a missing audio file: ${src}`);
        bad++;
      }
    }
  }
  if (bad === 0)
    pass(`all ${count} <audio> elements ship native controls, resolve, and never autoplay`);
}

/* --- 7. Themes -------------------------------------------------------------- */

console.log('\n\x1b[1mThemes\x1b[0m');
{
  let bad = 0;
  const expected = {
    '/stories/the-woods-called/index.html': 'grove',
    '/stories/the-defiant-ones/index.html': 'plum',
    '/stories/the-loud-ones/index.html': 'plum',
    '/stories/the-quiet-ones/index.html': 'hearth',
    '/stories/the-long-haul/index.html': 'hearth',
    '/stories/been-through-something/index.html': 'hearth',
  };
  for (const p of pages) {
    const theme = p.html.match(/<html[^>]*data-theme="([^"]+)"/)?.[1];
    if (!theme) {
      fail(`${p.rel} has no data-theme on <html>`);
      bad++;
      continue;
    }
    if (!['hearth', 'plum', 'grove'].includes(theme)) {
      fail(`${p.rel} has unknown theme "${theme}"`);
      bad++;
    }
    if (expected[p.rel] && expected[p.rel] !== theme) {
      fail(`${p.rel} should be ${expected[p.rel]} but is ${theme}`);
      bad++;
    }
    // The logo must be the variant belonging to that theme, or it will be
    // illegible on its own ground.
    const set = { hearth: 'cottagecore', plum: 'whimsigoth', grove: 'woodland' }[theme];
    const marks = [...p.html.matchAll(/<img[^>]+src="([^"]*(?:cottagecore|whimsigoth|woodland)[^"]*)"/g)];
    for (const [, src] of marks) {
      if (!src.includes(set)) {
        fail(`${p.rel} (theme ${theme}) uses the wrong logo variant: ${src}`);
        bad++;
      }
    }
  }
  if (bad === 0) pass('every page declares a valid theme and uses that theme’s logo artwork');
}

/* --- 8. No hardcoded colour outside the palette block ---------------------- */

console.log('\n\x1b[1mStylesheet discipline\x1b[0m');
{
  const css = readFileSync(SRC_CSS, 'utf8').split('\n');
  let inPalette = false;
  let depth = 0;
  let bad = 0;

  css.forEach((line, i) => {
    // Palette blocks are the selectors that define the theme variables.
    if (/^(:root,|:root \{|:root,$|\[data-theme=)/.test(line.trim())) inPalette = true;
    if (inPalette) {
      depth += (line.match(/\{/g) ?? []).length;
      depth -= (line.match(/\}/g) ?? []).length;
      if (depth <= 0 && line.includes('}')) {
        inPalette = false;
        depth = 0;
      }
      return;
    }
    if (/#[0-9a-fA-F]{3,8}\b/.test(line)) {
      fail(`global.css:${i + 1} hardcodes a colour outside the palette: ${line.trim()}`);
      bad++;
    }
  });
  if (bad === 0) pass('no hex colour appears outside the three palette blocks');
}

/* --- Result ----------------------------------------------------------------- */

console.log(
  failures === 0
    ? '\n\x1b[32mAudit passed.\x1b[0m\n'
    : `\n\x1b[31mAudit failed: ${failures} problem(s).\x1b[0m\n`
);
process.exit(failures === 0 ? 0 : 1);
