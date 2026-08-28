# Muin Sound Co.

Custom wedding songs, written from the couple's own story. Astro, static
output, no client framework.

Muin is the Ogham letter for vine — growth through connection, things that grow
stronger by intertwining. That idea drives the layout, not just the About copy.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:4321
npm run verify       # contrast + types + build + post-build audit
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Static build to `dist/` |
| `npm run preview` | Serve the build |
| `npm run check` | `astro check` — TypeScript and template diagnostics |
| `npm run contrast` | WCAG contrast math over all three palettes |
| `npm run audit` | Post-build audit of `dist/` (needs a build first) |
| `npm run test:a11y` | Browser behaviour tests (needs `npm run preview` running) |
| `npm run verify` | The first four, in order |
| `PREVIEW_BASE=... npm run test:a11y` | Point the browser tests at another origin |
| `npm run audio` | Regenerates the placeholder audio |

---

## Deploying

Pushes to `main` (or the current feature branch) build and publish to GitHub
Pages via `.github/workflows/deploy.yml`. The workflow runs `contrast`, `check`
and `audit` first, so a contrast regression or a dead link fails the deploy
rather than shipping.

**One-time setup:** repo **Settings → Pages → Build and deployment → Source:
GitHub Actions**. Nothing else to configure — the workflow derives the URL and
base path from the repository itself.

### Base paths

Pages serves this as a *project site*, at `/<repo>/` rather than the domain
root. Astro rewrites the URLs it generates (routes, imported images), but not
paths written by hand — those would work in local dev and 404 after deploy,
which is the worst kind of bug to catch late. Two things close that gap:

- `src/lib/paths.ts` — `withBase()`, for every hand-written `href` and every
  `/public` asset path (the audio files).
- The `rehypeBasePaths` plugin in `astro.config.mjs` — for internal links in
  markdown body copy, so `[video consult](/start/)` keeps working.

`npm run audit` fails if any internal link is missing the base, so this cannot
silently regress. With no base configured both are no-ops and local dev is
unaffected.

Moving to a custom domain later: set the domain in repo settings, add a
`public/CNAME`, and the base becomes `/` — no source changes needed.

---

## Where things are

```
assets/images/          Logo artwork. Three complete sets, one per theme.
public/audio/           PLACEHOLDER audio. Replace before launch.
src/data/               Brand facts, packages, FAQ, tracks, themes, stories.
src/styles/global.css   Reset, palettes, type scale, layout, components.
src/layouts/            Shell + the four layouts.
src/components/         Shared pieces.
src/content/stories/    Story pages, one markdown file each.
scripts/                Verification and asset generation.
```

`src/data/*` is the single source of truth. The visible page and the JSON-LD
both read from it, so structured data cannot drift from what the page says.

---

## The layout system

Four layouts. Every page uses exactly one. `Shell` sits under all four and owns
`<head>`, the header, the footer and the theme attributes.

| Layout | Used by |
|---|---|
| `Base` | About, Packages, For Photographers, Start Here, Stories index, 404 |
| `Story` | `/stories/*` |
| `Listen` | `/listen` — wider content column for track cards |
| `Home` | `/` |

### Adding a story page

Create one markdown file in `src/content/stories/`:

```yaml
---
theme: grove          # hearth | plum | grove
hero: photo           # photo | type | audio
weight: standard      # loud | standard | quiet
song:                 # optional
  src: /audio/your-song.mp3
  title: Song title
  description: Style and instrumentation, in prose.
  lyric: A short excerpt, as text.

title: The page heading
description: Unique meta description.
lede: One or two sentences under the heading.
---

Body copy in markdown.
```

That is the whole job. The schema in `src/content.config.ts` is a
`z.strictObject`, so **any frontmatter key not declared there fails the build**
with the offending file named. That is deliberate — the four knobs are the
constraint that keeps a new story page a twenty-minute job instead of a design
project. Adding a fifth is a reviewable edit to that schema, not something that
happens by accident.

---

## Themes

Three palettes, set with `data-theme` on `<html>`. Every colour in the
stylesheet goes through a custom property, so a theme swap repaints everything.
`npm run audit` fails the build if a hex value appears outside the palette
block.

