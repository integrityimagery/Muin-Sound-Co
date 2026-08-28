# Muin Sound Co.

Custom wedding songs, written from the couple's own story. Astro, static
output, no client framework.

Muin is the Ogham letter for vine — growth through connection, things that grow
stronger by intertwining. The logo's arch and foliage carry that; the page
layout itself is plain, one centred column.

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

### Page transitions

Navigating between pages fades the document out and lets the new one settle up
eight pixels — about a third of a second, once. **Cross-document view
transitions, declared in CSS**: `@view-transition { navigation: auto }`, no
router, no client-side JavaScript, no interception of clicks. The pages stay
ordinary documents that ordinary navigation loads. An SPA router would have
bought the same effect and taken on scroll restoration, focus management,
re-running every page script and keeping the back button honest — for fourteen
static pages.

Both documents have to opt in and both are served this stylesheet, so every
internal navigation transitions and every outbound link (a different origin)
simply does not. Where the browser lacks support, navigation is what it was:
instant. Chrome/Edge 126+ and Safari 18.2+ have it; Firefox's arrived later.

Three decisions carry it.

**The header is the one shared element.** It is fixed and identical on every
page, so it gets a `view-transition-name` and holds exactly still while the
page changes underneath. That single line is most of what makes this read as
composed rather than as a fade. The browser test asserts its viewport rect is
byte-identical either side of a navigation.

**The header cross-fades; the page below does not.** The header's two
snapshots are near-identical, so dissolving one into the other is invisible,
while fading it out and back would make the site's one fixed element blink on
every click. The page below is a *different* object, and cross-fading two
different layouts double-exposes them — at the midpoint you get one page's
display type printed through another's. It looked like a slideshow. So the
incoming page's delay is exactly the outgoing page's duration: no overlap, and
no blank pause either.

**The footer deliberately has no name.** Its position depends on page length,
so a shared footer would slide from wherever it sat on the old page to wherever
it sits on the new one — a long travel for an element you are navigating away
from.

One known behaviour: on the two navigations that change palette (into or out of
a story page in another theme), the ground switches to the destination's colour
at the start, so the outgoing page dissolves *into* the new palette rather than
out of its own. It reads as intentional in motion. Fixing it properly would
mean naming `main` as well, which brings the group's size morph and the
snapshot stretching that comes with it — not worth it for two routes.

Reduced motion switches it off at the source (`navigation: none`) rather than
speeding it up: `::view-transition-*` pseudo-elements live in their own tree,
so the blanket `*` rule in section 8 never reaches them.

**Browsers without view transitions** get the arrival on its own, as an
ordinary load animation on `main`, gated behind
`@supports not (view-transition-name: none)`. Half the effect, and it is the
half that carries the feeling — the exit fade needs a router to hold the old
page on screen, and this site does not have one. The gate is deliberately the
*property* and not the at-rule: `@supports at-rule(@view-transition)` would
itself be unrecognised in exactly the old browsers the fallback is for, so the
condition would be thrown out and the fallback would never apply.

**If you cannot see it**, in order of likelihood: your OS has Reduce Motion on
(the header collapse on scroll will also snap rather than ease — that is the
tell); the page was served from cache, so hard-reload; or the numbers were too
small. The first version shipped at 8px over 240ms, measured correctly, passed
every test, and was in practice invisible. It is now 22px over 420ms.

### Known constraints

- The placeholder audio is WAV because this environment has no MP3 encoder.
  Real masters should be MP3 — the player takes any source.
- The header collapse transitions `--mark-w`, a registered custom property, in
  a `transition` shorthand. That survives Lightning CSS, but a custom property
  in an *animation* shorthand did not: it merged `animation` with
  `animation-timeline` into something invalid and dropped it silently, with no
  build warning. If a transition or animation ever stops running for no visible
  reason, check the built CSS in `dist/_astro/` before checking anything else.
