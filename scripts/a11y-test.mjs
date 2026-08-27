/**
 * Behavioural accessibility tests against the built site.
 *
 * These check the things a static audit cannot: that the menu really traps
 * focus, that Escape really closes it, that the player is really operable from
 * the keyboard, and that reduced-motion really disables the vine.
 *
 * Run:  npm run test:a11y   (with `npm run preview` serving on 4321)
 */
import { chromium } from 'playwright';

const BASE = process.env.PREVIEW_BASE || 'http://localhost:4321';
// Let Playwright resolve its own browser by default; CHROMIUM_PATH is only
// needed in sandboxes that ship a browser outside Playwright's cache.
const EXE = process.env.CHROMIUM_PATH || undefined;

let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(
    `  ${ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${label}${detail ? ` — ${detail}` : ''}`
  );
};

const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});

/* --- Mobile navigation ----------------------------------------------------- */

console.log('\n\x1b[1mMobile navigation (390px)\x1b[0m');
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  const toggle = page.getByRole('button', { name: 'Menu', exact: true });
  check(await toggle.isVisible(), 'hamburger toggle is visible below 900px');
  check(
    (await toggle.getAttribute('aria-expanded')) === 'false',
    'aria-expanded starts false'
  );

  await toggle.click();
  await page.waitForTimeout(200);
  check(
    (await toggle.getAttribute('aria-expanded')) === 'true',
    'aria-expanded becomes true when opened'
  );

  // Focus should have moved into the panel.
  const focusInPanel = await page.evaluate(
    () => !!document.activeElement?.closest('[data-nav-panel]')
  );
  check(focusInPanel, 'focus moves into the panel on open');

  // The rest of the page must be inert.
  const inert = await page.evaluate(() => ({
    main: document.querySelector('main')?.hasAttribute('inert'),
    footer: document.querySelector('.site-footer')?.hasAttribute('inert'),
  }));
  check(inert.main && inert.footer, 'main and footer are inert while the menu is open');

  // Tab all the way round; focus must never leave the panel.
  let escaped = false;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(
      () => !!document.activeElement?.closest('[data-nav-panel]')
    );
    if (!inside) {
      escaped = true;
      break;
    }
  }
  check(!escaped, 'focus is trapped across 20 Tab presses');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check(
    (await toggle.getAttribute('aria-expanded')) === 'false',
    'Escape closes the menu'
  );
  const returned = await page.evaluate(
    () => document.activeElement?.matches('[data-nav-toggle]') ?? false
  );
  check(returned, 'focus returns to the toggle on close');

  const cleared = await page.evaluate(
    () => !document.querySelector('main')?.hasAttribute('inert')
  );
  check(cleared, 'inert is removed from the page on close');

  await page.close();
}

/* --- Desktop navigation ---------------------------------------------------- */

console.log('\n\x1b[1mDesktop navigation (1280px)\x1b[0m');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE + '/listen/', { waitUntil: 'networkidle' });

  const toggle = page.locator('[data-nav-toggle]');
  check(!(await toggle.isVisible()), 'no hamburger on desktop');

  // Direct children only — submenu links live inside .nav__list too.
  const navLinks = page.locator('.nav__list > li > a');
  check((await navLinks.count()) === 6, 'all six top-level nav items are present', `found ${await navLinks.count()}`);

  const current = page.locator('[aria-current="page"]');
  check((await current.count()) === 1, 'exactly one aria-current="page"');
  check(
    (await current.first().textContent())?.trim() === 'Listen',
    'aria-current marks the actual current page'
  );

  // Current page must be distinguished by more than colour.
  const distinct = await page.evaluate(() => {
    const el = document.querySelector('.nav__link[aria-current="page"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const marker = getComputedStyle(el, '::before');
    return {
      weight: cs.fontWeight,
      decoration: cs.textDecorationLine,
      hasGlyph: marker.content !== 'none' && marker.width !== 'auto',
    };
  });
  check(
    distinct?.weight === '700' && distinct.decoration.includes('underline') && distinct.hasGlyph,
    'current page uses weight + underline + leaf glyph, not colour alone',
    JSON.stringify(distinct)
  );

  // Story pages keep the nav reachable rather than hiding it.
  await page.goto(BASE + '/stories/the-woods-called/', { waitUntil: 'networkidle' });
  const storyNav = page.locator('.nav__list > li > a');
  check(await storyNav.first().isVisible(), 'story pages still show the nav on desktop');
  check(!(await page.locator('[data-nav-toggle]').isVisible()), 'story pages do not use a desktop hamburger');

  await page.close();
}

