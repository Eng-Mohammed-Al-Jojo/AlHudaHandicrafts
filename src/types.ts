export type FirebaseUser = { email: string; idToken: string }

export type Category = {
  id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  isVisible: boolean
  order: number
  createdAt?: string
}

export type ProductImage = {
  url: string
  fileId?: string
  alt: string
  order: number
}

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  categoryId: string
  categoryName: string
  isAvailable: boolean
  isPublished: boolean
  images: ProductImage[]
  badge?: string
  createdAt?: string
  updatedAt?: string
}

export type OrderStatus = 'جديد' | 'قيد التجهيز' | 'تم التواصل' | 'مكتمل' | 'ملغي'

export type OrderItem = {
  productId: string
  productName: string
  price: number
  image: string
}

export type Order = {
  id: string
  customer: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  items: OrderItem[]
  total: number
  itemsCount: number
  status: OrderStatus
  createdAt: string
}

export type CartItem = Product & { quantity: number }

export type ToastType = 'success' | 'error' | 'info'

export type Toast = {
  id: string
  message: string
  type: ToastType
}

export type OrderRouting = 'dashboard' | 'whatsapp'

export type CurrencyCode = 'ILS' | 'USD' | 'EUR'

export type SiteSettings = {
  storeName: string
  whatsappNumber: string
  phone: string
  email: string
  address: string
  orderRouting: OrderRouting
  freeShippingThreshold: number
  ordersEnabled: boolean
  usdRate: number
  eurRate: number
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  storeName: 'الهدى للتطريز',
  whatsappNumber: '',
  phone: '',
  email: '',
  address: '',
  orderRouting: 'dashboard',
  freeShippingThreshold: 350,
  ordersEnabled: true,
  usdRate: 3.65,
  eurRate: 3.95,
}

export type NewsletterSubscriber = {
  id: string
  email: string
  createdAt: string
  source?: string
  status?: 'active' | 'unsubscribed'
}

