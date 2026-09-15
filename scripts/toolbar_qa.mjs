import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import { returningUser } from './qa-user.mjs'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage();await returningUser(page)
 for(const width of [696,900,1440,390]) {
  await page.setViewport({width,height:900});await page.goto(process.env.QA_URL||'http://127.0.0.1:4180/',{waitUntil:'networkidle0'});await page.waitForSelector('.verse.active');await page.evaluate(()=>document.fonts.ready)
  const metrics=await page.evaluate(()=>{
   const toolbar=document.querySelector('.writing-tools').getBoundingClientRect()
   return {buttons:[...document.querySelectorAll('.writing-tools button')].map(e=>{const r=e.getBoundingClientRect();return {label:e.textContent,height:r.height,inside:r.top>=toolbar.top-1&&r.bottom<=toolbar.bottom+1&&r.right<=toolbar.right}}),next:document.querySelector('.next-button').getBoundingClientRect().height}
  })
  assert.ok(metrics.buttons.every(b=>b.height>=44&&b.inside),JSON.stringify({width,metrics}))
  if(width>600)assert.equal(metrics.next,120)
  await page.screenshot({path:`qa/toolbar-${width}.png`})
  console.log('PASS',width,JSON.stringify(metrics))
 }
} finally {await browser.close()}
