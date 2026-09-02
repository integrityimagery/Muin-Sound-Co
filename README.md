# Muin Sound Co.

An entry page. It introduces the brand and offers exactly one choice: which
of three doors to walk through — Weddings, Parties, or Tabletop Gaming.

Plain static: `index.html`, `styles.css`, and no JavaScript at all. No
framework, no build step, no dependencies. This is deliberate — with a single
page there is nothing to share yet, so a build step would only slow down
iteration. Astro is deferred until a second page exists.

---

## Running it

Any static file server works, since there is no build:

```bash
python3 -m http.server 4321   # or `npx serve`, or open index.html directly
```

---

## Where things are

```
index.html          The whole page.
styles.css           Every rule, in one file.
assets/images/       Logo set (three themes) and the six door illustrations.
favicon.ico, favicon-32.png, apple-touch-icon.png
                      Generated from assets/images/cottagecore-2a-avatar.png.
.github/workflows/    A no-build GitHub Pages deploy.
```

## The doors

`assets/images/{weddings,parties,gaming}-{closed,open}.png` are the source
artwork the user supplied — the `-closed`/`-open` suffixes are the two states.
For display, each was resized to 600×800 (2× a 300×400 CSS box, the door's
approximate on-page size) and re-exported as WebP with an optimized PNG
fallback, served through `<picture>`. The originals were 1200×1600 — 4× more
resolution than the page ever shows, so resizing them cut total door-image
weight from ~1.26MB to ~330KB, most of the concrete performance win described
in the brief.

**Interaction**: both states are stacked in the same box; the closed image is
the base layer, the open image sits on top at `opacity: 0`, and hovering or
focusing the door link raises it to `1` over a 300ms transition — a cross-fade
rather than a hard `src` swap, so there's no flicker. Both states are
preloaded (closed at high priority, open at low) so the first hover doesn't
flash blank waiting on a fetch.

The hover effect is gated behind `@media (hover: hover) and (pointer: fine)`,
which is what keeps touch devices safe: there is no hover event on touch, so
nothing intercepts the tap, and the anchor's native behavior — navigate
immediately — is the only thing that happens. No JavaScript is involved, which
means there is no `preventDefault()` anywhere to accidentally leave a device
requiring a second tap.

Keyboard focus (`:focus-visible`) reveals the open state exactly like hover
does, on every device, and additionally shows a `--focus`-coloured outline —
distinct from hover, which shows no ring at all, only the artwork.

`prefers-reduced-motion: reduce` drops the transition to `0s`: the door still
changes state on hover/focus, it simply doesn't cross-fade to get there.

## Links

Door and footer links are relative with no leading slash (`href="weddings"`,
not `href="/weddings"`). There's no `CNAME` in this repo, so it's served from
a GitHub Pages *project* site at `/Muin-Sound-Co/`, not the domain root — an
absolute `/weddings` would resolve to the wrong place and 404 even once that
page exists. Relative paths resolve correctly at any depth, including if a
custom domain is added later, so there's no reason to prefer the absolute
form here.

**`weddings`, `parties`, `gaming`, and `about` are all intentionally
unbuilt.** They 404 today. That's correct for this pass — the brief is
explicit that stub pages should not be created ahead of the branch pages
they belong to.

## Deploying

`.github/workflows/deploy.yml` runs on push to `main` and to this feature
branch. It does not build anything — it stages an *allowlist* of the actual
site files (`index.html`, `styles.css`, the icons, `assets/`) into a clean
directory and hands that to GitHub Pages. The allowlist matters: uploading the
repo root as-is would include the `.git` directory that `actions/checkout`
leaves behind, publishing raw git internals as static files.

**One-time setup**, if not already done: repo **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

## Colours

Hearth & Dried Herb only, as custom properties on `:root` — nothing in the
stylesheet hardcodes a hex value outside that block. A second palette (for a
themed branch page later) is a matter of adding `[data-theme="..."]`
overrides and swapping a `data-theme` attribute on `<html>`; the CSS is
structured for that even though it isn't needed yet.

## Before launch

- [ ] Real contact email in the footer (currently `hello@example.com`,
      marked `PLACEHOLDER` in `index.html`)
- [ ] Real domain — `muinsound.co` is a placeholder used in the canonical
      link, Open Graph tags, and JSON-LD. Update all of them together.
- [ ] `sameAs` social profile URLs in the JSON-LD block, once real ones exist
      (deliberately omitted rather than filled with invented links)
- [ ] Build `weddings`, `parties`, `gaming`, and `about` — each currently 404s
