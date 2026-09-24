import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  query,
  where,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import type { Product, Category, Order, OrderStatus, SiteSettings, NewsletterSubscriber, PaymentMethod, PaymentMethodDetails, PaymentMethodId } from './types'
import { DEFAULT_SITE_SETTINGS } from './types'
import { getFreeShippingThreshold } from './utils/commerce'

export const firebaseConfig = {
  apiKey: 'AIzaSyBpUaD5Jk-H3Ip6szA9iKgYBwinE0SMwUQ',
  authDomain: 'e-com-huda.firebaseapp.com',
  projectId: 'e-com-huda',
  storageBucket: 'e-com-huda.firebasestorage.app',
  messagingSenderId: '785342691435',
  appId: '1:785342691435:web:601e664d0be4c43d97d92e',
}

function withoutUndefinedFields<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T
}

function withDeletedUndefinedFields<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [
      key,
      fieldValue === undefined ? deleteField() : fieldValue,
    ])
  ) as T
}

// Initialize Firebase App & Firestore
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
export const db = getFirestore(app)
const auth = getAuth(app)
export const ADMIN_EMAIL = 'huda@gmail.com'

function isAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === ADMIN_EMAIL
}

export type FirebaseUser = { email: string; idToken: string }

/** Sign in through the Firebase SDK so Firestore rules receive request.auth. */
export async function signInAdmin(email: string, password: string): Promise<FirebaseUser> {
  try {
    // Admin access must not survive closing the browser. This is safer for a
    // public storefront that may be opened on a shared device.
    await setPersistence(auth, browserSessionPersistence)
    const credential = await signInWithEmailAndPassword(auth, email, password)
    if (!isAdminEmail(credential.user.email)) {
      await signOut(auth)
      throw new Error('هذا الحساب غير مخوّل للوصول إلى لوحة الإدارة.')
    }
    return { email: credential.user.email ?? email, idToken: await credential.user.getIdToken() }
  } catch (error) {
    if (error instanceof Error && error.message === 'هذا الحساب غير مخوّل للوصول إلى لوحة الإدارة.') throw error
    throw new Error('فشل تسجيل الدخول. تأكدي من صحة البريد وكلمة المرور ومن تفعيل Email/Password في Firebase Authentication.')
  }
}

export async function signOutAdmin(): Promise<void> { await signOut(auth) }

/** Wait for Firebase Auth persistence before subscribing to protected data. */
export function observeAdminAuth(onChange: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onChange(null)
      return
    }
    if (!isAdminEmail(user.email)) {
      await signOut(auth)
      onChange(null)
      return
    }
    onChange({ email: user.email ?? '', idToken: await user.getIdToken() })
  })
}

type ImageKitAuthorization = { signature: string; token: string; expire: number | string; publicKey: string }

/** ImageKit has a free tier; the signing secret stays safely inside the Worker. */
export async function uploadProductImage(file: File, idToken: string): Promise<string> {
  const authorizationResponse = await fetch('https://imagekit-upload-auth.work-menu-mohammed1998.workers.dev/upload-auth', {
    method: 'POST', headers: { Authorization: `Bearer ${idToken}` },
  })
  if (!authorizationResponse.ok) {
    const detail = await authorizationResponse.json().catch(() => ({})) as { error?: string }
    throw new Error(`${detail.error || 'خدمة تصريح الرفع غير متاحة'} (رمز ${authorizationResponse.status})`)
  }
  const authorization = await authorizationResponse.json() as ImageKitAuthorization
  if (!authorization.signature || !authorization.token || !authorization.expire || !authorization.publicKey) throw new Error('تصريح ImageKit غير مكتمل')
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileName', `${Date.now()}-${file.name.replace(/\s+/g, '_')}`)
  formData.append('publicKey', authorization.publicKey)
  formData.append('signature', authorization.signature)
  formData.append('expire', String(authorization.expire))
  formData.append('token', authorization.token)
  formData.append('folder', '/al-huda/products')
  const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: formData })
  if (!uploadResponse.ok) throw new Error(`ImageKit رفض رفع الصورة (رمز ${uploadResponse.status})`)
  const result = await uploadResponse.json() as { url?: string }
  if (!result.url) throw new Error('لم تُرجع ImageKit رابط الصورة')
  return result.url
}

