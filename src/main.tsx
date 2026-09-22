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
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(error => console.warn('PWA registration failed', error)))
  } else {
    // A cache-first worker can otherwise keep serving an old bundle on
    // localhost, hiding source changes and producing misleading test results.
    void navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => void registration.unregister())
    })
    void caches.keys().then(keys => {
      keys.filter(key => key.startsWith('alhuda-static-')).forEach(key => void caches.delete(key))
    })
  }
}
