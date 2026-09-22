import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingBag,
  Search,
  Menu,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  Sparkles,
  Truck,
  AlertCircle,
  Coins,
  ChevronDown,
  Check
} from 'lucide-react'
import type { CartItem, SiteSettings } from '../../types'
import { useCurrency } from '../../context/CurrencyContext'

interface Props {
  cartCount: number
  cartTotal: number
  cartItems: CartItem[]
  onRemoveItem: (id: string) => void
  onUpdateQty?: (id: string, qty: number) => void
  onCheckout: () => void
  settings?: SiteSettings
}

export default function Navbar({
  cartCount,
  cartTotal,
  cartItems,
  onRemoveItem,
  onUpdateQty,
  onCheckout,
  settings,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const currencyMenuRef = useRef<HTMLDivElement>(null)

  const { currency, setCurrency, currentConfig, availableCurrencies, formatPrice } = useCurrency()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(event.target as Node)) {
        setCurrencyOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
      setMenuOpen(false)
    }
  }

  const freeShippingLimit = Number(settings?.freeShippingThreshold ?? 350) || 350
  const ordersEnabled = settings?.ordersEnabled !== false
  const freeShippingProgress = freeShippingLimit > 0 ? Math.min(100, Math.round((cartTotal / freeShippingLimit) * 100)) : 100
  const remainingForFreeShipping = Math.max(0, freeShippingLimit - cartTotal)

  return (
    <>
      {/* Top Luxury Announcement Bar */}
      {!ordersEnabled ? (
        <div className="bg-amber-900 text-amber-100 text-center text-xs py-2 px-4 flex items-center justify-center gap-2 tracking-wide border-b border-amber-800">
          <AlertCircle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="font-semibold">تنويه: استقبال الطلبات متوقف مؤقتاً — يسعدنا تصفحكم للمتجر والقطع المميزة</span>
        </div>
      ) : (
        <div className="bg-[#24180E] text-[#F7F1E5] text-center text-xs py-2 px-4 flex items-center justify-center gap-2 tracking-wide border-b border-[#3D2C1E]">
          <Sparkles className="w-3.5 h-3.5 text-[#DFB76C] shrink-0" />
          <span>{freeShippingLimit > 0 ? `شحن مجاني للطلبات فوق ${formatPrice(freeShippingLimit)}` : 'شحن مجاني لجميع الطلبات'}</span>
          <span className="text-[#C59B4B] mx-2 hidden sm:inline">•</span>
          <span className="text-[#DFB76C] font-medium hidden sm:inline">صُنِع بحب وإتقان لأجلكِ</span>
        </div>
      )}

      {/* Main Sticky Glass Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EADBCE] shadow-xs">
        <div className="container flex items-center justify-between h-20 gap-4">

          {/* Right Section: Mobile menu button & Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden w-10 h-10 rounded-xl border border-[#EADBCE] flex items-center justify-center text-[#221811] hover:bg-[#FAF7F2] transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="فتح القائمة"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Brand Logo with Monogram Badge */}
            <Link
              to="/"
              className="flex items-center gap-3 no-underline group select-none"
              onClick={() => setMenuOpen(false)}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C59B4B] to-[#8D6527] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <span className="font-serif text-2xl font-bold leading-none mt-0.5" style={{ fontFamily: 'Amiri, serif' }}>هـ</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold leading-none text-[#221811] tracking-tight group-hover:text-[#8D6527] transition-colors" style={{ fontFamily: 'Amiri, serif' }}>
                  الهدى
                </span>
                <span className="text-[10px] tracking-[2px] text-[#C59B4B] font-semibold mt-0.5">
                  للمشغولات اليدوية
                </span>
              </div>
            </Link>
          </div>

          {/* Center Section: Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8" aria-label="التنقل الرئيسي">
            <HeaderNavLink to="/" active={location.pathname === '/'}>
              الرئيسية
            </HeaderNavLink>
            <HeaderNavLink to="/categories" active={location.pathname === '/categories'}>
              الأقسام
            </HeaderNavLink>
            <HeaderNavLink to="/products" active={location.pathname.startsWith('/products')}>
              المتجر
            </HeaderNavLink>
            <HeaderNavLink to="/#story" active={location.hash === '#story'}>
              قصتنا
            </HeaderNavLink>
          </nav>

          {/* Left Section: Search, Currency, Cart */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Search Input Bar (Desktop) */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] rounded-full px-3.5 py-1.5 focus-within:border-[#C59B4B] focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-[#8D6527] shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحثي عن قطعة مطرزة..."
                className="border-0 outline-none text-xs text-[#221811] placeholder-[#968B7E] bg-transparent w-40 focus:w-48 transition-all"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-[#968B7E] hover:text-[#221811]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
            {/* Cart Button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white px-4 py-2.5 shadow-sm hover:shadow-md transition-all group"
              aria-label={`سلة التسوق (${cartCount} قطع)`}
            >
              <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold hidden sm:inline">السلة</span>
              {cartCount > 0 && (
                <span className="bg-[#DFB76C] text-[#24180E] text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shadow-xs animate-scale-in">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <div className="lg:hidden bg-white border-t border-[#EADBCE] px-6 py-5 flex flex-col gap-4 animate-fade-in shadow-xl">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5">
              <Search className="w-4 h-4 text-[#8D6527]" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحثي في المتجر..."
                className="border-0 outline-none text-sm bg-transparent flex-1 text-[#221811]"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4 text-[#968B7E]" />
                </button>
              )}
            </form>

            <MobileNavLink to="/" onClick={() => setMenuOpen(false)}>الرئيسية</MobileNavLink>
            <MobileNavLink to="/categories" onClick={() => setMenuOpen(false)}>الأقسام</MobileNavLink>
            <MobileNavLink to="/products" onClick={() => setMenuOpen(false)}>جميع المنتجات</MobileNavLink>
            <MobileNavLink to="/#story" onClick={() => setMenuOpen(false)}>قصتنا وحرفيتنا</MobileNavLink>

            {/* Mobile Currency Switcher */}
            <div className="pt-3 pb-1 border-t border-[#EADBCE]">
              <span className="text-xs text-[#685D52] font-semibold block mb-2">عملة المتجر:</span>
              <div className="grid grid-cols-3 gap-2">
                {availableCurrencies.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCurrency(c.code)
                      setMenuOpen(false)
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${currency === c.code
                        ? 'bg-[#8D6527] text-white border-[#8D6527] shadow-xs'
                        : 'bg-[#FAF7F2] text-[#221811] border-[#EADBCE] hover:border-[#C59B4B]'
                      }`}
                  >
                    <span>{c.symbol}</span>
                    <span>{c.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#EADBCE]">
              <span className="text-[11px] text-[#968B7E]">متجر الهدى للتطريز</span>
            </div>
          </div>
        )}
      </header>

      {/* Cart Drawer */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#221811]/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setCartOpen(false)}
        >
          <aside
            className="absolute top-0 left-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col cart-drawer-enter"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#EADBCE] bg-[#FAF7F2]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F7F1E5] text-[#8D6527] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                    سلة مشترياتكِ
                  </h3>
                  <p className="text-[11px] text-[#685D52] m-0">
                    {cartCount > 0 ? `${cartCount} قطع مضافة` : 'السلة فارغة'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="w-9 h-9 rounded-xl border border-[#EADBCE] hover:bg-white flex items-center justify-center text-[#685D52] hover:text-[#221811] transition-colors"
                aria-label="إغلاق السلة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Shipping Progress Indicator */}
            {cartItems.length > 0 && (
              <div className="px-6 py-3.5 bg-[#FAF7F2]/80 border-b border-[#EADBCE]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="flex items-center gap-1.5 text-[#221811] font-medium">
                    <Truck className="w-3.5 h-3.5 text-[#C59B4B]" />
                    {remainingForFreeShipping === 0 ? (
                      <span className="text-emerald-700 font-bold">تهانينا! مؤهلة للشحن المجاني 🎉</span>
                    ) : (
                      <span>أضيفي بقيمة <strong className="text-[#8D6527]" dir="ltr">{formatPrice(remainingForFreeShipping)}</strong> للشحن المجاني</span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold text-[#8D6527]">{freeShippingProgress}%</span>
                </div>
                <div className="w-full bg-[#EADBCE] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#C59B4B] to-[#8D6527] h-full rounded-full transition-all duration-500"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Drawer Items List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-[#FAF7F2] border border-[#EADBCE] flex items-center justify-center mx-auto mb-4 text-[#C59B4B]">
                    <ShoppingBag className="w-9 h-9 stroke-[1.5]" />
                  </div>
                  <h4 className="font-serif text-xl text-[#221811] mb-2" style={{ fontFamily: 'Amiri, serif' }}>
                    سلتكِ هادئة وخالية
                  </h4>
                  <p className="text-xs text-[#685D52] max-w-xs mx-auto mb-6 leading-relaxed">
                    استكشفي تشكيلتنا المطرزة بالحب واختاري ما يبهج لحظاتكِ ومناسباتكِ.
                  </p>
                  <button
                    onClick={() => { setCartOpen(false); navigate('/products') }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white px-6 py-3 text-xs font-semibold transition-all"
                  >
                    تصفحي المنتجات الآن
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-[#EADBCE]/80 list-none p-0 m-0">
                  {cartItems.map(item => (
                    <li key={item.id} className="py-4 flex gap-4 items-center">
                      <img
                        src={item.images[0]?.url || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80'}
                        alt={item.name}
                        className="w-18 h-18 rounded-xl object-cover bg-[#FAF7F2] border border-[#EADBCE] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-[#968B7E] font-medium block mb-0.5">
                          {item.categoryName}
                        </span>
                        <h5 className="text-sm font-bold text-[#221811] truncate m-0 mb-1">
                          {item.name}
                        </h5>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-[#8D6527]">
                            {formatPrice(item.price * item.quantity)}
                          </span>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] rounded-lg px-2 py-1">
                            <button
                              onClick={() => onUpdateQty && onUpdateQty(item.id, Math.max(1, item.quantity - 1))}
                              className="text-[#685D52] hover:text-[#221811] p-0.5"
                              aria-label="إنقاص الكمية"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center text-[#221811]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQty && onUpdateQty(item.id, item.quantity + 1)}
                              className="text-[#685D52] hover:text-[#221811] p-0.5"
                              aria-label="زيادة الكمية"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#968B7E] hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        aria-label={`إزالة ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Drawer Footer with Totals & Checkout */}
            {cartItems.length > 0 && (
              <div className="px-6 py-5 border-t border-[#EADBCE] bg-[#FAF7F2]">
                {!ordersEnabled && (
                  <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>استقبال الطلبات متوقف مؤقتاً حالياً. يمكنكِ تصفح المنتجات وحفظها.</span>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-xs text-[#685D52]">
                    <span>المجموع الجزئي</span>
                    <span dir="ltr">{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#685D52]">
                    <span>الشحن</span>
                    <span className={remainingForFreeShipping === 0 ? 'text-emerald-700 font-bold' : ''}>
                      {remainingForFreeShipping === 0 ? 'مجاني' : 'يُحسب عند إتمام الطلب'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-base pt-2 border-t border-[#EADBCE]">
                    <span className="font-bold text-[#221811]">الإجمالي النهائي</span>
                    <strong className="font-bold text-lg text-[#8D6527]" dir="ltr">{formatPrice(cartTotal)}</strong>
                  </div>
                </div>

                <button
                  disabled={!ordersEnabled}
                  className={`w-full rounded-full py-3.5 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-3 group ${ordersEnabled
                    ? 'bg-[#8D6527] hover:bg-[#704F1E] text-white hover:shadow-lg cursor-pointer'
                    : 'bg-stone-300 text-stone-600 cursor-not-allowed shadow-none'
                    }`}
                  onClick={() => {
                    if (!ordersEnabled) return
                    setCartOpen(false)
                    onCheckout()
                  }}
                >
                  <span>{ordersEnabled ? 'متابعة إتمام الطلب' : 'استقبال الطلبات متوقف مؤقتاً'}</span>
                  {ordersEnabled && <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />}
                </button>

                <button
                  onClick={() => setCartOpen(false)}
                  className="w-full text-center text-xs text-[#685D52] hover:text-[#221811] mt-3 transition-colors"
                >
                  متابعة التسوق واستعراض المزيد
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  )
}

function HeaderNavLink({ to, active, children }: { to: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`text-sm no-underline transition-all relative py-1 font-medium ${active ? 'text-[#8D6527] font-bold' : 'text-[#221811] hover:text-[#8D6527]'
        }`}
    >
      {children}
      <span
        className={`absolute -bottom-1 right-0 h-0.5 bg-[#C59B4B] transition-all duration-300 rounded-full ${active ? 'w-full' : 'w-0 group-hover:w-full'
          }`}
      />
    </Link>
  )
}

function MobileNavLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="text-sm font-semibold text-[#221811] py-2 border-b border-[#FAF7F2] hover:text-[#8D6527] transition-colors flex items-center justify-between"
    >
      <span>{children}</span>
      <span className="text-[#C59B4B]">←</span>
    </Link>
  )
}
