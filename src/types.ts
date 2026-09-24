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
export type ShippingStatus = 'free' | 'standard'
export type PaymentStatus = 'pending' | 'paid'
export type PaymentMethodId = 'jawwalpay' | 'palpay' | 'bank_palestine' | 'other'

export type PaymentMethodDetails = {
  accountName: string
  accountNumber: string
  iban: string
  branch: string
  instructions: string
  paymentLink: string
}

export type PaymentMethod = PaymentMethodDetails & {
  id: PaymentMethodId
  label: string
  enabled: boolean
  /** Legacy field kept for settings saved by older versions. */
  details: string
}

export type OrderItem = {
  productId: string
  productName: string
  price: number
  quantity?: number
  image: string
}

export type Order = {
  id: string
  customer: string
  phone?: string
  email?: string
  governorate?: string
  city?: string
  address?: string
  deliveryNotes?: string
  notes?: string
  items: OrderItem[]
  total: number
  itemsCount: number
  displayCurrency?: CurrencyCode
  displayRate?: number
  displayTotal?: number
  shippingStatus?: ShippingStatus
  shippingThreshold?: number
  paymentStatus?: PaymentStatus
  requestedPaymentMethod?: PaymentMethodId
  paymentMethod?: PaymentMethodId
  paymentMethodLabel?: string
  paymentDetails?: PaymentMethodDetails
  paymentReference?: string
  paymentConfirmedAt?: string
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

export type SocialLinks = {
  instagram: string
  facebook: string
  tiktok: string
}

export type SiteSettings = {
  storeName: string
  whatsappNumber: string
  phone: string
  email: string
  address: string
  orderRouting: OrderRouting
  freeShippingThreshold: number
  deliveryCities: string[]
  paymentMethods: PaymentMethod[]
  ordersEnabled: boolean
  usdRate: number
  eurRate: number
  socialLinks: SocialLinks
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  storeName: 'الهدى للتطريز',
  whatsappNumber: '',
  phone: '',
  email: '',
  address: '',
  orderRouting: 'dashboard',
  freeShippingThreshold: 350,
  deliveryCities: ['غزة', 'النصر', 'الرمال', 'التجمع', 'دير البلح', 'خان يونس', 'رفح', 'شمال غزة'],
  paymentMethods: [
    { id: 'jawwalpay', label: 'جوال باي', enabled: true, accountName: '', accountNumber: '', iban: '', branch: '', instructions: '', paymentLink: '', details: '' },
    { id: 'palpay', label: 'بال باي', enabled: true, accountName: '', accountNumber: '', iban: '', branch: '', instructions: '', paymentLink: '', details: '' },
    { id: 'bank_palestine', label: 'بنك فلسطين', enabled: true, accountName: '', accountNumber: '', iban: '', branch: '', instructions: '', paymentLink: '', details: '' },
    { id: 'other', label: 'طريقة أخرى', enabled: false, accountName: '', accountNumber: '', iban: '', branch: '', instructions: '', paymentLink: '', details: '' },
  ],
  ordersEnabled: true,
  usdRate: 3.65,
  eurRate: 3.95,
  socialLinks: {
    instagram: '',
    facebook: '',
    tiktok: '',
  },
}

export type NewsletterSubscriber = {
  id: string
  email: string
  createdAt: string
  source?: string
  status?: 'active' | 'unsubscribed'
}
