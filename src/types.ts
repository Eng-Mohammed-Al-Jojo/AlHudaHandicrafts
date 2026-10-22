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
export type PaymentStatus = 'pending' | 'paid' | 'cancelled'
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

export type InvoiceType = 'sale' | 'purchase'

export type InvoiceItem = {
  id: string
  productId?: string
  name: string
  price: number
  quantity: number
  /** Discount amount in ILS applied to the whole line. */
  discount: number
}

export type InvoiceSignature = {
  /** Handwritten signature exported from the signature pad (PNG data URL). */
  drawing?: string
  /** Uploaded signature or stamp image (data URL). */
  image?: string
}

export type Invoice = {
  id: string
  invoiceNumber: string
  type: InvoiceType
  /** Original order id when this invoice was issued from an order. */
  orderId?: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  items: InvoiceItem[]
  /** Extra discount amount in ILS applied to the whole invoice. */
  extraDiscount: number
  notes?: string
  signature?: InvoiceSignature
  createdAt: string
  updatedAt?: string
}

export type InvoiceDraft = Omit<Invoice, 'id'>

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
  /** Default invoice signature (handwritten and/or uploaded) shared across devices. */
  invoiceSignature?: InvoiceSignature
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
  /** Friend's name — for subscriptions made through the WhatsApp list. */
  name?: string
  /** WhatsApp number, stored as international digits (e.g. 970599123456). */
  phone?: string
  /** Legacy field kept for older subscriptions created before the WhatsApp list. */
  email?: string
  createdAt: string
  source?: string
  status?: 'active' | 'unsubscribed'
}
