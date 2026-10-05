import { returningUser } from './qa-user.mjs'
import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'

const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const QA_URL = process.env.QA_URL || 'http://127.0.0.1:4173/'
const PHONE_VIEWPORT = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }
const LANDSCAPE_PHONE = { width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }

async function rect(page, selector) {
  return page.$eval(selector, element => {
    const r = element.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom }
  })
}

async function assertPhoneControlsInBounds(page, label) {
  const metrics = await page.evaluate(() => {
    const bounds = selector => {
      const node = document.querySelector(selector)
      if (!node) return null
      const r = node.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, right: r.right }
    }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      next: bounds('.next-button'),
      back: bounds('.previous-button'),
    }
  })
  assert.ok(metrics.next, `${label}: missing Next control`)
  assert.ok(metrics.back, `${label}: missing Back control`)
  assert.ok(metrics.next.h >= 48, `${label}: Next target is too short: ${JSON.stringify(metrics.next)}`)
  assert.ok(metrics.back.h >= 44, `${label}: Back target is too short: ${JSON.stringify(metrics.back)}`)
  assert.ok(metrics.next.b <= metrics.viewport.height, `${label}: Next clips below viewport: ${JSON.stringify(metrics)}`)
  assert.ok(metrics.back.b <= metrics.viewport.height, `${label}: Back clips below viewport: ${JSON.stringify(metrics)}`)
  assert.ok(metrics.next.y >= 0 && metrics.back.y >= 0, `${label}: controls start outside viewport: ${JSON.stringify(metrics)}`)
  assert.ok(metrics.next.right <= metrics.viewport.width && metrics.back.right <= metrics.viewport.width, `${label}: controls overflow horizontally: ${JSON.stringify(metrics)}`)
  assert.ok(metrics.scrollWidth <= metrics.viewport.width, `${label}: page horizontally overflows: ${JSON.stringify(metrics)}`)
}

async function setHandedness(page, hand) {
  await page.click('.setup-button')
  await page.evaluate(handedness => {
    const option = [...document.querySelectorAll('.segmented-control button')].find(element => element.textContent === handedness)
    option?.click()
  }, hand)
  await page.click('[aria-label="Close settings"]')
}

async function openJohn316(page) {
  await page.click('.reference-picker')
  await new Promise(resolve => setTimeout(resolve, 300))
  await page.type('[name=reference]', 'John 3:16')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => !document.querySelector('[role=dialog]'))
  assert.match(await page.$eval('.reference-picker', element => element.textContent), /John 3:16/)
}