/** Upload category image to ImageKit */
export async function uploadCategoryImage(file: File, idToken: string): Promise<string> {
  const authorizationResponse = await fetch('https://imagekit-upload-auth.work-menu-mohammed1998.workers.dev/upload-auth', {
    method: 'POST', headers: { Authorization: `Bearer ${idToken}` },
  })
  if (!authorizationResponse.ok) {
    const detail = await authorizationResponse.json().catch(() => ({})) as { error?: string }
    throw new Error(`${detail.error || 'خدمة تصريح الرفع غير متاحة'} (رمز ${authorizationResponse.status})`)
  }
  const authorization = await authorizationResponse.json() as ImageKitAuthorization
  if (!authorization.signature || !authorization.token || !authorization.expire || !authorization.publicKey) throw new Error('تصريح ImageKit غير مكتمل')
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileName', `${Date.now()}-${file.name.replace(/\s+/g, '_')}`)
  formData.append('publicKey', authorization.publicKey)
  formData.append('signature', authorization.signature)
  formData.append('expire', String(authorization.expire))
  formData.append('token', authorization.token)
  formData.append('folder', '/al-huda/categories')
  const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: formData })
  if (!uploadResponse.ok) throw new Error(`ImageKit رفض رفع الصورة (رمز ${uploadResponse.status})`)
  const result = await uploadResponse.json() as { url?: string }
  if (!result.url) throw new Error('لم تُرجع ImageKit رابط الصورة')
  return result.url
}


// ─── FIRESTORE: Products ──────────────────────────────────────────────────────

const PRODUCTS_COLLECTION = 'products'
const CATEGORIES_COLLECTION = 'categories'
const ORDERS_COLLECTION = 'orders'
const SETTINGS_COLLECTION = 'settings'
const SETTINGS_DOCUMENT = 'store'
const SUBSCRIBERS_COLLECTION = 'subscribers'
function normalizePaymentDetails(value: unknown, fallback: PaymentMethodDetails): PaymentMethodDetails {
  const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    accountName: typeof saved.accountName === 'string' ? saved.accountName : fallback.accountName,
    accountNumber: typeof saved.accountNumber === 'string' ? saved.accountNumber : fallback.accountNumber,
    iban: typeof saved.iban === 'string' ? saved.iban : fallback.iban,
    branch: typeof saved.branch === 'string' ? saved.branch : fallback.branch,
    instructions: typeof saved.instructions === 'string' ? saved.instructions : fallback.instructions,
    paymentLink: typeof saved.paymentLink === 'string' ? saved.paymentLink : fallback.paymentLink,
  }
}

function normalizePaymentMethods(value: unknown): PaymentMethod[] {
  const stored = Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    : []
  return DEFAULT_SITE_SETTINGS.paymentMethods.map(method => {
    const saved = stored.find(item => item.id === method.id)
    const details = normalizePaymentDetails(saved, method)
    return {
      ...method,
      ...details,
      enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : method.enabled,
      // Migrate the old single textarea value into the new instructions field.
      instructions: typeof saved?.instructions === 'string' && saved.instructions.trim()
        ? saved.instructions
        : typeof saved?.details === 'string' && saved.details.trim() ? saved.details : method.instructions,
      details: typeof saved?.details === 'string' ? saved.details : method.details,
    }
  })
}


export function subscribeToSiteSettings(onSuccess: (settings: SiteSettings) => void, onError?: (err: Error) => void) {
  return onSnapshot(doc(db, SETTINGS_COLLECTION, SETTINGS_DOCUMENT), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as Partial<SiteSettings>
      const storedSocialLinks = data.socialLinks && typeof data.socialLinks === 'object'
        ? data.socialLinks as Partial<SiteSettings['socialLinks']>
        : {}
      const storedDeliveryCities = Array.isArray(data.deliveryCities)
        ? Array.from(new Set(data.deliveryCities
          .filter((city): city is string => typeof city === 'string')
          .map(city => city.trim())
          .filter(Boolean)))
        : DEFAULT_SITE_SETTINGS.deliveryCities
      const storedPaymentMethods = normalizePaymentMethods(data.paymentMethods)
      onSuccess({
        ...DEFAULT_SITE_SETTINGS,
        ...data,
        freeShippingThreshold: getFreeShippingThreshold(data.freeShippingThreshold),
        deliveryCities: storedDeliveryCities,
        paymentMethods: storedPaymentMethods,
        ordersEnabled: data.ordersEnabled ?? true,
        usdRate: Number(data.usdRate ?? DEFAULT_SITE_SETTINGS.usdRate) > 0 ? Number(data.usdRate) : DEFAULT_SITE_SETTINGS.usdRate,
        eurRate: Number(data.eurRate ?? DEFAULT_SITE_SETTINGS.eurRate) > 0 ? Number(data.eurRate) : DEFAULT_SITE_SETTINGS.eurRate,
        socialLinks: {
          instagram: typeof storedSocialLinks.instagram === 'string' ? storedSocialLinks.instagram : '',
          facebook: typeof storedSocialLinks.facebook === 'string' ? storedSocialLinks.facebook : '',
          tiktok: typeof storedSocialLinks.tiktok === 'string' ? storedSocialLinks.tiktok : '',
        },
      })
    }
  }, (err) => onError?.(err))
}

