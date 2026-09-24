import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { returningUser } from './qa-user.mjs'

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const url = process.env.QA_URL || 'http://127.0.0.1:5173/'

try {
  await mkdir('artifacts/simplify-qa', { recursive: true })
  for (const [width, height, label] of [[1440, 900, 'desktop'], [768, 900, 'tablet'], [390, 844, 'phone']]) {
    const page = await browser.newPage()
    await returningUser(page)
    await page.setViewport({ width, height })
    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.verse.active')
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.$('.landscape-scene'), null, 'Decorative room remains in the reader DOM')
    assert.equal(await page.$('.room-identity'), null, 'Decorative room identity remains in the reader DOM')
    assert.equal(await page.$('.reader-random'), null, 'Random is duplicated in the reader toolbar')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Reader overflows horizontally')
    const toolbar = await page.$eval('.writing-tools', element => {
      const rect = element.getBoundingClientRect()
      return [...element.querySelectorAll('button')].map(button => {
        const bounds = button.getBoundingClientRect()
        return { text: button.textContent?.trim(), width: bounds.width, height: bounds.height, inToolbar: bounds.top >= rect.top - 1 && bounds.bottom <= rect.bottom + 1 }
      })
    })
    assert.ok(toolbar.every(button => button.height >= 40 && button.inToolbar), JSON.stringify({ label, toolbar }))
    await page.screenshot({ path: `artifacts/simplify-qa/${label}-reader.png` })
    await page.click('[aria-label="Open settings"]')
    await page.waitForSelector('[role="dialog"]')
    await new Promise(resolve => setTimeout(resolve, 300))
    await page.screenshot({ path: `artifacts/simplify-qa/${label}-settings.png` })
    await page.keyboard.press('Escape')
    await page.waitForSelector('[role="dialog"]', { hidden: true })
    await page.click('.writing-mode-button')
    await page.waitForFunction(() => document.querySelector('.writing-mode-button')?.textContent?.trim() === 'Exit writing mode')
    await page.screenshot({ path: `artifacts/simplify-qa/${label}-writing.png` })
    const beforeAdvance = await page.$eval('.reference-picker', element => element.textContent || '')
    await page.keyboard.press('ArrowRight')
    await page.waitForFunction(previous => document.querySelector('.reference-picker')?.textContent !== previous, {}, beforeAdvance)
    await page.click('.writing-mode-button')
    await page.close()
  }

  const reducedPage = await browser.newPage()
  await returningUser(reducedPage)
  await reducedPage.setViewport({ width: 390, height: 844 })
  await reducedPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await reducedPage.goto(url, { waitUntil: 'networkidle0' })
  await reducedPage.waitForSelector('.verse.active')
  assert.equal(await reducedPage.$eval('.writing-mode-button', element => getComputedStyle(element).transitionDuration), '0s')
  await reducedPage.click('.writing-mode-button')
  await reducedPage.screenshot({ path: 'artifacts/simplify-qa/phone-reduced-writing.png' })
  await reducedPage.close()
  console.log('PASS: simplified reader has no decorative room or duplicate random action; desktop, tablet, and phone toolbar controls fit; settings and writing flow work; arrows advance; reduced motion removes transitions.')
} finally {
  await browser.close()
}
