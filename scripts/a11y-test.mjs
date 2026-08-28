/**
 * Behavioural accessibility tests against the built site.
 *
 * These check the things a static audit cannot: that the menu really traps
 * focus, that Escape really closes it, that the player is really operable from
 * the keyboard, and that reduced motion really does still the header.
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
  check(
    (await page.locator('.brandmark--collapsible').count()) === 1,
    'story pages use the same collapsible lockup as everywhere else'
  );

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


  // Leaving and coming straight back must NOT close it: the pending close
  // timer has to be cancelled on re-entry, not just on the first open.
  await page.mouse.move(0, 700);
  await page.waitForTimeout(120); // less than the grace period
  await item.hover();
  await page.waitForTimeout(700); // longer than the grace period
  check(
    (await toggle.getAttribute('aria-expanded')) === 'true' && (await menu.isVisible()),
    'returning to the menu cancels the pending close'
  );

  // Travelling from the trigger down into the panel crosses a visual gap that
  // belongs to neither element. It must not read as leaving.
  {
    const t = await item.boundingBox();
    const m = await menu.boundingBox();
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
    await page.waitForTimeout(100);
    // Step through the gap slowly, as a real pointer would.
    for (let y = t.y + t.height; y <= m.y + 10; y += 2) {
      await page.mouse.move(t.x + t.width / 2, y);
    }
    await page.waitForTimeout(700);
    check(
      (await toggle.getAttribute('aria-expanded')) === 'true' && (await menu.isVisible()),
      'moving from the trigger down into the panel keeps it open'
    );
  }

  // And it must still close once the pointer genuinely leaves.
  await page.mouse.move(640, 20);
  await page.waitForTimeout(900);
  check(
    (await toggle.getAttribute('aria-expanded')) === 'false',
    'it still closes when the pointer really leaves'
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


/* --- Sticky header ---------------------------------------------------------
   The brief allows a sticky header only if it does not eat more than 15% of
   viewport height on mobile. That is the assertion that matters here. */

console.log('\n\x1b[1mSticky header\x1b[0m');
{
  for (const [w, h] of [[390, 844], [360, 780], [375, 667], [360, 640]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);

    const fixedOn = await page.evaluate(
      () => document.querySelector('[data-header]')?.dataset.fixed === 'on'
    );
    check(fixedOn, `header is fixed at ${w}px`);

    // The spacer must reserve exactly the expanded height, or the page jumps.
    const reserved = await page.evaluate(() => ({
      spacer: document.querySelector('[data-header-spacer]').getBoundingClientRect().height,
      header: document.querySelector('[data-header]').getBoundingClientRect().height,
    }));
    check(
      Math.abs(reserved.spacer - reserved.header) < 1,
      `spacer reserves the expanded header height at ${w}px`,
      `${reserved.spacer.toFixed(0)} vs ${reserved.header.toFixed(0)}`
    );

    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(500);

    const state = await page.evaluate(() => {
      const el = document.querySelector('[data-header]');
      const r = el.getBoundingClientRect();
      return {
        stuck: el.dataset.stuck,
        top: Math.round(r.top),
        height: Math.round(r.height),
        vh: window.innerHeight,
      };
    });

    check(state.stuck === 'true', `header collapses after scrolling at ${w}px`);
    check(state.top <= 1, `header stays pinned to the top at ${w}px`, `top=${state.top}`);

    const pct = (state.height / state.vh) * 100;
    check(
      pct <= 15,
      `collapsed header is within the 15% viewport budget at ${w}px`,
      `${state.height}px = ${pct.toFixed(1)}% of ${state.vh}px`
    );

    // The mark must stay centred, and the hamburger sits beside it rather
    // than under it — stacking them is what blew the budget.
    const layout = await page.evaluate(() => {
      const img = document.querySelector('.brandmark__compact').getBoundingClientRect();
      const t = document.querySelector('.nav__toggle').getBoundingClientRect();
      return {
        centre: Math.round(img.x + img.width / 2),
        half: Math.round(window.innerWidth / 2),
        gap: Math.round(t.left - img.right),
      };
    });
    check(
      Math.abs(layout.centre - layout.half) <= 1,
      `collapsed mark stays centred at ${w}px`,
      `${layout.centre} vs centre ${layout.half}`
    );
    check(
      layout.gap > 8,
      `collapsed mark does not collide with the menu button at ${w}px`,
      `${layout.gap}px clear`
    );

    await page.close();
  }

  // The lockup gives way to the wordmark, and only ONE is in the a11y tree.
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  const opacities = () =>
    page.evaluate(() => ({
      full: Number(getComputedStyle(document.querySelector('.brandmark__full')).opacity),
      compact: Number(getComputedStyle(document.querySelector('.brandmark__compact')).opacity),
    }));

  const atTop = await opacities();
  check(atTop.full === 1 && atTop.compact === 0, 'full lockup shows at the top of the page');

  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(500);

  const scrolled = await opacities();
  check(
    scrolled.full === 0 && scrolled.compact === 1,
    'it collapses to the wordmark once scrolled'
  );

  // The marks cross-fade, so both stay in the DOM. Exactly one of them may
  // carry the business name, or a screen reader meets it twice.
  const named = await page.evaluate(
    () =>
      [...document.querySelectorAll('header img')].filter(
        (i) => (i.getAttribute('alt') ?? '').trim() !== '' && i.getAttribute('aria-hidden') !== 'true'
      ).length
  );
  check(named === 1, 'exactly one logo image carries an accessible name', `${named} named`);

  // MUIN must not drift sideways as it collapses — that is the whole point.
  const centreExpanded = await page.evaluate(() => {
    window.scrollTo(0, 0);
    const b = document.querySelector('.brandmark--collapsible').getBoundingClientRect();
    return Math.round(b.x + b.width / 2);
  });
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(600);
  const centreCollapsed = await page.evaluate(() => {
    const b = document.querySelector('.brandmark--collapsible').getBoundingClientRect();
    return Math.round(b.x + b.width / 2);
  });
  check(
    centreExpanded === centreCollapsed,
    'the mark stays horizontally centred through the collapse',
    `${centreExpanded} -> ${centreCollapsed}`
  );

  // And the page beneath must not lurch when the header shrinks.
  const docY = () =>
    page.evaluate(
      () =>
        Math.round(
          document.querySelector('.plain-sentence').getBoundingClientRect().top + window.scrollY
        )
    );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const before = await docY();
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(600);
  const after = await docY();
  check(
    before === after,
    'page content does not shift when the header collapses',
    `${before} -> ${after}`
  );

  // Scrolling back up restores it.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const back = await page.evaluate(
    () => document.querySelector('[data-header]')?.dataset.stuck
  );
  check(back === 'false', 'scrolling back to the top restores the full lockup');

  // The submenu must still work from the collapsed header.
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(400);
  await page.locator('[data-nav-disclosure]').first().click();
  await page.waitForTimeout(200);
  const menuVisible = await page.locator('[data-nav-submenu]').first().isVisible();
  check(menuVisible, 'the Stories submenu still opens from the collapsed header');

  await page.close();
}

