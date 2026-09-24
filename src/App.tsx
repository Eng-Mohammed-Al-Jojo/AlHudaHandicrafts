import { useState, useEffect, useMemo, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'

import type { FirebaseUser, Product, Category, Order, OrderStatus, SiteSettings, NewsletterSubscriber } from './types'
import { DEFAULT_SITE_SETTINGS } from './types'
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from './data'

import {
  subscribeToProducts,
  subscribeToCategories,
  subscribeToOrders,
  subscribeToSubscribers,
  deleteSubscriberFromFirestore,
  addProductToFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  addCategoryToFirestore,
  updateCategoryInFirestore,
  deleteCategoryFromFirestore,
  moveProductsToCategoryAndDeleteCategory,
  addOrderToFirestore,
  updateOrderStatusInFirestore,
  updateOrderInFirestore,
  deleteOrderFromFirestore,
  seedInitialDatabase,
  clearAllFirestoreData
} from './firebase'

import { subscribeToSiteSettings, updateSiteSettings, signOutAdmin, observeAdminAuth } from './firebase'

import { useCart } from './hooks/useCart'
import { useToast } from './hooks/useToast'
import { getPublicCategories } from './utils/catalog'
import { getFreeShippingStatus } from './utils/commerce'
import { notifyNewOrder } from './utils/adminNotifications'

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ToastContainer from './components/ui/Toast'

import StorePage from './pages/StorePage'
import ProductsPage from './pages/ProductsPage'
import CategoriesPage from './pages/CategoriesPage'

import AdminLayout from './components/admin/AdminLayout'
import AdminOverview from './components/admin/AdminOverview'
import AdminProducts from './components/admin/AdminProducts'
import AdminCategories from './components/admin/AdminCategories'
import AdminOrders from './components/admin/AdminOrders'
import AdminLogin from './components/admin/AdminLogin'
import AdminSettings from './components/admin/AdminSettings'
import CheckoutModal from './components/store/CheckoutModal'
import OrderConfirmationModal from './components/store/OrderConfirmationModal'
import type { CheckoutCurrencyDetails, CheckoutCustomerDetails } from './components/store/CheckoutModal'
import { CurrencyProvider } from './context/CurrencyContext'

// React Router does not restore native browser anchor scrolling after a client-side
// navigation. This also makes every category/search route start at its own header.
function ScrollManager() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const targetId = decodeURIComponent(hash.slice(1))
      let frame = 0
      let attempts = 0
      const scrollWhenReady = () => {
        const target = document.getElementById(targetId)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
        // The home page can still be loading its products when the navigation
        // occurs. Retry briefly until the anchored section is mounted.
        if (attempts++ < 20) frame = requestAnimationFrame(scrollWhenReady)
      }
      frame = requestAnimationFrame(scrollWhenReady)
      return () => cancelAnimationFrame(frame)
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search, hash])

  return null
}

function getFirestoreWriteErrorMessage(error: unknown, action: string) {
  const code = (error as { code?: string } | null)?.code
  const details = error instanceof Error ? error.message : ''
  if (code === 'permission-denied') {
    return `لم يسمح Firebase بـ${action}. تحققي من تسجيل الدخول وصلاحيات الإدارة. لم يتم تغيير أي بيانات.`
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return `تعذر الاتصال بـFirebase أثناء ${action}. تحققي من الإنترنت ثم أعيدي المحاولة. لم يتم تغيير أي بيانات.`
  }
  if (code === 'resource-exhausted') {
    return `بلغت حدة Firebase أثناء ${action}. انتظري قليلاً ثم أعيدي المحاولة. لم يتم تغيير أي بيانات.`
  }
  if (/unsupported field value|undefined/i.test(details)) {
    return `رفض Firestore قيمة غير مدعومة أثناء ${action}. تم تنظيف القيم الفارغة؛ حدّثي الصفحة ثم أعيدي المحاولة.`
  }
  const codeSuffix = code ? ` (رمز Firebase: ${code})` : ''
  return `تعذر ${action} وحفظه في Firestore${codeSuffix}. لم يتم تغيير أي بيانات.`
}

