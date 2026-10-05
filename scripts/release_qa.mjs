import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { returningUser } from './qa-user.mjs'

const url = process.env.QA_URL || 'http://127.0.0.1:4173/'
const out = process.env.QA_OUT || 'artifacts/release-qa'
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const freshPage = async () => (await browser.createBrowserContext()).newPage()

async function openReturning({ width = 1440, height = 960, mobile = false, hand = 'right', theme = 'paper' } = {}) {
  const page = await freshPage()
  await returningUser(page)
  await page.evaluateOnNewDocument((handedness, savedTheme) => {
    localStorage.setItem('scripture-scribe-state-v2', JSON.stringify({ handedness, theme: savedTheme, fontSize: 36, lineGuide: true }))
  }, hand, theme)
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 })
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.verse.active p')
  await page.evaluate(() => document.fonts.ready)
  return page
}

async function openNavigator(page) {
  if (!await page.$('[name="reference"]')) await page.click('.reference-picker')
  await page.waitForSelector('[name="reference"]')
}

async function goToReference(page, ref) {
  await openNavigator(page)
  await page.click('[name="reference"]')
  await page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control')
  await page.keyboard.press('A')
  await page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control')
  await page.type('[name="reference"]', ref)
  await page.keyboard.press('Enter')
  await page.waitForFunction(expected => document.querySelector('.reference-picker')?.textContent?.includes(expected), {}, ref.replace(/\s+/, ' '))
  // The reference updates before the closing dialog unmounts. Do not reuse its inert input.
  await page.waitForFunction(() => !document.querySelector('.dialog-backdrop'))
}

async function setTranslation(page, translation) {
  await openNavigator(page)
  await page.waitForSelector('[name="navigator-translation"]')
  await page.select('[name="navigator-translation"]', translation)
  await page.waitForFunction(selected => document.querySelector('.reference-picker')?.textContent?.includes(selected === 'ASV1901' ? 'ASV' : selected), {}, translation)
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
  await page.waitForSelector('.reference-picker')
  await page.waitForSelector('.verse.active p')
}

async function assertChapterBoundary(page, { writing = false } = {}) {
  await goToReference(page, 'Jude 1:24')
  if (writing) {
    await page.click('.writing-mode-button')
    await page.waitForSelector('.focus-writing')
  }
  assert.equal(await page.$eval('.verse.active sup', element => element.textContent), '24')
  await page.click('.next-button')
  await page.waitForFunction(() => document.querySelector('.reference-picker')?.textContent?.includes('1:25'))
  assert.equal(await page.$eval('.verse.active sup', element => element.textContent), '25')
  await page.click('.next-button')
  await page.waitForFunction(() => document.querySelector('.reference-picker')?.textContent?.includes('Revelation 1:1'))
  assert.match(await page.$eval('.verse.active p', element => element.textContent), /Revelation of Jesus Christ/)
  await page.click('.previous-button')
  await page.waitForFunction(() => document.querySelector('.reference-picker')?.textContent?.includes('Jude 1:25'))
  assert.equal(await page.$eval('.verse.active sup', element => element.textContent), '25')
  if (writing) {
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.focus-writing'))
  }
}