{
  // The off-canvas panel must still cover the page. A `transform` on the
  // header would make it the containing block for the fixed panel and break
  // this, which is why the collapse animates padding instead.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.waitForTimeout(300);

  const panel = await page.evaluate(() => {
    const r = document.querySelector('[data-nav-panel]').getBoundingClientRect();
    return { top: Math.round(r.top), height: Math.round(r.height), vh: window.innerHeight };
  });
  check(
    panel.top <= 1 && panel.height >= panel.vh - 1,
    'the mobile menu still covers the full viewport from a collapsed header',
    JSON.stringify(panel)
  );

  const headerTransform = await page.evaluate(
    () => getComputedStyle(document.querySelector('[data-header]')).transform
  );
  check(
    headerTransform === 'none',
    'the header carries no transform (it would break the fixed panel)',
    headerTransform
  );

  await page.close();
}


/* --- Header parity across page types ---------------------------------------
   One header, identical everywhere. Story pages used to have their own
   variant, so this pins the behaviour down rather than trusting it. */

console.log('\n\x1b[1mHeader parity across page types\x1b[0m');
{
  const routes = [
    ['home', '/'],
    ['base', '/about/'],
    ['listen', '/listen/'],
    ['story (grove/photo)', '/stories/the-woods-called/'],
    ['story (plum/loud)', '/stories/the-defiant-ones/'],
    ['story (hearth/quiet)', '/stories/the-quiet-ones/'],
  ];

  const shapes = [];

  for (const [label, route] of routes) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const expanded = await page.evaluate(() => {
      const h = document.querySelector('[data-header]');
      const full = document.querySelector('.brandmark__full');
      const box = document.querySelector('.brandmark--collapsible');
      return {
        fixed: h?.dataset.fixed,
        stuck: h?.dataset.stuck,
        hasCollapsibleMark: !!box,
        fullOpacity: full ? Number(getComputedStyle(full).opacity) : null,
        centred: box
          ? Math.abs(box.getBoundingClientRect().x + box.getBoundingClientRect().width / 2 -
              window.innerWidth / 2) <= 1
          : null,
        navVisible: !!document.querySelector('.nav__list > li > a')?.checkVisibility(),
        spacerMatches:
          Math.abs(
            document.querySelector('[data-header-spacer]').getBoundingClientRect().height -
              h.getBoundingClientRect().height
          ) < 1,
      };
    });

    check(
      expanded.fixed === 'on' &&
        expanded.hasCollapsibleMark &&
        expanded.fullOpacity === 1 &&
        expanded.centred === true &&
        expanded.navVisible &&
        expanded.spacerMatches,
      `${label}: expanded header is the standard one`,
      JSON.stringify(expanded)
    );

    const beforeY = await page.evaluate(() =>
      Math.round(document.querySelector('main').getBoundingClientRect().top + window.scrollY)
    );

    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(700);

    const collapsed = await page.evaluate(() => {
      const h = document.querySelector('[data-header]');
      const r = h.getBoundingClientRect();
      const box = document.querySelector('.brandmark--collapsible').getBoundingClientRect();
      return {
        stuck: h.dataset.stuck,
        top: Math.round(r.top),
        height: Math.round(r.height),
        fullOpacity: Number(getComputedStyle(document.querySelector('.brandmark__full')).opacity),
        compactOpacity: Number(
          getComputedStyle(document.querySelector('.brandmark__compact')).opacity
        ),
        centred: Math.abs(box.x + box.width / 2 - window.innerWidth / 2) <= 1,
        transform: getComputedStyle(h).transform,
      };
    });

    const afterY = await page.evaluate(() =>
      Math.round(document.querySelector('main').getBoundingClientRect().top + window.scrollY)
    );

    check(
      collapsed.stuck === 'true' &&
        collapsed.top === 0 &&
        collapsed.fullOpacity === 0 &&
        collapsed.compactOpacity === 1 &&
        collapsed.centred &&
        collapsed.transform === 'none',
      `${label}: collapses to the centred wordmark`,
      JSON.stringify(collapsed)
    );

    check(beforeY === afterY, `${label}: content does not shift on collapse`, `${beforeY} -> ${afterY}`);

    shapes.push({ label, height: collapsed.height });
    await page.close();
  }

  // Every page should settle to the same collapsed height.
  const heights = [...new Set(shapes.map((s) => s.height))];
  check(
    heights.length === 1,
    'every page type collapses to the same header height',
    shapes.map((s) => `${s.label}=${s.height}px`).join(', ')
  );
}

