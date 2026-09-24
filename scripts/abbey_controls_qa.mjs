import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'
import { returningUser } from './qa-user.mjs'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
const url = process.env.QA_URL || 'http://127.0.0.1:5173/'

try {
  await mkdir('artifacts/abbey-controls-qa', { recursive: true })
  for (const [width, height, label] of [[1440, 900, 'desktop'], [768, 900, 'tablet'], [390, 844, 'phone']]) {
    const page = await browser.newPage()
    await returningUser(page)
    await page.setViewport({ width, height })
    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.verse.active')
    await page.evaluate(() => document.fonts.ready)

    const controls = await page.$eval('.control-rail', rail => {
      const next = rail.querySelector('.next-button')
      const back = rail.querySelector('.previous-button')
      if (!next || !back) throw new Error('Reader controls are missing.')
      const nextStyle = getComputedStyle(next)
      const backStyle = getComputedStyle(back)
      const nextBounds = next.getBoundingClientRect()
      const backBounds = back.getBoundingClientRect()
      return {
        next: { width: nextBounds.width, height: nextBounds.height, background: nextStyle.backgroundColor, color: nextStyle.color, shadow: nextStyle.boxShadow, radius: nextStyle.borderRadius },
        back: { width: backBounds.width, height: backBounds.height, background: backStyle.backgroundColor, color: backStyle.color, radius: backStyle.borderRadius },
        root: {
          page: getComputedStyle(document.documentElement).getPropertyValue('--page').trim(),
          limestone: getComputedStyle(document.documentElement).getPropertyValue('--page-deep').trim(),
          olive: getComputedStyle(document.documentElement).getPropertyValue('--olive').trim(),
          amber: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        },
      }
    })

    assert.equal(controls.root.page, '#fffdf7')
    assert.equal(controls.root.limestone, '#e9e1cf')
    assert.equal(controls.root.olive, '#3c5a41')
    assert.equal(controls.root.amber, '#a9702f')
    assert.ok(controls.next.width >= 44 && controls.next.height >= 44, `${label}: Next misses the minimum touch target.`)
    assert.ok(controls.back.width >= 44 && controls.back.height >= 44, `${label}: Back misses the minimum touch target.`)
    assert.notEqual(controls.next.background, controls.back.background, `${label}: Next and Back need distinct hierarchy.`)
    assert.notEqual(controls.next.shadow, 'none', `${label}: Next needs restrained elevation.`)
    assert.notEqual(controls.next.radius, '0px', `${label}: Next needs a refined corner treatment.`)
    await page.screenshot({ path: `artifacts/abbey-controls-qa/${label}-after.png` })
    await page.close()
  }

  const page = await browser.newPage()
  await returningUser(page)
  await page.setViewport({ width: 390, height: 844 })
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.verse.active')
  await page.click('.setup-button')
  await page.click('.background-options button:nth-child(4)')
  assert.equal(await page.$eval('html', element => element.dataset.theme), 'night')
  const night = await page.$eval('.next-button', button => ({
    background: getComputedStyle(button).backgroundColor,
    color: getComputedStyle(button).color,
    nextText: button.textContent?.trim(),
    transition: getComputedStyle(button).transitionDuration,
  }))
  assert.equal(night.nextText, 'Next')
  assert.notEqual(night.background, night.color, 'Night Next needs visible foreground contrast.')
  await page.keyboard.press('Escape')
  await page.waitForSelector('[role="dialog"]', { hidden: true })
  await new Promise(resolve => setTimeout(resolve, 200))
  await page.screenshot({ path: 'artifacts/abbey-controls-qa/phone-night-after.png' })

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await page.$eval('.next-button', button => getComputedStyle(button).transitionDuration), '0s')
  await page.close()
  console.log('PASS: abbey palette roles, primary/secondary control hierarchy, touch targets, night contrast, and reduced-motion controls verified at desktop, tablet, and phone widths.')
} finally {
  await browser.close()
}
