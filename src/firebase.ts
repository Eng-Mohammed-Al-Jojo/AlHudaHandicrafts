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
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import type { Product, Category, Order, OrderStatus, SiteSettings, NewsletterSubscriber } from './types'
import { DEFAULT_SITE_SETTINGS } from './types'

export const firebaseConfig = {
  apiKey: 'AIzaSyBpUaD5Jk-H3Ip6szA9iKgYBwinE0SMwUQ',
  authDomain: 'e-com-huda.firebaseapp.com',
  projectId: 'e-com-huda',
  storageBucket: 'e-com-huda.firebasestorage.app',
  messagingSenderId: '785342691435',
  appId: '1:785342691435:web:601e664d0be4c43d97d92e',
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


export function subscribeToSiteSettings(onSuccess: (settings: SiteSettings) => void, onError?: (err: Error) => void) {
  return onSnapshot(doc(db, SETTINGS_COLLECTION, SETTINGS_DOCUMENT), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as Partial<SiteSettings>
      const storedSocialLinks = data.socialLinks && typeof data.socialLinks === 'object'
        ? data.socialLinks as Partial<SiteSettings['socialLinks']>
        : {}
      onSuccess({
        ...DEFAULT_SITE_SETTINGS,
        ...data,
        freeShippingThreshold: Number(data.freeShippingThreshold ?? DEFAULT_SITE_SETTINGS.freeShippingThreshold) || DEFAULT_SITE_SETTINGS.freeShippingThreshold,
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
  const docRef = await addDoc(colRef, {
    ...product,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Update an existing product in Firestore
 */
export async function updateProductInFirestore(id: string, updates: Partial<Product>): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id)
  const cleanUpdates = { ...updates, updatedAt: serverTimestamp() }
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
  const docRef = await addDoc(colRef, {
    ...category,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Update an existing category in Firestore
 */
export async function updateCategoryInFirestore(id: string, updates: Partial<Category>): Promise<void> {
  const docRef = doc(db, CATEGORIES_COLLECTION, id)
  const cleanUpdates = { ...updates }
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

// ─── FIRESTORE: Orders ────────────────────────────────────────────────────────

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
        return {
          id: docSnap.id,
          customer: data.customer || 'عميلة',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          notes: data.notes || '',
          items: Array.isArray(data.items) ? data.items : [],
          total: Number(data.total) || 0,
          itemsCount: Number(data.itemsCount) || 0,
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

/**
 * Add a new order directly to Firestore
 */
export async function addOrderToFirestore(order: Omit<Order, 'id'>): Promise<string> {
  const colRef = collection(db, ORDERS_COLLECTION)
  const docRef = await addDoc(colRef, {
    ...order,
    createdAt: serverTimestamp(),
  })
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
  const cleanUpdates = { ...updates }
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
