import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
const url=process.env.QA_URL || 'http://127.0.0.1:4173/'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const results=[]
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.setViewport({width:1440,height:900})
 await page.goto(url,{waitUntil:'networkidle0'});await page.waitForSelector('.verse.active p')
 await mkdir('qa',{recursive:true})
 for(const label of ['White','Soft gray','Pale sage','Night']) {
  await page.click('[aria-label="Open settings"]');await page.waitForSelector('.settings-dialog')
  const found=await page.evaluate(label=>{const b=[...document.querySelectorAll('.settings-dialog button')].find(b=>b.textContent.trim()===label);if(!b)return false;b.click();return true},label)
  assert.ok(found,`Missing background choice: ${label}`)
  await page.keyboard.press('Escape')
  const selected=await page.evaluate(()=>document.documentElement.dataset.theme)
  await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.verse.active p')
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),selected,'Palette not persisted')
  const surface=await page.evaluate(()=>{
   const bg=e=>{while(e){const c=getComputedStyle(e).backgroundColor;if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent')return c;e=e.parentElement}return 'rgb(255, 255, 255)'}
   const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number)
   const lum=s=>rgb(s).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
   const p=document.querySelector('.verse.active p');const a=lum(getComputedStyle(p).color),b=lum(bg(p))
   const rail=document.querySelector('.control-rail');const next=document.querySelector('.next-button');const rect=next.getBoundingClientRect()
   return {rail:bg(rail),reader:bg(document.querySelector('.reader-panel')),next:getComputedStyle(next).backgroundColor,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),width:rect.width,height:rect.height,decorations:[getComputedStyle(rail,'::before').content,getComputedStyle(rail,'::after').content]}
  })
  assert.equal(surface.rail,surface.reader,'Rail is still a separate colored slab')
  assert.ok(['transparent','rgba(0, 0, 0, 0)'].includes(surface.next),'Next is not transparent')
  assert.ok(surface.contrast>=4.5,'Scripture contrast below 4.5:1')
  assert.ok(surface.width>=44&&surface.height>=44,'Free-hand target too small')
  assert.ok(surface.decorations.every(s=>s==='none'||s==='normal'||s==='""'),'Decorative rail copy remains')
  await page.waitForSelector('[role="progressbar"]')
  assert.equal(await page.$eval('[role="progressbar"]',e=>e.getAttribute('aria-valuenow')),'1')
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Enter writing mode').click())
  await new Promise(r=>setTimeout(r,300))
  assert.ok(await page.$eval('[role="progressbar"]',e=>{let p=e;while(p){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<.8)return false;p=p.parentElement}const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom<=innerHeight}),'Position bar hidden in writing mode')
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(()=>document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')==='2')
  await page.keyboard.press('ArrowLeft')
  await page.waitForFunction(()=>document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')==='1')
  await new Promise(r=>setTimeout(r,250))
  await page.screenshot({path:`qa/minimal-${selected}.png`})
  await page.keyboard.press('Escape')
  results.push({label,selected,...surface})
 }
 assert.equal(new Set(results.map(r=>r.reader)).size,4,'Background choices are not distinct')
 await page.select('select[aria-label="Bible translation"]','ASV1901')
 await page.waitForFunction(()=>document.querySelector('.chapter-kicker')?.textContent.includes('American Standard Version'))
 await page.click('.passage-button');await page.waitForSelector('input[name="reference"]')
 await page.type('input[name="reference"]','Matthew 17:27')
 await page.waitForFunction(()=>document.querySelector('.reference-result strong')?.textContent==='Matthew 17:27')
 await page.keyboard.press('Enter')
 await page.waitForFunction(()=>document.querySelector('.passage-button')?.textContent.includes('17:27'))
 assert.equal(await page.$eval('[role="progressbar"]',e=>e.getAttribute('aria-valuenow')),'27','Numbered verse was replaced by ordinal')
 assert.equal(await page.$eval('[role="progressbar"]',e=>e.getAttribute('aria-valuemax')),'27','Chapter with missing verse uses incorrect maximum')
 assert.deepEqual(errors,[])
 await writeFile('qa/minimal-acceptance.json',JSON.stringify({url,results},null,2))
 console.log(JSON.stringify({url,result:'PASS',results},null,2))
}finally{await browser.close()}
