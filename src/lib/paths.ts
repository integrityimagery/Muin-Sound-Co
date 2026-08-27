/**
 * Base-path aware internal links.
 *
 * GitHub Pages serves this repo as a PROJECT site, at
 * `/<repo-name>/` rather than at the domain root. Astro rewrites the URLs it
 * generates itself (assets, images, page routes) but it cannot rewrite a raw
 * `href="/about/"` written by hand — those would resolve to the domain root and
 * 404 on Pages while working perfectly in local dev, which is exactly the kind
 * of bug that only shows up after deploy.
 *
 * So every hand-written internal link goes through here. Markdown body links
 * are handled by the rehype plugin in astro.config.mjs, which does the same job
 * for `[text](/start/)`.
 *
 * With no base configured this is a no-op, so local dev is unaffected.
 */

const BASE = import.meta.env.BASE_URL || '/';

export const withBase = (path: string): string => {
  // Leave external links, anchors, mailto: and already-based paths alone.
  if (!path.startsWith('/')) return path;
  const prefix = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  if (prefix && path.startsWith(`${prefix}/`)) return path;
  return `${prefix}${path}`;
};
