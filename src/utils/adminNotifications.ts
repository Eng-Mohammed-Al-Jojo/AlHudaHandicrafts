import type { Order } from '../types'

const STORAGE_KEY = 'alhuda_admin_notifications_enabled'
let audioContext: AudioContext | null = null

type BrowserWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

function canUseBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function areAdminNotificationsEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContextConstructor = window.AudioContext ?? (window as BrowserWindow).webkitAudioContext
  if (!AudioContextConstructor) return null
  audioContext ??= new AudioContextConstructor()
  return audioContext
}

function playNotificationSound() {
  const context = getAudioContext()
  if (!context) return
  if (context.state === 'suspended') void context.resume()

  const now = context.currentTime
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
  gain.connect(context.destination)

  const oscillator = context.createOscillator()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(740, now)
  oscillator.frequency.setValueAtTime(980, now + 0.18)
  oscillator.connect(gain)
  oscillator.start(now)
  oscillator.stop(now + 0.45)
}

export async function enableAdminNotifications() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // The sound can still work when storage is unavailable.
  }

  // Prime audio from the click before awaiting the browser permission prompt.
  const context = getAudioContext()
  if (context?.state === 'suspended') await context.resume()

  let browserNotifications = false
  if (canUseBrowserNotifications()) {
    try {
      const permission = await Notification.requestPermission()
      browserNotifications = permission === 'granted'
    } catch (error) {
      console.warn('Admin notification permission failed:', error)
    }
  }

  return { browserNotifications, sound: Boolean(context) }
}

export function disableAdminNotifications() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export function notifyNewOrder(order: Order) {
  if (!areAdminNotificationsEnabled()) return

  if (canUseBrowserNotifications() && Notification.permission === 'granted') {
    try {
      const itemCount = order.itemsCount || order.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
      new Notification('طلب جديد من متجر الهدى', {
        body: `${order.customer} • ${itemCount} قطعة • ${order.total} ₪`,
        tag: `alhuda-order-${order.id}`,
        icon: '/icon.svg',
      })
    } catch (error) {
      console.warn('Admin order notification failed:', error)
    }
  }

  playNotificationSound()
}