**A theme is a palette AND a logo.** The three supplied logo sets are drawn for
their own grounds and are illegible on the others — the whimsigoth lockup has a
cream wordmark that vanishes on parchment, and the cottagecore lockup is dark
brown, which vanishes on near-black plum. `src/data/themes.ts` maps theme to
artwork. No file is ever recoloured; this selects between supplied variants.

| Theme | Palette | Logo set |
|---|---|---|
| `hearth` | Hearth & Dried Herb (default, light) | `cottagecore-2a-*` |
| `plum` | Plum & Starlight (dark) | `whimsigoth-1b-*` |
| `grove` | Enchanted Twilight Grove (light) | `woodland-3c-*` |

There is no `prefers-color-scheme` switching. These are editorial choices per
story, not a user setting.

---

## Accessibility

`npm run contrast` does real relative-luminance math over all three palettes:
51 enforced pairings, plus type-size floors for the `weight` knob. It exits
non-zero on failure. `npm run test:a11y` drives a real browser to check focus
trapping, Escape handling, keyboard audio operation, the no-JS fallback and
reduced motion.

Two things are load-bearing and easy to break by accident:

- **`outline-offset` on the focus ring.** It puts the ring on whatever the
  control sits on, never on the control's own fill. `--focus` is verified
  against the page and card grounds; against a rust or grove-green button fill
  it would measure 1.7:1 and 1.3:1. Primary buttons carry a second inner ring
  in `--btn-text` so the indicator is separated from the fill on any ground.
- **Card borders, not card fills.** Surfaces sit ~1.08:1 against the page by
  design, so the fill cannot delineate a card. `--border` does that work, which
  is why it is enforced at 3:1 rather than treated as decoration.

Disabled controls sit at ~2.8:1 in all three palettes. WCAG explicitly exempts
them, and a disabled button that met 4.5:1 would not read as disabled — so the
state is never signalled by colour alone: disabled controls carry the native
`disabled` attribute, `cursor: not-allowed`, and a flattened border.

---

## Before launch

Search the codebase for `PLACEHOLDER`. Every stand-in is marked.

- [ ] Real domain in `astro.config.mjs` and `src/data/site.ts`
- [ ] Real contact email and social URLs (these become `sameAs` in JSON-LD —
      a dead URL there publishes a false claim)
- [ ] Real prices in `src/data/packages.ts`. Set `priceValue` alongside
      `priceLabel`; while it is `null` no price is emitted to structured data,
      which is intentional — publishing an invented number would be publishing
      a false claim. `npm run audit` enforces this.
- [ ] Real FAQ answers in `src/data/faq.ts`, especially rights and licensing
- [ ] Real turnaround time (currently `X–X weeks` in three places)
- [ ] Real testimonials, replacing the marked slots on the homepage
- [ ] Real photography, passed as `photo.src` + `photo.alt` in story
      frontmatter. Until then `PlaceholderFigure` renders a marked panel at the
      right aspect ratio rather than stock imagery.
- [ ] Real audio as MP3, replacing `public/audio/placeholder-*.wav`, and update
      `src/data/tracks.ts`

### The header

One header on every page, including the story pages: **links, mark, links** in
a single row, vertically centred on each other, collapsing to the wordmark on
scroll without moving anything below it.

Two details are load-bearing.

**It is `position: fixed` with a measured spacer, not `position: sticky`.** A
sticky header is still in the document flow, so shrinking it on scroll pulls
everything below it up by the difference — a ~230px lurch mid-scroll that no
amount of easing disguises. Out of flow with a constant-height spacer, the
collapse moves nothing but the header. **Never give `.site-header` a
`transform`**: a transformed ancestor becomes the containing block for
`position: fixed` descendants, which would break the off-canvas mobile menu
nested inside it.

**The row is two grids with an identical template, not a grid and a subgrid.**
The mark and the nav are siblings, and the nav has to keep its own box — it is
the navigation landmark, and `display: contents` on a landmark is exactly the
kind of thing that has historically dropped it out of the accessibility tree.
So the nav is laid over the same row as the mark, spanning the full width, with
the same three columns; its middle column is empty and the mark sits in the
header grid's. Both templates use `--mark-w` for that column and the same
`--header-gap`, so they agree to the pixel — and keep agreeing through the
collapse, since `--mark-w` is a registered property that transitions.

The nav items are split into two lists rather than duplicated, so reading order
is left group then right group, which is the visual order. The split point is
derived (`Math.ceil(nav.length / 2)`), so a seventh item rebalances the header
instead of quietly lopsiding it.

