export const DEFAULT_FREE_SHIPPING_THRESHOLD = 350

export function getFreeShippingThreshold(value: unknown): number {
  const threshold = Number(value)
  return Number.isFinite(threshold) && threshold >= 0
    ? threshold
    : DEFAULT_FREE_SHIPPING_THRESHOLD
}

export function getFreeShippingStatus(total: unknown, value: unknown) {
  const normalizedTotal = Number.isFinite(Number(total)) ? Math.max(0, Number(total)) : 0
  const threshold = getFreeShippingThreshold(value)
  const isFreeShipping = threshold === 0 || normalizedTotal >= threshold
  const remaining = threshold === 0 ? 0 : Math.max(0, threshold - normalizedTotal)
  const progress = threshold === 0 ? 100 : Math.min(100, Math.round((normalizedTotal / threshold) * 100))

  return { threshold, isFreeShipping, remaining, progress }
}

export function isProductOnSale(product: {
  salePrice?: number
  saleStartDate?: string
  saleEndDate?: string
}): boolean {
  if (!product.salePrice || product.salePrice <= 0) return false
  const now = new Date()
  
  if (product.saleStartDate) {
    const start = new Date(product.saleStartDate)
    if (!isNaN(start.getTime()) && now < start) return false
  }
  
  if (product.saleEndDate) {
    const end = new Date(product.saleEndDate)
    if (!isNaN(end.getTime())) {
      // End of the day for saleEndDate (23:59:59.999)
      end.setHours(23, 59, 59, 999)
      if (now > end) return false
    }
  }

  // If both start and end date are empty, but salePrice is set, it's on sale
  return true
}

export function getEffectiveProductPrice(product: {
  price: number
  salePrice?: number
  saleStartDate?: string
  saleEndDate?: string
}): number {
  return isProductOnSale(product) ? product.salePrice! : product.price
}

export type SaleTimeRemaining = {
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
  formattedArabic: string
}

export function getSaleTimeRemaining(saleEndDate?: string): SaleTimeRemaining | null {
  if (!saleEndDate) return null
  const end = new Date(saleEndDate)
  if (isNaN(end.getTime())) return null

  // End of specified day
  end.setHours(23, 59, 59, 999)
  const now = new Date().getTime()
  const totalMs = end.getTime() - now

  if (totalMs <= 0) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formattedArabic: 'انتهى العرض'
    }
  }

  const seconds = Math.floor((totalMs / 1000) % 60)
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60)
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24)
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24))

  let formattedArabic = ''
  if (days > 0) {
    const dayLabel = days === 1 ? 'يوم' : days === 2 ? 'يومان' : days <= 10 ? `${days} أيام` : `${days} يوماً`
    formattedArabic = `${dayLabel}${hours > 0 ? ` و ${hours} س` : ''}`
  } else if (hours > 0) {
    formattedArabic = `${hours} س و ${minutes} د`
  } else {
    formattedArabic = `${minutes} د و ${seconds} ث`
  }

  return {
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    formattedArabic
  }
}
