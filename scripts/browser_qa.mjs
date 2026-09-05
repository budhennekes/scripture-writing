import puppeteer from 'puppeteer-core'
import { mkdir } from 'node:fs/promises'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 })
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForSelector('.verse.active')

  const activeText = () => page.$eval('.verse.active p', (node) => node.textContent)
  const referenceText = () => page.$eval(
    '.passage-button',
    (node) => `${node.querySelector('span')?.textContent} ${node.querySelector('strong')?.textContent}`,
  )

  if ((await referenceText()) !== 'Genesis 1:1') throw new Error('Initial reference is incorrect.')
  if (!(await activeText())?.startsWith('In the beginning')) throw new Error('Initial verse is incorrect.')

  await page.keyboard.press('Space')
  await page.waitForFunction(() => document.querySelector('.passage-button')?.textContent?.includes('1:2'))
  if (!(await activeText())?.startsWith('The earth was formless')) throw new Error('Space did not advance.')

  await page.click('.passage-button')
  await page.waitForSelector('.navigator-dialog')
  await page.type('input[name="reference"]', 'John 3:16')
  await page.waitForFunction(() => document.querySelector('.reference-result strong')?.textContent === 'John 3:16')
  await mkdir('qa', { recursive: true })
  await page.screenshot({ path: 'qa/navigator-search.png', fullPage: true })
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('.passage-button')?.textContent?.includes('3:16'))
  if (!(await activeText())?.includes('For God so loved the world')) throw new Error('Direct reference navigation failed.')

  await page.click('.bookmark-button')
  await page.waitForSelector('.bookmark-button.selected')
  await page.click('.passage-button')
  await page.waitForSelector('.saved-place')
  const savedReference = await page.$eval('.saved-place-link strong', (node) => node.textContent)
  if (savedReference !== 'John 3:16') throw new Error('Saved place is incorrect.')
  await page.screenshot({ path: 'qa/saved-place.png', fullPage: true })
  await page.keyboard.press('Escape')

  await page.click('button[aria-label="Open settings"]')
  await page.waitForSelector('.settings-dialog')
  await page.evaluate(() => {
    const groups = document.querySelectorAll('.settings-group')
    const buttons = groups[0].querySelectorAll('button')
    buttons[1].click()
  })
  await page.screenshot({ path: 'qa/settings.png', fullPage: true })
  await page.click('.settings-dialog .primary-button')
  await page.waitForSelector('.app-shell.controls-right')

  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => document.querySelector('.passage-button')?.textContent?.includes('3:17'))

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('scripture-scribe-state-v2') ?? '{}'))
  if (saved.handedness !== 'left' || saved.position.book !== 42 || saved.position.chapter !== 2 || saved.position.verse !== 16) {
    throw new Error('Progress or handedness was not saved.')
  }
  if (saved.savedPlaces.length !== 1 || saved.savedPlaces[0].position.verse !== 15) {
    throw new Error('Bookmark was not saved.')
  }

  await page.screenshot({ path: 'qa/desktop.png', fullPage: true })

  await page.setViewport({ width: 820, height: 1180, deviceScaleFactor: 1 })
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForSelector('.verse.active')
  const railWidth = await page.$eval('.control-rail', (node) => Math.round(node.getBoundingClientRect().width))
  if (railWidth !== 108) throw new Error(`Tablet rail width is ${railWidth}px, expected 108px.`)
  await page.screenshot({ path: 'qa/tablet.png', fullPage: true })

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForSelector('.verse.active')
  const mobileRailWidth = await page.$eval('.control-rail', (node) => Math.round(node.getBoundingClientRect().width))
  if (mobileRailWidth !== 74) throw new Error(`Mobile rail width is ${mobileRailWidth}px, expected 74px.`)
  await page.click('.passage-button')
  await page.waitForSelector('.navigator-dialog')
  await page.screenshot({ path: 'qa/mobile-navigator.png', fullPage: true })
  await page.keyboard.press('Escape')
  await page.screenshot({ path: 'qa/mobile.png', fullPage: true })

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await page.setOfflineMode(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.verse.active')
  if ((await referenceText()) !== 'John 3:17') throw new Error('Offline reload did not preserve the active Scripture.')
  await page.setOfflineMode(false)

  console.log('Browser QA passed:')
  console.log('- Full Bible loaded and Genesis 1:1 rendered')
  console.log('- Space and arrow navigation advanced one verse')
  console.log('- Direct reference entry opened John 3:16')
  console.log('- Bookmark saved and appeared in Saved places')
  console.log('- Left-handed mode moved controls to the right')
  console.log('- Position, settings, and bookmarks persisted locally')
  console.log('- Offline reload preserved John 3:17')
  console.log('- Desktop, tablet, mobile, search, and settings screenshots rendered')
} finally {
  await browser.close()
}
