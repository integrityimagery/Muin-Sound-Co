// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // PLACEHOLDER — replace with the real production domain before launch.
  // This value is used for canonical URLs and absolute URLs in JSON-LD.
  site: 'https://muinsound.co',
  output: 'static',
  build: {
    // Emit /about/index.html rather than /about.html so URLs stay clean.
    format: 'directory',
  },
  image: {
    // The logo art is flat vector-derived PNG; keep it lossless.
    responsiveStyles: true,
  },
});