/* --- Audio player ---------------------------------------------------------- */

console.log('\n\x1b[1mAudio player\x1b[0m');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  const playBtn = page.locator('[data-player-play]').first();
  const name = await playBtn.evaluate((el) => el.textContent?.trim());
  check(!!name && name.length > 4, 'play button has a real accessible name', name ?? '(none)');

  const seek = page.locator('[data-player-seek]').first();
  check(
    (await seek.evaluate((el) => el.tagName)) === 'INPUT',
    'seek control is a native input[type=range], keyboard-operable by default'
  );
  check(
    !!(await seek.getAttribute('aria-valuetext')),
    'seek control exposes aria-valuetext in spoken units',
    (await seek.getAttribute('aria-valuetext')) ?? ''
  );

  // Operate it entirely from the keyboard.
  await playBtn.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  const playing = await page.evaluate(() => {
    const a = document.querySelector('audio');
    return a ? !a.paused : false;
  });
  check(playing, 'Enter on the focused button starts playback');

  const label = await playBtn.evaluate((el) => el.textContent?.trim());
  check(label?.startsWith('Pause'), 'button label flips to Pause while playing', label ?? '');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const paused = await page.evaluate(() => document.querySelector('audio')?.paused);
  check(paused === true, 'Enter again pauses');

  // Only one track at a time.
  await page.locator('[data-player-play]').nth(1).click();
  await page.waitForTimeout(400);
  await page.locator('[data-player-play]').nth(2).click();
  await page.waitForTimeout(400);
  const playingCount = await page.evaluate(
    () => [...document.querySelectorAll('audio')].filter((a) => !a.paused).length
  );
  check(playingCount <= 1, 'at most one track plays at a time', `${playingCount} playing`);

  await page.close();
}

/* --- Focus indicator -------------------------------------------------------
   Reached by Tab, not by .focus(): `:focus-visible` deliberately does not match
   programmatic or mouse focus, so testing it any other way would be testing a
   state real keyboard users never see. */

console.log('\n\x1b[1mFocus indicator (keyboard)\x1b[0m');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.locator('body').press('Tab'); // first Tab lands on the skip link
  await page.waitForTimeout(300); // let the reveal transition settle

  const skip = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return { cls: el?.className, top: cs.insetBlockStart };
  });
  check(
    skip.cls?.includes('skip-link') && !skip.top.startsWith('-'),
    'skip link is the first stop and becomes visible on focus',
    JSON.stringify(skip)
  );

  // Walk forward to the first player button.
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press('Tab');
    found = await page.evaluate(
      () => document.activeElement?.matches('[data-player-play]') ?? false
    );
  }
  check(found, 'the play button is reachable by Tab');

  const ring = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return {
      width: cs.outlineWidth,
      style: cs.outlineStyle,
      offset: cs.outlineOffset,
      color: cs.outlineColor,
      innerRing: cs.boxShadow,
    };
  });
  check(
    ring.style === 'solid' && parseFloat(ring.width) >= 2 && parseFloat(ring.offset) > 0,
    'keyboard focus draws a solid, offset outline',
    JSON.stringify({ w: ring.width, s: ring.style, o: ring.offset })
  );
  check(
    ring.innerRing !== 'none',
    'primary controls also carry the inner contrast ring',
    ring.innerRing
  );

  // Hover must not produce the same treatment, or focus stops being distinct.
  const hoverRing = await page.evaluate(() => {
    const el = document.querySelector('.btn--primary');
    el?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    return getComputedStyle(el).outlineStyle;
  });
  check(hoverRing === 'none', 'hover alone does not draw a focus ring', hoverRing);

  await page.close();
}