export async function updateSiteSettings(settings: SiteSettings): Promise<void> {
  await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOCUMENT), settings, { merge: true })
}

/**
 * Subscribe to products collection in real time
 */
export function subscribeToProducts(
  onSuccess: (products: Product[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, PRODUCTS_COLLECTION)
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Product[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          name: data.name || '',
          slug: data.slug || '',
          description: data.description || '',
          price: Number(data.price) || 0,
          categoryId: data.categoryId || '',
          categoryName: data.categoryName || '',
          isAvailable: data.isAvailable ?? true,
          isPublished: data.isPublished ?? true,
          images: Array.isArray(data.images) ? data.images : [],
          badge: data.badge || undefined,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || ''),
        } as Product
      })
      onSuccess(list)
    },
    (err) => {
      console.warn('Firestore products listener error:', err)
      if (onError) onError(err)
    }
  )
}

/**
 * Add a new product to Firestore
 */
export async function addProductToFirestore(product: Omit<Product, 'id'>): Promise<string> {
  const colRef = collection(db, PRODUCTS_COLLECTION)
  const docRef = await addDoc(colRef, withoutUndefinedFields({
    ...product,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  return docRef.id
}

/**
 * Update an existing product in Firestore
 */
export async function updateProductInFirestore(id: string, updates: Partial<Product>): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id)
  const cleanUpdates = withDeletedUndefinedFields({ ...updates, updatedAt: serverTimestamp() })
  delete (cleanUpdates as Record<string, unknown>).id
  await updateDoc(docRef, cleanUpdates)
}

/**
 * Delete a product from Firestore
 */
export async function deleteProductFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id)
  await deleteDoc(docRef)
}

// ─── FIRESTORE: Categories ────────────────────────────────────────────────────

/**
 * Subscribe to categories collection in real time
 */
export function subscribeToCategories(
  onSuccess: (categories: Category[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, CATEGORIES_COLLECTION)
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Category[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          name: data.name || '',
          slug: data.slug || '',
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          isVisible: data.isVisible ?? true,
          order: Number(data.order) || 0,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
        } as Category
      })
      list.sort((a, b) => a.order - b.order)
      onSuccess(list)
    },
    (err) => {
      console.warn('Firestore categories listener error:', err)
      if (onError) onError(err)
    }
  )
}

/**
 * Add a new category to Firestore
 */
export async function addCategoryToFirestore(category: Omit<Category, 'id'>): Promise<string> {
  const colRef = collection(db, CATEGORIES_COLLECTION)
  const docRef = await addDoc(colRef, withoutUndefinedFields({
    ...category,
    createdAt: serverTimestamp(),
  }))
  return docRef.id
}

/**
 * Update an existing category in Firestore
 */
export async function updateCategoryInFirestore(id: string, updates: Partial<Category>): Promise<void> {
  const docRef = doc(db, CATEGORIES_COLLECTION, id)
  const cleanUpdates = withDeletedUndefinedFields({ ...updates })
  delete (cleanUpdates as Record<string, unknown>).id
  await updateDoc(docRef, cleanUpdates)
}

/**
 * Delete a category from Firestore
 */
export async function deleteCategoryFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, CATEGORIES_COLLECTION, id)
  await deleteDoc(docRef)
}

/**
 * Move all products out of a category, then delete the empty category.
 * The operation is chunked so a large catalog does not exceed Firestore's
 * 500-operation batch limit. Re-running it is safe after a partial failure.
 */
export async function moveProductsToCategoryAndDeleteCategory(
  sourceCategoryId: string,
  targetCategoryId: string,
  targetCategoryName: string
): Promise<number> {
  const productQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    where('categoryId', '==', sourceCategoryId)
  )
  const productSnapshot = await getDocs(productQuery)
  const productDocs = productSnapshot.docs
  const batchSize = 450

  for (let start = 0; start < productDocs.length; start += batchSize) {
    const batch = writeBatch(db)
    for (const productDoc of productDocs.slice(start, start + batchSize)) {
      batch.update(productDoc.ref, {
        categoryId: targetCategoryId,
        categoryName: targetCategoryName,
        updatedAt: serverTimestamp(),
      })
    }
    await batch.commit()
  }

  await deleteDoc(doc(db, CATEGORIES_COLLECTION, sourceCategoryId))
  return productDocs.length
}

