import type { InvoiceSignature } from '../types'

const STORAGE_KEY = 'alhuda_invoice_signature_v1'
const MAX_IMAGE_WIDTH = 900
const MAX_IMAGE_HEIGHT = 420

/** Load the signature the admin saved for reuse across invoices. */
export function loadSavedSignature(): InvoiceSignature {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as InvoiceSignature
    return {
      drawing: typeof parsed.drawing === 'string' && parsed.drawing ? parsed.drawing : undefined,
      image: typeof parsed.image === 'string' && parsed.image ? parsed.image : undefined,
    }
  } catch {
    return {}
  }
}

/** Persist a signature (drawing, uploaded image, or both). */
export function saveSignatureToStorage(signature: InvoiceSignature) {
  if (typeof window === 'undefined') return
  const cleaned = {
    ...(signature.drawing ? { drawing: signature.drawing } : {}),
    ...(signature.image ? { image: signature.image } : {}),
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
}

export function clearSavedSignature() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

/**
 * Read an uploaded signature image, downscale it, and return a compact data URL
 * so the invoice stays well below Firestore's document size limit.
 */
export function readSignatureImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('يرجى اختيار ملف صورة صالح'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'))
    reader.onload = () => {
      const source = typeof reader.result === 'string' ? reader.result : ''
      if (!source) {
        reject(new Error('تعذر قراءة الصورة'))
        return
      }
      const image = new Image()
      image.onerror = () => reject(new Error('تعذر تحميل الصورة'))
      image.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_WIDTH / image.width, MAX_IMAGE_HEIGHT / image.height)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('تعذر تجهيز الصورة'))
          return
        }
        context.fillStyle = '#FFFFFF'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.88))
      }
      image.src = source
    }
    reader.readAsDataURL(file)
  })
}
