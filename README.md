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
robots.txt            Fully open, points at sitemap.xml.
sitemap.xml           One URL — the only page that exists.
llms.txt              A short, honest summary for AI agents/crawlers.
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

**Alt text**: each `<img>` carries a real, descriptive `alt` (e.g. *"An
arched double door twined with a rose vine, a WEDDINGS sign above it,
closed"*) rather than an empty one — this is for image search and anyone
inspecting the image directly, and it's safe to add precisely because the
enclosing `<a>` already has `aria-label="Weddings"`. Per the accessible-name
computation, `aria-label` on an ancestor link fully overrides any descendant
image's `alt` when the browser works out what to announce — so the link
still reads as a clean "Weddings, link" to a screen reader; verified against
the accessibility tree, not assumed. The six alt strings are all distinct
(closed and open states describe what's actually different between them)
and none of them just repeats "Weddings"/"Parties"/"Gaming" — axe-core's
`image-redundant-alt` rule checks exactly that, and passes.

## The statement

`max-width: 63ch` on the `<h1>` is not a guess — it's the smallest width
(with a margin for font-metric differences) that breaks the actual copy to
two lines rather than three, measured in a real browser by counting the
statement's rendered `getClientRects()`. It holds two lines from 600px
viewports up through desktop. `max-width` only ever caps a line, never forces
one, so on a phone the same rule just wraps within whatever space is actually
there (three lines at 390px and below) — there's no readable font size that
fits this sentence on two lines at 360px, so that's the expected, accepted
outcome rather than something to keep chasing.

Weight is 400 (Fraunces has no true "thin" instance in the static weights
Google Fonts serves at the `opsz` range used here — 400 is its lightest).
The Google Fonts request itself was trimmed to exactly the weights in use:
Fraunces 600 and Alegreya Sans 700 were being requested for the old footer
text, which no longer exists, so both were dropped.

## The footer

Wordmark only, no text and no links — `assets/images/cottagecore-2a-wordmark`
(webp + png via `<picture>`, same pattern as the doors). It carries a
non-empty `alt="Muin Sound Co."`: with the top-of-page lockup gone, this is
now the *only* place the business name appears anywhere in the page's visible
or accessible content (the `<title>`, meta description, and JSON-LD still
carry it, but none of those are page content a reader encounters).

## Links

The three door links are relative with no leading slash (`href="weddings"`,
not `href="/weddings"`). There's no `CNAME` in this repo, so it's served from
a GitHub Pages *project* site at `/Muin-Sound-Co/`, not the domain root — an
absolute `/weddings` would resolve to the wrong place and 404 even once that
page exists. Relative paths resolve correctly at any depth, including if a
custom domain is added later, so there's no reason to prefer the absolute
form here.

**`weddings`, `parties`, and `gaming` are all intentionally unbuilt.** They
404 today. That's correct for this pass — the brief is explicit that stub
pages should not be created ahead of the branch pages they belong to.

There is currently no link to `/about` anywhere on the page — the footer that
used to carry it was replaced with the wordmark, which isn't a link (there is
nowhere else on the site for it to usefully point to yet).

## Deploying

`.github/workflows/deploy.yml` runs on push to `main` and to this feature
branch. It does not build anything — it stages an *allowlist* of the actual
site files (`index.html`, `styles.css`, the icons, `assets/`) into a clean
directory and hands that to GitHub Pages. The allowlist matters: uploading the
repo root as-is would include the `.git` directory that `actions/checkout`
leaves behind, publishing raw git internals as static files.

**One-time setup**, if not already done: repo **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

## Accessibility

Audited with [axe-core](https://github.com/dequelabs/axe-core) against every
WCAG 2.0/2.1/2.2 A and AA rule plus its best-practice set: **zero
violations, zero items needing manual review, 30 rules passed.** That
includes `color-contrast`, `target-size` (WCAG 2.5.8's 24×24px minimum —
the doors are ~300×400px, nowhere close to a concern), and `bypass` (no skip
link exists, and none is missing one: there is no repeated navigation block
on this page for a skip link to skip past).

To reproduce:

```bash
npm install axe-core --no-save   # sandboxed install, nothing committed
node -e "
const { chromium } = require('playwright');
const { readFileSync } = require('fs');
(async () => {
  const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:4321/');  // npm run-free: python3 -m http.server 4321
  await p.addScriptTag({ content: axe });
  const r = await p.evaluate(() => axe.run());
  console.log(r.violations);
  await b.close();
})();
"
```

Also verified directly against the accessibility tree (`page.accessibility.snapshot()`,
Playwright), not just axe's DOM-level checks:

- **Landmarks**: exactly one `main`, one `nav` (named "Choose your
  occasion"), one `contentinfo` — nothing on the page sits outside one of
  the three, other than the `aria-hidden` decorative frame.
- **Tab order**: Weddings → Parties → Gaming. Nothing else is
  focusable — the frame's SVGs have no interactive children, and the footer
  wordmark is a plain image, not a link.
- **Reflow**: no horizontal scroll at 320px CSS width, the WCAG 1.4.10
  benchmark (400% zoom on a 1280px viewport).
- **Reduced motion**: the door cross-fade transition drops to `0s` under
  `prefers-reduced-motion: reduce` — verified via computed style, not just
  the CSS rule existing.

None of this required adding anything to the page — the accessible
structure (empty `alt` on decorative images, `aria-label` naming each door,
one `h1`, real focus rings distinct from hover) was already in place from
how the page was built. This was verification, not remediation.

## SEO & structured data

**Structured data** is one `@graph` — `Organization`, `WebSite`, `WebPage`,
three `SiteNavigationElement` entries for the doors, and three `Service`
entities, one per door — rather than several separate `<script>` blocks, so
entities reference each other by `@id` instead of repeating the same facts
three times. Verified by parsing it and confirming every `@id` reference
actually resolves to a defined entity in the graph (nothing here is checked
by a browser at render time, so a typo would otherwise ship silently).

**The three `Service` entities are built only from words already on this
page.** Each `name`/`description` is the relevant clause of the h1 statement
— e.g. Weddings' description is "An original song, written and produced for
your wedding, from Muin Sound Co.", which is a direct extract, not a new
claim. `provider` links each Service back to the `Organization`, and
`WebPage.mainEntity` points at all three, which is literally true: the doors
are the main things this page routes to.

**Still deliberately not included**: `Offer.price`, `AggregateRating`, or
`FAQPage`. None of that exists on the page — no pricing, no reviews, no
FAQ copy — and structured data claiming any of it would not match visible
page content, which is exactly what Google's structured data guidelines
warn against. `knowsAbout` on the `Organization` entity is the same
discipline applied to subject matter rather than commerce: it states what
the visible statement already says, nothing more. The fuller `Service`
markup — actual scope, pricing, process — belongs on each branch page once
it exists and can back it honestly.

**`robots.txt`** is fully open — `Allow: /` for every user-agent, including
AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and so on).
Nothing here opts any of them out; if that's ever wanted for a specific
crawler, it's a one-line addition, not a redesign.

**`sitemap.xml`** lists exactly the one page that exists. Listing
`weddings`/`parties`/`gaming` before they're built would tell crawlers to
index pages that 404 — worse than not mentioning them at all. Add each as
it ships.

**`llms.txt`** is the emerging (not yet a ratified standard, and not
confirmed to be consumed by every major AI crawler) convention for a short,
structured, agent-readable summary of a site. Included because it's cheap
and directly on-topic for AI-search visibility, but it's worth being honest
that its adoption isn't guaranteed the way `robots.txt` or JSON-LD is. It
deliberately doesn't link to the three unbuilt branch pages, for the same
reason the sitemap doesn't.

**Open Graph / Twitter Card** tags are complete on both (title, description,
image, and image dimensions/alt on OG; the Twitter-specific equivalents
rather than relying on OG fallback, which isn't guaranteed on every
consuming platform). `og:image` uses the lockup at its native 1200×920 —
there's no purpose-built 1200×630 social card yet; the existing brand mark
is the honest choice over fabricating a new asset for this pass.

## Colours

Hearth & Dried Herb only, as custom properties on `:root` — nothing in the
stylesheet hardcodes a hex value outside that block. A second palette (for a
themed branch page later) is a matter of adding `[data-theme="..."]`
overrides and swapping a `data-theme` attribute on `<html>`; the CSS is
structured for that even though it isn't needed yet.

## Before launch

- [ ] Real domain — `muinsound.co` is a placeholder, used in the canonical
      link, theme-color-adjacent meta, Open Graph and Twitter tags, the
      JSON-LD `@graph` (five URLs/`@id`s), `robots.txt`'s `Sitemap:` line,
      and `sitemap.xml` itself. Update all of them together — a grep for
      `muinsound.co` should find every one.
- [ ] `sameAs` social profile URLs on the `Organization` entity in the
      JSON-LD block, once real ones exist (deliberately omitted rather than
      filled with invented links)
- [ ] Build `weddings`, `parties`, and `gaming` — each currently 404s. As
      each ships: add it to `sitemap.xml`, and expand its `Service` entity
      in the JSON-LD `@graph` with the real scope/pricing/process that page
      actually describes (the entry-page version only has a name and a
      one-line description pulled from the homepage statement).
- [ ] Decide where a contact address and an `/about` link belong now that
      the footer is wordmark-only — neither exists anywhere on the page at
      the moment
- [ ] A purpose-built 1200×630 social share image, if the lockup at its
      native 1200×920 ever looks wrong cropped on a specific platform