async function verifyFreshLandscapeWritingBounds(hand) {
  const context = await b.createBrowserContext()
  const page = await context.newPage()
  await returningUser(page)
  await page.setViewport(LANDSCAPE_PHONE)
  await page.goto(QA_URL, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.verse.active')
  await setHandedness(page, hand)
  await openJohn316(page)
  await page.evaluate(() => { document.documentElement.requestFullscreen = undefined })
  await page.click('.writing-mode-button')
  await page.waitForSelector('.focus-writing')
  await new Promise(resolve => setTimeout(resolve, 400))
  await assertPhoneControlsInBounds(page, `fresh landscape writing ${hand}`)
  await page.close()
  await context.close()
}

async function verifyPortraitToLandscapeWritingBounds(hand) {
  const context = await b.createBrowserContext()
  const page = await context.newPage()
  await returningUser(page)
  await page.setViewport(PHONE_VIEWPORT)
  await page.goto(QA_URL, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.verse.active')
  await setHandedness(page, hand)
  await openJohn316(page)
  await page.evaluate(() => { document.documentElement.requestFullscreen = undefined })
  await page.click('.writing-mode-button')
  await page.waitForSelector('.focus-writing')
  await new Promise(resolve => setTimeout(resolve, 400))
  await assertPhoneControlsInBounds(page, `portrait writing ${hand}`)
  await page.setViewport(LANDSCAPE_PHONE)
  await new Promise(resolve => setTimeout(resolve, 400))
  await assertPhoneControlsInBounds(page, `portrait to landscape writing ${hand}`)
  await page.screenshot({ path: `qa/phone-landscape-writing-${hand.toLowerCase()}.png` })
  await page.close()
  await context.close()
}

try {
  for (const [width, height] of [[320, 568], [375, 667], [390, 844], [430, 932], [844, 390], [768, 1024], [1440, 900]]) {
    const context = await b.createBrowserContext()
    const p = await context.newPage()
    await returningUser(p)
    await p.setViewport({ width, height, isMobile: width < 1000, hasTouch: width < 1000, deviceScaleFactor: 1 })
    await p.goto(QA_URL, { waitUntil: 'networkidle0' })
    await p.waitForSelector('.verse.active')
    const phone = width <= 600 || height < 500
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    const next = await rect(p, '.next-button')
    const back = await rect(p, '.previous-button')
    if (phone) {
      assert.ok(next.h >= 48)
      assert.ok(next.b <= height)
      assert.ok(next.x < back.x)
      assert.ok(next.y > height / 2)
      assert.ok(await p.$eval('.scripture-wrap', e => e.clientWidth > innerWidth - 50))
    }
    await p.click('.next-button')
    assert.equal(await p.$eval('.verse.active sup', e => e.textContent), '2')
    const before = await rect(p, '.verse.active p')
    await p.evaluate(() => { document.documentElement.requestFullscreen = undefined })
    await p.click('.writing-mode-button')
    await p.waitForSelector('.focus-writing')
    const focus = await rect(p, '.verse.active p')
    assert.ok(Math.abs(focus.x - before.x) < 2 && Math.abs(focus.y - before.y) < 2, `anchor ${width}: ${JSON.stringify({ before, focus })}`)
    assert.equal(await p.$('.reader-random'), null)
    if (phone) await assertPhoneControlsInBounds(p, `writing controls ${width}x${height}`)
    await p.click('.next-button')
    assert.equal(await p.$eval('.verse.active sup', e => e.textContent), '3')
    await p.click('.writing-mode-button')
    await setHandedness(p, 'Left')
    if (phone) assert.ok((await rect(p, '.next-button')).x > (await rect(p, '.previous-button')).x)
    await p.click('.reference-picker')
    await new Promise(r => setTimeout(r, 300))
    if (phone) {
      assert.notEqual(await p.evaluate(() => document.activeElement?.tagName), 'INPUT')
      const dialog = await rect(p, '[role=dialog]')
      assert.ok(dialog.w >= width - 2 && dialog.h >= height - 2)
      assert.ok(Math.round((await rect(p, '[role=dialog] .close-button')).h) >= 44)
    }
    await p.type('[name=reference]', 'John 3:16')
    await p.keyboard.press('Enter')
    await p.waitForFunction(() => !document.querySelector('[role=dialog]'))
    assert.match(await p.$eval('.reference-picker', e => e.textContent), /John 3:16/)
    if (width === 390) {
      await p.screenshot({ path: 'qa/phone-reader.png' })
      await p.click('.reference-picker')
      await new Promise(r => setTimeout(r, 1000))
      await p.screenshot({ path: 'qa/phone-chooser.png' })
      await p.click('[aria-label="Close passage navigator"]')
      await p.waitForFunction(() => !document.querySelector('[role=dialog]'))
      await new Promise(r => setTimeout(r, 1000))
      await p.evaluate(() => { document.documentElement.requestFullscreen = undefined })
      await p.click('.writing-mode-button')
      await p.waitForSelector('.focus-writing')
      await new Promise(r => setTimeout(r, 400))
      await assertPhoneControlsInBounds(p, 'phone writing screenshot')
      await p.screenshot({ path: 'qa/phone-writing.png' })
    }
    if (height === 390) await p.screenshot({ path: 'qa/phone-landscape.png' })
    await p.close()
    await context.close()
    console.log(`PASS ${width}x${height}: overflow, navigation, writing anchor, hand mirroring, chooser and reference entry`)
  }
  for (const hand of ['Right', 'Left']) {
    await verifyFreshLandscapeWritingBounds(hand)
    await verifyPortraitToLandscapeWritingBounds(hand)
    console.log(`PASS landscape writing bounds: fresh and rotated ${hand}`)
  }
} finally {
  await b.close()
}
