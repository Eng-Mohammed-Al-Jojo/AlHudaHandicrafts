import { useState, useEffect } from 'react'
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
import type { CheckoutCurrencyDetails } from './components/store/CheckoutModal'
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
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([])
  const [dbConnected, setDbConnected] = useState(false)
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true)
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const cart = useCart()
  const { toasts, show: notify, dismiss } = useToast()

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
        setProducts(items)
        setDbConnected(true)
        setIsLoadingInitialData(false)
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
    if (!authReady || !adminUser) { setOrders([]); setSubscribers([]); return }
    const unsubOrders = subscribeToOrders(
      setOrders,
      (err) => { console.error('Orders listener error:', err); notify('تعذر تحميل الطلبات: تحققي من قواعد Firestore.', 'error') }
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
  function handleAddToCart(p: Product) {
    cart.addItem(p)
    notify(`تمت إضافة «${p.name}» إلى السلة`)
  }

  async function handleCheckout(customer: string, phone: string, notes: string, currencyDetails: CheckoutCurrencyDetails) {
    if (settings.ordersEnabled === false) {
      notify('نعتذر، استقبال الطلبات متوقف مؤقتاً في الوقت الحالي.', 'error')
      return
    }
    if (!cart.items.length) return

    const freeShippingLimit = Number(settings.freeShippingThreshold ?? 350) || 350
    const isFreeShipping = freeShippingLimit > 0 && cart.total >= freeShippingLimit
    const shippingStatusText = isFreeShipping ? 'شحن مجاني (مؤهل للعرض)' : 'شحن عادي'

    const currencyNote = `[عملة العرض: ${currencyDetails.currency} | سعر الصرف المعتمد: 1 ${currencyDetails.currency} = ${currencyDetails.rate} ₪ | الإجمالي المعروض: ${currencyDetails.displayedTotal} | الإجمالي المحفوظ: ${cart.total} ₪]`
    const shippingNote = `[حالة الشحن: ${shippingStatusText} - حد الشحن المجاني: ${freeShippingLimit} ₪]`
    const orderNotesWithShipping = [notes, shippingNote, currencyNote].filter(Boolean).join('\n')

    const newOrderData: Omit<Order, 'id'> = {
      customer,
      phone,
      notes: orderNotesWithShipping,
      items: cart.items.map(i => ({
        productId: i.id,
        productName: i.name,
        price: i.price,
        image: i.images[0]?.url ?? '',
      })),
      total: cart.total,
      itemsCount: cart.count,
      status: 'جديد',
      createdAt: new Date().toISOString(),
    }

    try {
      await addOrderToFirestore(newOrderData)
      const orderItems = [...cart.items]
      const orderTotal = cart.total
      cart.clear()
      if (settings.orderRouting === 'whatsapp' && settings.whatsappNumber) {
        const lines = orderItems.map(item => `- ${item.name} × ${item.quantity} (${item.price * item.quantity} ₪)`).join('\n')
        const message = `طلب جديد من متجر ${settings.storeName}\nالاسم: ${customer}\nالجوال: ${phone}\n${lines}\nإجمالي العرض: ${currencyDetails.displayedTotal}\nالإجمالي الأصلي: ${orderTotal} ₪\nسعر الصرف: 1 ${currencyDetails.currency} = ${currencyDetails.rate} ₪\nالشحن: ${shippingStatusText}${notes ? `\nملاحظات: ${notes}` : ''}`
        window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
        notify('تم حفظ الطلب وفتح واتساب لإرساله.')
      } else notify('تم تسجيل طلبكِ وحفظه في لوحة التحكم بنجاح 🎉')
    } catch (err) {
      console.error('Order creation error:', err)
      notify('تعذر حفظ الطلب؛ لم يتم إرسال أي طلب. تحققي من الاتصال وحاولي مجدداً.', 'error')
    }
  }

  // ─── Admin Firestore CRUD Handlers ────────────────────────────────────────────

  // Products
  async function handleAddProduct(p: Product) {
    try {
      const { id, ...rest } = p
      const docId = await addProductToFirestore(rest)
      setProducts(prev => [{ ...p, id: docId }, ...prev])
      notify('تم حفظ المنتج الجديد في قاعدة بيانات Firestore')
    } catch (err) {
      console.error('Add product error:', err)
      setProducts(prev => [p, ...prev])
      notify('تمت الإضافة محلياً (تحقق من اتصال الإنترنت)', 'error')
    }
  }

  async function handleUpdateProduct(p: Product) {
    try {
      await updateProductInFirestore(p.id, p)
      setProducts(prev => prev.map(x => x.id === p.id ? p : x))
      notify('تم تحديث المنتج في قاعدة البيانات بنجاح')
    } catch (err) {
      console.error('Update product error:', err)
      setProducts(prev => prev.map(x => x.id === p.id ? p : x))
      notify('تم تحديث المنتج محلياً', 'error')
    }
  }

  async function handleDeleteProduct(id: string) {
    try {
      await deleteProductFromFirestore(id)
      setProducts(prev => prev.filter(p => p.id !== id))
      notify('تم حذف المنتج من قاعدة البيانات')
    } catch (err) {
      console.error('Delete product error:', err)
      setProducts(prev => prev.filter(p => p.id !== id))
      notify('تم حذف المنتج محلياً', 'error')
    }
  }

  // Categories
  async function handleAddCategory(c: Category) {
    try {
      const { id, ...rest } = c
      const docId = await addCategoryToFirestore(rest)
      setCategories(prev => [...prev, { ...c, id: docId }])
      notify('تمت إضافة القسم إلى قاعدة البيانات')
    } catch (err) {
      console.error('Add category error:', err)
      setCategories(prev => [...prev, c])
      notify('تمت الإضافة محلياً', 'error')
    }
  }

  async function handleUpdateCategory(c: Category) {
    try {
      await updateCategoryInFirestore(c.id, c)
      setCategories(prev => prev.map(x => x.id === c.id ? c : x))
      notify('تم تحديث القسم في قاعدة البيانات')
    } catch (err) {
      console.error('Update category error:', err)
      setCategories(prev => prev.map(x => x.id === c.id ? c : x))
      notify('تم التحديث محلياً', 'error')
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      await deleteCategoryFromFirestore(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      notify('تم حذف القسم من قاعدة البيانات')
    } catch (err) {
      console.error('Delete category error:', err)
      setCategories(prev => prev.filter(c => c.id !== id))
      notify('تم الحذف محلياً', 'error')
    }
  }

  // Orders
  async function handleUpdateOrderStatus(id: string, status: OrderStatus) {
    try {
      await updateOrderStatusInFirestore(id, status)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
      notify(`تم تحديث حالة الطلب إلى "${status}" في قاعدة البيانات`)
    } catch (err) {
      console.error('Update order status error:', err)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
      notify('تم التحديث محلياً', 'error')
    }
  }

  async function handleUpdateOrder(order: Order) {
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
                  categories={categories}
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
                categories={categories}
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
              <CategoriesPage categories={categories} />
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
                  user={adminUser!}
                  onAdd={handleAddCategory}
                  onUpdate={handleUpdateCategory}
                  onDelete={handleDeleteCategory}
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
    </BrowserRouter>
    </CurrencyProvider>
  )
}