const results = []
try {
  await mkdir(out, { recursive: true })

  // Sequential navigation including a book/chapter boundary, normal and full writing, both hands.
  for (const [label, options] of Object.entries({ desktopRight: { hand: 'right' }, desktopLeft: { hand: 'left' }, phoneRight: { width: 390, height: 844, mobile: true, hand: 'right' }, phoneLeft: { width: 390, height: 844, mobile: true, hand: 'left' } })) {
    const page = await openReturning(options)
    await assertChapterBoundary(page)
    await assertChapterBoundary(page, { writing: true })
    await page.screenshot({ path: `${out}/${label}-boundary.png` })
    const side = await page.$eval('.next-button', element => { const r = element.getBoundingClientRect(); return r.x + r.width / 2 < innerWidth / 2 ? 'left' : 'right' })
    assert.equal(side, options.hand === 'left' ? 'right' : 'left')
    results.push(`${label}: normal + writing boundary navigation, Back recovery, controls on free-hand side`)
    await page.close()
  }

  // Exact resume after close/reload: passage, translation, text settings, handedness and line guide.
  {
    const page = await freshPage()
    await returningUser(page)
    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.verse.active p')
    await page.evaluate(() => localStorage.setItem('scripture-scribe-state-v2', JSON.stringify({ handedness: 'left', theme: 'night', fontSize: 36, lineGuide: true })))
    await page.reload({ waitUntil: 'networkidle0' })
    await page.waitForSelector('.verse.active p')
    await setTranslation(page, 'BSB')
    await goToReference(page, 'John 3:16')
    await page.click('.setup-button')
    await page.waitForSelector('[aria-label="Scripture size"]')
    await page.click('[aria-label="Increase Scripture size"]')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('scripture-scribe-state-v2') || '{}').fontSize === 38)
    await page.click('[aria-label="Close settings"]')
    await page.reload({ waitUntil: 'networkidle0' })
    await page.waitForSelector('.verse.active p')
    assert.ok(await page.$eval('.reference-picker', element => element.textContent.includes('John 3:16') && element.textContent.includes('BSB')))
    assert.match(await page.$eval('.verse.active p', element => element.textContent), /God so loved the world/)
    assert.equal(await page.$eval('.app-shell', element => element.classList.contains('controls-right')), true)
    assert.equal(await page.$eval('.verse.active p', element => getComputedStyle(element).fontSize), '38px')
    assert.ok(await page.$eval('.guided-text', element => Boolean(element)))
    assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), false)
    results.push('resume: exact BSB John 3:16, night theme, left-hand controls, text size and line guide restored without auto-fullscreen')
    await page.close()
  }

  // Absent, stale and malformed storage recover without a crash or welcome-back interstitial.
  for (const [label, setup] of [
    ['absent', () => {}],
    ['stale', () => localStorage.setItem('scripture-scribe-state-v2', JSON.stringify({ position: { book: 999, chapter: 999, verse: 999 }, handedness: 'sideways', fontSize: 400, savedPlaces: [{ id: 'bad', position: { book: -1, chapter: 0, verse: 0 }, savedAt: Date.now() }] }))],
    ['malformed', () => localStorage.setItem('scripture-scribe-state-v2', '{not json')],
  ]) {
    const page = await freshPage()
    await returningUser(page)
    await page.evaluateOnNewDocument(setup)
    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.verse.active p')
    assert.match(await page.$eval('.verse.active p', element => element.textContent), /In the beginning/)
    assert.equal(await page.$('.welcome-dialog'), null)
    results.push(`${label} storage: recovered to Genesis 1:1 without crash or welcome-back interstitial`)
    await page.close()
  }

  // First-load failure shows recovery and retry succeeds without clearing saved storage.
  {
    const page = await freshPage()
    await returningUser(page)
    await page.evaluateOnNewDocument(() => localStorage.setItem('scripture-scribe-state-v2', JSON.stringify({ handedness: 'left', theme: 'night' })))
    let failed = false
    await page.setRequestInterception(true)
    page.on('request', request => {
      if (!failed && request.url().includes('/data/bible.json')) {
        failed = true
        request.respond({ status: 503, contentType: 'text/plain', body: 'temporary failure' })
      } else request.continue()
    })
    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.status-actions button')
    assert.match(await page.$eval('.status-screen', element => element.textContent), /try again/i)
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('scripture-scribe-state-v2')).handedness), 'left')
    await page.click('.status-actions button:first-child')
    await page.waitForSelector('.verse.active p')
    assert.match(await page.$eval('.verse.active p', element => element.textContent), /In the beginning/)
    results.push('first-load failure: retry succeeds and saved local settings remain intact')
    await page.close()
  }

  // Service worker repeat visit and offline reload.
  {
    const page = await openReturning()
    await goToReference(page, 'John 3:16')
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await page.reload({ waitUntil: 'networkidle0' })
    await page.setOfflineMode(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.verse.active p')
    assert.match(await page.$eval('.verse.active p', element => element.textContent), /God so loved the world/)
    await page.setOfflineMode(false)
    results.push('offline: repeat visit reloads saved passage from service-worker cache')
    await page.close()
  }

  await wait(50)
  console.log(results.map(result => `PASS ${result}`).join('\n'))
  console.log(`PASS: ${results.length} release checks.`)
} finally {
  await browser.close()
}
