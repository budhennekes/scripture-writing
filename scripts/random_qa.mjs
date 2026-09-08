import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const p=await browser.newPage();await p.setViewport({width:1440,height:900});
 await p.goto(process.env.QA_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle0'});await p.waitForSelector('.verse.active')
 const saved=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('scripture-scribe-library-v3')).translations.WEB.position)
 const original=await saved()
 const pick=async()=>{await p.click('.reference-picker');await p.waitForSelector('.random-verse');await p.click('.random-verse');await p.waitForFunction(()=>document.querySelector('.reference-picker').textContent.includes('Random'))}
 await pick();assert.deepEqual(await saved(),original)
 const ref=await p.$eval('.reference-picker',e=>e.textContent)
 await pick();assert.notEqual(await p.$eval('.reference-picker',e=>e.textContent),ref);assert.deepEqual(await saved(),original)
 await p.keyboard.press('d');assert.deepEqual(await saved(),original)
 await p.click('.bookmark-button');assert.deepEqual(await saved(),original)
 await p.click('.reference-picker');await new Promise(r=>setTimeout(r,350));await p.screenshot({path:'qa/random-desktop.png'});await p.click('.return-place');assert.ok(!(await p.$eval('.reference-picker',e=>e.textContent)).includes('Random'))
 await pick();await p.reload({waitUntil:'networkidle0'});await p.waitForSelector('.verse.active');assert.deepEqual(await saved(),original);assert.ok(!(await p.$eval('.reference-picker',e=>e.textContent)).includes('Random'))
 await p.setViewport({width:390,height:844});await p.click('.writing-mode-button');await pick();await p.click('.reference-picker');assert.equal(await p.$eval('.return-place',e=>getComputedStyle(e).visibility),'visible');await new Promise(r=>setTimeout(r,350));await p.screenshot({path:'qa/random-mobile.png'});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.click('.return-place')
 console.log('PASS: random selection changes reference; repeated draws, navigation and bookmarking preserve saved place; return/reload restore it; mobile fullscreen controls reachable.')
} finally {await browser.close()}