// ─── FIRESTORE: Orders ────────────────────────────────────────────────────────

function normalizeOrderItems(value: unknown): Order['items'] {
  if (!Array.isArray(value)) return []

  return value.flatMap(rawItem => {
    if (!rawItem || typeof rawItem !== 'object') return []
    const item = rawItem as Record<string, unknown>
    const price = Number(item.price)
    const quantity = Number(item.quantity)

    return [{
      productId: typeof item.productId === 'string' ? item.productId : '',
      productName: typeof item.productName === 'string' && item.productName.trim() ? item.productName : 'منتج محذوف',
      price: Number.isFinite(price) ? Math.max(0, price) : 0,
      quantity: Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1,
      image: typeof item.image === 'string' ? item.image : '',
    }]
  })
}

function isCurrencyCode(value: unknown): value is NonNullable<Order['displayCurrency']> {
  return value === 'ILS' || value === 'USD' || value === 'EUR'
}

function isPaymentMethodId(value: unknown): value is PaymentMethodId {
  return value === 'jawwalpay' || value === 'palpay' || value === 'bank_palestine' || value === 'other'
}

function normalizeOrderPaymentDetails(value: unknown): PaymentMethodDetails | undefined {
  if (!value || typeof value !== 'object') return undefined
  return normalizePaymentDetails(value, {
    accountName: '',
    accountNumber: '',
    iban: '',
    branch: '',
    instructions: '',
    paymentLink: '',
  })
}

/**
 * Subscribe to orders in real time
 */
export function subscribeToOrders(
  onSuccess: (orders: Order[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, ORDERS_COLLECTION)
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Order[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        const items = normalizeOrderItems(data.items)
        const totalValue = Number(data.total)
        const total = Number.isFinite(totalValue) ? Math.max(0, totalValue) : 0
        const storedItemsCount = Number(data.itemsCount)
        const derivedItemsCount = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
        const itemsCount = Number.isFinite(storedItemsCount) && storedItemsCount > 0
          ? Math.floor(storedItemsCount)
          : derivedItemsCount
        const displayCurrency = isCurrencyCode(data.displayCurrency) ? data.displayCurrency : undefined
        const displayRate = Number(data.displayRate)
        const displayTotal = Number(data.displayTotal)
        const hasCurrencySnapshot = Boolean(
          displayCurrency
          && Number.isFinite(displayRate)
          && displayRate > 0
          && Number.isFinite(displayTotal)
          && displayTotal >= 0
        )

        return {
          id: docSnap.id,

           customer: typeof data.customer === 'string' && data.customer.trim() ? data.customer : 'عميلة',
          phone: typeof data.phone === 'string' ? data.phone : '',
          email: typeof data.email === 'string' ? data.email : '',
          governorate: typeof data.governorate === 'string' ? data.governorate : '',
          city: typeof data.city === 'string' ? data.city : '',
          address: typeof data.address === 'string' ? data.address : '',
          deliveryNotes: typeof data.deliveryNotes === 'string' ? data.deliveryNotes : '',
          notes: typeof data.notes === 'string' ? data.notes : '',
          items,
          total,
          itemsCount,
          ...(hasCurrencySnapshot ? { displayCurrency, displayRate, displayTotal } : {}),
          shippingStatus: data.shippingStatus === 'free' || data.shippingStatus === 'standard' ? data.shippingStatus : undefined,
          shippingThreshold: Number.isFinite(Number(data.shippingThreshold)) ? Number(data.shippingThreshold) : undefined,
          paymentStatus: data.paymentStatus === 'paid' ? 'paid' : 'pending',
           requestedPaymentMethod: isPaymentMethodId(data.requestedPaymentMethod) ? data.requestedPaymentMethod : undefined,
           paymentMethod: isPaymentMethodId(data.paymentMethod) ? data.paymentMethod : undefined,
           paymentMethodLabel: typeof data.paymentMethodLabel === 'string' ? data.paymentMethodLabel : undefined,
           paymentDetails: normalizeOrderPaymentDetails(data.paymentDetails),
           paymentReference: typeof data.paymentReference === 'string' ? data.paymentReference : undefined,
           paymentConfirmedAt: typeof data.paymentConfirmedAt === 'string' ? data.paymentConfirmedAt : undefined,
           status: (data.status as OrderStatus) || 'جديد',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
        } as Order
      })
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      onSuccess(list)
    },
    (err) => {
      console.warn('Firestore orders listener error:', err)
      if (onError) onError(err)
    }
  )
}