/* --- Stories submenu -------------------------------------------------------
   The parent is a real link AND a disclosure. Both have to keep working, and
   the toggle's aria-expanded must never disagree with what is on screen. */

console.log('\n\x1b[1mStories submenu (desktop)\x1b[0m');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  const item = page.locator('.nav__item--has-menu').first();
  const link = item.locator('.nav__link').first();
  const toggle = item.locator('[data-nav-disclosure]').first();
  const menu = item.locator('[data-nav-submenu]').first();

  check(
    (await link.getAttribute('href'))?.endsWith('/stories/') ?? false,
    'parent is still a real link to the stories index',
    (await link.getAttribute('href')) ?? ''
  );
  check(
    ((await toggle.evaluate((el) => el.textContent?.trim())) ?? '').length > 3,
    'disclosure button has its own accessible name',
    await toggle.evaluate((el) => el.textContent?.trim())
  );
  check(
    (await toggle.getAttribute('aria-expanded')) === 'false' && !(await menu.isVisible()),
    'submenu starts collapsed, and aria-expanded agrees'
  );

  await toggle.click();
  await page.waitForTimeout(150);
  check(
    (await toggle.getAttribute('aria-expanded')) === 'true' && (await menu.isVisible()),
    'clicking the toggle opens the submenu, and aria-expanded agrees'
  );
  check(
    (await menu.locator('a').count()) === 6,
    'submenu lists all six stories',
    `${await menu.locator('a').count()} links`
  );

  const hrefs = await menu.locator('a').evaluateAll((els) =>
    els.map((el) => el.getAttribute('href'))
  );
  check(
    hrefs.every((h) => h && h.includes('/stories/') && h !== null),
    'every submenu link points at a story page'
  );

  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check(
    (await toggle.getAttribute('aria-expanded')) === 'false' && !(await menu.isVisible()),
    'Escape closes the submenu'
  );

  // Reopen, then click elsewhere.
  await toggle.click();
  await page.waitForTimeout(150);
  await page.locator('h1').first().click();
  await page.waitForTimeout(150);
  check(
    (await toggle.getAttribute('aria-expanded')) === 'false',
    'clicking outside closes the submenu'
  );

  // Hover is an enhancement, but it must keep aria-expanded honest.
  await item.hover();
  await page.waitForTimeout(200);
  check(
    (await toggle.getAttribute('aria-expanded')) === 'true' && (await menu.isVisible()),
    'hover opens the submenu without aria-expanded going stale'
  );

  // Keyboard: the toggle must be reachable and operable by Tab + Enter.
  // Park the pointer away from the nav first, or the hover path opens the menu
  // before the keyboard ever touches it and we would not be testing keyboard.
  await page.mouse.move(0, 700);
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.mouse.move(0, 700);
  let reached = false;
  for (let i = 0; i < 12 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(
      () => document.activeElement?.matches('[data-nav-disclosure]') ?? false
    );
  }
  check(reached, 'disclosure toggle is reachable by Tab');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check(
    (await toggle.getAttribute('aria-expanded')) === 'true',
    'Enter on the focused toggle opens the submenu'
  );
  // Tabbing out of the group closes it.
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  check(
    (await toggle.getAttribute('aria-expanded')) === 'false',
    'tabbing out of the group closes the submenu'
  );

  await page.close();
}

console.log('\n\x1b[1mStories submenu (current-page marking)\x1b[0m');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE + '/stories/the-woods-called/', { waitUntil: 'networkidle' });

  const pageCurrent = page.locator('[aria-current="page"]');
  check(
    (await pageCurrent.count()) === 1,
    'exactly one aria-current="page" on a story page',
    `${await pageCurrent.count()}`
  );
  check(
    (await pageCurrent.first().getAttribute('class'))?.includes('nav__sublink') ?? false,
    'aria-current="page" is on the submenu entry for this story'
  );

  const section = page.locator('.nav__link[aria-current="true"]');
  check(
    (await section.count()) === 1 &&
      (await section.first().textContent())?.trim() === 'Stories',
    'the Stories parent is marked as the current section, not as the page'
  );

  await page.close();
}

