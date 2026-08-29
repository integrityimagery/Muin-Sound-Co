import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  addEventListener('pagereveal', async (e) => {
    if (!e.viewTransition) return;
    await e.viewTransition.ready;
    window.__anims = document.getAnimations()
      .filter((a) => String(a.effect?.pseudoElement || '').startsWith('::view-transition'))
      .map((a) => ({
        pseudo: a.effect.pseudoElement,
        name: a.animationName || '(ua)',
        dur: a.effect.getTiming().duration,
        kf: a.effect.getKeyframes().map((k) => JSON.stringify(k)).join(' | ').slice(0, 300),
      }));
    for (const a of document.getAnimations())
      if (String(a.effect?.pseudoElement || '').startsWith('::view-transition')) { a.pause(); a.currentTime = 150; }
  });
});
const p = await ctx.newPage();
await p.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
await p.evaluate(() => window.scrollTo(0, 900));
await p.waitForTimeout(500);
await Promise.all([p.waitForURL('**/listen/'), p.locator('.nav__list a[href$="/listen/"]').first().click()]);
await p.waitForTimeout(500);
for (const a of await p.evaluate(() => window.__anims || [])) console.log(a.pseudo, '|', a.name, '|', a.dur, '\n   ', a.kf, '\n');
await b.close();