/** Add a new order directly to Firestore. */
export async function addOrderToFirestore(order: Omit<Order, 'id'>): Promise<string> {
  const colRef = collection(db, ORDERS_COLLECTION)
  const docRef = await addDoc(colRef, withoutUndefinedFields({
    ...order,
    createdAt: serverTimestamp(),
  }))
  return docRef.id
}

/**
 * Update an order's status in Firestore
 */
export async function updateOrderStatusInFirestore(id: string, status: OrderStatus): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, id)
  await updateDoc(docRef, { status })
}

/** Update the editable details of an existing order. */
export async function updateOrderInFirestore(id: string, updates: Partial<Order>): Promise<void> {
  const cleanUpdates = withDeletedUndefinedFields({ ...updates })
  delete (cleanUpdates as Record<string, unknown>).id
  delete (cleanUpdates as Record<string, unknown>).createdAt
  await updateDoc(doc(db, ORDERS_COLLECTION, id), cleanUpdates)
}

/** Permanently remove one order; Firestore rules restrict this to administrators. */
export async function deleteOrderFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, ORDERS_COLLECTION, id))
}

// ─── FIRESTORE: Subscribers (Newsletter) ──────────────────────────────────────

/**
 * Add a newsletter subscriber to Firestore
 */
export async function addSubscriberToFirestore(email: string, source = 'storefront_newsletter'): Promise<string> {
  const colRef = collection(db, SUBSCRIBERS_COLLECTION)
  const docRef = await addDoc(colRef, {
    email: email.trim().toLowerCase(),
    source,
    status: 'active',
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Subscribe to newsletter subscribers list in real time
 */
export function subscribeToSubscribers(
  onSuccess: (subscribers: NewsletterSubscriber[]) => void,
  onError?: (err: Error) => void
) {
  const q = collection(db, SUBSCRIBERS_COLLECTION)
  return onSnapshot(
    q,
    (snapshot) => {
      const list: NewsletterSubscriber[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          email: data.email || '',
          source: data.source || 'متجر الهدى',
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
        } as NewsletterSubscriber
      })
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      onSuccess(list)
    },
    (err) => {
      console.warn('Firestore subscribers listener error:', err)
      if (onError) onError(err)
    }
  )
}

/**
 * Delete a subscriber from Firestore
 */
export async function deleteSubscriberFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, SUBSCRIBERS_COLLECTION, id)
  await deleteDoc(docRef)
}

// ─── INITIAL SEEDING & SYNC HELPER ─────────────────────────────────────────────


/**
 * Seeds initial categories and products to Firestore directly so the database is populated.
 */
export async function seedInitialDatabase(
  initialCategories: Category[],
  initialProducts: Product[]
): Promise<{ categoriesCount: number; productsCount: number }> {
  const batch = writeBatch(db)

  // 1. Categories
  for (const cat of initialCategories) {
    const catRef = doc(db, CATEGORIES_COLLECTION, cat.id)
    const { id, ...data } = cat
    batch.set(catRef, { ...data, createdAt: serverTimestamp() }, { merge: true })
  }

  // 2. Products
  for (const prod of initialProducts) {
    const prodRef = doc(db, PRODUCTS_COLLECTION, prod.id)
    const { id, ...data } = prod
    batch.set(prodRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
  }

  await batch.commit()
  return {
    categoriesCount: initialCategories.length,
    productsCount: initialProducts.length,
  }
}

/**
 * Clear all records from Firestore collections (used for resetting/removing temporary data)
 */
export async function clearAllFirestoreData(): Promise<void> {
  const [prodSnaps, catSnaps, ordSnaps] = await Promise.all([
    getDocs(collection(db, PRODUCTS_COLLECTION)),
    getDocs(collection(db, CATEGORIES_COLLECTION)),
    getDocs(collection(db, ORDERS_COLLECTION)),
  ])

  const batch = writeBatch(db)
  prodSnaps.docs.forEach((d) => batch.delete(d.ref))
  catSnaps.docs.forEach((d) => batch.delete(d.ref))
  ordSnaps.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}
