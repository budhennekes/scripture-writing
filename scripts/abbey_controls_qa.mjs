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
        next: { width: nextBounds.width, height: nextBounds.height, background: nextStyle.backgroundColor, color: nextStyle.color, shadow: nextStyle.boxShadow, radius: nextStyle.borderRadius, weight: Number(nextStyle.fontWeight) },
        back: { width: backBounds.width, height: backBounds.height, background: backStyle.backgroundColor, color: backStyle.color, radius: backStyle.borderRadius, weight: Number(backStyle.fontWeight) },
        root: {
          page: getComputedStyle(document.documentElement).getPropertyValue('--page').trim(),
          limestone: getComputedStyle(document.documentElement).getPropertyValue('--page-deep').trim(),
          inkRgb: (() => { const probe = document.createElement('span'); probe.style.color = 'var(--ink)'; document.body.append(probe); const value = getComputedStyle(probe).color; probe.remove(); return value })(),
          amber: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        },
      }
    })

    assert.equal(controls.root.page, '#fffdf7')
    assert.equal(controls.root.limestone, '#e9e1cf')
    assert.equal(controls.root.amber, '#a9702f')
    assert.ok(controls.next.width >= 44 && controls.next.height >= 44, `${label}: Next misses the minimum touch target.`)
    assert.ok(controls.back.width >= 44 && controls.back.height >= 44, `${label}: Back misses the minimum touch target.`)
    // Approved 2026-09-24: neutral reading navigation. Ivory/ink, no green fill, no elevation;
    // hierarchy comes from size and type weight, not saturated colour.
    assert.ok(!['rgb(60, 90, 65)', 'rgb(113, 135, 100)'].includes(controls.next.background), `${label}: Next still uses the retired green fill.`)
    assert.equal(controls.next.shadow, 'none', `${label}: Next should sit flat on the page.`)
    assert.equal(controls.next.color, controls.root.inkRgb, `${label}: Next label should be set in ink.`)
    assert.ok(controls.next.width * controls.next.height > controls.back.width * controls.back.height, `${label}: Next must be the larger target.`)
    assert.ok(controls.next.weight > controls.back.weight || controls.next.width > controls.back.width, `${label}: Next needs typographic priority.`)
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
  console.log('PASS: reader palette roles, neutral ink navigation (no green/elevation), primary/secondary hierarchy, touch targets, night contrast, and reduced-motion controls verified at desktop, tablet, and phone widths.')
} finally {
  await browser.close()
}