/* --- Header arrangement -----------------------------------------------------
   Links, mark, links — one row, vertically centred on each other.

   The mark and the nav are siblings laid over the same grid row with matching
   templates, so "centred" and "equal gaps" are consequences of two independent
   declarations agreeing. Nothing in the CSS fails loudly when they stop
   agreeing; the header just goes quietly lopsided. Hence measuring it. */

console.log('\n\x1b[1mHeader arrangement (links either side of the mark)\x1b[0m');
{
  const readRow = () => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, mid: r.top + r.height / 2, h: r.height };
    };
    const fit = (sel) => {
      const ul = document.querySelector(sel);
      const items = [...ul.querySelectorAll(':scope > li')];
      const left = Math.min(...items.map((l) => l.getBoundingClientRect().left));
      const right = Math.max(...items.map((l) => l.getBoundingClientRect().right));
      const tallest = Math.max(...items.map((l) => l.getBoundingClientRect().height));
      const r = ul.getBoundingClientRect();
      return { slack: r.width - (right - left), wrapped: r.height > tallest + 2 };
    };
    return {
      start: box('.nav__list--start'),
      end: box('.nav__list--end'),
      mark: box('.site-header__brand'),
      startFit: fit('.nav__list--start'),
      endFit: fit('.nav__list--end'),
    };
  };

  /* 900px is the tightest case by construction — it is where the side-by-side
     layout starts, and where the heavier group has the least room. */
  for (const width of [900, 1000, 1280, 1600]) {
    for (const [label, route] of [
      ['home', '/'],
      ['story', '/stories/the-woods-called/'],
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const open = await page.evaluate(readRow);
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForTimeout(500);
      const shut = await page.evaluate(readRow);
      await page.close();

      const at = `${label} @${width}`;

      for (const [state, r] of [
        ['expanded', open],
        ['collapsed', shut],
      ]) {
        check(
          r.start.right < r.mark.left && r.mark.right < r.end.left,
          `${at}: ${state} — links sit either side of the mark`,
          `${Math.round(r.start.right)} | ${Math.round(r.mark.left)}–${Math.round(r.mark.right)} | ${Math.round(r.end.left)}`
        );

        const drift = Math.max(
          Math.abs(r.start.mid - r.mark.mid),
          Math.abs(r.end.mid - r.mark.mid)
        );
        check(
          drift <= 1,
          `${at}: ${state} — links are vertically centred on the mark`,
          `worst drift ${drift.toFixed(1)}px`
        );

        const lead = r.mark.left - r.start.right;
        const trail = r.end.left - r.mark.right;
        check(
          Math.abs(lead - trail) <= 1,
          `${at}: ${state} — the mark has the same air on both sides`,
          `${lead.toFixed(0)}px vs ${trail.toFixed(0)}px`
        );
      }

      /* One line each. Wrapping is the failure this layout is tuned against:
         it costs ~50px of header and leaves one side two lines deep and the
         other one, which reads as a broken header rather than a dense one. */
      check(
        !open.startFit.wrapped && !open.endFit.wrapped,
        `${at}: neither group wraps to a second line`,
        `slack ${open.startFit.slack.toFixed(0)}px / ${open.endFit.slack.toFixed(0)}px`
      );
      check(
        Math.min(open.startFit.slack, open.endFit.slack) > 4,
        `${at}: the tighter group keeps room to spare`,
        `${Math.min(open.startFit.slack, open.endFit.slack).toFixed(0)}px`
      );
    }
  }
}

