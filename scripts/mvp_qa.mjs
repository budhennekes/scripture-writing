import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import {mkdir,readFile} from 'node:fs/promises'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.setViewport({width:1440,height:960})
 await page.goto('http://127.0.0.1:4173/scripture-writing/',{waitUntil:'networkidle0'})
 await page.evaluate(()=>{localStorage.clear();localStorage.setItem('scripture-scribe-state-v2',JSON.stringify({position:{book:42,chapter:2,verse:15},savedPlaces:[{id:'old',position:{book:42,chapter:2,verse:15},savedAt:1}]}))})
 await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.verse.active')
 assert.match(await page.$eval('.passage-button',e=>e.textContent),/3:16/)
 assert.ok(await page.$('.bookmark-button.selected'))
 const texts={}
 for(const [id,file] of [['WEB','bible'],['ASV1901','asv1901'],['BSB','bsb']]) {
  await page.select('[aria-label="Bible translation"]',id)
  await page.waitForFunction(id=>document.querySelector('.chapter-kicker')?.textContent.includes(id==='BSB'?'Berean':id==='ASV1901'?'American':'World'),{},id)
  const data=JSON.parse(await readFile(`public/data/${file}.json`,'utf8'))
  texts[id]=await page.$eval('.verse.active p',e=>e.textContent)
  assert.equal(texts[id],data.books.find(b=>b.id==='JHN').chapters[2].verses.find(v=>v.number===16).text)
  if(id!=='WEB'){assert.equal(await page.$('.bookmark-button.selected'),null);await page.click('.bookmark-button')}
 }
 await page.click('.writing-tools button:nth-of-type(1)')
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.chapter-label')).opacity==='0')
 assert.equal(await page.$eval('.chapter-label',e=>getComputedStyle(e).display),'block')
 await page.click('.writing-tools button:nth-of-type(2)');await page.click('.verse.active p')
 assert.equal(await page.$eval('.verse.active p',e=>e.textContent),texts.BSB)
 assert.equal(await page.$eval('.verse.active p',e=>getComputedStyle(e).backgroundImage),'none')
 assert.equal(await page.$eval('.verse.active p',e=>e.dataset.lineMarked),'true')
 assert.equal(await page.$eval('.verse.active p',e=>getComputedStyle(e,'::before').width),'2px')
 await page.focus('.verse.active p');await page.keyboard.press('ArrowDown')
 assert.match(await page.$eval('.passage-button',e=>e.textContent),/3:16/)
 await mkdir('qa',{recursive:true});await page.screenshot({path:'qa/mvp-focus-desktop.png'})
 await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.screenshot({path:'qa/mvp-focus-mobile.png'})
 await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.verse.active')
 assert.equal(await page.$eval('[aria-label="Bible translation"]',e=>e.value),'BSB')
 await page.select('[aria-label="Bible translation"]','WEB');await page.waitForFunction(()=>document.querySelector('.chapter-kicker')?.textContent.includes('World'))
 assert.ok(await page.$('.bookmark-button.selected'))
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('scripture-scribe-library-v3')))
 assert.equal(Object.keys(state.translations).length,3)
 for(const entry of Object.values(state.translations)){assert.equal(entry.position.bookId,'JHN');assert.equal(entry.savedPlaces.length,1)}
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('blocked')};document.activeElement.blur()})
 await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('.saved-status')?.textContent.includes('Not saved'))
 assert.deepEqual(errors,[])
 console.log('PASS: legacy migration, 3 exact translation verses, isolated bookmarks, canonical persistence/reload, focus, guide text/keyboard, mobile overflow, storage failure. Screenshots saved.')
}finally{await browser.close()}
