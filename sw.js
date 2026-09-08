const PREFIX = 'scripture-scribe-'
const CACHE_NAME = PREFIX + 'v10-phone'
const root = self.registration.scope
const APP_SHELL = ['./', 'manifest.webmanifest', 'scribe-mark.svg', 'images/chapel-light.webp', 'data/bible.json', 'data/asv1901.json', 'data/bsb.json', 'data/dra.json', 'data/import-example.json'].map(path => new URL(path, root).href)
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(root)) return
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)) }
    return response
  }).catch(async () => {
    const cached = await caches.match(event.request)
    if (cached) return cached
    if (event.request.mode === 'navigate') return (await caches.match(root)) || Response.error()
    return Response.error()
  }))
})
