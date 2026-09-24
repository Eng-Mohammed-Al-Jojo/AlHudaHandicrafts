export type CartQuantityMap = Record<string, number>

const CART_STORAGE_KEY = 'al_huda_cart_v1'
const CART_STORAGE_VERSION = 1
const MAX_STORED_PRODUCTS = 100

type StoredCart = {
  version: number
  items: Array<{
    productId: string
    quantity: number
  }>
}

function isValidProductId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function normalizeCartQuantity(value: unknown): number {
  const quantity = Number(value)
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1
}

export function readPersistedCart(): CartQuantityMap {
  if (typeof window === 'undefined') return Object.create(null)

  try {
    const rawValue = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!rawValue) return Object.create(null)

    const stored = JSON.parse(rawValue) as Partial<StoredCart>
    if (stored.version !== CART_STORAGE_VERSION || !Array.isArray(stored.items)) return Object.create(null)

    const quantities: CartQuantityMap = Object.create(null)
    for (const item of stored.items.slice(0, MAX_STORED_PRODUCTS)) {
      if (!item || !isValidProductId(item.productId)) continue
      quantities[item.productId] = normalizeCartQuantity(item.quantity)
    }
    return quantities
  } catch {
    return Object.create(null)
  }
}

export function writePersistedCart(quantities: CartQuantityMap): void {
  if (typeof window === 'undefined') return

  const items = Object.entries(quantities)
    .slice(0, MAX_STORED_PRODUCTS)
    .map(([productId, quantity]) => ({
      productId,
      quantity: normalizeCartQuantity(quantity),
    }))

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      version: CART_STORAGE_VERSION,
      items,
    } satisfies StoredCart))
  } catch {
    // Storage may be unavailable in private browsing or when its quota is full.
    // The in-memory cart must continue to work in that case.
  }
}