/* Splitting one list into two is only safe if it stays ONE landmark with every
   link inside it. `display: contents` on the panel is what makes the two lists
   grid items of the nav, and dropping an element out of the accessibility tree
   is exactly what that property has a history of doing.

   Read from Chromium's own accessibility tree over CDP, not from Playwright's
   role engine: the role engine computes roles from the DOM, so it would report
   a healthy landmark whether or not the browser actually exposes one — which
   is the entire question here. */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  const labels = await page.evaluate(() =>
    [...document.querySelectorAll('.nav__list > li > a')].map((a) => a.textContent.trim())
  );

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await page.close();

  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const navs = nodes.filter((n) => n.role?.value === 'navigation' && !n.ignored);

  check(navs.length === 1, 'the split nav is still one navigation landmark', `${navs.length}`);
  check(
    navs[0]?.name?.value === 'Main',
    'the landmark keeps its name',
    JSON.stringify(navs[0]?.name?.value)
  );

  const inside = new Set();
  const walk = (node) => {
    if (!node) return;
    if (node.role?.value === 'link' && node.name?.value) inside.add(node.name.value.trim());
    (node.childIds ?? []).forEach((id) => walk(byId.get(id)));
  };
  walk(navs[0]);

  /* Case-insensitive: the bar is `text-transform: uppercase`, and Chromium
     applies that to the accessible name, so the tree says STORIES where the
     markup says Stories. */
  const named = [...inside].map((n) => n.toLowerCase());
  const missing = labels.filter(
    (label) => !named.some((n) => n.includes(label.toLowerCase()))
  );
  check(
    missing.length === 0,
    'every link from both groups is inside that landmark',
    missing.length ? `missing ${missing.join(', ')}` : `${labels.length} links`
  );
}

/* --- Page gutters -----------------------------------------------------------
   The content column used to sit in a two-column grid with a narrow spine down
   the left for the vine, which made the left gutter wider than the right by the
   spine's width. With the vine gone the shell's own padding is the gutter on
   both sides, and this is what says so. */

