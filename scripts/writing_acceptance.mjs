import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const url=process.env.QA_URL || 'http://127.0.0.1:4173/'
const results=[]
try {
 for (const reduced of [false,true]) {
  const context=await browser.createBrowserContext()
  const page=await context.newPage();const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.setViewport({width:1440,height:900})
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}])
  await page.goto(url,{waitUntil:'networkidle0'})
  await page.waitForSelector('.verse.active p')
  const clickText=async text=>{const found=await page.evaluate(text=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);if(!b)return false;b.click();b.focus();return true},text);assert.ok(found,`Missing visible action: ${text}`)}
  const rect=()=>page.$eval('.verse.active p',p=>{const r=p.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,text:p.textContent}})
  const reference=()=>page.$eval('.passage-button',p=>p.textContent)
  const before=await rect()
  await clickText('Enter writing mode')
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Exit writing mode'))
  await new Promise(r=>setTimeout(r,400))
  const after=await rect()
  assert.equal(before.text,after.text)
  for(const key of ['x','y','width'])assert.ok(Math.abs(before[key]-after[key])<2,`Focus moved Scripture ${key}: ${before[key]} -> ${after[key]}`)
  // The focus button remains keyboard-focused: arrows must still navigate.
  const initial=await reference()
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(old=>document.querySelector('.passage-button')?.textContent!==old,{},initial)
  const advanced=await rect()
  assert.ok(Math.abs(advanced.y-after.y)<2,`Verse navigation moved the reading anchor: ${after.y} -> ${advanced.y}`)
  await page.keyboard.press('ArrowLeft')
  await page.waitForFunction(old=>document.querySelector('.passage-button')?.textContent===old,{},initial)
  await page.keyboard.down('Control');await page.keyboard.press('ArrowRight');await page.keyboard.up('Control')
  assert.equal(await reference(),initial,'Modified arrows changed Scripture')
  const still=await rect();await new Promise(r=>setTimeout(r,350));const settled=await rect()
  assert.equal(still.y,settled.y,'Text drifts after navigation')
  await mkdir('qa',{recursive:true})
  await page.screenshot({path:`qa/writing-acceptance-${reduced?'reduced':'normal'}.png`})
  await clickText('Exit writing mode')
  await page.waitForFunction(()=>!document.querySelector('.focus-writing'))
  await page.click('.passage-button');await page.waitForSelector('input[name="reference"]')
  await page.type('input[name="reference"]','John 3:16')
  const old=await reference();await page.keyboard.press('ArrowLeft');assert.equal(await reference(),old,'Input arrows navigated Scripture')
  await page.keyboard.press('Escape')
  await page.setViewport({width:390,height:844})
  await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Enter writing mode');b.dataset.qa='enter-mode'})
  await page.click('[data-qa="enter-mode"]')
  const mobileInitial=await reference()
  await page.keyboard.press('Space')
  await page.waitForFunction(old=>document.querySelector('.passage-button')?.textContent!==old,{},mobileInitial)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile horizontal overflow')
  assert.ok(await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Exit writing mode');if(!b)return false;const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}),'Mobile exit not visible')
  await page.screenshot({path:`qa/writing-mobile-${reduced?'reduced':'normal'}.png`})
  assert.deepEqual(errors,[])
  results.push({reducedMotion:reduced,anchor:after,result:'PASS'})
  await context.close()
 }
 await writeFile('qa/writing-acceptance.json',JSON.stringify({url,results},null,2))
 console.log(JSON.stringify({url,results},null,2))
}finally{await browser.close()}