console.log('\n\x1b[1mStories submenu (mobile, inside the off-canvas panel)\x1b[0m');
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.waitForTimeout(200);

  const toggle = page.locator('[data-nav-disclosure]').first();
  const menu = page.locator('[data-nav-submenu]').first();
  check(await toggle.isVisible(), 'disclosure toggle is available in the mobile panel');

  await toggle.click();
  await page.waitForTimeout(200);
  check(await menu.isVisible(), 'submenu expands inline inside the panel');

  // Focus must still be trapped now that there are more links in the panel.
  let escaped = false;
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(
      () => !!document.activeElement?.closest('[data-nav-panel]')
    );
    if (!inside) {
      escaped = true;
      break;
    }
  }
  check(!escaped, 'focus is still trapped with the submenu open');

  // First Escape closes the submenu; the panel stays open.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const navOpen = await page.evaluate(
    () => document.querySelector('[data-nav]')?.getAttribute('data-open')
  );
  check(
    (await toggle.getAttribute('aria-expanded')) === 'false' && navOpen === 'true',
    'Escape closes the submenu first, leaving the panel open'
  );

  // Second Escape closes the panel.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check(
    (await page.evaluate(
      () => document.querySelector('[data-nav]')?.getAttribute('data-open')
    )) === 'false',
    'a second Escape closes the panel'
  );

  await page.close();
}

/* --- No-JS fallback -------------------------------------------------------- */

console.log('\n\x1b[1mNo-JavaScript fallback\x1b[0m');
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });

  const nativeVisible = await page.locator('audio').first().isVisible();
  check(nativeVisible, 'native <audio controls> is visible with JS disabled');

  const bodyText = await page.locator('main').innerText();
  check(
    bodyText.includes('Muin Sound Co. writes and produces'),
    'all copy is present in the served HTML, not injected by script'
  );
  check(bodyText.includes('Which one of these is you?'), 'story tiles render without JS');

  await ctx.close();
}

/* --- Reduced motion -------------------------------------------------------- */

console.log('\n\x1b[1mprefers-reduced-motion: reduce\x1b[0m');
{
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const vine = document.querySelector('.vine__path--a');
    const leaf = document.querySelector('.leaf-node');
    return {
      dashoffset: getComputedStyle(vine).strokeDashoffset,
      dasharray: getComputedStyle(vine).strokeDasharray,
      vineAnims: vine.getAnimations().length,
      leafOpacity: getComputedStyle(leaf).opacity,
      leafTransform: getComputedStyle(leaf).transform,
    };
  });

  check(state.vineAnims === 0, 'vine has no running animation under reduced motion');
  check(
    state.dashoffset === '0px' && state.dasharray === 'none',
    'vine renders fully drawn rather than hidden',
    JSON.stringify({ dashoffset: state.dashoffset, dasharray: state.dasharray })
  );
  check(state.leafOpacity === '1', 'leaves are visible rather than faded out');
  check(state.leafTransform === 'none', 'leaves are not left mid-transform');

  await ctx.close();
}

/* --- Responsive ------------------------------------------------------------ */

console.log('\n\x1b[1mResponsive down to 360px\x1b[0m');
{
  for (const width of [360, 390, 768, 899, 900, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
    }));
    check(
      overflow.doc <= overflow.win,
      `no horizontal overflow at ${width}px`,
      `${overflow.doc} vs ${overflow.win}`
    );
    await page.close();
  }
}

await browser.close();

console.log(
  failures === 0
    ? '\n\x1b[32mAll behavioural checks passed.\x1b[0m\n'
    : `\n\x1b[31m${failures} behavioural check(s) failed.\x1b[0m\n`
);
process.exit(failures === 0 ? 0 : 1);
