import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  FileText,
  ImageDown,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import type { Invoice, InvoiceDraft, InvoiceSignature, InvoiceType, Product, SiteSettings } from '../../types'
import Modal from '../ui/Modal'
import InvoiceEditor from './InvoiceEditor'
import {
  buildInvoiceShareText,
  buildManualInvoiceHtml,
  calculateInvoiceTotals,
  createManualInvoiceImage,
  downloadManualInvoiceImage,
  formatMoney,
  invoiceDateLabel,
  invoiceTypeLabel,
  invoiceWhatsAppLink,
  printManualInvoice,
} from '../../utils/manualInvoice'

interface Props {
  invoices: Invoice[]
  products: Product[]
  settings: SiteSettings
  onAdd: (draft: InvoiceDraft) => Promise<Invoice>
  onUpdate: (invoice: Invoice) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onPersistSignature?: (signature: InvoiceSignature) => Promise<void>
  notify: (msg: string, type?: 'success' | 'error') => void
}

type TypeFilter = 'all' | InvoiceType

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminInvoices({ invoices, products, settings, onAdd, onUpdate, onDelete, onPersistSignature, notify }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imageSavingId, setImageSavingId] = useState<string | null>(null)

  const totals = useMemo(() => {
    const sales = invoices.filter(invoice => invoice.type === 'sale')
    const purchases = invoices.filter(invoice => invoice.type === 'purchase')
    return {
      salesCount: sales.length,
      purchasesCount: purchases.length,
      salesTotal: sales.reduce((sum, invoice) => sum + calculateInvoiceTotals(invoice).total, 0),
      purchasesTotal: purchases.reduce((sum, invoice) => sum + calculateInvoiceTotals(invoice).total, 0),
    }
  }, [invoices])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const digits = search.replace(/\D/g, '')
    return invoices.filter(invoice => {
      if (typeFilter !== 'all' && invoice.type !== typeFilter) return false
      if (!term) return true
      const inText = [
        invoice.invoiceNumber,
        invoice.customerName,
        invoice.deliveryAddress,
        invoice.notes || '',
      ].some(value => value.toLowerCase().includes(term))
      const inPhone = digits ? invoice.customerPhone.replace(/\D/g, '').includes(digits) : false
      return inText || inPhone
    })
  }, [invoices, search, typeFilter])

  function openNew() {
    setEditingInvoice(null)
    setEditorOpen(true)
  }

  function openEdit(invoice: Invoice) {
    setViewingInvoice(null)
    setEditingInvoice(invoice)
    setEditorOpen(true)
  }

  async function handleSave(draft: InvoiceDraft) {
    setSaving(true)
    try {
      if (editingInvoice) {
        await onUpdate({ ...draft, id: editingInvoice.id })
        notify(`تم تحديث ${draft.invoiceNumber} بنجاح`)
      } else {
        await onAdd(draft)
        notify(`تم إنشاء ${draft.invoiceNumber} وحفظها بنجاح`)
      }
      setEditorOpen(false)
      setEditingInvoice(null)
    } catch (err) {
      console.error('Save invoice error:', err)
      notify('تعذر حفظ الفاتورة. تحققي من الاتصال والصلاحيات.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingInvoice) return
    setDeleting(true)
    try {
      await onDelete(deletingInvoice.id)
      notify(`تم حذف ${deletingInvoice.invoiceNumber}`)
      setDeletingInvoice(null)
      if (viewingInvoice?.id === deletingInvoice.id) setViewingInvoice(null)
    } catch (err) {
      console.error('Delete invoice error:', err)
      notify('تعذر حذف الفاتورة', 'error')
    } finally {
      setDeleting(false)
    }
  }

  function shareInvoice(invoice: Invoice) {
    const link = invoiceWhatsAppLink(invoice)
    if (!link) {
      notify('لا يوجد رقم واتساب صالح لهذه الفاتورة', 'error')
      return
    }
    const text = buildInvoiceShareText(invoice, settings)
    window.open(`${link}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  async function saveAsImage(invoice: Invoice) {
    if (imageSavingId) return
    setImageSavingId(invoice.id)
    try {
      const blob = await createManualInvoiceImage(invoice, settings)
      downloadManualInvoiceImage(blob, invoice)
      notify(`تم حفظ ${invoice.invoiceNumber} كصورة عالية الدقة، جاهزة للإرسال على واتساب`)
    } catch (err) {
      console.error('Invoice image error:', err)
      notify('تعذر إنشاء صورة الفاتورة. حاولي مرة أخرى.', 'error')
    } finally {
      setImageSavingId(null)
    }
  }

  const FILTERS: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'sale', label: 'فواتير بيع' },
    { id: 'purchase', label: 'فواتير شراء' },
  ]

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">
              <ReceiptText className="w-3.5 h-3.5 text-[#C59B4B]" />
              الفواتير
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
              فواتير الهدى
            </h1>
            <p className="text-xs text-[#685D52] m-0 mt-1.5 leading-relaxed max-w-xl">
              أنشئي فواتير بيع أو شراء، اختاري الأصناف من المتجر، وأضيفي خصومات على الصنف أو الفاتورة كاملة، مع توقيعك الخاص.
            </p>
          </div>
          <button
            onClick={openNew}
            className="shrink-0 rounded-xl bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-5 py-3 flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إنشاء فاتورة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-[#EADBCE] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#685D52]">إجمالي الفواتير</span>
            <span className="w-8 h-8 rounded-xl bg-[#FAF7F2] text-[#8D6527] flex items-center justify-center"><FileText className="w-4 h-4" /></span>
          </div>
          <strong className="text-2xl font-serif text-[#221811]" style={{ fontFamily: 'Amiri, serif' }}>{invoices.length}</strong>
          <span className="text-[10px] text-[#968B7E] font-semibold mr-1">فاتورة</span>
        </div>
        <div className="bg-white rounded-2xl border border-[#EADBCE] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#685D52]">فواتير البيع</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></span>
          </div>
          <strong className="text-xl font-bold text-emerald-800">{formatMoney(totals.salesTotal)}</strong>
          <span className="text-[10px] text-[#968B7E] font-semibold block">{totals.salesCount} فاتورة</span>
        </div>
        <div className="bg-white rounded-2xl border border-[#EADBCE] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#685D52]">فواتير الشراء</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center"><TrendingDown className="w-4 h-4" /></span>
          </div>
          <strong className="text-xl font-bold text-amber-800">{formatMoney(totals.purchasesTotal)}</strong>
          <span className="text-[10px] text-[#968B7E] font-semibold block">{totals.purchasesCount} فاتورة</span>
        </div>
        <div className="bg-white rounded-2xl border border-[#EADBCE] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#685D52]">أصناف المتجر</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center"><ShoppingCart className="w-4 h-4" /></span>
          </div>
          <strong className="text-2xl font-serif text-[#221811]" style={{ fontFamily: 'Amiri, serif' }}>{products.length}</strong>
          <span className="text-[10px] text-[#968B7E] font-semibold mr-1">صنف متاح</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-[#EADBCE] p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] focus-within:border-[#8D6527] rounded-xl px-3 py-2.5 flex-1 transition-colors">
          <Search className="w-4 h-4 text-[#8D6527] shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحثي بالاسم، رقم الفاتورة، أو رقم الواتساب..."
            className="bg-transparent border-0 outline-none text-xs text-[#221811] placeholder-[#B4A898] flex-1"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#968B7E] hover:text-[#221811] cursor-pointer" aria-label="مسح البحث">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl p-1">
          {FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setTypeFilter(filter.id)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                typeFilter === filter.id ? 'bg-[#8D6527] text-white shadow-xs' : 'text-[#685D52] hover:text-[#221811]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-[#EADBCE] flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
              سجل الفواتير
            </h2>
            <p className="text-[11px] text-[#685D52] m-0 mt-0.5">{filtered.length} فاتورة معروضة من أصل {invoices.length}</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="p-10 sm:p-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2] text-[#8D6527] flex items-center justify-center mx-auto mb-3">
              <ReceiptText className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="font-serif text-xl text-[#221811] m-0 mb-1">لا توجد فواتير بعد</h3>
            <p className="text-xs text-[#685D52] m-0 mb-5">ابدئي بإنشاء أول فاتورة بيع أو شراء لزبون من المتجر.</p>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-5 py-2.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إنشاء فاتورة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#685D52]">لا توجد نتائج مطابقة للبحث أو الفلتر الحالي.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF7F2] text-[#685D52] font-bold border-b border-[#EADBCE]">
                  <tr>
                    <th className="p-4">الفاتورة</th>
                    <th className="p-4">الزبون</th>
                    <th className="p-4">واتساب</th>
                    <th className="p-4">الأصناف</th>
                    <th className="p-4">الإجمالي</th>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {filtered.map(invoice => {
                    const invoiceTotals = calculateInvoiceTotals(invoice)
                    return (
                      <tr key={invoice.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                        <td className="p-4">
                          <span className="block font-bold text-[#221811] font-mono" dir="ltr">{invoice.invoiceNumber}</span>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${invoice.type === 'sale' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {invoiceTypeLabel(invoice.type)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="block font-bold text-[#221811]">{invoice.customerName}</span>
                          {invoice.deliveryAddress && <span className="block text-[10px] text-[#968B7E] truncate max-w-[180px]">{invoice.deliveryAddress}</span>}
                        </td>
                        <td className="p-4 text-[#685D52] font-mono" dir="ltr">{invoice.customerPhone || '—'}</td>
                        <td className="p-4 text-[#685D52]">{invoice.items.length} صنف</td>
                        <td className="p-4 font-bold text-[#8D6527]">{formatMoney(invoiceTotals.total)}</td>
                        <td className="p-4 text-[#968B7E]">{formatShortDate(invoice.createdAt)}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setViewingInvoice(invoice)} className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors cursor-pointer" title="عرض">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => printManualInvoice(invoice, settings) || notify('تعذر فتح نافذة الطباعة', 'error')} className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors cursor-pointer" title="طباعة / PDF">
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { void saveAsImage(invoice) }}
                              disabled={imageSavingId === invoice.id}
                              className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                              title="حفظ كصورة"
                            >
                              {imageSavingId === invoice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => shareInvoice(invoice)} className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-emerald-400 text-[#685D52] hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer" title="إرسال واتساب">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(invoice)} className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors cursor-pointer" title="تعديل">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeletingInvoice(invoice)} className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-red-300 hover:bg-red-50 text-[#685D52] hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer" title="حذف">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-[#FAF7F2]">
              {filtered.map(invoice => {
                const invoiceTotals = calculateInvoiceTotals(invoice)
                return (
                  <div key={invoice.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="block font-bold text-sm text-[#221811]">{invoice.customerName}</span>
                        <span className="block text-[10px] text-[#968B7E] font-mono" dir="ltr">{invoice.invoiceNumber}</span>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold ${invoice.type === 'sale' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {invoiceTypeLabel(invoice.type)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#685D52]">
                      <span dir="ltr">{invoice.customerPhone || '—'}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3 text-[#8D6527]" />{formatShortDate(invoice.createdAt)}</span>
                      <span>{invoice.items.length} صنف</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <strong className="text-[#8D6527] text-sm">{formatMoney(invoiceTotals.total)}</strong>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setViewingInvoice(invoice)} className="w-8 h-8 rounded-lg border border-[#EADBCE] text-[#685D52] flex items-center justify-center cursor-pointer" title="عرض"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => printManualInvoice(invoice, settings)} className="w-8 h-8 rounded-lg border border-[#EADBCE] text-[#685D52] flex items-center justify-center cursor-pointer" title="طباعة"><Printer className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { void saveAsImage(invoice) }} disabled={imageSavingId === invoice.id} className="w-8 h-8 rounded-lg border border-[#EADBCE] text-[#685D52] flex items-center justify-center cursor-pointer disabled:opacity-50" title="حفظ كصورة">{imageSavingId === invoice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />}</button>
                        <button onClick={() => shareInvoice(invoice)} className="w-8 h-8 rounded-lg border border-[#EADBCE] text-[#685D52] flex items-center justify-center cursor-pointer" title="واتساب"><MessageCircle className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEdit(invoice)} className="w-8 h-8 rounded-lg border border-[#EADBCE] text-[#685D52] flex items-center justify-center cursor-pointer" title="تعديل"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeletingInvoice(invoice)} className="w-8 h-8 rounded-lg border border-[#EADBCE] text-red-600 flex items-center justify-center cursor-pointer" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Editor */}
      {editorOpen && (
        <Modal onClose={() => { setEditorOpen(false); setEditingInvoice(null) }} size="2xl" structured className="p-0">
          <InvoiceEditor
            existing={editingInvoice}
            invoices={invoices}
            products={products}
            settings={settings}
            saving={saving}
            onSave={handleSave}
            onPersistSignature={onPersistSignature}
            onClose={() => { setEditorOpen(false); setEditingInvoice(null) }}
            notify={notify}
          />
        </Modal>
      )}

      {/* Preview */}
      {viewingInvoice && (
        <Modal onClose={() => setViewingInvoice(null)} size="xl" structured className="p-0">
          <div className="bg-[#FAF7F2] p-4 border-b border-[#EADBCE] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-[#8D6527]" />
              <span className="font-bold text-sm text-[#221811]">{viewingInvoice.invoiceNumber}</span>
              <span className="text-[10px] text-[#968B7E]">{invoiceDateLabel(viewingInvoice.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => shareInvoice(viewingInvoice)} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-2 flex items-center gap-1.5 transition-colors cursor-pointer">
                <MessageCircle className="w-3.5 h-3.5" />
                واتساب
              </button>
              <button onClick={() => printManualInvoice(viewingInvoice, settings)} className="rounded-lg bg-[#8D6527] hover:bg-[#704F1E] text-white text-[11px] font-bold px-3 py-2 flex items-center gap-1.5 transition-colors cursor-pointer">
                <Printer className="w-3.5 h-3.5" />
                طباعة / PDF
              </button>
              <button
                onClick={() => { void saveAsImage(viewingInvoice) }}
                disabled={imageSavingId === viewingInvoice.id}
                className="rounded-lg bg-[#24180E] hover:bg-[#3A2A18] text-[#DFB76C] text-[11px] font-bold px-3 py-2 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                {imageSavingId === viewingInvoice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />}
                حفظ كصورة
              </button>
              <button onClick={() => openEdit(viewingInvoice)} className="rounded-lg border border-[#EADBCE] bg-white text-[#685D52] hover:text-[#221811] text-[11px] font-bold px-3 py-2 flex items-center gap-1.5 transition-colors cursor-pointer">
                <Pencil className="w-3.5 h-3.5" />
                تعديل
              </button>
              <button onClick={() => setViewingInvoice(null)} className="w-8 h-8 rounded-lg border border-[#EADBCE] bg-white text-[#685D52] flex items-center justify-center cursor-pointer" title="إغلاق"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <iframe
            title={`معاينة ${viewingInvoice.invoiceNumber}`}
            srcDoc={buildManualInvoiceHtml(viewingInvoice, settings)}
            className="w-full flex-1 min-h-[60vh] bg-white"
          />
        </Modal>
      )}

      {/* Delete confirmation */}
      {deletingInvoice && (
        <Modal onClose={() => setDeletingInvoice(null)} size="sm">
          <div className="bg-white rounded-3xl border border-[#EADBCE] p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#221811] m-0 mb-2" style={{ fontFamily: 'Amiri, serif' }}>حذف الفاتورة</h3>
            <p className="text-xs text-[#685D52] mb-6 leading-relaxed">
              هل تريدين حذف الفاتورة <strong className="font-mono" dir="ltr">{deletingInvoice.invoiceNumber}</strong> للزبون <strong>{deletingInvoice.customerName}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => setDeletingInvoice(null)} disabled={deleting} className="flex-1 py-2.5 rounded-xl border border-[#EADBCE] text-xs font-semibold text-[#685D52] hover:bg-[#FAF7F2] transition-colors cursor-pointer disabled:opacity-60">إلغاء</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60">
                {deleting ? 'جارٍ الحذف...' : 'نعم، حذف'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="flex items-center justify-between text-[10px] text-[#968B7E] px-1">
        <span className="flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> تُحفظ الفواتير في قاعدة البيانات وتظهر فوراً.</span>
        <span>متجر {settings.storeName}</span>
      </div>
    </div>
  )
}
