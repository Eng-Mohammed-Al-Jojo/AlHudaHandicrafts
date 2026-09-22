import { useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Download, FilePenLine, Filter, LayoutGrid, List, MessageCircle, Phone, Search, ShoppingBag, Sparkles, Trash2, X } from 'lucide-react'
import type { Order, OrderStatus } from '../../types'
import Modal from '../ui/Modal'
import { exportOrdersToExcel } from '../../utils/orderExport'

interface Props {
  orders: Order[]
  onUpdateStatus: (id: string, status: OrderStatus) => void
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

export default function AdminOrders({ orders, onUpdateStatus, onUpdate, onDelete, notify }: Props) {
  const [statusFilter, setStatusFilter] = useState<'الكل' | OrderStatus>('الكل')
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [fromDate, setFromDate] = useState(todayKey())
  const [toDate, setToDate] = useState(todayKey())
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

    {filteredOrders.length === 0 ? <div className="bg-white rounded-2xl border border-[#EADBCE] shadow-xs p-12 text-center"><ShoppingBag className="w-9 h-9 text-[#C59B4B] mx-auto mb-3" /><h3 className="font-serif text-xl text-[#221811] m-0 mb-1">لا توجد طلبات مطابقة</h3><p className="text-xs text-[#685D52] m-0">غيّري الفلاتر أو اختاري فترة أخرى.</p></div> : viewMode === 'table' ? <div className="w-full max-w-full min-w-0 bg-white rounded-2xl border border-[#EADBCE] shadow-xs overflow-hidden"><div className="w-full max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain"><table className="w-full min-w-[1120px] text-right border-collapse"><thead className="bg-[#24180E] text-[#F7F1E5] text-xs"><tr><th className="px-4 py-4 font-semibold">الطلب</th><th className="px-4 py-4 font-semibold">التاريخ</th><th className="px-4 py-4 font-semibold">العميلة والتواصل</th><th className="px-4 py-4 font-semibold">المنتجات</th><th className="px-4 py-4 font-semibold">الإجمالي</th><th className="px-4 py-4 font-semibold">الحالة</th><th className="px-4 py-4 font-semibold">إجراءات</th></tr></thead><tbody className="divide-y divide-[#EADBCE]">{filteredOrders.map(order => <OrderRow key={order.id} order={order} onUpdateStatus={onUpdateStatus} onEdit={() => setEditingOrder(order)} onDelete={() => setDeletingOrder(order)} />)}</tbody></table></div></div> : <div className="w-full min-w-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{filteredOrders.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} onEdit={() => setEditingOrder(order)} onDelete={() => setDeletingOrder(order)} />)}</div>}

    {editingOrder && <OrderEditor order={editingOrder} onClose={() => setEditingOrder(null)} onSave={async order => { await onUpdate(order); setEditingOrder(null) }} />}
    {deletingOrder && <Modal onClose={() => !isDeleting && setDeletingOrder(null)} size="sm"><div className="p-6 sm:p-8"><div className="flex items-center gap-3 text-red-800"><div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><Trash2 className="w-5 h-5" /></div><h2 className="font-serif text-xl m-0">حذف الطلب</h2></div><p className="text-sm text-[#685D52] leading-relaxed mt-5">هل تريدين حذف طلب <strong>{deletingOrder.customer}</strong> نهائياً؟ لا يمكن استرجاعه بعد الحذف.</p><div className="flex justify-end gap-2 mt-6"><button disabled={isDeleting} onClick={() => setDeletingOrder(null)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#685D52] hover:bg-[#FAF7F2]">إلغاء</button><button disabled={isDeleting} onClick={confirmDelete} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-800 text-white disabled:opacity-60">{isDeleting ? 'جارٍ الحذف...' : 'حذف نهائياً'}</button></div></div></Modal>}
  </div>
}

function OrderRow({ order, onUpdateStatus, onEdit, onDelete }: { order: Order; onUpdateStatus: Props['onUpdateStatus']; onEdit: () => void; onDelete: () => void }) {
  const cleanPhone = (order.phone || '').replace(/[^\d+]/g, '')
  return <tr className="hover:bg-[#FAF7F2]/70 transition-colors align-top"><td className="px-4 py-4 text-xs text-[#685D52]" dir="ltr">#{order.id.slice(0, 8)}</td><td className="px-4 py-4 text-xs text-[#685D52] whitespace-nowrap"><span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-[#8D6527]" />{formatDate(order.createdAt)}</span></td><td className="px-4 py-4"><strong className="block text-sm text-[#221811] mb-1">{order.customer}</strong>{order.phone && <div className="flex items-center gap-1.5 text-xs text-[#685D52]" dir="ltr"><Phone className="w-3.5 h-3.5 text-[#8D6527]" />{order.phone}{cleanPhone && <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 mr-1" title="فتح واتساب"><MessageCircle className="w-4 h-4" /></a>}</div>}</td><td className="px-4 py-4 max-w-75"><div className="text-xs text-[#221811] leading-6">{order.items.map(item => item.productName).join('، ') || '—'}</div>{order.notes && <p className="text-[11px] text-[#8D6527] mt-1 mb-0 line-clamp-2">{order.notes}</p>}</td><td className="px-4 py-4 whitespace-nowrap"><strong className="text-sm text-[#8D6527]">{order.total} ش</strong><span className="block text-[11px] text-[#968B7E] mt-1">{order.itemsCount} قطع</span></td><td className="px-4 py-4"><select value={order.status} onChange={event => onUpdateStatus(order.id, event.target.value as OrderStatus)} className={`border rounded-xl px-2.5 py-2 text-xs font-bold outline-none cursor-pointer ${STATUS_COLOR[order.status]}`}>{ALL_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select></td><td className="px-4 py-4"><div className="flex items-center gap-2"><button onClick={onEdit} className="w-8 h-8 rounded-lg text-[#8D6527] hover:bg-[#F7F1E5] flex items-center justify-center" title="تعديل الطلب"><FilePenLine className="w-4 h-4" /></button><button onClick={onDelete} className="w-8 h-8 rounded-lg text-red-700 hover:bg-red-50 flex items-center justify-center" title="حذف الطلب"><Trash2 className="w-4 h-4" /></button></div></td></tr>
}

function OrderCard({ order, onUpdateStatus, onEdit, onDelete }: { order: Order; onUpdateStatus: Props['onUpdateStatus']; onEdit: () => void; onDelete: () => void }) {
  const cleanPhone = (order.phone || '').replace(/[^\d+]/g, '')
  return <article className="bg-white rounded-2xl border border-[#EADBCE] shadow-xs p-4 sm:p-5 flex flex-col gap-4 hover:border-[#DFB76C] transition-colors">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[11px] text-[#968B7E] m-0" dir="ltr">#{order.id.slice(0, 8)}</p><h3 className="font-serif text-lg font-bold text-[#221811] m-0 mt-1">{order.customer}</h3><p className="text-[11px] text-[#685D52] m-0 mt-1 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-[#8D6527]" />{formatDate(order.createdAt)}</p></div>
      <strong className="text-lg text-[#8D6527] whitespace-nowrap">{order.total} <small className="text-xs font-normal">ش</small></strong>
    </div>
    <div className="rounded-xl bg-[#FAF7F2] border border-[#EADBCE] px-3 py-2.5 text-xs text-[#221811] leading-6">{order.items.map(item => item.productName).join('، ') || '—'}<span className="block text-[11px] text-[#968B7E]">{order.itemsCount} قطع</span></div>
    {order.notes && <p className="text-xs text-[#8D6527] bg-amber-50/70 border border-amber-100 rounded-xl p-2.5 m-0 line-clamp-3">{order.notes}</p>}
    <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#EADBCE]">
      {order.phone ? <div className="flex items-center gap-1.5 text-xs text-[#685D52]" dir="ltr"><Phone className="w-3.5 h-3.5 text-[#8D6527]" />{order.phone}{cleanPhone && <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700"><MessageCircle className="w-4 h-4" /></a>}</div> : <span />}
      <select value={order.status} onChange={event => onUpdateStatus(order.id, event.target.value as OrderStatus)} className={`border rounded-xl px-2 py-1.5 text-[11px] font-bold outline-none cursor-pointer ${STATUS_COLOR[order.status]}`}>{ALL_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select>
    </div>
    <div className="flex justify-end gap-2"><button onClick={onEdit} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8D6527] hover:bg-[#F7F1E5] rounded-lg px-2.5 py-2"><FilePenLine className="w-3.5 h-3.5" />تعديل</button><button onClick={onDelete} className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:bg-red-50 rounded-lg px-2.5 py-2"><Trash2 className="w-3.5 h-3.5" />حذف</button></div>
  </article>
}

function DateFilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${active ? 'bg-[#8D6527] text-white' : 'border border-[#EADBCE] text-[#685D52] hover:border-[#C59B4B]'}`}>{children}</button> }

function OrderEditor({ order, onClose, onSave }: { order: Order; onClose: () => void; onSave: (order: Order) => Promise<void> }) {
  const [draft, setDraft] = useState(order); const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); if (!draft.customer.trim() || draft.total < 0) return; setSaving(true); try { await onSave({ ...draft, customer: draft.customer.trim(), phone: draft.phone?.trim(), notes: draft.notes?.trim(), total: Number(draft.total) || 0 }) } finally { setSaving(false) } }
  const inputClass = 'w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527]'
  return <Modal onClose={onClose} size="lg"><form onSubmit={submit} className="p-6 sm:p-8"><div className="flex items-start justify-between gap-4 border-b border-[#EADBCE] pb-4"><div><h2 className="font-serif text-2xl text-[#221811] m-0">تعديل الطلب</h2><p className="text-xs text-[#685D52] m-0 mt-1" dir="ltr">#{order.id}</p></div><button type="button" onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-[#FAF7F2] text-[#685D52] flex items-center justify-center"><X className="w-5 h-5" /></button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6"><Field label="اسم العميلة"><input required value={draft.customer} onChange={event => setDraft(current => ({ ...current, customer: event.target.value }))} className={inputClass} /></Field><Field label="رقم الهاتف"><input value={draft.phone ?? ''} dir="ltr" onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))} className={`${inputClass} text-left`} /></Field><Field label="إجمالي الطلب (شيكل)"><input required min="0" type="number" value={draft.total} onChange={event => setDraft(current => ({ ...current, total: Number(event.target.value) }))} className={inputClass} /></Field><Field label="حالة الطلب"><select value={draft.status} onChange={event => setDraft(current => ({ ...current, status: event.target.value as OrderStatus }))} className={inputClass}>{ALL_STATUSES.map(status => <option key={status}>{status}</option>)}</select></Field><div className="sm:col-span-2"><Field label="المنتجات المسجلة"><div className="bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-3 text-xs text-[#685D52]">{order.items.map(item => item.productName).join('، ') || 'لا توجد منتجات مسجلة'}</div></Field></div><div className="sm:col-span-2"><Field label="الملاحظات"><textarea rows={4} value={draft.notes ?? ''} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} className={`${inputClass} resize-y`} /></Field></div></div><div className="flex justify-end gap-2 pt-5 mt-6 border-t border-[#EADBCE]"><button type="button" onClick={onClose} className="px-5 py-3 rounded-xl text-xs font-bold text-[#685D52] hover:bg-[#FAF7F2]">إلغاء</button><button disabled={saving} className="px-5 py-3 rounded-xl text-xs font-bold text-white bg-[#8D6527] hover:bg-[#704F1E] disabled:opacity-60">{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</button></div></form></Modal>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-[#221811]">{label}<span className="block mt-1.5">{children}</span></label> }
