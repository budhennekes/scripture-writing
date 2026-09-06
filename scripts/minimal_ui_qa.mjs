import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const url=process.env.QA_URL||'http://127.0.0.1:4173/'
await mkdir('artifacts/minimal-ui',{recursive:true})
try {
 const page=await browser.newPage()
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(url,{waitUntil:'networkidle0'})
 // Legacy-only fixture: preserve the existing theme key and writing hand.
 await page.evaluate(()=>{localStorage.clear();localStorage.setItem('scripture-scribe-settings-v1',JSON.stringify({theme:'paper',handedness:'left',fontSize:36}))})
 await page.reload({waitUntil:'networkidle0'})
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'paper')
 assert.equal(await page.$eval('.app-shell',el=>el.classList.contains('controls-right')),true)
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]) {
  await page.setViewport(viewport)
  await page.click('[aria-label="Open settings"]')
  assert.deepEqual(await page.$$eval('.background-options button',els=>els.map(el=>el.textContent)),['White','Soft gray','Pale sage','Night'])
  await page.screenshot({path:`artifacts/minimal-ui/settings-${viewport.width}.png`})
  await page.click('[aria-label="Close settings"]')
  assert.equal(await page.$('.theme-button'),null)
  const bounds=await page.$$eval('.rail-button',els=>els.map(el=>({w:el.offsetWidth,h:el.offsetHeight})))
  assert.ok(bounds.every(b=>b.w>=44&&b.h>=44))
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.screenshot({path:`artifacts/minimal-ui/reader-${viewport.width}.png`})
  await page.click('.writing-mode-button')
  assert.equal(await page.$eval('[role="progressbar"]',el=>getComputedStyle(el).visibility),'visible')
  await page.screenshot({path:`artifacts/minimal-ui/writing-${viewport.width}.png`})
  await page.click('.writing-mode-button')
 }
 // Actual source numbering has gaps: the last number, not entry count, is the denominator.
 await page.select('[name="translation"]','ASV1901')
 await page.waitForFunction(()=>document.querySelector('.chapter-kicker')?.textContent.includes('American Standard'))
 await page.click('.passage-button');await page.type('[name="reference"]','Matthew 17:27');await page.keyboard.press('Enter')
 await page.waitForFunction(()=>document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')==='27')
 assert.equal(await page.$eval('[role="progressbar"]',el=>el.getAttribute('aria-valuemax')),'27')
 assert.match(await page.$eval('[role="progressbar"]',el=>el.textContent),/Matthew 17 · Verse 27 of 27/)
 assert.deepEqual(errors,[])
 console.log('Minimal UI QA PASS: legacy White/hand migration, desktop/mobile settings and reader, >=44px targets, no overflow, writing position visibility, ASV numbering gap. Screenshots: artifacts/minimal-ui/')
} finally {await browser.close()}
