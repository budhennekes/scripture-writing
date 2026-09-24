// Cross identity + neutral reading navigation + rail-free writing mode.
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'
import { returningUser } from './qa-user.mjs'

const url = process.env.QA_URL || 'http://127.0.0.1:4173/'
const out = process.env.QA_OUT || 'artifacts/cross-navigation-qa'
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const results = []

const fresh = async () => (await browser.createBrowserContext()).newPage()

async function open({ width, height, theme = 'paper', hand = 'right', mobile = false, reduce = false }) {
  const page = await fresh()
  await returningUser(page)
  await page.evaluateOnNewDocument((theme, hand) => {
    localStorage.setItem('scripture-scribe-state-v2', JSON.stringify({ theme, handedness: hand }))
  }, theme, hand)
  if (reduce) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 })
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.verse.active')
  await page.evaluate(() => document.fonts.ready)
  return page
}

const rect = (page, selector) => page.$eval(selector, el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom } })

try {
  await mkdir(out, { recursive: true })

  // 1. Loading identity: a plain cross, not a letter; still.
  {
    const page = await fresh()
    await returningUser(page)
    await page.setRequestInterception(true)
    page.on('request', request => request.url().includes('/data/') ? undefined : request.continue())
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.loading-mark')
    await page.evaluate(() => document.fonts.ready)
    const mark = await page.$eval('.loading-mark', el => ({ tag: el.tagName.toLowerCase(), text: el.textContent.trim(), animation: getComputedStyle(el).animationName, hidden: el.getAttribute('aria-hidden'), w: el.getBoundingClientRect().width }))
    assert.equal(mark.tag, 'svg'); assert.equal(mark.text, ''); assert.equal(mark.animation, 'none'); assert.equal(mark.hidden, 'true')
    assert.equal(await page.$eval('.status-screen', el => el.textContent.includes('Preparing your place.')), true)
    await page.screenshot({ path: `${out}/loading-desktop.png` })
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
    await page.screenshot({ path: `${out}/loading-phone.png` })
    results.push('loading: cross svg, no S, still, copy unchanged')
    await page.close()
  }

  // 2. Icons wired and coherent.
  {
    const html = await (await fetch(url)).text()
    for (const href of ['favicon.svg', 'favicon.ico', 'favicon-96x96.png', 'apple-touch-icon.png', 'site.webmanifest']) assert.ok(html.includes(`href="${href}"`), `missing relative ${href}`)
    assert.equal(html.includes('manifest.webmanifest'), false)
    const manifest = await (await fetch(new URL('site.webmanifest', url))).json()
    assert.equal(manifest.start_url, './'); assert.equal(manifest.scope, './')
    for (const icon of manifest.icons) assert.equal((await fetch(new URL(icon.src, url))).status, 200)
    const svg = await (await fetch(new URL('favicon.svg', url))).text()
    assert.ok(!svg.includes('M326 145'), 'Old S favicon still served')
    const sw = await (await fetch(new URL('sw.js', url))).text()
    assert.match(sw, /v19-cross-identity/)
    results.push('icons: base-path links, single manifest, icons 200, new favicon served, SW cache v19')
  }

  // 3. Normal reader controls in every relevant state.
  for (const [label, opts] of [['desktop', { width: 1440, height: 900 }], ['desktop-left', { width: 1440, height: 900, hand: 'left' }], ['tablet', { width: 768, height: 900 }], ['phone', { width: 390, height: 844, mobile: true }], ['phone-left', { width: 390, height: 844, mobile: true, hand: 'left' }], ['phone-night', { width: 390, height: 844, mobile: true, theme: 'night' }], ['desktop-night', { width: 1440, height: 900, theme: 'night' }]]) {
    const page = await open(opts)
    const style = await page.$eval('.next-button', el => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color, shadow: s.boxShadow, page: getComputedStyle(document.querySelector('.reader-panel')).backgroundColor } })
    assert.equal(style.shadow, 'none', `${label}: Next still elevated`)
    assert.ok(!/rgb\(60, 90, 65\)|rgb\(113, 135, 100\)/.test(style.bg), `${label}: green fill remains`)
    const next = await rect(page, '.next-button'), back = await rect(page, '.previous-button')
    assert.ok(next.h >= 48 && next.w >= 44 && back.h >= 44 && back.w >= 44, `${label}: target too small`)
    assert.ok(next.w * next.h > back.w * back.h, `${label}: Next not dominant`)
    const b = await page.$eval('.verse.active p', el => el.getBoundingClientRect().toJSON())
    await page.screenshot({ path: `${out}/${label}-reader.png` })
    await page.focus('.next-button'); await page.keyboard.press('Tab'); await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift')
    const focus = await page.$eval('.next-button', el => getComputedStyle(el).outlineStyle)
    assert.equal(focus, 'solid', `${label}: no visible focus`)
    await page.screenshot({ path: `${out}/${label}-focus.png` })
    await page.click('.next-button')
    assert.equal(await page.$eval('.verse.active sup', el => el.textContent), '2', `${label}: Next click`)
    await page.click('.previous-button')
    assert.equal(await page.$eval('.verse.active sup', el => el.textContent), '1', `${label}: Back click`)
    assert.equal(await page.$eval('.previous-button', el => el.disabled), true)
    const a = await page.$eval('.verse.active p', el => el.getBoundingClientRect().toJSON())
    assert.ok(Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1, `${label}: Scripture moved`)
    const box = await rect(page, '.next-button')
    await page.mouse.move(box.x + box.w / 2, box.y + box.h / 2); await page.mouse.down(); await wait(60)
    await page.screenshot({ path: `${out}/${label}-pressed.png` })
    await page.mouse.up()
    results.push(`${label}: neutral Next ${Math.round(next.w)}x${Math.round(next.h)}, Back ${Math.round(back.w)}x${Math.round(back.h)}, focus ring, disabled Back at Gen 1:1, Scripture still`)
    await page.close()
  }

  // 4. Full writing mode: no rail column, single quiet Next verse, Back recovery, Exit always visible.
  for (const [label, opts] of [['writing-desktop-right', { width: 1440, height: 900 }], ['writing-desktop-left', { width: 1440, height: 900, hand: 'left' }], ['writing-tablet', { width: 768, height: 1024 }], ['writing-phone-right', { width: 390, height: 844, mobile: true }], ['writing-phone-left', { width: 390, height: 844, mobile: true, hand: 'left' }], ['writing-desktop-night', { width: 1440, height: 900, theme: 'night' }]]) {
    const page = await open(opts)
    const before = await page.$eval('.verse.active p', el => el.getBoundingClientRect().toJSON())
    await page.click('.writing-mode-button')
    await page.waitForSelector('.focus-writing')
    const frames = await page.evaluate(async () => { const f = []; for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); const r = document.querySelector('.verse.active p').getBoundingClientRect(); f.push([r.x, r.y]) } return { f, anims: document.querySelector('.verse.active').getAnimations({ subtree: true }).length } })
    for (const [x, y] of frames.f) assert.ok(Math.abs(x - before.x) < 2 && Math.abs(y - before.y) < 2, `${label}: Scripture moved entering writing mode`)
    assert.equal(frames.anims, 0)
    const state = await page.evaluate(() => {
      const rail = document.querySelector('.control-rail'), panel = document.querySelector('.reader-panel'), next = document.querySelector('.next-button')
      const rs = getComputedStyle(rail)
      return { panelW: panel.getBoundingClientRect().width, railBg: rs.backgroundColor, railBorder: rs.borderInlineEndWidth + '/' + rs.borderInlineStartWidth, nextText: next.textContent.trim(), exit: (() => { const e = document.querySelector('.writing-mode-button'); const r = e.getBoundingClientRect(); return e.textContent.trim() === 'Exit writing mode' && r.top >= 0 && r.bottom <= innerHeight && getComputedStyle(e).visibility === 'visible' })(), progress: getComputedStyle(document.querySelector('.chapter-position')).visibility, ref: getComputedStyle(document.querySelector('.reference-picker')).visibility }
    })
    assert.equal(state.nextText, 'Next verse')
    assert.equal(state.exit, true, `${label}: Exit not visible`)
    assert.equal(state.progress, 'hidden', `${label}: progress chrome still shown`)
    assert.equal(state.ref, 'visible')
    const next = await rect(page, '.next-button'), back = await rect(page, '.previous-button')
    const vw = opts.width, vh = await page.evaluate(() => innerHeight)
    assert.ok(next.h >= 56 && next.w >= 120, `${label}: Next target ${next.w}x${next.h}`)
    assert.ok(back.h >= 44 && back.w >= 44, `${label}: Back target`)
    assert.ok(next.b <= vh && next.y > vh / 2, `${label}: Next not at lower edge`)
    const leftSide = opts.hand !== 'left' // right-handed writer: controls on left
    assert.equal(next.x + next.w / 2 < vw / 2, leftSide, `${label}: Next on wrong side`)
    if (!opts.mobile) {
      assert.ok(state.panelW >= vw - 1, `${label}: rail column still reserved (${state.panelW})`)
      assert.ok(['rgba(0, 0, 0, 0)', 'transparent'].includes(state.railBg), `${label}: rail slab visible`)
    }
    await page.screenshot({ path: `${out}/${label}.png` })
    await page.click('.next-button')
    assert.equal(await page.$eval('.verse.active sup', el => el.textContent), '2')
    await page.click('.previous-button')
    assert.equal(await page.$eval('.verse.active sup', el => el.textContent), '1')
    await page.keyboard.press('Space')
    assert.equal(await page.$eval('.verse.active sup', el => el.textContent), '2')
    await page.keyboard.press('ArrowLeft')
    assert.equal(await page.$eval('.verse.active sup', el => el.textContent), '1')
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.focus-writing'))
    results.push(`${label}: rail removed, Next verse ${Math.round(next.w)}x${Math.round(next.h)} lower ${leftSide ? 'left' : 'right'}, Back ${Math.round(back.w)}x${Math.round(back.h)}, Exit visible, progress hidden, keys+Escape ok, 0 Scripture animations`)
    await page.close()
  }

  // 5. Long verse scrolls clear of the controls (Esther 8:9 is the longest verse).
  for (const [label, opts] of [['long-desktop', { width: 1280, height: 720 }], ['long-phone', { width: 390, height: 700, mobile: true }]]) {
    const page = await open(opts)
    await page.click('.reference-picker'); await page.type('[name="reference"]', 'Esther 8:9'); await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('.reference-picker')?.textContent?.includes('8:9'))
    await page.click('.writing-mode-button'); await page.waitForSelector('.focus-writing'); await wait(150)
    const clear = await page.evaluate(() => { const w = document.querySelector('.scripture-wrap'); w.scrollTop = w.scrollHeight; return new Promise(r => requestAnimationFrame(() => { const p = document.querySelector('.verse.active p').getBoundingClientRect(); const n = document.querySelector('.next-button').getBoundingClientRect(); const overlapX = p.left < n.right && p.right > n.left; return r({ scrollable: w.scrollHeight > w.clientHeight, textBottom: p.bottom, nextTop: n.top, overlapX }) })) })
    assert.ok(clear.scrollable, `${label}: long verse not scrollable`)
    assert.ok(!clear.overlapX || clear.textBottom <= clear.nextTop, `${label}: controls cover text ${JSON.stringify(clear)}`)
    await page.screenshot({ path: `${out}/${label}-scrolled.png` })
    results.push(`${label}: Esther 8:9 scrolls; last line ends above/clear of Next`)
    await page.close()
  }

  // 6. Reduced motion.
  {
    const page = await open({ width: 1440, height: 900, reduce: true })
    assert.equal(await page.$eval('.next-button', el => getComputedStyle(el).transitionDuration), '0s')
    assert.equal(await page.$eval('.next-button svg', el => getComputedStyle(el).transitionDuration), '0s')
    results.push('reduced-motion: control and arrow transitions 0s')
    await page.close()
  }

  await readFile(`${out}/writing-desktop-right.png`)
  console.log(results.map(r => 'PASS ' + r).join('\n'))
  console.log(`PASS: ${results.length} cross/navigation checks.`)
} finally {
  await browser.close()
}
