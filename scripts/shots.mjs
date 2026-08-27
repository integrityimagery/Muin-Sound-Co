/** Dev-only: screenshots the built site for visual review. Not part of the site. */
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? '/tmp/shots';
const BASE = 'http://localhost:4321';

const targets = [
  ['home-desktop', '/', 1280, 900, false],
  ['home-full', '/', 1280, 900, true],
  ['home-mobile', '/', 390, 844, true],
  ['home-360', '/', 360, 780, false],
  ['story-grove', '/stories/the-woods-called/', 1280, 900, true],
  ['story-plum-loud', '/stories/the-defiant-ones/', 1280, 900, true],
  ['story-plum-audio', '/stories/the-loud-ones/', 1280, 900, false],
  ['story-quiet', '/stories/the-quiet-ones/', 1280, 900, false],
  ['listen', '/listen/', 1280, 900, true],
  ['packages', '/packages/', 1280, 900, false],
  ['stories-index', '/stories/', 1280, 900, false],
];

const EXE = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});

for (const [name, path, w, h, full] of targets) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  await page.close();
  console.log('shot', name);
}

/* Mobile menu open, to check the off-canvas panel and focus handling. */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/menu-open.png` });
  await page.close();
  console.log('shot menu-open');
}

await browser.close();
