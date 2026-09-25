import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Calendar,
} from 'lucide-react'
import type { FirebaseUser } from '../../types'
import Modal from '../ui/Modal'
import AdminNotificationButton from './AdminNotificationButton'

interface Props {
  user: FirebaseUser
  onLogout: () => void
  children: React.ReactNode
  unseenOrdersCount?: number
  onClearUnseenOrders?: () => void
}

const NAV_ITEMS = [
  { id: 'overview',   label: 'نظرة عامة',  icon: LayoutDashboard, to: '/admin' },
  { id: 'products',   label: 'المنتجات',    icon: Package,         to: '/admin/products' },
  { id: 'categories', label: 'الأقسام',     icon: Layers,          to: '/admin/categories' },
  { id: 'orders',     label: 'الطلبات',     icon: ShoppingBag,     to: '/admin/orders' },
  { id: 'settings',   label: 'الإعدادات',   icon: Settings,        to: '/admin/settings' },
]

export default function AdminLayout({ user, onLogout, children, unseenOrdersCount = 0, onClearUnseenOrders }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const location = useLocation()
  const currentPath = location.pathname

  // Clear unseen badge when visiting the orders page
  useEffect(() => {
    if (currentPath === '/admin/orders' && unseenOrdersCount > 0) {
      onClearUnseenOrders?.()
    }
  }, [currentPath, unseenOrdersCount, onClearUnseenOrders])

  const currentDate = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  function isActive(to: string) {
    return to === '/admin' ? currentPath === '/admin' : currentPath.startsWith(to)
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#221811] flex antialiased overflow-x-hidden">

      {/* ── Mobile Backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#221811]/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ══════════════════════════════
          SIDEBAR — Desktop always visible, Mobile drawer
         ══════════════════════════════ */}
      <aside
        className={`fixed top-0 right-0 h-full w-72 bg-white border-l border-[#EADBCE] shadow-xl flex flex-col z-40 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#EADBCE] flex items-center justify-between shrink-0">
          <Link to="/admin" className="flex items-center gap-3 no-underline group" onClick={() => setSidebarOpen(false)}>
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-[#EADBCE] group-hover:border-[#8D6527] transition-all shrink-0 bg-white">
              <img src="/logo.jpeg" alt="لوحة الهدى" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-serif text-lg font-bold text-[#221811] leading-none truncate group-hover:text-[#8D6527] transition-colors" style={{ fontFamily: 'Amiri, serif' }}>
                لوحة الهدى
              </span>
              <span className="text-[10px] tracking-wider text-[#8D6527] font-semibold mt-0.5">
                نظام إدارة المتجر
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#685D52] hover:bg-[#FAF7F2] transition-colors"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="قائمة لوحة التحكم">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = isActive(item.to)
            return (
              <Link
                key={item.id}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all no-underline ${
                  active
                    ? 'bg-[#8D6527] text-white shadow-sm'
                    : 'text-[#685D52] hover:bg-[#FAF7F2] hover:text-[#221811]'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-[#8D6527]'}`} />
                <span className="flex-1">{item.label}</span>
                {item.id === 'orders' && unseenOrdersCount > 0 && (
                  <span className={`text-[10px] font-black min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center animate-pulse shadow-sm ${
                    active ? 'bg-white text-[#8D6527]' : 'bg-red-500 text-white'
                  }`}>
                    {unseenOrdersCount > 99 ? '99+' : unseenOrdersCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer: User Info + Actions */}
        <div className="p-4 border-t border-[#EADBCE] bg-[#FAF7F2]/60 shrink-0 space-y-3">
          <div className="bg-white border border-[#EADBCE] rounded-xl px-3.5 py-2.5 shadow-xs">
            <span className="text-[10px] text-[#968B7E] font-medium block">المستخدم الحالي:</span>
            <p className="text-xs font-bold text-[#221811] truncate m-0 mt-0.5">{user.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              target="_blank"
              className="flex-1 rounded-xl bg-white border border-[#EADBCE] hover:border-[#8D6527] text-[#221811] text-xs font-semibold py-2.5 px-3 flex items-center justify-center gap-1.5 no-underline transition-colors shadow-xs"
            >
              <span>عرض المتجر</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#8D6527]" />
            </Link>
            <button
              onClick={() => setLogoutConfirm(true)}
              className="rounded-xl border border-[#EADBCE] hover:border-red-300 hover:bg-red-50 text-[#685D52] hover:text-red-700 text-xs font-semibold p-2.5 transition-colors shadow-xs"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════
          MAIN CONTENT AREA
         ══════════════════════════════ */}
      <main className="flex-1 min-w-0 lg:mr-72 min-h-screen flex flex-col pb-20 lg:pb-0">

        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#EADBCE] px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden p-2 rounded-xl border border-[#EADBCE] text-[#221811] hover:bg-[#FAF7F2] transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="فتح القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current date — hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#685D52]">
              <Calendar className="w-4 h-4 text-[#8D6527]" />
              <span>{currentDate}</span>
            </div>
          </div>

          {/* Notifications and connection status */}
          <div className="flex items-center gap-2">
            <AdminNotificationButton />
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-2.5 sm:px-3 py-1 rounded-full shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="hidden xs:inline">النظام متصل</span>
              <span className="xs:hidden">متصل</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 min-w-0">
          {children}
        </div>
      </main>

      {/* ══════════════════════════════
          MOBILE BOTTOM NAVIGATION BAR
          (visible on < lg, hidden on lg+)
         ══════════════════════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#EADBCE] shadow-[0_-4px_20px_rgba(34,24,17,0.08)] flex items-center"
        aria-label="التنقل السفلي"
      >
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = isActive(item.to)
          return (
            <Link
              key={item.id}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 no-underline transition-all ${
                active ? 'text-[#8D6527]' : 'text-[#968B7E]'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${active ? 'bg-[#8D6527]/10' : ''}`}>
                <Icon className={`w-5 h-5 transition-all ${active ? 'text-[#8D6527]' : 'text-[#968B7E]'}`} />
                {active && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#C59B4B] border-2 border-white" />
                )}
                {item.id === 'orders' && !active && unseenOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white animate-bounce shadow-sm">
                    {unseenOrdersCount > 99 ? '99+' : unseenOrdersCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold leading-none ${active ? 'text-[#8D6527]' : 'text-[#968B7E]'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* ══════════════════════════════
          LOGOUT CONFIRMATION DIALOG
         ══════════════════════════════ */}
      {logoutConfirm && (
        <Modal onClose={() => setLogoutConfirm(false)} size="sm">
          <div className="bg-white rounded-3xl border border-[#EADBCE] shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#221811] m-0 mb-2" style={{ fontFamily: 'Amiri, serif' }}>
              تسجيل الخروج
            </h3>
            <p className="text-xs text-[#685D52] mb-6 leading-relaxed">
              هل أنتِ متأكدة من رغبتكِ في إنهاء جلسة الإدارة الحالية والخروج؟
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-[#EADBCE] text-sm font-semibold text-[#685D52] hover:bg-[#FAF7F2] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-xs transition-colors"
              >
                نعم، خروج
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
