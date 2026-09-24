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
