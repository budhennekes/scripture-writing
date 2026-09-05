import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page = await browser.newPage()
 const errors=[]; page.on('pageerror',e=>errors.push(e.message))
 await page.setViewport({width:390,height:844})
 await page.goto('http://127.0.0.1:4173/?readability=1',{waitUntil:'networkidle0'})
 const target=await page.evaluate(async()=>{
  const bible=await (await fetch('/data/bible.json')).json()
  let longest={text:'',position:null}
  bible.books.forEach((b,book)=>b.chapters.forEach((c,chapter)=>c.verses.forEach((v,verse)=>{if(v.text.length>longest.text.length)longest={text:v.text,position:{book,chapter,verse}}})))
  localStorage.removeItem('scripture-scribe-library-v3')
  const key='scripture-scribe-state-v2'
  const saved=JSON.parse(localStorage.getItem(key)||'{}')
  localStorage.setItem(key,JSON.stringify({...saved,position:longest.position,fontSize:52}))
  return longest
 })
 await page.reload({waitUntil:'networkidle0'})
 await page.waitForSelector('.verse.active p')
 const measurement=await page.evaluate(()=>{
  const p=document.querySelector('.verse.active p')
  let el=p.parentElement,scrollable=false
  while(el){const css=getComputedStyle(el);if(['auto','scroll'].includes(css.overflowY)&&el.scrollHeight>el.clientHeight)scrollable=true;el=el.parentElement}
  return {text:p.textContent,size:parseFloat(getComputedStyle(p).fontSize),scrollable,overflow:document.documentElement.scrollWidth>innerWidth}
 })
 assert.equal(measurement.text,target.text)
 assert.equal(measurement.size,52,'Mobile must honor selected font size')
 assert.equal(measurement.scrollable,true,'Long verse must be scrollable')
 assert.equal(measurement.overflow,false,'No horizontal overflow')
 assert.deepEqual(errors,[])
 console.log('Readability QA passed: longest verse intact; 52px mobile text honored; vertical scroll reachable; no horizontal overflow or runtime errors.')
} finally {await browser.close()}
