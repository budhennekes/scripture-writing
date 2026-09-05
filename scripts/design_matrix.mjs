import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const results=[]
try{
 await mkdir('qa/design-matrix',{recursive:true})
 const page=await browser.newPage()
 await page.goto('http://127.0.0.1:4173/?matrix=1',{waitUntil:'networkidle0'})
 for(const [name,width,height] of [['desktop',1440,960],['tablet',820,1180],['phone',390,844],['landscape',844,390]]){
  await page.setViewport({width,height})
  for(const theme of ['paper','night']){
   for(const hand of ['right','left']){
    await page.evaluate(({theme,hand})=>{localStorage.removeItem('scripture-scribe-library-v3');localStorage.setItem('scripture-scribe-state-v2',JSON.stringify({position:{book:42,chapter:2,verse:15},handedness:hand,theme,fontSize:36,savedPlaces:[]}))},{theme,hand})
    await page.reload({waitUntil:'networkidle0'})
    await page.waitForSelector('.verse.active p')
    const state=await page.evaluate(()=>{
     const rail=document.querySelector('.control-rail').getBoundingClientRect()
     const active=document.querySelector('.verse.active p')
     return {overflow:document.documentElement.scrollWidth>innerWidth,railX:rail.x,railWidth:rail.width,verse:active.textContent,font:getComputedStyle(active).fontSize}
    })
    assert.equal(state.overflow,false,`${name}/${theme}/${hand} horizontal overflow`)
    assert.ok(state.verse.includes('For God so loved the world'))
    assert.ok(hand==='right'?state.railX<width/2:state.railX>width/2,`${name} free-hand rail misplaced`)
    const file=`qa/design-matrix/${name}-${theme}-${hand}.png`
    await page.screenshot({path:file})
    results.push({name,width,height,theme,hand,...state,file})
   }
  }
 }
 await writeFile('qa/design-matrix/results.json',JSON.stringify(results,null,2))
 console.log(`Design matrix passed: ${results.length} viewport/theme/hand combinations; exact active text, no horizontal overflow, correctly placed rail.`)
}finally{await browser.close()}
