import { useCallback, useRef, useState } from 'react'
import type { Product, CartItem, Coupon } from '../types'
import {
  normalizeCartQuantity,
  readPersistedCart,
  writePersistedCart,
  type CartQuantityMap,
} from '../utils/cartStorage'

export type CartSyncResult = {
  removed: Array<{ id: string; name: string }>
  priceChanges: Array<{ id: string; name: string; previousPrice: number; currentPrice: number }>
}

function cartItemsToQuantities(items: CartItem[]): CartQuantityMap {
  const quantities: CartQuantityMap = Object.create(null)
  for (const item of items) {
    quantities[item.id] = normalizeCartQuantity(item.quantity)
  }
  return quantities
}

import { isProductOnSale, getEffectiveProductPrice } from '../utils/commerce'

export function useCart() {
  const initializedRef = useRef(false)
  const entriesRef = useRef<CartQuantityMap>(Object.create(null))
  const itemsRef = useRef<CartItem[]>([])

  if (!initializedRef.current) {
    entriesRef.current = readPersistedCart()
    initializedRef.current = true
  }

  const [items, setItems] = useState<CartItem[]>(itemsRef.current)
  const [coupon, setCoupon] = useState<Coupon | null>(null)

  const commitCart = useCallback((nextItems: CartItem[]) => {
    const nextEntries = cartItemsToQuantities(nextItems)
    itemsRef.current = nextItems
    entriesRef.current = nextEntries
    setItems(nextItems)
    writePersistedCart(nextEntries)
  }, [])

  const addItem = useCallback((product: Product, quantity = 1) => {
    const safeQuantity = normalizeCartQuantity(quantity)
    const currentItems = itemsRef.current
    const existing = currentItems.find(item => item.id === product.id)
    const nextItems = existing
      ? currentItems.map(item => item.id === product.id
        ? { ...item, ...product, quantity: item.quantity + safeQuantity }
        : item)
      : [...currentItems, { ...product, quantity: safeQuantity }]

    commitCart(nextItems)
  }, [commitCart])

  const removeItem = useCallback((productId: string) => {
    commitCart(itemsRef.current.filter(item => item.id !== productId))
  }, [commitCart])

  const updateQty = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) return
    const safeQuantity = normalizeCartQuantity(quantity)
    commitCart(itemsRef.current.map(item => item.id === productId
      ? { ...item, quantity: safeQuantity }
      : item))
  }, [commitCart])

  const clear = useCallback(() => {
    commitCart([])
    setCoupon(null)
  }, [commitCart])

  const syncWithProducts = useCallback((products: Product[]): CartSyncResult => {
    const catalog = new Map(products.map(product => [product.id, product]))
    const currentById = new Map(itemsRef.current.map(item => [item.id, item]))
    const removed: CartSyncResult['removed'] = []
    const priceChanges: CartSyncResult['priceChanges'] = []
    const nextItems: CartItem[] = []

    for (const [productId, quantity] of Object.entries(entriesRef.current)) {
      const product = catalog.get(productId)
      const currentItem = currentById.get(productId)
      if (!product || !product.isPublished || !product.isAvailable) {
        removed.push({
          id: productId,
          name: product?.name || currentItem?.name || 'منتج محذوف',
        })
        continue
      }

      const safeQuantity = normalizeCartQuantity(quantity)
      if (currentItem && currentItem.price !== product.price) {
        priceChanges.push({
          id: productId,
          name: product.name,
          previousPrice: currentItem.price,
          currentPrice: product.price,
        })
      }
      nextItems.push({ ...product, quantity: safeQuantity })
    }

    commitCart(nextItems)
    return { removed, priceChanges }
  }, [commitCart])

  const total = items.reduce((sum, item) => {
    const effectivePrice = getEffectiveProductPrice(item)
    return sum + effectivePrice * item.quantity
  }, 0)

  const discountAmount = coupon ? (coupon.type === 'percentage' ? (total * coupon.value) / 100 : coupon.value) : 0
  const finalTotal = Math.max(0, total - discountAmount)
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    items,
    addItem,
    removeItem,
    updateQty,
    clear,
    syncWithProducts,
    total,
    discountAmount,
    finalTotal,
    coupon,
    setCoupon,
    count,
  }
}