// ─── Store Layout ─────────────────────────────────────────────────────────────
function StoreLayout({ children, cartData, onCheckout, settings }: {
  children: React.ReactNode
  cartData: ReturnType<typeof useCart>
  onCheckout: () => void
  settings: SiteSettings
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#221811]">
      <Navbar
        cartCount={cartData.count}
        cartTotal={cartData.total}
        cartItems={cartData.items}
        onRemoveItem={cartData.removeItem}
        onUpdateQty={cartData.updateQty}
        onCheckout={onCheckout}
        settings={settings}
      />
      <div className="flex-1">
        {children}
      </div>
      <Footer settings={settings} />
    </div>
  )
}

// ─── Admin Guard ──────────────────────────────────────────────────────────────
function AdminGuard({ user, ready, children }: { user: FirebaseUser | null; ready: boolean; children: React.ReactNode }) {
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center text-[#8D6527] gap-3">
        <div className="w-10 h-10 border-3 border-[#C59B4B] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold">جارٍ التحقق من جلسة الإدارة...</span>
      </div>
    )
  }
  if (!user) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [adminUser, setAdminUser] = useState<FirebaseUser | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const knownOrderIdsRef = useRef<Set<string> | null>(null)
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([])
  const [dbConnected, setDbConnected] = useState(false)
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true)
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [orderConfirmation, setOrderConfirmation] = useState<{ orderId: string } | null>(null)

  const cart = useCart()
  const { toasts, show: notify, dismiss } = useToast()
  const publicCategories = useMemo(() => getPublicCategories(categories, products), [categories, products])

  function handleSetAdminUser(user: FirebaseUser | null) {
    setAdminUser(user)
  }

  function handleAdminLogout() {
    void signOutAdmin().catch(err => console.warn('Firebase sign-out error:', err))
    handleSetAdminUser(null)
  }

  // Firebase Auth, not localStorage, is the source of truth for protected data.
  useEffect(() => {
    const unsubscribe = observeAdminAuth(user => {
      handleSetAdminUser(user)
      setAuthReady(true)
    })
    return unsubscribe
  }, [])

  // ─── Real-time Firestore Subscriptions ─────────────────────────────────────────
  useEffect(() => {
    // 1. Products subscription
    const unsubProducts = subscribeToProducts(
      (items) => {
        const cartSync = cart.syncWithProducts(items)
        setProducts(items)
        setDbConnected(true)
        setIsLoadingInitialData(false)

        const syncMessages: string[] = []
        if (cartSync.removed.length > 0) {
          const names = cartSync.removed.slice(0, 2).map(item => `«${item.name}»`).join('، ')
          syncMessages.push(`أزيلت ${names}${cartSync.removed.length > 2 ? ' ومنتجات أخرى' : ''} لعدم توفرها أو نشرها`)
        }
        if (cartSync.priceChanges.length > 0) {
          const names = cartSync.priceChanges.slice(0, 2).map(item => `«${item.name}»`).join('، ')
          syncMessages.push(`حُدّثت أسعار ${names}${cartSync.priceChanges.length > 2 ? ' ومنتجات أخرى' : ''}`)
        }
        if (syncMessages.length > 0) notify(`تمت مزامنة السلة: ${syncMessages.join('؛ ')}.`, 'info')
      },
      (err) => {
        console.error('Products listener error:', err)
        setDbConnected(false)
        setIsLoadingInitialData(false)
      }
    )

    // 2. Categories subscription
    const unsubCategories = subscribeToCategories(
      (items) => {
        setCategories(items)
      },
      (err) => {
        console.error('Categories listener error:', err)
      }
    )

    const unsubSettings = subscribeToSiteSettings(setSettings, (err) => console.warn('Settings listener error:', err))

    return () => {
      unsubProducts()
      unsubCategories()
      unsubSettings()
    }
  }, [])

  // Orders and Subscribers are private. Attach this listener only after the authenticated admin session is ready.
  useEffect(() => {
    if (!authReady || !adminUser) {
      setOrders([])
      setOrdersLoaded(false)
      knownOrderIdsRef.current = null
      setSubscribers([])
      return
    }
    const unsubOrders = subscribeToOrders(
      items => {
        setOrders(items)
        setOrdersLoaded(true)
      },
      (err) => {
        console.error('Orders listener error:', err)
        setOrdersLoaded(false)
        notify('تعذر تحميل الطلبات: تحققي من قواعد Firestore.', 'error')
      }
    )
    const unsubSubscribers = subscribeToSubscribers(
      setSubscribers,
      (err) => {
        console.error('Subscribers listener error:', err)
        notify('تعذر تحميل المشتركات: تأكدي من نشر قواعد Firestore وتسجيل الدخول ببريد huda@gmail.com.', 'error')
      }
    )
    return () => {
      unsubOrders()
      unsubSubscribers()
    }
  }, [authReady, adminUser?.email])

  useEffect(() => {
    if (!authReady || !adminUser || !ordersLoaded) return
    const currentIds = new Set(orders.map(order => order.id))
    if (knownOrderIdsRef.current === null) {
      knownOrderIdsRef.current = currentIds
      return
    }
    orders
      .filter(order => !knownOrderIdsRef.current?.has(order.id))
      .forEach(order => notifyNewOrder(order))
    knownOrderIdsRef.current = currentIds
  }, [orders, ordersLoaded, authReady, adminUser?.email])

  async function handleDeleteSubscriber(id: string) {
    try {
      await deleteSubscriberFromFirestore(id)
      setSubscribers(prev => prev.filter(s => s.id !== id))
      notify('تم حذف المشتركة من القائمة بنجاح')
    } catch (err) {
      console.error('Delete subscriber error:', err)
      notify('تعذر حذف المشتركة', 'error')
    }
  }


  // ─── Cart & Checkout ──────────────────────────────────────────────────────────
  function handleAddToCart(p: Product, quantity = 1) {
    cart.addItem(p, quantity)
    notify(quantity > 1 ? `تمت إضافة ${quantity} قطع من «${p.name}» إلى السلة` : `تمت إضافة «${p.name}» إلى السلة`)
  }

  async function handleCheckout(details: CheckoutCustomerDetails, currencyDetails: CheckoutCurrencyDetails): Promise<boolean> {
    if (settings.ordersEnabled === false) {
      notify('نعتذر، استقبال الطلبات متوقف مؤقتاً في الوقت الحالي.', 'error')
      return false
    }
    if (!cart.items.length) {
      notify('لم تعد هناك منتجات متاحة في السلة. أضيفي المنتجات المطلوبة ثم حاولي مجدداً.', 'error')
      return false
    }

    const selectedPaymentMethod = settings.paymentMethods.find(method => method.id === details.requestedPaymentMethod && method.enabled)
    if (!selectedPaymentMethod) {
      notify('طريقة الدفع غير متاحة حالياً. حدّثي صفحة المتجر وحاولي مجدداً.', 'error')
      return false
    }

    const { threshold: freeShippingLimit, isFreeShipping } = getFreeShippingStatus(cart.total, settings.freeShippingThreshold)
    const shippingStatusText = isFreeShipping ? 'شحن مجاني (مؤهل للعرض)' : 'شحن عادي'
    const shippingNote = `[حالة الشحن: ${shippingStatusText} - حد الشحن المجاني: ${freeShippingLimit} ₪]`
    const deliveryNotesWithShipping = [details.deliveryNotes, shippingNote].filter(Boolean).join('\n')

    const newOrderData: Omit<Order, 'id'> = {
      customer: details.customer,
      phone: details.phone,
      email: details.email,
      city: details.city,
      address: details.address,
      deliveryNotes: deliveryNotesWithShipping,
      notes: details.notes,
      requestedPaymentMethod: selectedPaymentMethod.id,
      paymentStatus: 'pending',
      paymentMethodLabel: selectedPaymentMethod.label,
      paymentDetails: {
        accountName: selectedPaymentMethod.accountName,
        accountNumber: selectedPaymentMethod.accountNumber,
        iban: selectedPaymentMethod.iban,
        branch: selectedPaymentMethod.branch,
        instructions: selectedPaymentMethod.instructions,
        paymentLink: selectedPaymentMethod.paymentLink,
      },
      items: cart.items.map(i => ({
        productId: i.id,
        productName: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.images[0]?.url ?? '',
      })),
      total: cart.total,
      itemsCount: cart.count,
      displayCurrency: currencyDetails.currency,
      displayRate: currencyDetails.rate,
      displayTotal: currencyDetails.displayedAmount,
      shippingStatus: isFreeShipping ? 'free' : 'standard',
      shippingThreshold: freeShippingLimit,
      status: 'جديد',
      createdAt: new Date().toISOString(),
    }

    try {
      const orderId = await addOrderToFirestore(newOrderData)
      const orderItems = [...cart.items]
      const orderTotal = cart.total
      cart.clear()
      setOrderConfirmation({ orderId })
      if (settings.orderRouting === 'whatsapp' && settings.whatsappNumber) {
        const lines = orderItems
          .map(item => `- ${item.name} × ${item.quantity} (السعر الأساسي: ${item.price * item.quantity} ₪)`)
          .join('\n')
        const message = [
          `طلب جديد من متجر ${settings.storeName}`,
          `رقم الطلب: #${orderId.slice(0, 8)}`,
          `الاسم: ${details.customer}`,
          `الجوال: ${details.phone}`,
          ...(details.email ? [`البريد الإلكتروني: ${details.email}`] : []),
          `المدينة: ${details.city}`,
          `العنوان: ${details.address}`,
           `طريقة الدفع المطلوبة: ${selectedPaymentMethod.label}`,
           ...(selectedPaymentMethod.accountName ? [`اسم صاحب الحساب: ${selectedPaymentMethod.accountName}`] : []),
           ...(selectedPaymentMethod.accountNumber ? [`رقم التحويل: ${selectedPaymentMethod.accountNumber}`] : []),
           ...(selectedPaymentMethod.iban ? [`IBAN: ${selectedPaymentMethod.iban}`] : []),
           ...(selectedPaymentMethod.branch ? [`الفرع: ${selectedPaymentMethod.branch}`] : []),
          lines,
          `القيمة التقديرية بعملة العرض: ${currencyDetails.displayedTotal}`,
          `الإجمالي الأساسي: ${orderTotal} ₪`,
          `سعر الصرف وقت الطلب: 1 ${currencyDetails.currency} = ${currencyDetails.rate} ₪`,
          `الشحن: ${shippingStatusText}`,
          ...(details.deliveryNotes ? [`ملاحظات التوصيل: ${details.deliveryNotes}`] : []),
          ...(details.notes ? [`تفاصيل التطريز: ${details.notes}`] : []),
        ].join('\n')
        const whatsappWindow = window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
        notify(whatsappWindow ? `تم حفظ الطلب #${orderId.slice(0, 8)} وفتح واتساب.` : `تم حفظ الطلب #${orderId.slice(0, 8)}. تعذر فتح واتساب تلقائياً؛ يمكنك إرسال التفاصيل يدوياً.`)
      } else {
        notify(`تم تسجيل الطلب #${orderId.slice(0, 8)} وحفظه في لوحة التحكم بنجاح 🎉`)
      }
      return true
    } catch (err) {
      console.error('Order creation error:', err)
      notify('تعذر حفظ الطلب؛ لم يتم إرسال أي طلب. تحققي من الاتصال وحاولي مجدداً.', 'error')
      return false
    }
  }

  // ─── Admin Firestore CRUD Handlers ────────────────────────────────────────────

  // Products
  async function handleAddProduct(p: Product): Promise<void> {
    try {
      const { id, ...rest } = p
      const docId = await addProductToFirestore(rest)
      setProducts(prev => [{ ...p, id: docId }, ...prev])
      notify('تم حفظ المنتج الجديد في قاعدة بيانات Firestore')
    } catch (err) {
      console.error('Add product error:', err)
      notify(getFirestoreWriteErrorMessage(err, 'حفظ المنتج الجديد'), 'error')
      throw err
    }
  }

  async function handleUpdateProduct(p: Product): Promise<void> {
    try {
      await updateProductInFirestore(p.id, p)
      setProducts(prev => prev.map(x => x.id === p.id ? p : x))
      notify('تم تحديث المنتج في قاعدة البيانات بنجاح')
    } catch (err) {
      console.error('Update product error:', err)
      notify(getFirestoreWriteErrorMessage(err, 'تحديث المنتج'), 'error')
      throw err
    }
  }

  async function handleDeleteProduct(id: string): Promise<void> {
    try {
      await deleteProductFromFirestore(id)
      setProducts(prev => prev.filter(p => p.id !== id))
      notify('تم حذف المنتج من قاعدة البيانات')
    } catch (err) {
      console.error('Delete product error:', err)
      notify(getFirestoreWriteErrorMessage(err, 'حذف المنتج'), 'error')
      throw err
    }
  }

  // Categories
  async function handleAddCategory(c: Category): Promise<void> {
    try {
      const { id, ...rest } = c
      const docId = await addCategoryToFirestore(rest)
      setCategories(prev => [...prev, { ...c, id: docId }])
      notify('تمت إضافة القسم إلى قاعدة البيانات')
    } catch (err) {
      console.error('Add category error:', err)
      notify(getFirestoreWriteErrorMessage(err, 'حفظ القسم الجديد'), 'error')
      throw err
    }
  }

  async function handleUpdateCategory(c: Category): Promise<void> {
    try {
      await updateCategoryInFirestore(c.id, c)
      setCategories(prev => prev.map(x => x.id === c.id ? c : x))
      notify('تم تحديث القسم في قاعدة البيانات')
    } catch (err) {
      console.error('Update category error:', err)
      notify(getFirestoreWriteErrorMessage(err, 'تحديث القسم'), 'error')
      throw err
    }
  }

  async function handleDeleteCategory(id: string): Promise<void> {
    const linkedProductsCount = products.filter(product => product.categoryId === id).length
    if (linkedProductsCount > 0) {
      const message = `لا يمكن حذف القسم لوجود ${linkedProductsCount} منتج مرتبط به. انقلي المنتجات إلى قسم آخر أولاً.`
      notify(message, 'error')
      throw new Error(message)
    }

    try {
      await deleteCategoryFromFirestore(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      notify('تم حذف القسم من قاعدة البيانات')
    } catch (err) {
      console.error('Delete category error:', err)
      notify(getFirestoreWriteErrorMessage(err, 'حذف القسم'), 'error')
      throw err
    }
  }

  async function handleMoveProductsAndDeleteCategory(sourceCategoryId: string, targetCategoryId: string): Promise<void> {
    const targetCategory = categories.find(category => category.id === targetCategoryId)
    if (!targetCategory || targetCategory.id === sourceCategoryId) {
      const message = 'اختاري قسماً بديلاً صالحاً لنقل المنتجات إليه.'
      notify(message, 'error')
      throw new Error(message)
    }

    try {
      const movedProductsCount = await moveProductsToCategoryAndDeleteCategory(
        sourceCategoryId,
        targetCategory.id,
        targetCategory.name
      )
      setProducts(prev => prev.map(product => product.categoryId === sourceCategoryId
        ? { ...product, categoryId: targetCategory.id, categoryName: targetCategory.name }
        : product))
      setCategories(prev => prev.filter(category => category.id !== sourceCategoryId))
      notify(`تم نقل ${movedProductsCount} منتج إلى «${targetCategory.name}» ثم حذف القسم بنجاح.`)
    } catch (err) {
      console.error('Move products and delete category error:', err)
      notify(getFirestoreWriteErrorMessage(err, 'نقل المنتجات وحذف القسم'), 'error')
      throw err
    }
  }

  // Orders
  async function handleUpdateOrderStatus(id: string, status: OrderStatus): Promise<void> {
    const currentOrder = orders.find(order => order.id === id)
    if (status === 'مكتمل' && currentOrder?.status !== 'مكتمل' && currentOrder?.paymentStatus !== 'paid') {
      notify('لا يمكن تغيير الطلب إلى «مكتمل» قبل تأكيد الدفع من نافذة الدفع.', 'error')
      return
    }
    try {
      await updateOrderStatusInFirestore(id, status)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
      notify(`تم تحديث حالة الطلب إلى "${status}" في قاعدة البيانات`)
    } catch (err) {
      console.error('Update order status error:', err)
      notify(getFirestoreWriteErrorMessage(err, 'تحديث حالة الطلب'), 'error')
      throw err
    }
  }

  async function handleUpdateOrder(order: Order) {
    const currentOrder = orders.find(item => item.id === order.id)
    if (order.status === 'مكتمل' && currentOrder?.status !== 'مكتمل' && order.paymentStatus !== 'paid') {
      const message = 'يجب تأكيد الدفع قبل تحويل الطلب إلى «مكتمل».'
      notify(message, 'error')
      throw new Error(message)
    }
    try {
      await updateOrderInFirestore(order.id, order)
      setOrders(prev => prev.map(item => item.id === order.id ? order : item))
      notify('تم حفظ تعديلات الطلب في قاعدة البيانات')
    } catch (err) {
      console.error('Update order error:', err)
      notify('تعذر حفظ تعديلات الطلب. تحققي من اتصالك وصلاحيات الإدارة.', 'error')
      throw err
    }
  }

  async function handleDeleteOrder(id: string) {
    try {
      await deleteOrderFromFirestore(id)
      setOrders(prev => prev.filter(order => order.id !== id))
      notify('تم حذف الطلب نهائياً من قاعدة البيانات')
    } catch (err) {
      console.error('Delete order error:', err)
      notify('تعذر حذف الطلب. لم يتم تغيير أي بيانات.', 'error')
      throw err
    }
  }

  // ─── Database Seeding & Clear Actions ─────────────────────────────────────────
  async function handleSeedDatabase() {
    try {
      const result = await seedInitialDatabase(MOCK_CATEGORIES, MOCK_PRODUCTS)
      notify(`تمت تهيئة قاعدة البيانات بنجاح! (${result.productsCount} منتج، ${result.categoriesCount} قسم)`)
    } catch (err) {
      console.error('Seed database error:', err)
      notify('تعذر تهيئة قاعدة البيانات، تحقق من صلاحيات Firestore', 'error')
    }
  }

  async function handleClearDatabase() {
    try {
      await clearAllFirestoreData()
      setProducts([])
      setCategories([])
      setOrders([])
      notify('تم مسح كافة البيانات المؤقتة من قاعدة البيانات بنجاح 🗑️')
    } catch (err) {
      console.error('Clear database error:', err)
      notify('تعذر مسح البيانات من Firestore', 'error')
    }
  }

  return (
    <CurrencyProvider settings={settings}>
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        {/* ── Store ── */}
        <Route
          path="/"
          element={
            <StoreLayout
              cartData={cart}
              onCheckout={() => setCheckoutOpen(true)}
              settings={settings}
            >
              {isLoadingInitialData ? (
                <div className="min-h-[50vh] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-10 h-10 border-3 border-[#C59B4B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[#8D6527] text-xs font-semibold">جاري تحميل تشكيلة الهدى للتطريز الفاخرة...</p>
                  </div>
                </div>
              ) : (
                <StorePage
                  products={products}
                  categories={publicCategories}
                  onAddToCart={handleAddToCart}
                  settings={settings}
                />
              )}
            </StoreLayout>
          }
        />
        <Route
          path="/products"
          element={
            <StoreLayout
              cartData={cart}
              onCheckout={() => setCheckoutOpen(true)}
              settings={settings}
            >
              <ProductsPage
                products={products}
                categories={publicCategories}
                onAddToCart={handleAddToCart}
              />
            </StoreLayout>
          }
        />
        <Route
          path="/categories"
          element={
            <StoreLayout
              cartData={cart}
              onCheckout={() => setCheckoutOpen(true)}
              settings={settings}
            >
              <CategoriesPage categories={publicCategories} />
            </StoreLayout>
          }
        />

        {/* ── Admin Login ── */}
        <Route
          path="/admin/login"
          element={adminUser ? <Navigate to="/admin" replace /> : <AdminLogin onSuccess={handleSetAdminUser} />}
        />

        {/* ── Admin Panel ── */}
        <Route
          path="/admin"
          element={
            <AdminGuard user={adminUser} ready={authReady}>
              <AdminLayout user={adminUser!} onLogout={handleAdminLogout}>
                <AdminOverview
                  products={products}
                  orders={orders}
                  categoriesCount={categories.length}
                  subscribers={subscribers}
                  onDeleteSubscriber={handleDeleteSubscriber}
                  onNavigate={(tab) => {
                    const path = tab === 'orders' ? 'orders' : tab === 'products' ? 'products' : tab === 'categories' ? 'categories' : ''
                    window.location.assign(`/admin/${path}`)
                  }}
                  onSeedDatabase={handleSeedDatabase}
                  onClearDatabase={handleClearDatabase}
                  dbConnected={dbConnected}
                />
              </AdminLayout>
            </AdminGuard>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminGuard user={adminUser} ready={authReady}>
              <AdminLayout user={adminUser!} onLogout={handleAdminLogout}>
                <AdminProducts
                  products={products}
                  categories={categories}
                  user={adminUser!}
                  onAdd={handleAddProduct}
                  onDelete={handleDeleteProduct}
                  onUpdate={handleUpdateProduct}
                  notify={(msg, type) => notify(msg, type ?? 'success')}
                />
              </AdminLayout>
            </AdminGuard>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <AdminGuard user={adminUser} ready={authReady}>
              <AdminLayout user={adminUser!} onLogout={handleAdminLogout}>
                <AdminCategories
                  categories={categories}
                  products={products}
                  user={adminUser!}
                  onAdd={handleAddCategory}
                  onUpdate={handleUpdateCategory}
                  onDelete={handleDeleteCategory}
                  onMoveAndDelete={handleMoveProductsAndDeleteCategory}
                  notify={(msg, type) => notify(msg, type ?? 'success')}
                />
              </AdminLayout>
            </AdminGuard>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminGuard user={adminUser} ready={authReady}>
              <AdminLayout user={adminUser!} onLogout={handleAdminLogout}>
                <AdminOrders
                  orders={orders}
                  settings={settings}
                  onUpdateStatus={handleUpdateOrderStatus}
                  onUpdate={handleUpdateOrder}
                  onDelete={handleDeleteOrder}
                  notify={(msg, type) => notify(msg, type ?? 'success')}
                />
              </AdminLayout>
            </AdminGuard>
          }
        />
        <Route path="/admin/settings" element={<AdminGuard user={adminUser} ready={authReady}><AdminLayout user={adminUser!} onLogout={handleAdminLogout}><AdminSettings settings={settings} onSave={async next => { await updateSiteSettings(next); setSettings(next) }} notify={(msg, type) => notify(msg, type ?? 'success')} /></AdminLayout></AdminGuard>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
      {checkoutOpen && <CheckoutModal items={cart.items} total={cart.total} settings={settings} onSubmit={handleCheckout} onClose={() => setCheckoutOpen(false)} />}
      {orderConfirmation && <OrderConfirmationModal orderId={orderConfirmation.orderId} whatsappNumber={settings.whatsappNumber} storeName={settings.storeName} onClose={() => setOrderConfirmation(null)} />}
    </BrowserRouter>
    </CurrencyProvider>
  )
}
