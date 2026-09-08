import puppeteer from 'puppeteer-core'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle0'})
 await page.waitForSelector('.verse.active p')
 await page.click('.passage-button');await page.type('input[name="reference"]','John 3:16');await page.keyboard.press('Enter')
 await page.waitForFunction(()=>document.querySelector('.verse.active sup').textContent==='16')
 const text=await page.$eval('.verse.active p',e=>e.textContent)
 await page.click('.page-ribbon');await page.waitForSelector('.page-ribbon.selected')
 await mkdir('qa',{recursive:true})
 await page.screenshot({path:'qa/writing-page-normal.png'})
 await page.click('.writing-mode-button')
 await page.waitForFunction(()=>!!document.fullscreenElement&&!!document.querySelector('.focus-writing'))
 assert.equal(await page.$eval('.verse.active p',e=>e.textContent),text)
 assert.ok(await page.$eval('.topbar',e=>e.inert&&getComputedStyle(e).visibility==='hidden'))
 await new Promise(r=>setTimeout(r,250));await page.screenshot({path:'qa/writing-page-focus.png'})
 await page.click('.writing-mode-button');await page.waitForFunction(()=>!document.fullscreenElement&&!document.querySelector('.focus-writing'))
 await page.click('.writing-mode-button');await page.waitForFunction(()=>!!document.fullscreenElement)
 // Simulate the browser's native fullscreen exit event, independent of app key handling.
 await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>!document.querySelector('.focus-writing'))
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Unsupported'))})
 await page.click('.writing-mode-button');await page.waitForSelector('.focus-writing')
 assert.equal(await page.evaluate(()=>!!document.fullscreenElement),false)
 assert.ok(await page.$eval('.focus-writing',e=>{const r=e.getBoundingClientRect();return r.width===innerWidth&&r.height===innerHeight}))
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.focus-writing'))
 await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.page-ribbon.selected')
 assert.equal(await page.$eval('.verse.active p',e=>e.textContent),text)
 assert.deepEqual(errors,[])
 console.log('PASS: real Chromium fullscreen entry, visible exit, native fullscreen exit synchronization, denied API viewport fallback, Escape, bookmark and exact passage retained after reload; screenshots captured.')
} finally {await browser.close()}
