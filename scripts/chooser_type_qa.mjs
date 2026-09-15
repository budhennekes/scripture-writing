import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import { returningUser } from './qa-user.mjs'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage();await returningUser(page)
 for(const width of [1280,768,390,320]) {
  await page.setViewport({width,height:940});await page.goto(process.env.QA_URL||'http://127.0.0.1:4180/',{waitUntil:'networkidle0'});await page.waitForSelector('.reference-picker');await page.click('.reference-picker');await page.waitForSelector('.navigator-dialog');await new Promise(r=>setTimeout(r,350));await page.evaluate(()=>document.fonts.ready)
  for(const theme of ['paper','night']) {
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme)
   await page.focus('[name=reference]')
   const s=await page.evaluate(()=>{const input=document.querySelector('[name=reference]'),outer=input.closest('.reference-search'),i=getComputedStyle(input),o=getComputedStyle(outer),d=document.querySelector('.navigator-dialog');return {innerOutline:i.outlineStyle,innerBorder:i.borderTopWidth,outerOutline:o.outlineWidth,inputSize:i.fontSize,overflow:d.scrollWidth>d.clientWidth+1}})
   assert.equal(s.innerOutline,'none');assert.equal(s.innerBorder,'0px');assert.equal(s.outerOutline,'2px');assert.equal(s.inputSize,'16px');assert.equal(s.overflow,false)
   await page.screenshot({path:`qa/chooser-type-${width}-${theme}.png`})
  }
  await page.type('[name=reference]','John 3:16');await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.reference-picker').textContent.includes('John 3:16'))
  console.log(`PASS ${width}: one focus ring, readable input, no panel overflow, reference navigation`)
 }
} finally {await browser.close()}
