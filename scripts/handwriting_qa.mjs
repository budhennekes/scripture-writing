import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'
import { returningUser } from './qa-user.mjs'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})

try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await returningUser(page)
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(process.env.QA_URL || 'http://127.0.0.1:4173/', { waitUntil: 'networkidle0' })
  await page.waitForSelector('.verse.active p')

  const verseNumber = () => page.$eval('.verse.active sup', element => element.textContent)
  const verseRect = () => page.$eval('.verse.active p', element => element.getBoundingClientRect().toJSON())

  assert.equal(await page.$$eval('.verse', elements => elements.length), 1)
  assert.equal(await page.$('.landscape-scene'), null)
  assert.equal(await page.$('.reader-random'), null)
  assert.equal(await page.$('.shortcut-coach'), null)
  await page.screenshot({ path: 'qa/handwriting-desktop.png' })

  const beforeWriting = await verseRect()
  await page.click('.writing-mode-button')
  await page.waitForFunction(() => document.querySelector('.writing-mode-button')?.textContent?.trim() === 'Exit writing mode')
  assert.deepEqual(await verseRect(), beforeWriting)
  await page.keyboard.press('Space')
  assert.equal(await verseNumber(), '2')
  await page.keyboard.press('ArrowLeft')
  assert.equal(await verseNumber(), '1')
  await page.keyboard.down('Control')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.up('Control')
  assert.equal(await verseNumber(), '1')
  await page.click('.writing-mode-button')
  await page.waitForFunction(() => document.querySelector('.writing-mode-button')?.textContent?.trim() === 'Enter writing mode')

  for (const hand of ['Left', 'Right']) {
    await page.click('.setup-button')
    await page.waitForSelector('[aria-label="Writing hand"]')
    await page.evaluate(selectedHand => {
      const button = [...document.querySelectorAll('[aria-label="Writing hand"] button')]
        .find(element => element.textContent === selectedHand)
      button?.click()
    }, hand)
    await page.click('[aria-label="Close settings"]')
    const target = await page.$eval('.next-button', element => {
      const bounds = element.getBoundingClientRect()
      return { x: bounds.x, width: bounds.width, height: bounds.height }
    })
    assert.ok(target.height >= 44 && target.width >= 44)
    assert.equal(target.x > 720, hand === 'Left')
  }

  await page.click('.setup-button')
  await page.click('.line-guide-button')
  await page.click('[aria-label="Close settings"]')
  await page.click('.guided-text')
  assert.ok(await page.$('.guided-text[data-line-marked]'))

  await page.click('.reference-picker')
  await page.type('[name="reference"]', 'John 3:16')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('.reference-picker')?.textContent?.includes('3:16'))
  await page.click('.page-ribbon')

  for (const translation of ['BSB', 'ASV1901', 'WEB']) {
    await page.click('.reference-picker')
    await page.select('[name="navigator-translation"]', translation)
    await page.waitForFunction(selected => document.querySelector('.reference-picker')?.textContent?.includes(selected === 'ASV1901' ? 'ASV' : selected), {}, translation)
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  await page.setViewport({ width: 390, height: 844 })
  await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth)
  await page.screenshot({ path: 'qa/handwriting-mobile.png' })

  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.setOfflineMode(true)
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForSelector('.verse.active')
  assert.equal(await page.$('.landscape-scene'), null)
  assert.equal(await page.$eval('.reference-picker', element => element.textContent?.includes('3:16')), true)
  assert.deepEqual(errors, [])
  console.log('PASS: simplified reader, writing mode, handed controls, line guide, passage and translation selection, mobile layout, and offline resume.')
} finally {
  await browser.close()
}
