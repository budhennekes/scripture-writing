import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import { returningUser } from './qa-user.mjs'
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const wait=()=>new Promise(r=>setTimeout(r,300)),results=[]
try {
 for (const [width,height] of [[1440,900],[768,1024],[390,844],[320,568]]) {
  const context=await b.createBrowserContext(),p=await context.newPage();await returningUser(p)
  await p.setViewport({width,height,hasTouch:width<1000,isMobile:width<1000});await p.goto(process.env.QA_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle0'});await p.evaluate(()=>document.fonts.ready)
  assert.ok(await p.evaluate(()=>document.fonts.check('600 16px "Source Sans 3 Variable"')))
  assert.match(await p.$eval('.next-button',e=>getComputedStyle(e).fontFamily),/Source Sans 3/)
  assert.match(await p.$eval('.verse.active p',e=>getComputedStyle(e).fontFamily),/Newsreader/)
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  const overlap=await p.evaluate(()=>{const buttons=[...document.querySelectorAll('.writing-tools button')].map(e=>({label:e.getAttribute('aria-label')||e.textContent,r:e.getBoundingClientRect()}));const hits=[];buttons.forEach((a,i)=>buttons.slice(i+1).forEach(c=>{if(Math.min(a.r.right,c.r.right)-Math.max(a.r.left,c.r.left)>1&&Math.min(a.r.bottom,c.r.bottom)-Math.max(a.r.top,c.r.top)>1)hits.push([a.label,c.label])}));return hits})
  assert.deepEqual(overlap,[])
  await p.screenshot({path:`qa/type-reader-${width}.png`});await p.click('.setup-button');await wait()
  assert.ok(await p.$eval('.settings-dialog .setting-copy h2',e=>parseFloat(getComputedStyle(e).fontSize)>=17))
  assert.ok(await p.$eval('.segmented-control button',e=>e.getBoundingClientRect().height>=44))
  assert.ok(await p.$eval('.font-control button',e=>parseFloat(getComputedStyle(e).fontSize)>=22))
  for(const theme of ['paper','gray','sage','night']) {
   await p.evaluate(theme=>{document.documentElement.dataset.theme=theme},theme)
   const contrast=await p.$eval('.next-button',e=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');const luminance=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);const rgb=[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};const s=getComputedStyle(e),a=luminance(s.color),c=luminance(s.backgroundColor);return (Math.max(a,c)+.05)/(Math.min(a,c)+.05)})
   assert.ok(contrast>=4.5,`${theme} Next contrast ${contrast}`)
  }
  await p.screenshot({path:`qa/type-settings-night-${width}.png`});await p.evaluate(()=>{document.documentElement.dataset.theme='paper'});await p.keyboard.press('Escape');await p.click('.reference-picker');await wait();await p.screenshot({path:`qa/type-chooser-${width}.png`})
  results.push({width,result:'PASS font delivery, Scripture family, toolbar non-overlap, 44px options, and Next contrast in four themes'})
  await context.close()
 }
 console.log(JSON.stringify(results,null,2))
}finally{await b.close()}
