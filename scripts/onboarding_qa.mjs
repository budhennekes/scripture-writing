import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const url=process.env.QA_URL||'http://127.0.0.1:4173/'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const delay=ms=>new Promise(r=>setTimeout(r,ms))
const reports=[]
await fs.mkdir('qa',{recursive:true})
const ready=async p=>{await p.goto(url,{waitUntil:'networkidle0'});await p.waitForSelector('.verse.active');await p.evaluate(()=>document.fonts.ready)}
try {
 for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,568],[844,390]]) {
  const context=await browser.createBrowserContext(),p=await context.newPage(),errors=[]
  p.on('pageerror',e=>errors.push(e.message))
  await p.setViewport({width,height,isMobile:width<1000,hasTouch:width<1000})
  await ready(p);await p.waitForSelector('.welcome-dialog[role=dialog]');await delay(250)
  assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Skip introduction')
  assert.ok(await p.$eval('.reader-panel',e=>e.inert))
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await p.screenshot({path:`qa/introduction-${width}.png`})
  await p.keyboard.down('Shift');await p.keyboard.press('Tab');await p.keyboard.up('Shift')
  assert.ok(await p.evaluate(()=>document.activeElement.classList.contains('welcome-skip')))
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Skip introduction')
  await p.click('.hand-choice button:nth-child(2)');await delay(250)
  assert.ok(await p.$('.controls-right'))
  assert.ok(await p.$eval('.welcome-desk',e=>e.querySelector('.desk-control').getBoundingClientRect().x>e.querySelector('.desk-page').getBoundingClientRect().x))
  await p.click('.welcome-start');await p.waitForSelector('.navigator-dialog[role=dialog]');await delay(250)
  if(width<1000) assert.notEqual(await p.evaluate(()=>document.activeElement.tagName),'INPUT')
  await p.click('.starting-points button:nth-child(2)');await p.waitForFunction(()=>!document.querySelector('[role=dialog]'))
  assert.match(await p.$eval('.reference-picker',e=>e.textContent),/John 1:1/)
  assert.equal(await p.evaluate(()=>localStorage.getItem('scripture-scribe-introduction-v1')),'seen')
  await p.keyboard.press('d');assert.equal(await p.$eval('.verse.active sup',e=>e.textContent),'2')
  await p.reload({waitUntil:'networkidle0'});assert.equal(await p.$('.welcome-dialog'),null);assert.ok(await p.$('.controls-right'))
  assert.match(await p.$eval('.reference-picker',e=>e.textContent),/John 1:2/)
  await p.click('.setup-button');await delay(250);await p.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent==='Show introduction').click());await delay(250)
  assert.match(await p.$eval('.welcome-skip',e=>e.textContent),/John 1:2/)
  await p.click('[aria-label="Skip introduction"]');await delay(200)
  assert.equal(await p.evaluate(()=>document.activeElement.className),'verse active')
  assert.deepEqual(errors,[]);reports.push({viewport:`${width}x${height}`,result:'PASS first visit, focus trap, handedness preview/persistence, starting passage, D advance, reload, replay and skip'})
  await context.close()
 }
 const context=await browser.createBrowserContext(),p=await context.newPage()
 await p.setViewport({width:1440,height:900});await p.evaluateOnNewDocument(()=>localStorage.setItem('scripture-scribe-state-v2',JSON.stringify({position:{book:42,chapter:2,verse:15},handedness:'right'})))
 await ready(p);assert.equal(await p.$('.welcome-dialog'),null);assert.match(await p.$eval('.reference-picker',e=>e.textContent),/John 3:16/)
 await p.click('.reference-picker');await delay(250);await p.click('.testament-tabs button:first-child');await p.click('[aria-controls="chapters-GEN"]');await delay(250)
 assert.equal(await p.$$eval('#chapters-GEN button',es=>es.length),50)
 await p.screenshot({path:'qa/introduction-book-expanded.png'})
 await p.click('[aria-controls="chapters-GEN"]');await p.click('[aria-controls="chapters-GEN"]');await delay(300)
 assert.ok(await p.$('#chapters-GEN:not([inert])'))
 await p.click('[aria-controls="chapters-GEN"]');await delay(220);assert.equal(await p.$('#chapters-GEN'),null)
 await p.keyboard.press('Escape');await p.click('.setup-button');await delay(240);assert.ok(await p.$('[aria-labelledby="settings-title"][role=dialog]'))
 await p.keyboard.press('Escape');await delay(200)
 await p.evaluate(()=>{document.documentElement.requestFullscreen=undefined})
 const samples=await p.evaluate(async()=>{
  const rect=()=>{const r=document.querySelector('.verse.active p').getBoundingClientRect();return [r.x,r.y,r.width]}
  const before=rect();document.querySelector('.writing-mode-button').click();const frames=[]
  for(let i=0;i<24;i++){await new Promise(requestAnimationFrame);frames.push(rect())}
  return {before,frames,animations:document.querySelector('.verse.active').getAnimations({subtree:true}).length}
 })
 for(const frame of samples.frames)frame.forEach((v,i)=>assert.ok(Math.abs(v-samples.before[i])<2))
 assert.equal(samples.animations,0);await p.screenshot({path:'qa/introduction-writing.png'})
 await p.keyboard.press('Escape');await p.click('.bookmark-button');await p.waitForSelector('.bookmark-confirmation')
 assert.ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('scripture-scribe-library-v3')).translations.WEB.savedPlaces.length===1))
 await delay(1700);assert.equal(await p.$('.bookmark-confirmation'),null)
 await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await p.click('.reference-picker');await delay(120)
 assert.equal(await p.$eval('.settings-dialog',e=>getComputedStyle(e).animationName),'none')
 await p.click('.testament-tabs button:first-child');await p.click('[aria-controls="chapters-GEN"]');assert.equal(await p.$eval('#chapters-GEN',e=>e.getAnimations().length),0)
 await p.keyboard.press('Escape');assert.equal(await p.$('.dialog-backdrop'),null)
 reports.push({case:'returning user and motion',result:'PASS legacy position, reversible chapter/panel transitions, 24 stable writing frames, save confirmation, reduced motion'})
 await context.close()
 const failureContext=await browser.createBrowserContext(),failure=await failureContext.newPage()
 await failure.evaluateOnNewDocument(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError')}})
 await ready(failure);await failure.click('[aria-label="Skip introduction"]');await delay(200);await failure.click('.bookmark-button');await delay(200)
 assert.equal(await failure.$('.bookmark-confirmation'),null);assert.match(await failure.$eval('.saved-status',e=>e.textContent),/Not saved/)
 reports.push({case:'storage unavailable',result:'PASS reader remains usable; no false saved confirmation'})
 await failureContext.close()
 await fs.writeFile('qa/onboarding-results.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2))
} finally {await browser.close()}
