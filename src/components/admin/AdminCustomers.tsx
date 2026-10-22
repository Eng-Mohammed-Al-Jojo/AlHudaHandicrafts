import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Eye,
  FileText,
  MessageCircle,
  Phone,
  ReceiptText,
  Search,
  ShoppingBag,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Invoice, Order } from '../../types'
import Modal from '../ui/Modal'
import { calculateInvoiceTotals, formatMoney, invoiceTypeLabel } from '../../utils/manualInvoice'
import { formatWhatsAppNumber, normalizeWhatsAppNumber, whatsappLink } from '../../utils/whatsapp'

interface Props {
  orders: Order[]
  invoices: Invoice[]
}

type CustomerRecord = {
  key: string
  name: string
  phone: string
  address: string
  orders: Order[]
  saleInvoices: Invoice[]
  purchaseInvoices: Invoice[]
  totalSpent: number
  firstActivity: string
  lastActivity: string
}

type CustomerSourceFilter = 'all' | 'orders' | 'invoices'

function invoiceCount(customer: CustomerRecord) {
  return customer.saleInvoices.length + customer.purchaseInvoices.length
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
}

function customerKey(name: string, phone?: string) {
  const digits = normalizeWhatsAppNumber(phone || '')
  if (digits) return `phone:${digits}`
  return `name:${name.trim().toLowerCase()}`
}

function orderAddress(order: Order) {
  return [order.governorate, order.city, order.address].filter(Boolean).join('، ')
}

