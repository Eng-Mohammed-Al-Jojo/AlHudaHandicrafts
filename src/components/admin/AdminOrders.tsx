import { useState } from 'react'
import {
  ShoppingBag,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  Calendar,
  Sparkles,
  FileText,
  ChevronDown,
} from 'lucide-react'
import type { Order, OrderStatus } from '../../types'

interface Props {
  orders: Order[]
  onUpdateStatus: (id: string, status: OrderStatus) => void
  notify: (msg: string) => void
}

const ALL_STATUSES: OrderStatus[] = ['جديد', 'قيد التجهيز', 'تم التواصل', 'مكتمل', 'ملغي']

const STATUS_COLOR: Record<string, string> = {
  'جديد':        'bg-amber-50 border-amber-300 text-amber-900',
  'قيد التجهيز': 'bg-blue-50 border-blue-300 text-blue-900',
  'تم التواصل':  'bg-purple-50 border-purple-300 text-purple-900',
  'مكتمل':       'bg-emerald-50 border-emerald-300 text-emerald-900',
  'ملغي':        'bg-red-50 border-red-300 text-red-900',
}

const FILTER_BADGE: Record<string, string> = {
  'جديد':        'status-new',
  'قيد التجهيز': 'status-process',
  'تم التواصل':  'status-contact',
  'مكتمل':       'status-done',
  'ملغي':        'status-cancel',
}

function formatOrderDate(dateStr?: string) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return dateStr }
}

export default function AdminOrders({ orders, onUpdateStatus, notify }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('الكل')

  const filteredOrders = statusFilter === 'الكل'
    ? orders
    : orders.filter(o => o.status === statusFilter)

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">

      {/* ── Page Header ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] p-5 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="eyebrow mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
              <span>طلبات الزبائن والمتابعة</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
              إدارة ومتابعة الطلبات
            </h1>
            <p className="text-xs text-[#685D52] m-0 mt-1">
              تحديث حالات التجهيز، التواصل عبر واتساب، وتأكيد الشحن.
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] text-[#8D6527] text-sm font-bold px-4 py-2 rounded-full">
              <ShoppingBag className="w-4 h-4" />
              {orders.length} طلب
            </span>
          </div>
        </div>
      </div>

      {/* ── Status Filter Tabs (Scrollable) ── */}
      <div className="bg-white rounded-2xl border border-[#EADBCE] p-2 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setStatusFilter('الكل')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'الكل'
                ? 'bg-[#8D6527] text-white shadow-xs'
                : 'text-[#685D52] hover:bg-[#FAF7F2]'
            }`}
          >
            الكل ({orders.length})
          </button>
          {ALL_STATUSES.map(st => {
            const count = orders.filter(o => o.status === st).length
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === st
                    ? 'bg-[#8D6527] text-white shadow-xs'
                    : 'text-[#685D52] hover:bg-[#FAF7F2]'
                }`}
              >
                {st} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Orders List ── */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2] text-[#8D6527] flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="font-serif text-xl font-bold text-[#221811] m-0 mb-1" style={{ fontFamily: 'Amiri, serif' }}>
            لا توجد طلبات
          </h3>
          <p className="text-xs text-[#685D52] m-0">
            {statusFilter === 'الكل' ? 'لم يتم تسجيل أي طلب بعد.' : `لا توجد طلبات بحالة «${statusFilter}».`}
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredOrders.map(order => {
            const cleanPhone = (order.phone || '').replace(/[^\d+]/g, '')
            const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-[#EADBCE] hover:border-[#DFB76C] shadow-xs transition-all overflow-hidden"
              >
                {/* ── Card Top ── */}
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                    {/* Left: Customer + Items */}
                    <div className="flex-1 space-y-3">
                      {/* Customer name + Date */}
                      <div className="flex flex-wrap items-start gap-2">
                        <h3 className="font-serif text-base sm:text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                          {order.customer}
                        </h3>
                        <span className="text-[11px] text-[#968B7E] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-[#8D6527]" />
                          <span>{formatOrderDate(order.createdAt)}</span>
                        </span>
                      </div>

                      {/* Phone + WhatsApp */}
                      <div className="flex flex-wrap items-center gap-3">
                        {order.phone && (
                          <span className="text-xs text-[#685D52] flex items-center gap-1" dir="ltr">
                            <Phone className="w-3.5 h-3.5 text-[#8D6527]" />
                            <span>{order.phone}</span>
                          </span>
                        )}
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full transition-colors no-underline"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>واتساب</span>
                          </a>
                        )}
                      </div>

                      {/* Order Items */}
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-2.5 py-1.5 text-xs max-w-full"
                          >
                            {item.image && (
                              <img src={item.image} alt="" className="w-6 h-6 rounded-md object-cover bg-white shrink-0" />
                            )}
                            <span className="font-semibold text-[#221811] truncate">{item.productName}</span>
                            <span className="text-[#8D6527] font-bold shrink-0">({item.price} ش)</span>
                          </div>
                        ))}
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="flex items-start gap-1.5 text-xs text-[#8D6527] bg-amber-50/70 border border-amber-200/60 rounded-xl p-2.5">
                          <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                          <span><strong>ملاحظات:</strong> {order.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Total + Status */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#FAF7F2] lg:shrink-0">
                      {/* Total */}
                      <div className="text-right">
                        <span className="text-[11px] text-[#685D52] block mb-0.5">الإجمالي</span>
                        <strong className="text-xl sm:text-2xl font-bold text-[#8D6527]">
                          {order.total} <small className="text-xs font-normal">شيكل</small>
                        </strong>
                      </div>

                      {/* Status Selector */}
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={order.status}
                            onChange={e => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                            className={`appearance-none text-xs font-bold px-3 py-2 pr-7 rounded-xl outline-none border cursor-pointer ${STATUS_COLOR[order.status] ?? 'bg-gray-50 border-gray-300 text-gray-900'}`}
                          >
                            {ALL_STATUSES.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-current opacity-60" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Card Status Stripe ── */}
                <div className={`h-1 ${
                  order.status === 'جديد' ? 'bg-amber-400' :
                  order.status === 'قيد التجهيز' ? 'bg-blue-400' :
                  order.status === 'تم التواصل' ? 'bg-purple-400' :
                  order.status === 'مكتمل' ? 'bg-emerald-400' : 'bg-red-400'
                }`} />
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
