const CACHE_NAME = 'alhuda-pwa-v5'

// Critical assets to pre-cache on install for instant offline loading
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/manifest-admin.webmanifest',
  '/favicon.png',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.jpeg',
]

// ── Install: Pre-cache core shell assets & activate immediately ───────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('[PWA SW] Precache failed for:', url, err))
          )
        )
      })
      .then(() => self.skipWaiting())
  )
})

// ── Activate: Clean up old cache versions & claim all clients ────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[PWA SW] Removing old cache:', k)
          return caches.delete(k)
        })
      )
    ).then(() => self.clients.claim())
  )
})

// ── Message: Allow client to trigger skipWaiting on update ───────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ── Fetch: Smart routing for navigation, assets, and Google Fonts ────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Skip chrome-extensions, unsupported schemes, and Vite dev server internals
  if (!url.protocol.startsWith('http')) return
  if (url.pathname.startsWith('/@') || url.pathname.includes('/node_modules/')) return

  // ── 1. Google Web Fonts: Stale-While-Revalidate / Cache First ──────────────
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone()).catch(() => {})
              }
              return networkResponse
            })
            .catch(() => cached)

          return cached || fetchPromise
        })
      )
    )
    return
  }

  // Skip other cross-origin third-party requests (e.g. Firebase, external CDN)
  if (url.origin !== location.origin) return

  // ── 2. Navigation (HTML Pages): Network First with Offline Fallback ────────
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then(cache => {
              // Cache both root shell and specific navigation path
              cache.put('/', responseToCache).catch(() => {})
              if (url.pathname.startsWith('/admin')) {
                cache.put('/admin', responseToCache.clone()).catch(() => {})
              }
            })
          }
          return response
        })
        .catch(async () => {
          // If network is offline, retrieve cached shell
          const cache = await caches.open(CACHE_NAME)
          const fallback = url.pathname.startsWith('/admin')
            ? (await cache.match('/admin')) || (await cache.match('/'))
            : await cache.match('/')

          if (fallback) return fallback

          // Minimal graceful offline HTML fallback if cache is totally empty
          return new Response(
            `<!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>متجر الهدى — وضع عدم الاتصال</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #FAF7F2; color: #221811; text-align: center; padding: 3rem 1.5rem; }
                .card { max-width: 400px; margin: 0 auto; background: white; padding: 2rem; border-radius: 1.5rem; border: 1px solid #EADBCE; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
                h1 { color: #8D6527; font-size: 1.5rem; margin-bottom: 0.5rem; }
                p { color: #685D52; font-size: 0.875rem; line-height: 1.6; }
                button { background: #8D6527; color: white; border: none; padding: 0.75rem 1.75rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer; margin-top: 1rem; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>أنتِ غير متصلة بالإنترنت</h1>
                <p>يرجى التحقق من اتصالك بالإنترنت ثم إعادة المحاولة لعرض أحدث تصاميم وتطريزات متجر الهدى.</p>
                <button onclick="window.location.reload()">إعادة المحاولة</button>
              </div>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        })
    )
    return
  }

  // ── 3. Static Assets (JS, CSS, Images): Cache First with Network Fallback ──
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse
          }

          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache).catch(() => {})
          })

          return networkResponse
        })
        .catch(() => {
          // Never return undefined from respondWith — return a 404 or empty response
          if (event.request.destination === 'image') {
            return new Response('', { status: 404, statusText: 'Image unavailable offline' })
          }
          return new Response('', { status: 503, statusText: 'Service Unavailable' })
        })
    })
  )
})