export default function AdminCustomers({ orders, invoices }: Props) {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<CustomerSourceFilter>('all')
  const [selected, setSelected] = useState<CustomerRecord | null>(null)

  const customers = useMemo(() => {
    const map = new Map<string, CustomerRecord>()

    function ensure(name: string, phone: string | undefined, date: string) {
      const cleanName = name.trim() || 'زبون'
      const key = customerKey(cleanName, phone)
      const existing = map.get(key)
      if (existing) {
        if (date && new Date(date).getTime() < new Date(existing.firstActivity).getTime()) existing.firstActivity = date
        if (date && new Date(date).getTime() > new Date(existing.lastActivity).getTime()) existing.lastActivity = date
        if (!existing.phone && phone) existing.phone = phone
        return existing
      }
      const record: CustomerRecord = {
        key,
        name: cleanName,
        phone: phone?.trim() || '',
        address: '',
        orders: [],
        saleInvoices: [],
        purchaseInvoices: [],
        totalSpent: 0,
        firstActivity: date,
        lastActivity: date,
      }
      map.set(key, record)
      return record
    }

    const invoicedOrderIds = new Set(
      invoices
        .map(invoice => invoice.orderId)
        .filter((orderId): orderId is string => Boolean(orderId))
    )

    orders.forEach(order => {
      const record = ensure(order.customer || '', order.phone, order.createdAt)
      record.orders.push(order)
      if (!record.address) record.address = orderAddress(order)
      // If an invoice was issued for this order, the invoice total (after discounts) is the actual amount.
      if (order.status !== 'ملغي' && !invoicedOrderIds.has(order.id)) record.totalSpent += order.total
    })

    invoices.forEach(invoice => {
      const record = ensure(invoice.customerName, invoice.customerPhone, invoice.createdAt)
      if (invoice.type === 'sale') {
        record.saleInvoices.push(invoice)
        record.totalSpent += calculateInvoiceTotals(invoice).total
      } else {
        record.purchaseInvoices.push(invoice)
      }
      if (!record.address && invoice.deliveryAddress) record.address = invoice.deliveryAddress
    })

    return [...map.values()].sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  }, [orders, invoices])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const digits = search.replace(/\D/g, '')
    return customers.filter(customer => {
      const matchesSource =
        sourceFilter === 'all'
          ? true
          : sourceFilter === 'orders'
            ? customer.orders.length > 0
            : invoiceCount(customer) > 0

      if (!matchesSource) return false
      if (!term) return true

      const inName = customer.name.toLowerCase().includes(term)
      const inAddress = customer.address.toLowerCase().includes(term)
      const inPhone = digits ? normalizeWhatsAppNumber(customer.phone).includes(digits) : false
      return inName || inAddress || inPhone
    })
  }, [customers, search, sourceFilter])

  const stats = useMemo(() => ({
    total: customers.length,
    withOrders: customers.filter(customer => customer.orders.length > 0).length,
    withInvoices: customers.filter(customer => invoiceCount(customer) > 0).length,
    totalValue: customers.reduce((sum, customer) => sum + customer.totalSpent, 0),
  }), [customers])

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] p-5 sm:p-7 shadow-xs">
        <div className="eyebrow mb-2">
          <Users className="w-3.5 h-3.5 text-[#C59B4B]" />
          الزبائن
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
          زبائن الهدى
        </h1>
        <p className="text-xs text-[#685D52] m-0 mt-1.5 leading-relaxed max-w-2xl">
          كل من يقوم بالطلب من المتجر أو تُنشأ له فاتورة يظهر هنا تلقائياً مع بياناته وسجل تعاملاته.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setSourceFilter('all')}
          aria-pressed={sourceFilter === 'all'}
          className={`text-right bg-white rounded-2xl border p-4 shadow-xs transition-all cursor-pointer hover:border-[#8D6527] ${sourceFilter === 'all' ? 'border-[#8D6527] ring-2 ring-[#8D6527]/15' : 'border-[#EADBCE]'}`}
          title="عرض كل الزبائن"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#685D52]">إجمالي الزبائن</span>
            <span className="w-8 h-8 rounded-xl bg-[#FAF7F2] text-[#8D6527] flex items-center justify-center"><Users className="w-4 h-4" /></span>
          </div>
          <strong className="text-2xl font-serif text-[#221811]" style={{ fontFamily: 'Amiri, serif' }}>{stats.total}</strong>
          <span className="text-[10px] text-[#968B7E] font-semibold mr-1">زبون</span>
        </button>
        <button
          type="button"
          onClick={() => setSourceFilter('orders')}
          aria-pressed={sourceFilter === 'orders'}
          className={`text-right bg-white rounded-2xl border p-4 shadow-xs transition-all cursor-pointer hover:border-[#8D6527] ${sourceFilter === 'orders' ? 'border-[#8D6527] ring-2 ring-[#8D6527]/15' : 'border-[#EADBCE]'}`}
          title="عرض الزبائن الذين لديهم طلبات"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#685D52]">لديهم طلبات</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><ShoppingBag className="w-4 h-4" /></span>
          </div>
          <strong className="text-2xl font-serif text-[#221811]" style={{ fontFamily: 'Amiri, serif' }}>{stats.withOrders}</strong>
          <span className="text-[10px] text-[#968B7E] font-semibold mr-1">زبون</span>
        </button>
        <button
          type="button"
          onClick={() => setSourceFilter('invoices')}
          aria-pressed={sourceFilter === 'invoices'}
          className={`text-right bg-white rounded-2xl border p-4 shadow-xs transition-all cursor-pointer hover:border-[#8D6527] ${sourceFilter === 'invoices' ? 'border-[#8D6527] ring-2 ring-[#8D6527]/15' : 'border-[#EADBCE]'}`}
          title="عرض الزبائن الذين جاءوا من خلال الفواتير"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#685D52]">من الفواتير</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center"><ReceiptText className="w-4 h-4" /></span>
          </div>
          <strong className="text-2xl font-serif text-[#221811]" style={{ fontFamily: 'Amiri, serif' }}>{stats.withInvoices}</strong>
          <span className="text-[10px] text-[#968B7E] font-semibold mr-1">زبون</span>
        </button>
        <div className="bg-white rounded-2xl border border-[#EADBCE] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#685D52]">قيمة التعاملات</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></span>
          </div>
          <strong className="text-xl font-bold text-emerald-800">{formatMoney(stats.totalValue)}</strong>
          <span className="text-[10px] text-[#968B7E] font-semibold block">طلبات + فواتير بيع</span>
        </div>
      </div>

      {/* Search + source filter */}
      <div className="bg-white rounded-2xl border border-[#EADBCE] p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] focus-within:border-[#8D6527] rounded-xl px-3 py-2.5 flex-1 transition-colors">
            <Search className="w-4 h-4 text-[#8D6527] shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحثي بالاسم، رقم الواتساب، أو العنوان..."
              className="bg-transparent border-0 outline-none text-xs text-[#221811] placeholder-[#B4A898] flex-1"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[#968B7E] hover:text-[#221811] cursor-pointer" aria-label="مسح البحث">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-[11px] text-[#685D52] font-semibold shrink-0 px-2">{filtered.length} نتيجة</span>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl p-1">
          {([
            { id: 'all', label: 'الكل', count: stats.total },
            { id: 'orders', label: 'لديهم طلبات', count: stats.withOrders },
            { id: 'invoices', label: 'من الفواتير', count: stats.withInvoices },
          ] as { id: CustomerSourceFilter; label: string; count: number }[]).map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSourceFilter(option.id)}
              aria-pressed={sourceFilter === option.id}
              className={`rounded-lg px-2 py-2 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                sourceFilter === option.id
                  ? 'bg-[#8D6527] text-white shadow-xs'
                  : 'text-[#685D52] hover:text-[#221811] hover:bg-white'
              }`}
            >
              <span>{option.label}</span>
              <span className={`text-[9px] rounded-full min-w-[18px] px-1 py-0.5 ${sourceFilter === option.id ? 'bg-white/20 text-white' : 'bg-white text-[#8D6527] border border-[#EADBCE]'}`}>
                {option.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-[#EADBCE]">
          <h2 className="font-serif text-lg sm:text-xl font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>قائمة الزبائن</h2>
          <p className="text-[11px] text-[#685D52] m-0 mt-0.5">
            {sourceFilter === 'orders'
              ? 'الزبائن الذين لديهم طلبات من المتجر'
              : sourceFilter === 'invoices'
                ? 'الزبائن الذين جاءوا من خلال الفواتير'
                : 'تُحدَّث تلقائياً من الطلبات والفواتير'}
          </p>
        </div>

        {customers.length === 0 ? (
          <div className="p-10 sm:p-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2] text-[#8D6527] flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="font-serif text-xl text-[#221811] m-0 mb-1">لا يوجد زبائن بعد</h3>
            <p className="text-xs text-[#685D52] m-0 mb-5">سيظهر الزبائن هنا تلقائياً بمجرد استلام أول طلب أو إنشاء أول فاتورة.</p>
            <div className="flex items-center justify-center gap-2">
              <Link to="/admin/invoices" className="inline-flex items-center gap-2 rounded-xl bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-4 py-2.5 no-underline transition-colors">
                <ReceiptText className="w-4 h-4" />
                إنشاء فاتورة
              </Link>
              <Link to="/admin/orders" className="inline-flex items-center gap-2 rounded-xl border border-[#EADBCE] bg-white text-[#685D52] hover:text-[#221811] text-xs font-bold px-4 py-2.5 no-underline transition-colors">
                <ShoppingBag className="w-4 h-4" />
                الطلبات
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#685D52]">
            لا توجد نتائج مطابقة للبحث أو الفلتر الحالي.
            {sourceFilter !== 'all' && (
              <button
                type="button"
                onClick={() => { setSourceFilter('all'); setSearch('') }}
                className="block mx-auto mt-3 rounded-lg border border-[#EADBCE] bg-white hover:border-[#8D6527] text-[#8D6527] text-[11px] font-bold px-3 py-1.5 cursor-pointer"
              >
                عرض كل الزبائن
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF7F2] text-[#685D52] font-bold border-b border-[#EADBCE]">
                  <tr>
                    <th className="p-4">الزبون</th>
                    <th className="p-4">واتساب</th>
                    <th className="p-4">العنوان</th>
                    <th className="p-4 text-center">الطلبات</th>
                    <th className="p-4 text-center">الفواتير</th>
                    <th className="p-4">قيمة التعاملات</th>
                    <th className="p-4">آخر نشاط</th>
                    <th className="p-4 text-center">تفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {filtered.map(customer => (
                    <tr key={customer.key} className="hover:bg-[#FAF7F2]/50 transition-colors">
                      <td className="p-4">
                        <span className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#8D6527] flex items-center justify-center shrink-0"><UserRound className="w-4 h-4" /></span>
                          <span className="font-bold text-[#221811]">{customer.name}</span>
                        </span>
                      </td>
                      <td className="p-4 text-[#685D52] font-mono" dir="ltr">{customer.phone ? formatWhatsAppNumber(customer.phone) : '—'}</td>
                      <td className="p-4 text-[#685D52] max-w-[220px]"><span className="block truncate">{customer.address || '—'}</span></td>
                      <td className="p-4 text-center font-bold text-[#221811]">{customer.orders.length}</td>
                      <td className="p-4 text-center font-bold text-[#221811]">{customer.saleInvoices.length + customer.purchaseInvoices.length}</td>
                      <td className="p-4 font-bold text-[#8D6527]">{formatMoney(customer.totalSpent)}</td>
                      <td className="p-4 text-[#968B7E]">{formatDate(customer.lastActivity)}</td>
                      <td className="p-4">
                        <button onClick={() => setSelected(customer)} className="mx-auto w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors cursor-pointer" title="عرض التفاصيل">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-[#FAF7F2]">
              {filtered.map(customer => (
                <button
                  key={customer.key}
                  onClick={() => setSelected(customer)}
                  className="w-full text-right p-4 space-y-2 hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-[#221811]">{customer.name}</span>
                    <span className="font-bold text-[#8D6527] text-xs">{formatMoney(customer.totalSpent)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#685D52]">
                    <span dir="ltr" className="font-mono">{customer.phone ? formatWhatsAppNumber(customer.phone) : '—'}</span>
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3 text-[#8D6527]" />{formatDate(customer.lastActivity)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#968B7E]">
                    <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{customer.orders.length} طلب</span>
                    <span className="flex items-center gap-1"><ReceiptText className="w-3 h-3" />{customer.saleInvoices.length + customer.purchaseInvoices.length} فاتورة</span>
                    {customer.address && <span className="truncate">{customer.address}</span>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Customer details */}
      {selected && (
        <Modal onClose={() => setSelected(null)} size="lg" className="p-0 overflow-hidden">
          <div className="bg-[#FAF7F2] p-5 border-b border-[#EADBCE] flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#EADBCE] text-[#8D6527] flex items-center justify-center shrink-0">
                <UserRound className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-serif text-xl font-bold text-[#221811] m-0 truncate" style={{ fontFamily: 'Amiri, serif' }}>{selected.name}</h3>
                <p className="text-[11px] text-[#685D52] m-0 mt-0.5 flex items-center gap-1" dir="ltr">
                  <Phone className="w-3 h-3 text-[#8D6527]" />
                  {selected.phone ? formatWhatsAppNumber(selected.phone) : 'لا يوجد رقم'}
                </p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg border border-[#EADBCE] bg-white text-[#685D52] flex items-center justify-center cursor-pointer shrink-0" aria-label="إغلاق">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-xl bg-[#FAF7F2] border border-[#EADBCE] p-3">
                <span className="text-[10px] text-[#968B7E] block">الطلبات</span>
                <strong className="text-lg text-[#221811]">{selected.orders.length}</strong>
              </div>
              <div className="rounded-xl bg-[#FAF7F2] border border-[#EADBCE] p-3">
                <span className="text-[10px] text-[#968B7E] block">فواتير البيع</span>
                <strong className="text-lg text-[#221811]">{selected.saleInvoices.length}</strong>
              </div>
              <div className="rounded-xl bg-[#FAF7F2] border border-[#EADBCE] p-3">
                <span className="text-[10px] text-[#968B7E] block">فواتير الشراء</span>
                <strong className="text-lg text-[#221811]">{selected.purchaseInvoices.length}</strong>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <span className="text-[10px] text-emerald-700 block">قيمة التعاملات</span>
                <strong className="text-sm text-emerald-800">{formatMoney(selected.totalSpent)}</strong>
              </div>
            </div>

            <div className="text-xs text-[#685D52] space-y-1">
              <p className="m-0"><strong className="text-[#221811]">العنوان:</strong> {selected.address || '—'}</p>
              <p className="m-0"><strong className="text-[#221811]">أول تعامل:</strong> {formatDate(selected.firstActivity)}</p>
              <p className="m-0"><strong className="text-[#221811]">آخر نشاط:</strong> {formatDate(selected.lastActivity)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selected.phone && (
                <a
                  href={whatsappLink(selected.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 no-underline transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  محادثة واتساب
                </a>
              )}
              <Link to="/admin/invoices" className="inline-flex items-center gap-1.5 rounded-xl border border-[#EADBCE] bg-white text-[#685D52] hover:text-[#221811] text-xs font-bold px-4 py-2.5 no-underline transition-colors">
                <ReceiptText className="w-4 h-4" />
                الفواتير
              </Link>
              <Link to="/admin/orders" className="inline-flex items-center gap-1.5 rounded-xl border border-[#EADBCE] bg-white text-[#685D52] hover:text-[#221811] text-xs font-bold px-4 py-2.5 no-underline transition-colors">
                <ShoppingBag className="w-4 h-4" />
                الطلبات
              </Link>
            </div>

            {/* Orders */}
            <div>
              <h4 className="text-xs font-bold text-[#221811] m-0 mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#8D6527]" />
                الطلبات
              </h4>
              {selected.orders.length === 0 ? (
                <p className="text-[11px] text-[#968B7E] m-0 bg-[#FAF7F2] rounded-xl p-3">لا توجد طلبات مسجلة.</p>
              ) : (
                <div className="divide-y divide-[#FAF7F2] border border-[#EADBCE] rounded-xl overflow-hidden">
                  {selected.orders.map(order => (
                    <div key={order.id} className="flex items-center justify-between gap-2 p-3 text-[11px] bg-white">
                      <div className="min-w-0">
                        <span className="font-bold text-[#221811] block">#{order.id.slice(0, 8)}</span>
                        <span className="text-[#968B7E]">{formatDate(order.createdAt)} · {order.status}</span>
                      </div>
                      <strong className="text-[#8D6527] shrink-0">{formatMoney(order.total)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices */}
            <div>
              <h4 className="text-xs font-bold text-[#221811] m-0 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#8D6527]" />
                الفواتير
              </h4>
              {selected.saleInvoices.length + selected.purchaseInvoices.length === 0 ? (
                <p className="text-[11px] text-[#968B7E] m-0 bg-[#FAF7F2] rounded-xl p-3">لا توجد فواتير مسجلة.</p>
              ) : (
                <div className="divide-y divide-[#FAF7F2] border border-[#EADBCE] rounded-xl overflow-hidden">
                  {[...selected.saleInvoices, ...selected.purchaseInvoices]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(invoice => (
                      <div key={invoice.id} className="flex items-center justify-between gap-2 p-3 text-[11px] bg-white">
                        <div className="min-w-0">
                          <span className="font-bold text-[#221811] block font-mono" dir="ltr">{invoice.invoiceNumber}</span>
                          <span className="text-[#968B7E]">{formatDate(invoice.createdAt)} · {invoiceTypeLabel(invoice.type)}</span>
                        </div>
                        <strong className="text-[#8D6527] shrink-0">{formatMoney(calculateInvoiceTotals(invoice).total)}</strong>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
