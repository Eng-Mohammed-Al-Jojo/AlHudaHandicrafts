import { useEffect, useState } from 'react'

const sizeCache = new Map<string, number | null>()
const inflight = new Map<string, Promise<number | null>>()

export function formatBytesArabic(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} بايت`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} ك.ب`
  const mb = kb / 1024
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} ميجا`
}

async function fetchImageByteSize(url: string): Promise<number | null> {
  if (!url) return null
  if (sizeCache.has(url)) return sizeCache.get(url) ?? null

  if (url.startsWith('data:')) {
    const commaIdx = url.indexOf(',')
    if (commaIdx === -1) return null
    const base64 = url.slice(commaIdx + 1)
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
    const bytes = Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
    sizeCache.set(url, bytes)
    return bytes
  }

  const existing = inflight.get(url)
  if (existing) return existing

  const promise = (async (): Promise<number | null> => {
    try {
      const headRes = await fetch(url, { method: 'HEAD', mode: 'cors' })
      if (headRes.ok) {
        const len = headRes.headers.get('content-length')
        if (len) {
          const parsed = Number(len)
          if (Number.isFinite(parsed) && parsed > 0) {
            sizeCache.set(url, parsed)
            return parsed
          }
        }
      }
    } catch {
      // Fallback to GET below
    }

    try {
      const res = await fetch(url, { mode: 'cors' })
      if (!res.ok) {
        sizeCache.set(url, null)
        return null
      }
      const len = res.headers.get('content-length')
      if (len) {
        const parsed = Number(len)
        if (Number.isFinite(parsed) && parsed > 0) {
          sizeCache.set(url, parsed)
          return parsed
        }
      }
      const blob = await res.blob()
      const bytes = blob.size > 0 ? blob.size : null
      sizeCache.set(url, bytes)
      return bytes
    } catch {
      sizeCache.set(url, null)
      return null
    } finally {
      inflight.delete(url)
    }
  })()

  inflight.set(url, promise)
  return promise
}

interface Props {
  url?: string
  bytes?: number
  prefix?: string
  className?: string
  variant?: 'overlay' | 'pill'
}

export default function ImageSizeBadge({
  url,
  bytes: directBytes,
  prefix = '',
  className = '',
  variant = 'overlay',
}: Props) {
  const [resolvedBytes, setResolvedBytes] = useState<number | null>(() => {
    if (typeof directBytes === 'number') return directBytes
    if (url && sizeCache.has(url)) return sizeCache.get(url) ?? null
    return null
  })

  useEffect(() => {
    if (typeof directBytes === 'number') {
      setResolvedBytes(directBytes)
      return
    }
    if (!url) {
      setResolvedBytes(null)
      return
    }
    if (sizeCache.has(url)) {
      setResolvedBytes(sizeCache.get(url) ?? null)
      return
    }

    let cancelled = false
    void fetchImageByteSize(url).then(size => {
      if (!cancelled) setResolvedBytes(size)
    })
    return () => { cancelled = true }
  }, [url, directBytes])

  if (resolvedBytes === null || resolvedBytes <= 0) return null

  const mb = resolvedBytes / (1024 * 1024)
  const label = `${prefix}${formatBytesArabic(resolvedBytes)}`

  const toneClass =
    variant === 'overlay'
      ? mb >= 1.5
        ? 'bg-red-700/90 text-white'
        : mb >= 0.5
          ? 'bg-amber-600/90 text-white'
          : 'bg-[#24180E]/85 text-[#F7F1E5]'
      : mb >= 1.5
        ? 'bg-red-50 text-red-700 border border-red-200'
        : mb >= 0.5
          ? 'bg-amber-50 text-amber-800 border border-amber-200'
          : 'bg-[#FAF7F2] text-[#685D52] border border-[#EADBCE]'

  return (
    <span
      dir="rtl"
      title={`حجم الصورة: ${formatBytesArabic(resolvedBytes)}`}
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs shadow-xs ${toneClass} ${className}`}
    >
      {label}
    </span>
  )
}
