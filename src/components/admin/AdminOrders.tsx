import { useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, CheckCircle2, CreditCard, Download, FilePenLine, Filter, LayoutGrid, List, MessageCircle, Phone, ReceiptText, Search, Send, Share2, ShoppingBag, Sparkles, Trash2, X } from 'lucide-react'
import type { Order, OrderStatus, PaymentMethod, PaymentMethodId, SiteSettings } from '../../types'
import Modal from '../ui/Modal'
import AdminSelect from './AdminSelect'
import { exportOrdersToExcel } from '../../utils/orderExport'
import { createInvoiceImage, downloadInvoiceImage } from '../../utils/invoice'

interface Props {
  orders: Order[]
  settings: SiteSettings
  onUpdateStatus: (id: string, status: OrderStatus) => Promise<void>
  onUpdate: (order: Order) => Promise<void>
  onDelete: (id: string) => Promise<void>
  notify: (msg: string, type?: 'success' | 'error') => void
}

const ALL_STATUSES: OrderStatus[] = ['جديد', 'قيد التجهيز', 'تم التواصل', 'مكتمل', 'ملغي']
const STATUS_COLOR: Record<OrderStatus, string> = {
  'جديد': 'bg-amber-50 text-amber-900 border-amber-200', 'قيد التجهيز': 'bg-blue-50 text-blue-900 border-blue-200',
  'تم التواصل': 'bg-purple-50 text-purple-900 border-purple-200', 'مكتمل': 'bg-emerald-50 text-emerald-900 border-emerald-200', 'ملغي': 'bg-red-50 text-red-900 border-red-200',
}
type DateFilter = 'today' | 'all' | 'range'
type ViewMode = 'table' | 'cards'

function localDateKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function todayKey() { return localDateKey(new Date().toISOString()) }
function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatOrderItems(order: Order) {
  return order.items
    .map(item => `${item.productName} × ${item.quantity ?? 1}`)
    .join('، ') || '—'
}

function formatOrderCurrency(order: Order) {
  if (!order.displayCurrency || order.displayCurrency === 'ILS' || typeof order.displayTotal !== 'number' || !Number.isFinite(order.displayTotal)) return null
  const amount = order.displayTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const rate = typeof order.displayRate === 'number' && Number.isFinite(order.displayRate) && order.displayRate > 0
    ? ` · 1 ${order.displayCurrency} = ${order.displayRate} ₪`
    : ''
  return `${amount} ${order.displayCurrency} وقت الطلب${rate}`
}

function formatIls(value: number) {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₪`
}

function getOrderLocation(order: Order) {
  return [order.governorate, order.city].filter(Boolean).join('، ') || order.address || ''
}

function getShippingStatus(order: Order): 'free' | 'standard' {
  if (order.shippingStatus === 'free' || order.shippingStatus === 'standard') return order.shippingStatus
  return order.notes?.includes('شحن مجاني') ? 'free' : 'standard'
}

function getWhatsAppNumber(phone?: string) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return `972${digits.slice(1)}`
  return digits
}

function buildPaymentConfirmationMessage(order: Order, method: PaymentMethod) {
  const itemCount = order.itemsCount || order.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
  const paymentDetails = [
    method.accountName && `اسم صاحب الحساب: ${method.accountName}`,
    method.accountNumber && `رقم الحساب/المحفظة: ${method.accountNumber}`,
    method.iban && `IBAN: ${method.iban}`,
    method.branch && `الفرع: ${method.branch}`,
    method.instructions && `التعليمات: ${method.instructions}`,
  ].filter(Boolean)
  return [
    `السلام عليكم ${order.customer}`,
    '',
    'تم استلام طلبك وتأكيد الدفع معنا ✅',
    `رقم الطلب: #${order.id.slice(0, 8)}`,
    `عدد القطع: ${itemCount}`,
    `الإجمالي: ${formatIls(order.total)}`,
    `طريقة الدفع: ${method.label}`,
    ...(paymentDetails.length > 0 ? ['', 'بيانات الدفع:', ...paymentDetails] : []),
    '',
    'سنبدأ تجهيز طلبك والتواصل معكِ عند تحديث حالته.',
  ].join('\n')
}

function buildInvoiceText(order: Order, settings: SiteSettings) {
  const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`
  const itemLines = order.items.map(item => {
    const quantity = item.quantity ?? 1
    return `- ${item.productName} × ${quantity} — ${formatIls(item.price * quantity)}`
  }).join('\n')
  const shippingStatus = getShippingStatus(order)
  const displayCurrency = formatOrderCurrency(order)
  const location = [order.governorate, order.city, order.address].filter(Boolean).join('، ')

  return [
    `فاتورة ${settings.storeName}`,
    `رقم الفاتورة: ${invoiceNumber}`,
    `رقم الطلب: #${order.id.slice(0, 8)}`,
    `التاريخ: ${formatDate(order.createdAt)}`,
    '',
    'بيانات العميلة:',
    `الاسم: ${order.customer}`,
    `الجوال: ${order.phone ?? ''}`,
    ...(order.email ? [`البريد الإلكتروني: ${order.email}`] : []),
    ...(location ? [`العنوان: ${location}`] : []),
    '',
    'المنتجات:',
    itemLines || 'لا توجد منتجات',
    '',
    `الإجمالي الأساسي: ${formatIls(order.total)}`,
    ...(displayCurrency ? [`${displayCurrency}`] : []),
    `الشحن: ${shippingStatus === 'free' ? 'مجاني' : 'عادي — يتم التنسيق مع العميلة'}`,
    ...(order.shippingThreshold !== undefined ? [`حد الشحن المجاني: ${formatIls(order.shippingThreshold)}`] : []),
    ...(order.deliveryNotes ? [`ملاحظات التوصيل: ${order.deliveryNotes}`] : []),
    ...(order.notes ? [`ملاحظات: ${order.notes}`] : []),
  ].join('\n')
}