Three measurements — `--mark-w`, `--header-gap` and the nav's own item gap —
are tuned together against one constraint: at 900px, where the side-by-side
layout starts, the heavier group (For Photographers / About / Start Here) has
to fit its column on one line. Widen any of them and it wraps, costing ~50px of
header and leaving one side two lines deep and the other one.
`npm run test:a11y` re-measures this at four widths, on two page types, in both
states, and also reads Chromium's own accessibility tree over CDP to confirm
the split nav is still a single `navigation` landmark with all six links inside
it.

Below 900px the whole navigation is one hamburger, so there is nothing to seat
either side of the mark — but the arrangement is the same idea: mark centred,
nav beside it, the two vertically centred. Stacking the hamburger under the
wordmark instead pushed the collapsed header to 16% of a 360x640 screen, over
the brief's 15% budget.

### The vine's motion

**The stem is always there. Only the leaves grow**, opening as you reach them
and staying open. One `IntersectionObserver` in `Vine.astro` drives it, and the
rule is one sentence: a leaf opens once its top has passed 82% of the viewport
height.

It went through two earlier versions, and both failed the same way, which is
worth writing down because it is not obvious.

- **CSS scroll-driven animation** (`animation-timeline: scroll()/view()`) is
  the cheap, correct-looking answer. It shipped in Chrome 115, Firefox 144 and
  Safari 26; everywhere older the vine simply never moved.
- **A script on a scroll clock** fixed the support gap and not the real
  problem: the stem's length is the *page's* length. Tie the clock to the
  document and a short page arrives finished; tie it to the vine and the same
  scroll gesture grows a different amount on every page. `/about/` opened all
  eighteen leaves before you touched the wheel.

A leaf has no such problem — it is a fixed point in the page, and "open when
you reach it" means the same thing on the homepage as on a two-paragraph stub.
So the stem stopped animating and the growth moved entirely into the foliage.

One trap, since it looks like the observer alone should be enough: with
`threshold: 0`, an entry is queued only when `isIntersecting` **changes**. Jump
the viewport past a leaf in one go — End, a fragment link, a flung trackpad —
and it goes from below the root box to above it without ever being inside one:
no state change, no callback, and a leaf you have scrolled well past sits there
furled. On the homepage that left 14 of 24 shut at the foot of the page. The
observer is therefore the *cue*, not the rule: every callback re-checks every
leaf still waiting.

### Every leaf is generated

`Vine.astro` draws each leaf to order — outline, size, angle, which strand it
grows from, how fast it opens. Eighteen copies of one drawing at three angles
looked stamped. The blade is built along an axis rather than written out as a
path, so its two edges, its vein and its stalk stay in register: a broader or
more upswept leaf is still recognisably the same plant.

The randomness is seeded (`SEED` at the top of the file), not `Math.random()`.
It is a design tool, so it should be a fixed one — the same vine ships from
every build, it is reviewable in a diff, and the tests can assert against it.
Change `SEED` to deal a new hand.

Density is thinned at runtime rather than fixed at build time, because the vine
is as long as its page: one fixed set of leaves is a thicket on a stub and a
bare wire on the homepage. Leaves are dropped until no two are closer than 72px,
so the spacing is a property of the design and not of how much copy a page
happens to carry.

`npm run test:a11y` checks nine routes: every leaf you have reached is open,
none opens before you reach it, growth never runs backwards, and the vine is
fully leafed at the foot of every page. It also checks the variety itself —
that no two leaves share an outline, that both strands are used, and that sizes,
angles and timings differ — because a bug that collapsed any of that to a
constant would leave the vine working and looking stamped, which nothing else
would catch.

Without JavaScript, and under `prefers-reduced-motion`, the growth is never
armed and the CSS leaves the vine complete and still — a whole picture, just
not an animated one.

### Known constraints

- The placeholder audio is WAV because this environment has no MP3 encoder.
  Real masters should be MP3 — the player takes any source.
- **Declare the leaves' transitions with longhands, never the `transition`
  shorthand.** Lightning CSS folds a shorthand into one declaration, and a
  custom property named inside it (`--grow`, `--tuck`) is not reliably carried
  through — the same silent drop that took out the earlier scroll-driven
  animations, where it merged `animation` with `animation-timeline` into
  something invalid and discarded it without a word.
