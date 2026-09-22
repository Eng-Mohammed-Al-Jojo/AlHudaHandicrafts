const CACHE = 'alhuda-static-v3'
const APP_SHELL = ['/', '/manifest.webmanifest']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  
  // Skip cross-origin requests, chrome extensions, and Vite internal dev routes
  if (url.origin !== location.origin || url.pathname.startsWith('/@') || url.pathname.includes('/node_modules/')) {
    return
  }

  // HTML must be network-first. Otherwise an installed storefront can keep
  // serving an old index.html and therefore an old JavaScript bundle forever.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseToCache = response.clone()
          caches.open(CACHE).then(cache => cache.put('/', responseToCache))
          return response
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse
        }

        // Clone synchronously before response is used or returned
        const responseToCache = networkResponse.clone()
        caches.open(CACHE).then(cache => {
          cache.put(event.request, responseToCache).catch(() => {})
        }).catch(() => {})

        return networkResponse
      }).catch(() => cachedResponse)
    })
  )
})