export default function AdminOrders({ orders, settings, onUpdateStatus, onUpdate, onDelete, notify }: Props) {
  const [statusFilter, setStatusFilter] = useState<'الكل' | OrderStatus>('الكل')
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [fromDate, setFromDate] = useState(todayKey())
  const [toDate, setToDate] = useState(todayKey())
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null)
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null)
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter(order => {
      const orderDate = localDateKey(order.createdAt)
      const dateMatches = dateFilter === 'all' || (dateFilter === 'today' && orderDate === todayKey()) || (dateFilter === 'range' && (!fromDate || orderDate >= fromDate) && (!toDate || orderDate <= toDate))
      const statusMatches = statusFilter === 'الكل' || order.status === statusFilter
      const searchMatches = !query || [order.customer, order.phone, order.id, order.items.map(item => item.productName).join(' ')].join(' ').toLowerCase().includes(query)
      return dateMatches && statusMatches && searchMatches
    })
  }, [orders, statusFilter, dateFilter, fromDate, toDate, search])

  async function handleExport() {
    if (!filteredOrders.length) return notify('لا توجد طلبات مطابقة للفلاتر لتصديرها.')
    try {
      await exportOrdersToExcel(filteredOrders)
      notify(`تم تصدير ${filteredOrders.length} طلب إلى ملف Excel.`)
    } catch (error) {
      console.error('Excel export error:', error)
      notify('تعذر إنشاء ملف Excel. حاولي مرة أخرى.', 'error')
    }
  }
  async function confirmDelete() {
    if (!deletingOrder) return
    setIsDeleting(true)
    try { await onDelete(deletingOrder.id); setDeletingOrder(null) } catch { /* parent notifies */ } finally { setIsDeleting(false) }
  }

  async function handleStatusChange(id: string, status: OrderStatus) {
    if (updatingStatusId) return
    const order = orders.find(item => item.id === id)
    if (!order) return

    if (status === 'مكتمل' && order.paymentStatus !== 'paid') {
      setPaymentOrder(order)
      return
    }

    setUpdatingStatusId(id)
    try {
      await onUpdateStatus(id, status)
    } catch {
      // Parent shows the Firestore error; the old status remains selected.
    } finally {
      setUpdatingStatusId(null)
    }
  }

  async function confirmPayment(methodId: PaymentMethodId, reference: string) {
    if (!paymentOrder || isConfirmingPayment) return
    const method = settings.paymentMethods.find(item => item.id === methodId)
    if (!method) {
      notify('اختاري طريقة دفع مفعلة من الإعدادات.', 'error')
      return
    }

    setIsConfirmingPayment(true)
    try {
      const updatedOrder: Order = {
        ...paymentOrder,
        status: 'مكتمل',
        paymentStatus: 'paid',
        paymentMethod: methodId,
        paymentMethodLabel: method.label,
        paymentReference: reference.trim(),
        paymentConfirmedAt: new Date().toISOString(),
      }
      await onUpdate(updatedOrder)
      setPaymentOrder(null)
      notify('تم تأكيد الدفع وتحديث الطلب إلى «مكتمل».', 'success')

      const phone = getWhatsAppNumber(updatedOrder.phone)
      if (phone) {
        const message = buildPaymentConfirmationMessage(updatedOrder, method)
        const whatsappWindow = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
        notify(whatsappWindow ? 'تم فتح رسالة واتساب لتأكيد الدفع وإرسالها للعميلة.' : 'تعذر فتح واتساب تلقائياً؛ الرسالة جاهزة للإرسال يدوياً.', whatsappWindow ? 'success' : 'error')
      } else {
        notify('تم تأكيد الدفع، لكن لا يوجد رقم واتساب مسجل للعميلة.')
      }
    } catch (error) {
      console.error('Payment confirmation error:', error)
      notify('تعذر حفظ تأكيد الدفع. لم يتم تغيير حالة الطلب.', 'error')
    } finally {
      setIsConfirmingPayment(false)
    }
  }

  return <div className="w-full min-w-0 space-y-5 max-w-7xl mx-auto animate-fade-in">
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] p-5 sm:p-8 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div><div className="eyebrow mb-1"><Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" /><span>طلبات الزبائن والمتابعة</span></div><h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>إدارة الطلبات</h1><p className="text-xs text-[#685D52] m-0 mt-1">استعرضي الطلبات، حدّثي بياناتها، وصدّري النتائج التي تظهر لكِ.</p></div>
        <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] text-[#8D6527] text-sm font-bold px-4 py-2 rounded-full"><ShoppingBag className="w-4 h-4" />{filteredOrders.length} من {orders.length} طلب</span><div className="flex rounded-xl border border-[#EADBCE] p-1 bg-[#FAF7F2]" aria-label="طريقة عرض الطلبات"><button onClick={() => setViewMode('table')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-white text-[#8D6527] shadow-xs' : 'text-[#968B7E]'}`} title="عرض جدول"><List className="w-4 h-4" /></button><button onClick={() => setViewMode('cards')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'cards' ? 'bg-white text-[#8D6527] shadow-xs' : 'text-[#968B7E]'}`} title="عرض بطاقات"><LayoutGrid className="w-4 h-4" /></button></div><button onClick={handleExport} className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"><Download className="w-4 h-4" />تصدير Excel</button></div>
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-[#EADBCE] p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-[#221811]"><Filter className="w-4 h-4 text-[#8D6527]" />الفلاتر</div>
      <div className="flex flex-col xl:flex-row xl:items-end gap-3">
        <div className="flex flex-wrap gap-2"><DateFilterButton active={dateFilter === 'today'} onClick={() => setDateFilter('today')}>طلبات اليوم</DateFilterButton><DateFilterButton active={dateFilter === 'all'} onClick={() => setDateFilter('all')}>كل الطلبات</DateFilterButton><DateFilterButton active={dateFilter === 'range'} onClick={() => setDateFilter('range')}>فترة مخصصة</DateFilterButton></div>
        {dateFilter === 'range' && <div className="flex flex-wrap items-center gap-2"><label className="text-xs text-[#685D52]">من <input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="mr-1 bg-[#FAF7F2] border border-[#EADBCE] rounded-lg px-2 py-2 text-[#221811]" /></label><label className="text-xs text-[#685D52]">إلى <input type="date" min={fromDate} value={toDate} onChange={event => setToDate(event.target.value)} className="mr-1 bg-[#FAF7F2] border border-[#EADBCE] rounded-lg px-2 py-2 text-[#221811]" /></label></div>}
        <div className="relative min-w-45 xl:mr-auto"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8D6527]" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl pr-9 pl-3 py-2.5 text-xs outline-none focus:border-[#8D6527]" /></div>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">{(['الكل', ...ALL_STATUSES] as const).map(status => <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${statusFilter === status ? 'bg-[#8D6527] text-white' : 'text-[#685D52] hover:bg-[#FAF7F2]'}`}>{status} ({status === 'الكل' ? orders.length : orders.filter(order => order.status === status).length})</button>)}</div>
    </div>

    {filteredOrders.length === 0 ? <div className="bg-white rounded-2xl border border-[#EADBCE] shadow-xs p-12 text-center"><ShoppingBag className="w-9 h-9 text-[#C59B4B] mx-auto mb-3" /><h3 className="font-serif text-xl text-[#221811] m-0 mb-1">لا توجد طلبات مطابقة</h3><p className="text-xs text-[#685D52] m-0">غيّري الفلاتر أو اختاري فترة أخرى.</p></div> : viewMode === 'table' ? <div className="w-full max-w-full min-w-0 bg-white rounded-2xl border border-[#EADBCE] shadow-xs overflow-hidden"><div className="w-full max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain"><table className="w-full min-w-[1120px] text-right border-collapse"><thead className="bg-[#24180E] text-[#F7F1E5] text-xs"><tr><th className="px-4 py-4 font-semibold">الطلب</th><th className="px-4 py-4 font-semibold">التاريخ</th><th className="px-4 py-4 font-semibold">العميلة والتواصل</th><th className="px-4 py-4 font-semibold">المنتجات</th><th className="px-4 py-4 font-semibold">الإجمالي</th><th className="px-4 py-4 font-semibold">الحالة</th><th className="px-4 py-4 font-semibold">إجراءات</th></tr></thead><tbody className="divide-y divide-[#EADBCE]">{filteredOrders.map(order => <OrderRow key={order.id} order={order} onUpdateStatus={(id, status) => void handleStatusChange(id, status)} updatingStatus={updatingStatusId === order.id} onEdit={() => setEditingOrder(order)} onDelete={() => setDeletingOrder(order)} onOpenInvoice={() => setInvoiceOrder(order)} onConfirmPayment={() => setPaymentOrder(order)} />)}</tbody></table></div></div> : <div className="w-full min-w-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{filteredOrders.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={(id, status) => void handleStatusChange(id, status)} updatingStatus={updatingStatusId === order.id} onEdit={() => setEditingOrder(order)} onDelete={() => setDeletingOrder(order)} onOpenInvoice={() => setInvoiceOrder(order)} onConfirmPayment={() => setPaymentOrder(order)} />)}</div>}

    {editingOrder && <OrderEditor order={editingOrder} onClose={() => setEditingOrder(null)} onSave={async order => { await onUpdate(order); setEditingOrder(null) }} />}
    {deletingOrder && <Modal onClose={() => !isDeleting && setDeletingOrder(null)} size="sm"><div className="p-6 sm:p-8"><div className="flex items-center gap-3 text-red-800"><div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><Trash2 className="w-5 h-5" /></div><h2 className="font-serif text-xl m-0">حذف الطلب</h2></div><p className="text-sm text-[#685D52] leading-relaxed mt-5">هل تريدين حذف طلب <strong>{deletingOrder.customer}</strong> نهائياً؟ لا يمكن استرجاعه بعد الحذف.</p><div className="flex justify-end gap-2 mt-6"><button disabled={isDeleting} onClick={() => setDeletingOrder(null)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#685D52] hover:bg-[#FAF7F2]">إلغاء</button><button disabled={isDeleting} onClick={confirmDelete} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-800 text-white disabled:opacity-60">{isDeleting ? 'جارٍ الحذف...' : 'حذف نهائياً'}</button></div></div></Modal>}
    {invoiceOrder && <InvoiceModal order={invoiceOrder} settings={settings} notify={notify} onClose={() => setInvoiceOrder(null)} />}
     {paymentOrder && <PaymentConfirmationModal order={paymentOrder} settings={settings} busy={isConfirmingPayment} onClose={() => !isConfirmingPayment && setPaymentOrder(null)} onConfirm={confirmPayment} />}
  </div>
}

function PaymentMethodData({ method }: { method: PaymentMethod }) {
  const rows = [
    method.accountName && { label: 'اسم صاحب الحساب', value: method.accountName },
    method.accountNumber && { label: method.id === 'bank_palestine' ? 'رقم الحساب' : 'رقم المحفظة / الجوال', value: method.accountNumber },
    method.iban && { label: 'IBAN', value: method.iban },
    method.branch && { label: 'الفرع', value: method.branch },
    method.paymentLink && { label: 'رابط الدفع', value: method.paymentLink },
  ].filter((row): row is { label: string; value: string } => Boolean(row))
  if (rows.length === 0) return null
  return <div className="mt-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2]/60 p-3 text-xs text-[#685D52]"><p className="font-bold text-[#221811] m-0 mb-2">بيانات التحويل</p>{rows.map(row => <div key={row.label} className="flex justify-between gap-3 py-0.5"><span>{row.label}</span><strong className="text-[#221811] text-left" dir={row.label.includes('رقم') || row.label.includes('IBAN') ? 'ltr' : 'rtl'}>{row.value}</strong></div>)}</div>
}

function PaymentConfirmationModal({ order, settings, busy, onClose, onConfirm }: {
  order: Order
  settings: SiteSettings
  busy: boolean
  onClose: () => void
  onConfirm: (methodId: PaymentMethodId, reference: string) => Promise<void>
}) {
  const enabledMethods = (settings.paymentMethods ?? []).filter(method => method.enabled)
  const [methodId, setMethodId] = useState<PaymentMethodId | ''>(enabledMethods.find(method => method.id === order.requestedPaymentMethod)?.id ?? enabledMethods[0]?.id ?? '')
  const [reference, setReference] = useState(order.paymentReference ?? '')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const selectedMethod = enabledMethods.find(method => method.id === methodId)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!methodId) {
      setError('اختاري طريقة الدفع أولاً.')
      return
    }
    if (reference.trim().length < 3) {
      setError('أضيفي رقم العملية أو ملاحظة التأكيد.')
      return
    }
    if (!confirmed) {
      setError('فعّلي علامة تأكيد استلام الدفع والتحقق منه قبل إكمال الطلب.')
      return
    }
    setError('')
    await onConfirm(methodId, reference.trim())
  }

  return <Modal onClose={onClose} size="md">
    <form onSubmit={submit} className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-[#EADBCE] pb-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><CreditCard className="w-5 h-5" /></div>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#221811] m-0">تأكيد الدفع</h2>
            <p className="text-xs text-[#685D52] m-0 mt-1">قبل إنهاء الطلب، سجلي طريقة الدفع وتأكيد الاستلام.</p>
          </div>
        </div>
        <button type="button" onClick={onClose} disabled={busy} className="w-9 h-9 rounded-xl hover:bg-[#FAF7F2] text-[#685D52] flex items-center justify-center disabled:opacity-50" aria-label="إغلاق"><X className="w-5 h-5" /></button>
      </div>

      <div className="mt-5 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/60 p-4 flex items-center justify-between gap-3">
        <div><p className="text-xs text-[#685D52] m-0">العميلة</p><strong className="text-sm text-[#221811]">{order.customer}</strong></div>
        <div className="text-left"><p className="text-xs text-[#685D52] m-0">الإجمالي</p><strong className="text-lg text-[#8D6527]">{formatIls(order.total)}</strong></div>
      </div>

      {enabledMethods.length === 0 ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">لا توجد طريقة دفع مفعلة. اذهب إلى إعدادات المتجر وفعّل طريقة واحدة على الأقل قبل تأكيد الطلب.</div>
      ) : (
        <>
          <div className="mt-5">
            <label className="block text-xs font-bold text-[#221811] mb-1.5">طريقة الدفع <span className="text-red-500">*</span></label>
            <AdminSelect value={methodId} options={enabledMethods.map(method => ({ value: method.id, label: method.label }))} onChange={value => { setMethodId(value as PaymentMethodId); setError('') }} />
          </div>
          {selectedMethod && <PaymentMethodData method={selectedMethod} />}
          {selectedMethod?.instructions && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900 leading-relaxed"><strong className="block mb-1">تعليمات الدفع:</strong>{selectedMethod.instructions}</div>}
          <div className="mt-5">
            <label className="block text-xs font-bold text-[#221811] mb-1.5" htmlFor="payment-reference">رقم العملية / ملاحظة التأكيد <span className="text-red-500">*</span></label>
            <input id="payment-reference" value={reference} onChange={event => { setReference(event.target.value); setError('') }} placeholder="مثال: رقم الحوالة أو آخر أربعة أرقام من العملية" className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all" />
          </div>
          <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#EADBCE] bg-white p-3 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={event => { setConfirmed(event.target.checked); setError('') }} className="w-4 h-4 mt-0.5 rounded text-[#8D6527] focus:ring-[#8D6527]" />
            <span className="text-xs text-[#685D52] leading-relaxed">أؤكد أنتم استلمتم الدفع والتحقق منه، ويمكن تغيير حالة الطلب إلى «مكتمل».</span>
          </label>
        </>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800 m-0">{error}</p>}
      <div className="mt-6 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] p-3 text-xs text-[#685D52] flex items-start gap-2"><Send className="w-4 h-4 text-[#8D6527] shrink-0 mt-0.5" /><span>بعد الحفظ سيتم فتح واتساب تلقائياً برسالة تأكيد الدفع للعميلة. إذا لم يفتح المتصفح، يمكنك إرسال الرسالة يدوياً.</span></div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#685D52] hover:bg-[#FAF7F2] disabled:opacity-50">إلغاء</button>
        <button type="submit" disabled={busy || enabledMethods.length === 0} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-60"><CheckCircle2 className="w-4 h-4" />{busy ? 'جارٍ حفظ التأكيد...' : 'تأكيد الدفع وإكمال الطلب'}</button>
      </div>
    </form>
  </Modal>
}

function OrderRow({ order, onUpdateStatus, onEdit, onDelete, onOpenInvoice, onConfirmPayment, updatingStatus }: { order: Order; onUpdateStatus: (id: string, status: OrderStatus) => void; onEdit: () => void; onDelete: () => void; onOpenInvoice: () => void; onConfirmPayment: () => void; updatingStatus: boolean }) {
  const cleanPhone = (order.phone || '').replace(/[^\d+]/g, '')
  return <tr className="hover:bg-[#FAF7F2]/70 transition-colors align-top"><td className="px-4 py-4 text-xs text-[#685D52]" dir="ltr">#{order.id.slice(0, 8)}</td><td className="px-4 py-4 text-xs text-[#685D52] whitespace-nowrap"><span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-[#8D6527]" />{formatDate(order.createdAt)}</span></td><td className="px-4 py-4"><strong className="block text-sm text-[#221811] mb-1">{order.customer}</strong>{order.phone && <div className="flex items-center gap-1.5 text-xs text-[#685D52]" dir="ltr"><Phone className="w-3.5 h-3.5 text-[#8D6527]" />{order.phone}{cleanPhone && <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 mr-1" title="فتح واتساب"><MessageCircle className="w-4 h-4" /></a>}</div>}{getOrderLocation(order) && <div className="text-[10px] text-[#685D52] mt-1">{getOrderLocation(order)}</div>}</td><td className="px-4 py-4 max-w-75"><div className="text-xs text-[#221811] leading-6">{formatOrderItems(order) || '—'}</div>{order.notes && <p className="text-[11px] text-[#8D6527] mt-1 mb-0 line-clamp-2">{order.notes}</p>}</td><td className="px-4 py-4 whitespace-nowrap"><strong className="text-sm text-[#8D6527]">{order.total} ش</strong><span className="block text-[11px] text-[#968B7E] mt-1">{order.itemsCount} قطع</span>{(order.paymentMethodLabel || order.requestedPaymentMethod) && <span className={`block text-[10px] mt-1 ${order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>الدفع: {order.paymentMethodLabel || 'طريقة محددة'} — {order.paymentStatus === 'paid' ? 'مؤكد' : 'بانتظار التأكيد'}</span>}{formatOrderCurrency(order) && <span className="block text-[10px] text-[#8D6527] mt-1 whitespace-normal">{formatOrderCurrency(order)}</span>}</td><td className="px-4 py-4"><select value={order.status} onChange={event => onUpdateStatus(order.id, event.target.value as OrderStatus)} disabled={updatingStatus} className={`border rounded-xl px-2.5 py-2 text-xs font-bold outline-none disabled:opacity-60 disabled:cursor-wait ${updatingStatus ? 'cursor-wait' : 'cursor-pointer'} ${STATUS_COLOR[order.status]}`}>{ALL_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select></td><td className="px-4 py-4"><div className="flex items-center gap-2">{order.paymentStatus !== 'paid' && <button onClick={onConfirmPayment} className="w-8 h-8 rounded-lg text-emerald-700 hover:bg-emerald-50 flex items-center justify-center" title="تأكيد الدفع"><CreditCard className="w-4 h-4" /></button>}<button onClick={onEdit} className="w-8 h-8 rounded-lg text-[#8D6527] hover:bg-[#F7F1E5] flex items-center justify-center" title="تعديل الطلب"><FilePenLine className="w-4 h-4" /></button><button onClick={onOpenInvoice} className="w-8 h-8 rounded-lg text-emerald-700 hover:bg-emerald-50 flex items-center justify-center" title="إصدار فاتورة"><ReceiptText className="w-4 h-4" /></button><button onClick={onDelete} className="w-8 h-8 rounded-lg text-red-700 hover:bg-red-50 flex items-center justify-center" title="حذف الطلب"><Trash2 className="w-4 h-4" /></button></div></td></tr>
}

function OrderCard({ order, onUpdateStatus, onEdit, onDelete, onOpenInvoice, onConfirmPayment, updatingStatus }: { order: Order; onUpdateStatus: (id: string, status: OrderStatus) => void; onEdit: () => void; onDelete: () => void; onOpenInvoice: () => void; onConfirmPayment: () => void; updatingStatus: boolean }) {
  const cleanPhone = (order.phone || '').replace(/[^\d+]/g, '')
  return <article className="bg-white rounded-2xl border border-[#EADBCE] shadow-xs p-4 sm:p-5 flex flex-col gap-4 hover:border-[#DFB76C] transition-colors">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[11px] text-[#968B7E] m-0" dir="ltr">#{order.id.slice(0, 8)}</p><h3 className="font-serif text-lg font-bold text-[#221811] m-0 mt-1">{order.customer}</h3><p className="text-[11px] text-[#685D52] m-0 mt-1 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-[#8D6527]" />{formatDate(order.createdAt)}</p></div>
      <strong className="text-lg text-[#8D6527] whitespace-nowrap">{order.total} <small className="text-xs font-normal">ش</small></strong>
    </div>
    <div className="rounded-xl bg-[#FAF7F2] border border-[#EADBCE] px-3 py-2.5 text-xs text-[#221811] leading-6">{formatOrderItems(order) || '—'}<span className="block text-[11px] text-[#968B7E]">{order.itemsCount} قطع</span>{formatOrderCurrency(order) && <span className="block text-[10px] text-[#8D6527] mt-1">{formatOrderCurrency(order)}</span>}</div>
    {(order.paymentMethodLabel || order.requestedPaymentMethod) && <div className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[11px] ${order.paymentStatus === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><span className="font-bold">الدفع: {order.paymentMethodLabel || 'طريقة محددة'}</span><span>{order.paymentStatus === 'paid' ? 'مؤكد' : 'بانتظار التأكيد'}</span></div>}
    {order.notes && <p className="text-xs text-[#8D6527] bg-amber-50/70 border border-amber-100 rounded-xl p-2.5 m-0 line-clamp-3">{order.notes}</p>}
    <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#EADBCE]">
      {order.phone ? <div className="flex items-center gap-1.5 text-xs text-[#685D52]" dir="ltr"><Phone className="w-3.5 h-3.5 text-[#8D6527]" />{order.phone}{cleanPhone && <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700"><MessageCircle className="w-4 h-4" /></a>}</div> : <span />}
      <select value={order.status} onChange={event => onUpdateStatus(order.id, event.target.value as OrderStatus)} disabled={updatingStatus} className={`border rounded-xl px-2 py-1.5 text-[11px] font-bold outline-none disabled:opacity-60 disabled:cursor-wait ${updatingStatus ? 'cursor-wait' : 'cursor-pointer'} ${STATUS_COLOR[order.status]}`}>{ALL_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select>
    </div>
    <div className="flex flex-wrap justify-end gap-2">{order.paymentStatus !== 'paid' && <button onClick={onConfirmPayment} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg px-2.5 py-2"><CreditCard className="w-3.5 h-3.5" />تأكيد الدفع</button>}<button onClick={onEdit} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8D6527] hover:bg-[#F7F1E5] rounded-lg px-2.5 py-2"><FilePenLine className="w-3.5 h-3.5" />تعديل</button><button onClick={onOpenInvoice} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg px-2.5 py-2"><ReceiptText className="w-3.5 h-3.5" />فاتورة</button><button onClick={onDelete} className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:bg-red-50 rounded-lg px-2.5 py-2"><Trash2 className="w-3.5 h-3.5" />حذف</button></div>
  </article>
}

function InvoiceModal({ order, settings, notify, onClose }: { order: Order; settings: SiteSettings; notify: (msg: string, type?: 'success' | 'error') => void; onClose: () => void }) {
  const location = getOrderLocation(order)
  const shippingStatus = getShippingStatus(order)
  const [isPreparingImage, setIsPreparingImage] = useState(false)

  async function shareInvoiceImage() {
    setIsPreparingImage(true)
    try {
      const blob = await createInvoiceImage(order, settings)
      const file = new File([blob], `invoice-${order.id.slice(0, 8)}.png`, { type: 'image/png' })
      const canShareFiles = typeof navigator.share === 'function'
        && (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }))

      if (!canShareFiles) {
        notify('هذا المتصفح لا يدعم مشاركة الملفات مباشرة. استخدمي زر تحميل الصورة ثم أرفقيها في واتساب.', 'error')
        return
      }

      await navigator.share({
        title: `فاتورة ${settings.storeName}`,
        files: [file],
      })
      notify('تمت مشاركة صورة الفاتورة عبر التطبيق المختار.')
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') notify('تعذر فتح قائمة مشاركة صورة الفاتورة.', 'error')
    } finally {
      setIsPreparingImage(false)
    }
  }

  async function downloadImage() {
    setIsPreparingImage(true)
    try {
      const blob = await createInvoiceImage(order, settings)
      downloadInvoiceImage(blob, order)
      notify('تم تنزيل صورة الفاتورة بصيغة PNG.')
    } catch {
      notify('تعذر إنشاء صورة الفاتورة.', 'error')
    } finally {
      setIsPreparingImage(false)
    }
  }

  return <Modal onClose={onClose} size="lg" className="rounded-3xl overflow-hidden p-0 border border-[#EADBCE]">
    <div className="invoice-print-root bg-white p-5 sm:p-8">
      <div className="no-print flex items-center justify-between gap-3 border-b border-[#EADBCE] pb-4 mb-6">
        <div className="flex items-center gap-2 text-sm font-bold text-[#8D6527]"><ReceiptText className="w-5 h-5" />معاينة فاتورة الطلب</div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-[#EADBCE] flex items-center justify-center text-[#685D52] hover:bg-white" aria-label="إغلاق الفاتورة"><X className="w-4 h-4" /></button>
          <button onClick={downloadImage} disabled={isPreparingImage} className="inline-flex items-center gap-1.5 rounded-xl border border-[#8D6527] px-3 py-2 text-xs font-bold text-[#8D6527] hover:bg-[#FAF7F2] disabled:opacity-60"><ReceiptText className="w-3.5 h-3.5" />تحميل صورة</button>
          <button onClick={() => void shareInvoiceImage()} disabled={isPreparingImage} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><Share2 className="w-3.5 h-3.5" />مشاركة الفاتورة</button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-5 border-b-2 border-[#8D6527] pb-5">
        <div><p className="text-xs text-[#8D6527] font-bold m-0">فاتورة مبيعات</p><h2 className="font-serif text-3xl text-[#221811] m-0 mt-1" style={{ fontFamily: 'Amiri, serif' }}>{settings.storeName}</h2>{settings.address && <p className="text-[11px] text-[#685D52] m-0 mt-1">{settings.address}</p>}{settings.phone && <p className="text-[11px] text-[#685D52] m-0" dir="ltr">{settings.phone}</p>}</div>
        <div className="text-left text-xs text-[#685D52]"><p className="m-0">رقم الفاتورة</p><strong className="text-sm text-[#221811] block mt-1" dir="ltr">INV-{order.id.slice(0, 8).toUpperCase()}</strong><p className="m-0 mt-2">التاريخ</p><strong className="text-[#221811] block mt-1">{formatDate(order.createdAt)}</strong></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 text-xs">
        <div className="rounded-xl bg-[#FAF7F2] p-4"><p className="font-bold text-[#221811] m-0 mb-2">بيانات العميلة</p><p className="m-0">الاسم: {order.customer}</p><p className="m-0 mt-1" dir="ltr">الجوال: {order.phone || '—'}</p>{order.email && <p className="m-0 mt-1" dir="ltr">{order.email}</p>}{location && <p className="m-0 mt-1">العنوان: {location}</p>}</div>
        <div className="rounded-xl bg-[#FAF7F2] p-4"><p className="font-bold text-[#221811] m-0 mb-2">بيانات الطلب</p><p className="m-0">الحالة: {order.status}</p><p className="m-0 mt-1">عدد القطع: {order.itemsCount}</p><p className="m-0 mt-1">الشحن: {shippingStatus === 'free' ? 'مجاني' : 'عادي — يتم التنسيق'}</p>{order.shippingThreshold !== undefined && <p className="m-0 mt-1">حد الشحن المجاني: {formatIls(order.shippingThreshold)}</p>}</div>
      </div>

      <div className="overflow-x-auto border border-[#EADBCE] rounded-xl">
        <table className="w-full text-right text-xs border-collapse"><thead className="bg-[#24180E] text-[#F7F1E5]"><tr><th className="p-3">المنتج</th><th className="p-3">الكمية</th><th className="p-3">سعر الوحدة</th><th className="p-3">الإجمالي</th></tr></thead><tbody className="divide-y divide-[#EADBCE]">{order.items.length > 0 ? order.items.map(item => { const quantity = item.quantity ?? 1; return <tr key={`${item.productId}-${quantity}`}><td className="p-3">{item.productName}</td><td className="p-3">× {quantity}</td><td className="p-3">{formatIls(item.price)}</td><td className="p-3 font-bold">{formatIls(item.price * quantity)}</td></tr> }) : <tr><td colSpan={4} className="p-5 text-center text-[#968B7E]">لا توجد منتجات</td></tr>}</tbody></table>
      </div>

      <div className="flex justify-end mt-5"><div className="w-full sm:w-72 space-y-2 text-xs"><div className="flex justify-between text-[#685D52]"><span>المجموع الأساسي</span><strong className="text-[#221811]">{formatIls(order.total)}</strong></div>{formatOrderCurrency(order) && <div className="flex justify-between text-[#8D6527]"><span>قيمة العرض وقت الطلب</span><strong>{formatOrderCurrency(order)}</strong></div>}<div className="flex justify-between text-[#685D52]"><span>الشحن</span><strong className="text-[#221811]">{shippingStatus === 'free' ? 'مجاني' : 'يُنسق مع العميلة'}</strong></div><div className="flex justify-between border-t border-[#EADBCE] pt-3 text-sm"><strong>الإجمالي</strong><strong className="text-[#8D6527]">{formatIls(order.total)}</strong></div></div></div>

      {(order.deliveryNotes || order.notes) && <div className="mt-5 rounded-xl border border-[#EADBCE] bg-[#FFFCF8] p-4 text-xs"><p className="font-bold text-[#221811] m-0 mb-2">ملاحظات</p>{order.deliveryNotes && <p className="m-0 text-[#685D52]">التوصيل: {order.deliveryNotes}</p>}{order.notes && <p className="m-0 mt-1 text-[#685D52]">التطريز: {order.notes}</p>}</div>}
      <p className="text-[10px] text-[#968B7E] text-center mt-6 mb-0">شكراً لثقتك بمتجر {settings.storeName} — الفاتورة الأساسية محفوظة بالشيكل.</p>
    </div>
  </Modal>
}

function DateFilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${active ? 'bg-[#8D6527] text-white' : 'border border-[#EADBCE] text-[#685D52] hover:border-[#C59B4B]'}`}>{children}</button> }

function OrderEditor({ order, onClose, onSave }: { order: Order; onClose: () => void; onSave: (order: Order) => Promise<void> }) {
  const [draft, setDraft] = useState(order); const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); if (!draft.customer.trim() || draft.total < 0) return; setSaving(true); try { await onSave({ ...draft, customer: draft.customer.trim(), phone: draft.phone?.trim(), email: draft.email?.trim(), governorate: draft.governorate?.trim(), city: draft.city?.trim(), address: draft.address?.trim(), deliveryNotes: draft.deliveryNotes?.trim(), notes: draft.notes?.trim(), total: Number(draft.total) || 0 }) } catch { /* parent notifies */ } finally { setSaving(false) } }
  const inputClass = 'w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527]'
  return <Modal onClose={onClose} size="lg"><form onSubmit={submit} className="p-6 sm:p-8"><div className="flex items-start justify-between gap-4 border-b border-[#EADBCE] pb-4"><div><h2 className="font-serif text-2xl text-[#221811] m-0">تعديل الطلب</h2><p className="text-xs text-[#685D52] m-0 mt-1" dir="ltr">#{order.id}</p></div><button type="button" onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-[#FAF7F2] text-[#685D52] flex items-center justify-center"><X className="w-5 h-5" /></button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6"><Field label="اسم العميلة"><input required value={draft.customer} onChange={event => setDraft(current => ({ ...current, customer: event.target.value }))} className={inputClass} /></Field><Field label="رقم الهاتف"><input value={draft.phone ?? ''} dir="ltr" onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))} className={`${inputClass} text-left`} /></Field><Field label="إجمالي الطلب (شيكل)"><input required min="0" type="number" value={draft.total} onChange={event => setDraft(current => ({ ...current, total: Number(event.target.value) }))} className={inputClass} /></Field><Field label="حالة الطلب"><select value={draft.status} onChange={event => setDraft(current => ({ ...current, status: event.target.value as OrderStatus }))} className={inputClass}>{ALL_STATUSES.map(status => <option key={status}>{status}</option>)}</select></Field><div className="sm:col-span-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] p-3 text-xs"><strong className="text-[#221811]">الدفع:</strong> <span className="text-[#685D52]">{draft.paymentMethodLabel || 'غير محدد'} — {draft.paymentStatus === 'paid' ? 'مؤكد' : 'بانتظار التأكيد'}</span></div><CustomerDetailsEditor draft={draft} onChange={setDraft} /><div className="sm:col-span-2"><Field label="المنتجات المسجلة"><div className="bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-3 text-xs text-[#685D52]">{order.items.length > 0 ? formatOrderItems(order) : 'لا توجد منتجات مسجلة'}</div></Field></div>{formatOrderCurrency(order) && <div className="sm:col-span-2"><Field label="عملة العرض وقت الطلب"><div className="bg-amber-50/70 border border-amber-100 rounded-xl px-3.5 py-3 text-xs text-[#8D6527]">{formatOrderCurrency(order)}</div></Field></div>}<div className="sm:col-span-2"><Field label="الملاحظات"><textarea rows={4} value={draft.notes ?? ''} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} className={`${inputClass} resize-y`} /></Field></div></div><div className="flex justify-end gap-2 pt-5 mt-6 border-t border-[#EADBCE]"><button type="button" onClick={onClose} className="px-5 py-3 rounded-xl text-xs font-bold text-[#685D52] hover:bg-[#FAF7F2]">إلغاء</button><button disabled={saving} className="px-5 py-3 rounded-xl text-xs font-bold text-white bg-[#8D6527] hover:bg-[#704F1E] disabled:opacity-60">{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</button></div></form></Modal>
}
function CustomerDetailsEditor({ draft, onChange }: { draft: Order; onChange: (order: Order) => void }) {
  const inputClass = 'w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527]'
  return <div className="sm:col-span-2 rounded-2xl border border-[#EADBCE] bg-[#FFFCF8] p-4 space-y-3">
    <p className="text-xs font-bold text-[#221811] m-0">بيانات العميلة والتوصيل</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="البريد الإلكتروني"><input type="email" dir="ltr" value={draft.email ?? ''} onChange={event => onChange({ ...draft, email: event.target.value })} className={`${inputClass} text-left`} /></Field>
      <Field label="المحافظة"><input value={draft.governorate ?? ''} onChange={event => onChange({ ...draft, governorate: event.target.value })} className={inputClass} /></Field>
      <Field label="المدينة"><input value={draft.city ?? ''} onChange={event => onChange({ ...draft, city: event.target.value })} className={inputClass} /></Field>
      <Field label="العنوان"><textarea rows={2} value={draft.address ?? ''} onChange={event => onChange({ ...draft, address: event.target.value })} className={`${inputClass} resize-none`} /></Field>
      <div className="sm:col-span-2"><Field label="ملاحظات التوصيل"><textarea rows={2} value={draft.deliveryNotes ?? ''} onChange={event => onChange({ ...draft, deliveryNotes: event.target.value })} className={`${inputClass} resize-none`} /></Field></div>
    </div>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-[#221811]">{label}<span className="block mt-1.5">{children}</span></label> }
