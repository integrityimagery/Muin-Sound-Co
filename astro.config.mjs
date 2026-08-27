// @ts-check
import { defineConfig } from 'astro/config';

/**
 * `site` and `base` come from the environment so one config serves both local
 * dev (root, no base) and GitHub Pages (a project site at /<repo>/).
 * The deploy workflow sets them; locally they are unset and everything stays
 * at the root.
 */
const site = process.env.SITE_URL ?? 'https://muinsound.co';
const base = process.env.BASE_PATH ?? '/';

/**
 * Prefixes internal links written in markdown body copy.
 *
 * Astro rewrites the URLs it generates itself, but `[video consult](/start/)`
 * in a story's markdown is opaque to it — on a project site that link would
 * resolve to the domain root and 404, while working fine in local dev. This
 * closes that gap so the two behave identically.
 *
 * Hand-written links in .astro files go through src/lib/paths.ts instead.
 */
function rehypeBasePaths() {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  return (tree) => {
    if (!prefix) return;
    const walk = (node) => {
      if (node.tagName === 'a' && typeof node.properties?.href === 'string') {
        const href = node.properties.href;
        if (href.startsWith('/') && !href.startsWith(`${prefix}/`)) {
          node.properties.href = `${prefix}${href}`;
        }
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

export default defineConfig({
  site,
  base,
  output: 'static',
  build: {
    // Emit /about/index.html rather than /about.html so URLs stay clean.
    format: 'directory',
  },
  markdown: {
    rehypePlugins: [rehypeBasePaths],
  },
  image: {
    responsiveStyles: true,
  },
});
