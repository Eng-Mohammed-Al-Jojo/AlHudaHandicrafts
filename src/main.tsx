import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          // Listen for new service worker updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // A new version is available
                  window.dispatchEvent(new CustomEvent('pwa-update-available'))
                }
              })
            }
          })
        })
        .catch(error => {
          console.warn('[PWA] Service Worker registration failed:', error)
        })
    })

    // Reload seamlessly when new service worker takes control
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  } else {
    // In development mode: clean up registrations and caches to prevent stale bundles
    void navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => void reg.unregister())
    })
    void caches.keys().then(keys => {
      keys
        .filter(key => key.startsWith('alhuda-'))
        .forEach(key => void caches.delete(key))
    })
  }
}
