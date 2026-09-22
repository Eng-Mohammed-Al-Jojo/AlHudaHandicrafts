import { useState } from 'react'
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Layers,
  ArrowLeft,
  Sparkles,
  Database,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Copy,
  Download,
  Check,
  X,
  Phone,
  Calendar,
} from 'lucide-react'
import type { Product, Order, NewsletterSubscriber } from '../../types'

interface Props {
  products: Product[]
  orders: Order[]
  categoriesCount?: number
  subscribers?: NewsletterSubscriber[]
  onDeleteSubscriber?: (id: string) => Promise<void>
  onNavigate: (tab: string) => void
  onSeedDatabase?: () => Promise<void>
  onClearDatabase?: () => Promise<void>
  dbConnected?: boolean
}

function formatOrderDate(dateStr?: string) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

const STATUS_STYLE: Record<string, string> = {
  'جديد':        'status-new',
  'قيد التجهيز': 'status-process',
  'تم التواصل':  'status-contact',
  'مكتمل':       'status-done',
  'ملغي':        'status-cancel',
}

export default function AdminOverview({
  products,
  orders,
  categoriesCount = 0,
  subscribers = [],
  onDeleteSubscriber,
  onNavigate,
  onSeedDatabase,
  onClearDatabase,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showSubscribersModal, setShowSubscribersModal] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyAllEmails() {
    if (subscribers.length === 0) return
    navigator.clipboard.writeText(subscribers.map(s => s.email).join(', '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function exportSubscribersCSV() {
    if (subscribers.length === 0) return
    const header = 'Email,Created At,Source\n'
    const rows = subscribers.map(s => `"${s.email}","${s.createdAt}","${s.source || 'Newsletter'}"`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alhuda_subscribers_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalSales      = orders.reduce((sum, o) => sum + o.total, 0)
  const newOrders       = orders.filter(o => o.status === 'جديد').length
  const publishedProducts = products.filter(p => p.isPublished).length

  async function handleSeed() {
    if (!onSeedDatabase) return
    setIsProcessing(true)
    try { await onSeedDatabase() } finally { setIsProcessing(false) }
  }

  async function handleClear() {
    if (!onClearDatabase) return
    setIsProcessing(true)
    try { await onClearDatabase(); setShowClearConfirm(false) } finally { setIsProcessing(false) }
  }

  const KPI_CARDS = [
    {
      label: 'إجمالي المبيعات',
      value: totalSales,
      unit: 'شيكل',
      icon: TrendingUp,
      iconBg: 'bg-amber-50 text-[#8D6527]',
      note: 'من كافة الطلبات المسجلة',
      noteIcon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      noteColor: 'text-emerald-700',
    },
    {
      label: 'طلبات جديدة',
      value: newOrders,
      unit: 'طلب',
      icon: Clock,
      iconBg: 'bg-blue-50 text-blue-700',
      note: newOrders > 0 ? 'بحاجة للمتابعة' : 'تم الرد على الكل',
      noteColor: 'text-[#8D6527]',
    },
    {
      label: 'المنتجات المعروضة',
      value: publishedProducts,
      unit: `من ${products.length}`,
      icon: Package,
      iconBg: 'bg-[#FAF7F2] text-[#8D6527]',
      note: 'جاهزة للشراء في المتجر',
      noteColor: 'text-[#685D52]',
    },
    {
      label: 'أقسام الكتالوج',
      value: categoriesCount,
      unit: 'أقسام',
      icon: Layers,
      iconBg: 'bg-purple-50 text-purple-700',
      note: 'عبايات، مفارش، إكسسوارات',
      noteColor: 'text-[#685D52]',
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in max-w-7xl mx-auto">

      {/* ── Welcome Banner ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] p-5 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
              <span>نظرة عامة على الأداء والمبيعات</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-normal text-[#221811] m-0 mb-2" style={{ fontFamily: 'Amiri, serif' }}>
              مرحباً بكِ في لوحة الإدارة
            </h1>
            <p className="text-xs sm:text-sm text-[#685D52] m-0">
              متابعة فورية للطلبات الواردة، كتالوج المنتجات، وحركة المبيعات في متجر الهدى.
            </p>
          </div>

          <div className="flex flex-row sm:flex-col gap-2 sm:gap-2 shrink-0">
            <button
              onClick={() => onNavigate('products')}
              className="flex-1 sm:flex-none rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-4 sm:px-5 py-2.5 sm:py-3 shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              <span>إدارة المنتجات</span>
            </button>
            <button
              onClick={() => onNavigate('orders')}
              className="flex-1 sm:flex-none rounded-full bg-[#FAF7F2] border border-[#EADBCE] hover:border-[#8D6527] text-[#221811] text-xs font-bold px-4 sm:px-5 py-2.5 sm:py-3 transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-[#8D6527]" />
              <span>الطلبات ({orders.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards — 2 col on mobile, 4 col on xl ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {KPI_CARDS.map(card => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-[#EADBCE] p-4 sm:p-5 shadow-xs hover:border-[#C59B4B] transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] sm:text-xs font-bold text-[#685D52] leading-tight">{card.label}</span>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <strong className="text-2xl sm:text-3xl font-serif text-[#221811]" style={{ fontFamily: 'Amiri, serif' }}>
                  {card.value}
                </strong>
                <small className="text-[10px] sm:text-xs text-[#685D52] font-semibold">{card.unit}</small>
              </div>
              <p className={`text-[10px] sm:text-[11px] font-semibold m-0 flex items-center gap-1 ${card.noteColor}`}>
                {card.noteIcon}
                <span className="leading-tight">{card.note}</span>
              </p>
            </div>
          )
        })}

        {/* Newsletter Subscribers — full width on mobile, 1 col on desktop */}
        <div
          onClick={() => setShowSubscribersModal(true)}
          className="col-span-2 lg:col-span-4 xl:col-span-1 xl:col-start-5 bg-white rounded-2xl border border-[#EADBCE] p-4 sm:p-5 shadow-xs hover:border-[#8D6527] transition-all cursor-pointer group hover:shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-[#685D52]">المشتركات بالنشرة</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <strong className="text-2xl sm:text-3xl font-serif text-[#221811]" style={{ fontFamily: 'Amiri, serif' }}>
              {subscribers.length}
            </strong>
            <small className="text-[10px] sm:text-xs text-[#685D52] font-semibold">مشتركة</small>
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#8D6527] font-semibold m-0 flex items-center gap-1 group-hover:underline">
            <span>استعراض وتصدير الإيميلات</span>
            <ArrowLeft className="w-3 h-3" />
          </p>
        </div>
      </div>

      {/* ── Recent Orders Section ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b border-[#EADBCE] flex items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#221811] m-0 mb-0.5" style={{ fontFamily: 'Amiri, serif' }}>
              أحدث طلبات الزبائن
            </h3>
            <p className="text-xs text-[#685D52] m-0 hidden sm:block">
              آخر الطلبات المستلمة عبر المتجر والمحفوظة في قاعدة البيانات
            </p>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-[#8D6527] hover:underline flex items-center gap-1.5 shrink-0"
          >
            <span className="hidden sm:inline">عرض كافة الطلبات</span>
            <span className="sm:hidden">الكل</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12 p-6">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] text-[#8D6527] flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h4 className="font-serif text-lg text-[#221811] m-0 mb-1">لا توجد طلبات مسجلة بعد</h4>
            <p className="text-xs text-[#685D52] m-0">ستظهر هنا تفاصيل طلبات الزبائن بمجرد إرسالها.</p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table (hidden on mobile) ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF7F2] text-[#685D52] font-bold border-b border-[#EADBCE]">
                  <tr>
                    <th className="p-4">العميلة</th>
                    <th className="p-4">رقم التواصل</th>
                    <th className="p-4">المنتجات</th>
                    <th className="p-4">الإجمالي</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {orders.slice(0, 5).map(o => (
                    <tr key={o.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                      <td className="p-4 font-bold text-[#221811]">{o.customer}</td>
                      <td className="p-4 text-[#685D52]" dir="ltr">{o.phone || '—'}</td>
                      <td className="p-4 text-[#685D52]">{o.itemsCount} منتجات</td>
                      <td className="p-4 font-bold text-[#8D6527]">{o.total} شيكل</td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLE[o.status] ?? ''}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-[#968B7E]">{formatOrderDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Cards (hidden on sm+) ── */}
            <div className="sm:hidden divide-y divide-[#FAF7F2]">
              {orders.slice(0, 5).map(o => (
                <div key={o.id} className="p-4 space-y-2">
                  {/* Row 1: Name + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#221811] text-sm truncate">{o.customer}</span>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${STATUS_STYLE[o.status] ?? ''}`}>
                      {o.status}
                    </span>
                  </div>
                  {/* Row 2: Phone + Date */}
                  <div className="flex items-center gap-3 text-[11px] text-[#685D52]">
                    {o.phone && (
                      <span className="flex items-center gap-1" dir="ltr">
                        <Phone className="w-3 h-3 text-[#8D6527]" />
                        {o.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#8D6527]" />
                      {formatOrderDate(o.createdAt)}
                    </span>
                  </div>
                  {/* Row 3: Items + Total */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#685D52]">{o.itemsCount} منتجات</span>
                    <span className="font-bold text-[#8D6527]">{o.total} شيكل</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Database Management Tools ── */}
      {(onSeedDatabase || onClearDatabase) && (
        <div className="bg-[#FAF7F2] rounded-2xl sm:rounded-3xl border border-[#EADBCE] p-5 sm:p-8">
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="font-serif text-lg font-bold text-[#221811] m-0 mb-1" style={{ fontFamily: 'Amiri, serif' }}>
                إدارة بيانات النظام
              </h4>
              <p className="text-xs text-[#685D52] m-0">
                أدوات تهيئة بيانات العرض التجريبية أو تفريغ البيانات المؤقتة.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onSeedDatabase && (
                <button
                  onClick={handleSeed}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none rounded-xl bg-white border border-[#EADBCE] hover:border-[#8D6527] text-[#221811] text-xs font-semibold px-4 py-2.5 flex items-center justify-center gap-2 shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
                >
                  <Database className="w-4 h-4 text-[#8D6527]" />
                  <span>{isProcessing ? 'جارٍ العمل...' : 'تهيئة بيانات تجريبية'}</span>
                </button>
              )}

              {onClearDatabase && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold px-4 py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>مسح البيانات</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Clear Confirmation Modal ── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#221811]/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#EADBCE] shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#221811] m-0 mb-2" style={{ fontFamily: 'Amiri, serif' }}>
              مسح كافة البيانات؟
            </h3>
            <p className="text-xs text-[#685D52] mb-6 leading-relaxed">
              سيتم تفريغ كافة المنتجات والأقسام والطلبات من قاعدة البيانات. هل تريدين المتابعة؟
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-[#EADBCE] text-sm font-semibold text-[#685D52] hover:bg-[#FAF7F2] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleClear}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-xs transition-colors"
              >
                تأكيد المسح
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Newsletter Subscribers Modal ── */}
      {showSubscribersModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#221811]/50 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-[#EADBCE] shadow-2xl max-w-2xl w-full animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="bg-[#FAF7F2] p-5 sm:p-6 border-b border-[#EADBCE] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-base sm:text-xl font-bold text-[#221811] m-0 truncate" style={{ fontFamily: 'Amiri, serif' }}>
                    المشتركات في النشرة ({subscribers.length})
                  </h3>
                  <p className="text-[11px] text-[#685D52] m-0 hidden sm:block">
                    قائمة إيميلات العميلات المسجلات عبر المتجر
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubscribersModal(false)}
                className="w-8 h-8 rounded-xl border border-[#EADBCE] flex items-center justify-center text-[#685D52] hover:bg-white hover:text-[#221811] shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="p-4 bg-[#FAF7F2]/50 border-b border-[#EADBCE] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-[#685D52] font-semibold">
                الإجمالي: <strong className="text-[#221811]">{subscribers.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyAllEmails}
                  disabled={subscribers.length === 0}
                  className="rounded-xl border border-[#EADBCE] bg-white hover:border-[#8D6527] text-[#221811] text-xs font-bold px-3 py-2 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-40"
                >
                  {copied ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-700">تم!</span></>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 text-[#8D6527]" /><span className="hidden sm:inline">نسخ الكل</span></>
                  )}
                </button>
                <button
                  onClick={exportSubscribersCSV}
                  disabled={subscribers.length === 0}
                  className="rounded-xl bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-3 py-2 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير CSV</span>
                </button>
              </div>
            </div>

            {/* Subscribers List */}
            <div className="overflow-y-auto flex-1 divide-y divide-[#FAF7F2]">
              {subscribers.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-[#8D6527] flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h4 className="font-serif text-lg text-[#221811] m-0 mb-1">لا توجد مشتركات بعد</h4>
                  <p className="text-xs text-[#685D52] m-0">ستظهر إيميلات العميلات هنا فوراً عند تسجيلهن.</p>
                </div>
              ) : (
                subscribers.map((sub, index) => (
                  <div
                    key={sub.id || index}
                    className="p-4 hover:bg-[#FAF7F2]/60 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-center text-xs font-semibold text-[#968B7E] shrink-0">{index + 1}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#221811] block truncate font-mono" dir="ltr">{sub.email}</span>
                        <span className="text-[11px] text-[#8D6527] block">{formatOrderDate(sub.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigator.clipboard.writeText(sub.email)}
                        className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors cursor-pointer"
                        title="نسخ الإيميل"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteSubscriber && (
                        <button
                          onClick={() => onDeleteSubscriber(sub.id)}
                          className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-red-300 text-[#685D52] hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#FAF7F2] border-t border-[#EADBCE] flex justify-end shrink-0">
              <button
                onClick={() => setShowSubscribersModal(false)}
                className="rounded-xl border border-[#EADBCE] text-xs font-semibold text-[#685D52] hover:bg-white px-5 py-2 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
