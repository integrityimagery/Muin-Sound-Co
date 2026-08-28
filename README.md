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

### The vine's motion

The vine grows on scroll: the stem draws, a tip leads the draw, and sprouts
unfurl behind it. Natively this is CSS scroll-driven animation
(`animation-timeline: scroll()/view()`) — no JavaScript, no per-frame work.

That only shipped in **Chrome 115, Firefox 144 and Safari 26**, so anything
older would have seen a finished vine and no motion at all. `Vine.astro`
carries a script fallback that writes the same values directly; it takes the
tip's position from `getPointAtLength` on the real path, so it needs no copy of
the curve. The native rules are `:not([data-vine-fallback])`-scoped so the two
never run together — a scroll-driven animation on `stroke-dashoffset` would
otherwise beat an inline style and fight it.

Append **`?vine-fallback`** to any URL to force the script path in a browser
that supports the native one. Because the two are mutually exclusive in CSS,
that is a faithful simulation, and `npm run test:a11y` asserts the two produce
the same thing.

### Known constraints

- The placeholder audio is WAV because this environment has no MP3 encoder.
  Real masters should be MP3 — the player takes any source.
- The vine's scroll-driven growth uses CSS scroll-driven animations. Where they
  are unsupported the vine renders fully drawn, which is the intended
  degradation. **Declare those animations with longhands, never the `animation`
  shorthand** — Lightning CSS merges the shorthand with `animation-timeline`
  into a single declaration that is invalid and gets dropped silently.
