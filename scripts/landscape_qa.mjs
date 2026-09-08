import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const lum=c=>{let a=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*a[0]+.7152*a[1]+.0722*a[2]}
try {
 const p=await browser.newPage();await p.setViewport({width:1440,height:900});await p.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle0'});await p.waitForSelector('.verse.active p')
 assert.ok(await p.$eval('.landscape-scene img',e=>e.complete&&e.naturalWidth>1000))
 const results=[]
 for(const theme of ['paper','gray','sage','night']){
  await p.evaluate(t=>document.documentElement.dataset.theme=t,theme)
  assert.equal(await p.$eval('.reader-panel',e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','Reader must not cover the landscape header')
  const c=await p.$eval('.verse.active p',e=>[getComputedStyle(e).color,getComputedStyle(document.querySelector('.scripture-wrap')).backgroundColor]);const l=c.map(lum);const contrast=(Math.max(...l)+.05)/(Math.min(...l)+.05);assert.ok(contrast>=4.5);results.push({theme,contrast})
  if(theme==='night')await p.screenshot({path:'qa/landscape-night.png'})
 }
 await p.evaluate(()=>document.documentElement.dataset.theme='paper');await p.setViewport({width:390,height:844});await p.screenshot({path:'qa/landscape-mobile.png'});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await p.$eval('.writing-mode-button',e=>{const r=e.getBoundingClientRect();return r.right<=innerWidth&&r.top>0&&r.bottom<innerHeight}))
 await p.click('.writing-mode-button');await new Promise(r=>setTimeout(r,700));assert.equal(await p.$eval('.landscape-scene',e=>getComputedStyle(e).opacity),'0');await p.click('.writing-mode-button')
 await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert.equal(await p.$eval('.landscape-scene',e=>getComputedStyle(e).transitionDuration),'0s')
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.setOfflineMode(true);await p.reload({waitUntil:'networkidle0'});await p.waitForSelector('.verse.active');assert.ok(await p.$eval('.landscape-scene img',e=>e.complete&&e.naturalWidth>1000))
 console.log(JSON.stringify({result:'PASS',checks:['local image decoded','four palette text contrasts','mobile layout and entry control','scene recedes in focus','reduced motion','image available after offline reload'],results},null,2))
} finally {await browser.close()}
