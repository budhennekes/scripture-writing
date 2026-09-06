import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
  for (const reduced of [false, true]) {
    const page = await browser.newPage()
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }])
    await page.goto(process.env.QA_URL || 'http://127.0.0.1:4173/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'networkidle0' })
    await page.waitForSelector('.verse.active')
    await page.evaluate(() => {
      window.motionCalls = []
      const animate = Element.prototype.animate
      Element.prototype.animate = function (...args) {
        window.motionCalls.push({ tag: this.tagName, className: this.getAttribute('class'), bookmark: Boolean(this.closest('.bookmark-button')) })
        return animate.apply(this, args)
      }
    })
    await page.click('.bookmark-button')
    await page.waitForSelector('.bookmark-button.selected')
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('scripture-scribe-library-v3')))
    assert.equal(saved.translations.WEB.savedPlaces.length, 1)
    assert.equal(await page.evaluate(() => window.motionCalls.filter(c => c.bookmark).length), reduced ? 0 : 1)
    await page.keyboard.press('ArrowRight')
    await page.waitForFunction(() => document.querySelector('.passage-button').textContent.includes('1:2'))
    assert.equal(await page.evaluate(() => window.motionCalls.filter(c => c.className?.includes('next-button')).length), reduced ? 0 : 1)
    assert.equal(await page.evaluate(() => window.motionCalls.filter(c => c.tag === 'ARTICLE').length), 0)
    await page.evaluate(() => { window.motionCalls = []; Storage.prototype.setItem = () => { throw new Error('Storage blocked') } })
    await page.click('.bookmark-button')
    await page.waitForFunction(() => document.querySelector('.saved-status').textContent.includes('Not saved'))
    assert.equal(await page.evaluate(() => window.motionCalls.filter(c => c.bookmark).length), 0, 'Failed save must not celebrate')
    await page.click('.writing-tools button:nth-of-type(2)')
    await page.click('.guided-text')
    await page.focus('.guided-text')
    const top = () => page.$eval('.guided-text', e => e.style.getPropertyValue('--guide-top'))
    const before = await top()
    await page.evaluate(() => document.querySelector('.guided-text').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', repeat: true, bubbles: true })))
    assert.equal(await top(), before)
    await page.keyboard.down('Shift'); await page.keyboard.press('ArrowDown'); await page.keyboard.up('Shift')
    assert.equal(await top(), before)
    const marker = await page.$eval('.guided-text', e => ({ width: getComputedStyle(e, '::before').width, background: getComputedStyle(e).backgroundImage, animation: getComputedStyle(e, '::before').animationName }))
    assert.deepEqual(marker, { width: '2px', background: 'none', animation: 'none' })
    await page.close()
  }
  console.log('PASS: successful-save-only ribbon, tactile keyboard control without Scripture animation, reduced motion, failed-save silence, static 2px margin marker, guide repeat/modifier guards.')
} finally { await browser.close() }