console.log('\n\x1b[1mPage gutters\x1b[0m');
{
  for (const width of [1600, 1280, 1024, 900, 700, 390, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(BASE + '/about/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);

    const g = await page.evaluate(() => {
      const grid = document.querySelector('.page-grid').getBoundingClientRect();
      return {
        left: grid.left,
        right: window.innerWidth - grid.right,
      };
    });
    await page.close();

    check(
      Math.abs(g.left - g.right) <= 1,
      `page gutters are even at ${width}px`,
      `${g.left.toFixed(0)}px vs ${g.right.toFixed(0)}px`
    );
  }
}

/* --- Page transitions -------------------------------------------------------
   Cross-document view transitions, declared entirely in CSS. Three things are
   worth pinning down, and none of them is visible in a screenshot. */

console.log('\n\x1b[1mPage transitions\x1b[0m');
{
  /* Records, on the OUTGOING document, whether the browser actually started a
     transition for this navigation. sessionStorage because that is the only
     thing that survives the document swap. */
  const recorder = () => {
    addEventListener('pageswap', (e) => {
      sessionStorage.setItem('swap', e.viewTransition ? 'transition' : 'none');
    });
  };

  const navigate = async (ctx) => {
    await ctx.addInitScript(recorder);
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const before = await page.evaluate(() =>
      JSON.stringify(document.querySelector('[data-header]').getBoundingClientRect())
    );
    await Promise.all([
      page.waitForURL('**/about/'),
      page.locator('.nav__list a[href$="/about/"]').first().click(),
    ]);
    await page.waitForTimeout(700);
    const result = {
      swap: await page.evaluate(() => sessionStorage.getItem('swap')),
      after: await page.evaluate(() =>
        JSON.stringify(document.querySelector('[data-header]').getBoundingClientRect())
      ),
      before,
      // Nothing may be left running, or the page is stuck under a snapshot.
      stuck: await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((a) => String(a.effect?.pseudoElement || '').startsWith('::view-transition'))
            .length
      ),
      interactive: await page.locator('h1').first().isVisible(),
    };
    await page.close();
    return result;
  };

  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const r = await navigate(ctx);
    await ctx.close();

    check(r.swap === 'transition', 'a real click starts a view transition', `${r.swap}`);
    check(
      r.before === r.after,
      'the header is in exactly the same place either side of it',
      `${r.before} vs ${r.after}`
    );
    check(r.stuck === 0, 'nothing is left running once it finishes', `${r.stuck} animations`);
    check(r.interactive, 'the destination is rendered and not hidden under a snapshot');
  }

  /* The `*` rule in the reduced-motion block cannot reach ::view-transition-*,
     so the transition has to be switched off at the source. If that ever
     regressed, the one motion on the site would be the one ignoring the
     preference. */
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    });
    const r = await navigate(ctx);
    await ctx.close();

    check(
      r.swap === 'none',
      'reduced motion: no transition is started at all',
      `${r.swap}`
    );
    check(r.interactive, 'reduced motion: the destination still renders');
  }

  /* `view-transition-name` forces a stacking context, and the off-canvas menu
     is a `position: fixed` child of the header. If naming the header ever
     started giving it a containing block too, the full-screen menu would
     silently shrink to the header's box. */
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.click('[data-nav-toggle]');
    await page.waitForTimeout(250);
    const panel = await page.evaluate(() => {
      const r = document.querySelector('[data-nav-panel]').getBoundingClientRect();
      return { x: r.x, y: r.y, w: Math.round(r.width), h: Math.round(r.height),
               vw: window.innerWidth, vh: window.innerHeight };
    });
    await page.close();
    check(
      panel.x === 0 && panel.y === 0 && panel.w === panel.vw && panel.h === panel.vh,
      'naming the header does not trap the off-canvas menu inside it',
      JSON.stringify(panel)
    );
  }
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

  const stickiness = await page.evaluate(() => ({
    fixed: document.querySelector('[data-header]')?.dataset.fixed ?? 'unset',
    position: getComputedStyle(document.querySelector('[data-header]')).position,
    spacer: document.querySelector('[data-header-spacer]').getBoundingClientRect().height,
  }));
  check(
    stickiness.fixed === 'unset' && stickiness.position === 'static' && stickiness.spacer === 0,
    'without JS the header stays in flow and the spacer reserves nothing',
    JSON.stringify(stickiness)
  );

  await ctx.close();
}

/* --- Reduced motion -------------------------------------------------------- */

console.log('\n\x1b[1mprefers-reduced-motion: reduce\x1b[0m');
{
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  /* The header's collapse is the site's one remaining piece of motion: it
     transitions its padding and --mark-w, and cross-fades the two marks. Under
     reduced motion it must still ARRIVE — a collapse that refused to happen
     would leave a full-height lockup pinned to the top of the screen — it just
     must not be animated getting there. */
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(120);

  const state = await page.evaluate(() => {
    const header = document.querySelector('[data-header]');
    return {
      stuck: header.dataset.stuck,
      running: header
        .getAnimations({ subtree: true })
        .filter((a) => a.playState === 'running').length,
      full: getComputedStyle(document.querySelector('.brandmark__full')).opacity,
      compact: getComputedStyle(document.querySelector('.brandmark__compact')).opacity,
    };
  });

  check(state.stuck === 'true', 'reduced motion: the header still collapses');
  check(
    state.running === 0,
    'reduced motion: nothing in the header is mid-animation',
    `${state.running} running`
  );
  check(
    state.full === '0' && state.compact === '1',
    'reduced motion: the collapse lands on its final state at once',
    JSON.stringify({ full: state.full, compact: state.compact })
  );

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
