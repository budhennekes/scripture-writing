import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try{
 const p=await browser.newPage()
 await p.goto('http://127.0.0.1:4173/?persistence=1',{waitUntil:'networkidle0'})
 const expected={position:{book:42,chapter:2,verse:15},handedness:'left',fontSize:40,theme:'night',savedPlaces:[{id:'qa-bookmark',position:{book:0,chapter:0,verse:0},savedAt:1}]}
 await p.evaluate(state=>{localStorage.removeItem('scripture-scribe-library-v3');localStorage.setItem('scripture-scribe-state-v2',JSON.stringify(state))},expected)
 await p.reload({waitUntil:'networkidle0'})
 await p.waitForSelector('.verse.active')
 const actual=await p.evaluate(()=>JSON.parse(localStorage.getItem('scripture-scribe-state-v2')))
 for(const key of Object.keys(expected))assert.deepEqual(actual[key],expected[key],`${key} changed on reload`)
 await p.click('.passage-button')
 await p.waitForSelector('.navigator-dialog')
 await p.select('select[name="book"]','0')
 await p.keyboard.press('Escape')
 const afterCancel=await p.evaluate(()=>JSON.parse(localStorage.getItem('scripture-scribe-state-v2')))
 assert.deepEqual(afterCancel.position,expected.position,'Cancelled browsing overwrote saved place')
 console.log('Persistence QA passed: saved reference, font, theme, handedness, bookmarks preserved; cancelled browsing preserves writing position.')
}finally{await browser.close()}
