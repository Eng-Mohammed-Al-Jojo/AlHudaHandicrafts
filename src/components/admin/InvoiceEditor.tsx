import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  Eraser,
  ImagePlus,
  Loader2,
  Plus,
  ReceiptText,
  Save,
  ShoppingBag,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import type { Invoice, InvoiceDraft, InvoiceItem, InvoiceSignature, InvoiceType, Product, SiteSettings } from '../../types'
import { isValidWhatsAppNumber } from '../../utils/whatsapp'
import {
  calculateInvoiceTotals,
  formatMoney,
  invoiceLineTotal,
  invoiceTypeLabel,
  nextInvoiceNumber,
} from '../../utils/manualInvoice'
import {
  clearSavedSignature,
  loadSavedSignature,
  readSignatureImage,
  saveSignatureToStorage,
} from '../../utils/signatureStorage'
import SignaturePad from './SignaturePad'
import SelectMenu from '../ui/SelectMenu'

interface Props {
  existing?: Invoice | null
  /** Pre-filled data for a new invoice, e.g. when issuing an invoice from an order. */
  initialDraft?: InvoiceDraft | null
  /** Small explanatory line shown under the editor title. */
  contextLabel?: string
  /** Prevent changing the invoice type, e.g. for an invoice issued from a sale order. */
  lockType?: boolean
  invoices: Invoice[]
  products: Product[]
  settings: SiteSettings
  saving?: boolean
  onSave: (draft: InvoiceDraft) => Promise<void>
  onPersistSignature?: (signature: InvoiceSignature) => Promise<void>
  onClose: () => void
  notify: (msg: string, type?: 'success' | 'error') => void
}

function createItem(): InvoiceItem {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: '',
    price: 0,
    quantity: 1,
    discount: 0,
  }
}

function toDraft(invoice: Invoice): InvoiceDraft {
  const { id: _id, ...rest } = invoice
  void _id
  return normalizeDraft(rest)
}

function normalizeDraft(draft: InvoiceDraft): InvoiceDraft {
  return {
    ...draft,
    extraDiscount: Number(draft.extraDiscount) || 0,
    items: draft.items.map(item => ({
      ...item,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      discount: Number(item.discount) || 0,
    })),
    signature: draft.signature ? { ...draft.signature } : {},
  }
}

function fieldClass(extra = '') {
  return `w-full bg-[#FAF7F2] border border-[#EADBCE] focus:border-[#8D6527] focus:bg-white rounded-xl px-3 py-2.5 text-xs text-[#221811] outline-none transition-all ${extra}`
}

export default function InvoiceEditor({
  existing,
  initialDraft,
  contextLabel,
  lockType = false,
  invoices,
  products,
  settings,
  saving = false,
  onSave,
  onPersistSignature,
  onClose,
  notify,
}: Props) {
  const isEditing = Boolean(existing)
  const [draft, setDraft] = useState<InvoiceDraft>(() => {
    if (existing) return toDraft(existing)
    if (initialDraft) {
      const normalized = normalizeDraft(initialDraft)
      const savedSignature = settings.invoiceSignature
      const hasDraftSignature = Boolean(normalized.signature?.drawing || normalized.signature?.image)
      if (!hasDraftSignature && (savedSignature?.drawing || savedSignature?.image)) {
        return { ...normalized, signature: { ...savedSignature } }
      }
      return normalized
    }
    const localSignature = loadSavedSignature()
    const savedSignature = settings.invoiceSignature
    const canUseSaved = Boolean(savedSignature?.drawing || savedSignature?.image)
    return {
      invoiceNumber: nextInvoiceNumber(invoices, 'sale'),
      type: 'sale',
      customerName: '',
      customerPhone: '',
      deliveryAddress: '',
      items: [createItem()],
      extraDiscount: 0,
      notes: '',
      signature: canUseSaved ? { ...savedSignature } : localSignature,
      createdAt: new Date().toISOString(),
    }
  })
  const [errorMsg, setErrorMsg] = useState('')
  const [signatureNotice, setSignatureNotice] = useState('')
  const [uploading, setUploading] = useState(false)
  const [signatureSaving, setSignatureSaving] = useState(false)

  const totals = useMemo(() => calculateInvoiceTotals(draft), [draft])
  const signature = draft.signature ?? {}
  const hasSignature = Boolean(signature.drawing || signature.image)

  function updateDraft(patch: Partial<InvoiceDraft>) {
    setDraft(current => ({ ...current, ...patch }))
  }

  function setType(type: InvoiceType) {
    setDraft(current => ({
      ...current,
      type,
      invoiceNumber: isEditing ? current.invoiceNumber : nextInvoiceNumber(invoices, type),
    }))
  }

  function updateItem(id: string, patch: Partial<InvoiceItem>) {
    setDraft(current => ({
      ...current,
      items: current.items.map(item => item.id === id ? { ...item, ...patch } : item),
    }))
  }

  function addItem() {
    setDraft(current => ({ ...current, items: [...current.items, createItem()] }))
  }

  function addProductItem(productId: string) {
    const product = products.find(item => item.id === productId)
    if (!product) return
    setDraft(current => ({
      ...current,
      items: [
        ...current.items.filter(item => item.name.trim() || item.price > 0),
        {
          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          discount: 0,
        },
      ],
    }))
  }

  function removeItem(id: string) {
    setDraft(current => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter(item => item.id !== id) : [createItem()],
    }))
  }

  function updateSignature(patch: Partial<InvoiceSignature>) {
    setDraft(current => ({
      ...current,
      signature: { ...(current.signature ?? {}), ...patch },
    }))
    setSignatureNotice('')
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setErrorMsg('')
    try {
      const dataUrl = await readSignatureImage(file)
      updateSignature({ image: dataUrl })
      notify('تم تجهيز صورة التوقيع/الختم')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تجهيز الصورة')
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveSignature() {
    if (!hasSignature) {
      setErrorMsg('ارسمي التوقيع أو ارفعي صورة أولاً ثم احفظيه')
      return
    }
    setSignatureSaving(true)
    setErrorMsg('')
    try {
      const cleanSignature: InvoiceSignature = {
        ...(signature.drawing ? { drawing: signature.drawing } : {}),
        ...(signature.image ? { image: signature.image } : {}),
      }
      saveSignatureToStorage(cleanSignature)
      if (onPersistSignature) await onPersistSignature(cleanSignature)
      setSignatureNotice('تم حفظ التوقيع لاستخدامه في الفواتير القادمة على كل الأجهزة')
      notify('تم حفظ التوقيع بنجاح')
    } catch (err) {
      console.error('Save signature error:', err)
      setSignatureNotice('تم حفظ التوقيع على هذا الجهاز فقط؛ تعذر حفظه في قاعدة البيانات')
      setErrorMsg('تعذر حفظ التوقيع في قاعدة البيانات. تحققي من الاتصال والصلاحيات.')
    } finally {
      setSignatureSaving(false)
    }
  }

  async function handleClearSignature() {
    updateSignature({ drawing: undefined, image: undefined })
    clearSavedSignature()
    if (onPersistSignature) {
      try {
        await onPersistSignature({})
      } catch (err) {
        console.error('Clear saved signature error:', err)
      }
    }
    setSignatureNotice('تم مسح التوقيع المحفوظ')
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrorMsg('')

    const customerName = draft.customerName.trim()
    if (customerName.length < 2) {
      setErrorMsg('الرجاء إدخال اسم الزبون')
      return
    }

    if (!isValidWhatsAppNumber(draft.customerPhone)) {
      setErrorMsg('الرجاء إدخال رقم واتساب صحيح للزبون')
      return
    }

    const items = draft.items
      .map(item => ({
        ...item,
        name: item.name.trim(),
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
        discount: Number(item.discount) || 0,
      }))
      .filter(item => item.name)

    if (items.length === 0) {
      setErrorMsg('أضيفي صنفاً واحداً على الأقل إلى الفاتورة')
      return
    }

    if (items.some(item => item.quantity <= 0)) {
      setErrorMsg('كمية كل صنف يجب أن تكون أكبر من صفر')
      return
    }

    if (items.some(item => item.price < 0 || item.discount < 0)) {
      setErrorMsg('الأسعار والخصومات لا يمكن أن تكون سالبة')
      return
    }

    const previewTotals = calculateInvoiceTotals({ items, extraDiscount: Number(draft.extraDiscount) || 0 })
    if ((Number(draft.extraDiscount) || 0) > previewTotals.subtotal - previewTotals.itemsDiscount) {
      setErrorMsg('الخصم الإضافي أكبر من قيمة الفاتورة')
      return
    }

    const cleanSignature = hasSignature
      ? {
        ...(signature.drawing ? { drawing: signature.drawing } : {}),
        ...(signature.image ? { image: signature.image } : {}),
      }
      : undefined

    const payload: InvoiceDraft = {
      invoiceNumber: draft.invoiceNumber,
      type: draft.type,
      ...(draft.orderId ? { orderId: draft.orderId } : {}),
      customerName,
      customerPhone: draft.customerPhone.trim(),
      deliveryAddress: draft.deliveryAddress.trim(),
      items,
      extraDiscount: Number(draft.extraDiscount) || 0,
      notes: draft.notes?.trim() || '',
      ...(cleanSignature ? { signature: cleanSignature } : {}),
      createdAt: draft.createdAt || new Date().toISOString(),
    }

    await onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      <div className="p-4 sm:p-6 border-b border-[#EADBCE] bg-[#FAF7F2] flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#8D6527] text-white flex items-center justify-center shrink-0 shadow-sm">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif text-lg sm:text-2xl font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
              {isEditing ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة'}
            </h3>
            <p className="text-[11px] text-[#685D52] m-0 mt-0.5">
              {draft.invoiceNumber} · {invoiceTypeLabel(draft.type)}
            </p>
            {contextLabel && <p className="text-[10px] text-[#8D6527] font-semibold m-0 mt-1">{contextLabel}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-xl border border-[#EADBCE] bg-white flex items-center justify-center text-[#685D52] hover:text-[#221811] hover:border-[#8D6527] transition-colors cursor-pointer shrink-0"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Invoice type */}
        <section>
          <p className="text-[11px] font-bold text-[#685D52] mb-2">نوع الفاتورة</p>
          {lockType ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#8D6527] bg-[#8D6527] text-white px-4 py-3 text-xs font-bold shadow-sm">
              <ShoppingBag className="w-4 h-4" />
              فاتورة بيع مرتبطة بالطلب
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {(['sale', 'purchase'] as InvoiceType[]).map(type => {
                const active = draft.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setType(type)}
                    className={`rounded-xl border px-4 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      active
                        ? 'bg-[#8D6527] border-[#8D6527] text-white shadow-sm'
                        : 'bg-white border-[#EADBCE] text-[#685D52] hover:border-[#8D6527]'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {invoiceTypeLabel(type)}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Customer */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-[#685D52]">بيانات الزبون</p>
            <span className="text-[10px] text-[#968B7E]">سيُضاف تلقائياً إلى صفحة الزبائن</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#968B7E] mb-1">اسم الزبون *</label>
              <input
                value={draft.customerName}
                onChange={e => updateDraft({ customerName: e.target.value })}
                placeholder="مثال: أم محمد"
                className={fieldClass()}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#968B7E] mb-1">رقم التواصل واتساب *</label>
              <input
                value={draft.customerPhone}
                onChange={e => updateDraft({ customerPhone: e.target.value })}
                placeholder="0599 123 456"
                dir="ltr"
                inputMode="tel"
                className={fieldClass('text-right')}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#968B7E] mb-1">مكان التوصيل</label>
              <input
                value={draft.deliveryAddress}
                onChange={e => updateDraft({ deliveryAddress: e.target.value })}
                placeholder="المدينة، الحي، عنوان مختصر"
                className={fieldClass()}
              />
            </div>
          </div>
        </section>

        {/* Items */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-[11px] font-bold text-[#685D52]">الأصناف والأسعار</p>
            <div className="flex flex-wrap items-center gap-2">
              <SelectMenu
                value=""
                options={products.map(product => ({
                  value: product.id,
                  label: product.name,
                  description: formatMoney(product.price),
                }))}
                onChange={productId => addProductItem(productId)}
                placeholder="+ اختيار صنف من المتجر"
                variant="admin"
                className="max-w-[220px]"
                triggerClassName="bg-[#FAF7F2] border border-[#EADBCE] hover:border-[#C59B4B] focus-visible:border-[#8D6527] rounded-xl px-3 py-2 text-[11px] text-[#221811]"
                menuMinWidth={260}
                ariaLabel="اختيار صنف من المتجر"
              />
              <button
                type="button"
                onClick={addItem}
                className="rounded-xl border border-[#EADBCE] bg-white hover:border-[#8D6527] text-[#8D6527] text-[11px] font-bold px-3 py-2 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                صنف يدوي
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#EADBCE] overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-2 bg-[#FAF7F2] border-b border-[#EADBCE] px-3 py-2 text-[10px] font-bold text-[#968B7E]">
              <span className="col-span-4">الصنف</span>
              <span className="col-span-1 text-center">الكمية</span>
              <span className="col-span-2 text-center">السعر</span>
              <span className="col-span-2 text-center">خصم الصنف</span>
              <span className="col-span-2 text-center">الإجمالي</span>
              <span className="col-span-1" />
            </div>

            <div className="divide-y divide-[#F1E8DD]">
              {draft.items.map(item => {
                const lineTotal = invoiceLineTotal(item)
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end sm:items-center px-3 py-3 bg-white">
                    <div className="col-span-12 sm:col-span-4">
                      <label className="sm:hidden block text-[10px] font-semibold text-[#968B7E] mb-1">الصنف</label>
                      <input
                        value={item.name}
                        onChange={e => updateItem(item.id, { name: e.target.value })}
                        placeholder="اسم الصنف"
                        className={fieldClass()}
                      />
                      {item.productId && <span className="text-[9px] text-[#8D6527] font-semibold">مرتبط بصنف المتجر</span>}
                    </div>
                    <div className="col-span-3 sm:col-span-1">
                      <label className="sm:hidden block text-[10px] font-semibold text-[#968B7E] mb-1">الكمية</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })}
                        className={fieldClass('text-center px-1')}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <label className="sm:hidden block text-[10px] font-semibold text-[#968B7E] mb-1">السعر (₪)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={item.price}
                        onChange={e => updateItem(item.id, { price: Number(e.target.value) })}
                        className={fieldClass('text-center px-1')}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <label className="sm:hidden block text-[10px] font-semibold text-[#968B7E] mb-1">خصم (₪)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={item.discount}
                        onChange={e => updateItem(item.id, { discount: Number(e.target.value) })}
                        className={fieldClass('text-center px-1 text-red-700')}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-2 text-left sm:text-center font-bold text-xs text-[#8D6527] pb-2.5 sm:pb-0">
                      {formatMoney(lineTotal)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="col-span-1 w-8 h-8 mx-auto rounded-lg border border-[#EADBCE] hover:border-red-300 hover:bg-red-50 text-[#968B7E] hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="حذف الصنف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Totals + notes */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#968B7E] mb-1">ملاحظات على الفاتورة</label>
              <textarea
                value={draft.notes}
                onChange={e => updateDraft({ notes: e.target.value })}
                rows={3}
                placeholder="تفاصيل التطريز، موعد التسليم، أي ملاحظات أخرى..."
                className={fieldClass('resize-none leading-relaxed')}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#968B7E] mb-1">خصم إضافي على كامل الفاتورة (₪)</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={draft.extraDiscount}
                onChange={e => updateDraft({ extraDiscount: Number(e.target.value) })}
                className={fieldClass('border-red-100 focus:border-red-400')}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] p-4 space-y-2 self-start">
            <div className="flex justify-between text-xs text-[#685D52]"><span>المجموع</span><span>{formatMoney(totals.subtotal)}</span></div>
            <div className="flex justify-between text-xs text-[#B91C1C]"><span>خصم الأصناف</span><span>− {formatMoney(totals.itemsDiscount)}</span></div>
            <div className="flex justify-between text-xs text-[#B91C1C]"><span>خصم إضافي</span><span>− {formatMoney(totals.extraDiscount)}</span></div>
            <div className="flex justify-between items-center border-t-2 border-[#C59B4B] pt-2 mt-1">
              <span className="text-sm font-bold text-[#221811]">الإجمالي النهائي</span>
              <span className="text-xl font-bold text-[#8D6527]">{formatMoney(totals.total)}</span>
            </div>
            <p className="text-[10px] text-[#968B7E] m-0 pt-1">{totals.itemsCount} قطعة · {draft.items.filter(item => item.name.trim()).length} صنف</p>
          </div>
        </section>

        {/* Signature */}
        <section className="rounded-2xl border border-[#EADBCE] bg-[#FFFCF8] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-[11px] font-bold text-[#685D52] m-0 flex items-center gap-1.5">
                <ReceiptText className="w-3.5 h-3.5 text-[#8D6527]" />
                التوقيع والاعتماد
              </p>
              <p className="text-[10px] text-[#968B7E] m-0 mt-1">ارسمي توقيعك باليد أو ارفعي صورة، ويمكنك استخدام الاثنين معاً. يُحفظ التوقيع لإعادة استخدامه.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { void handleSaveSignature() }}
                disabled={signatureSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#EADBCE] hover:border-[#8D6527] text-[#8D6527] text-[10px] font-bold px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                {signatureSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                حفظ كتوقيع افتراضي
              </button>
              <button
                type="button"
                onClick={() => { void handleClearSignature() }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#EADBCE] hover:border-red-300 hover:text-red-600 text-[#685D52] text-[10px] font-bold px-3 py-1.5 transition-colors cursor-pointer"
              >
                <Eraser className="w-3 h-3" />
                مسح
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-[#968B7E] mb-1.5">التوقيع بخط اليد</p>
              <SignaturePad
                value={signature.drawing}
                onChange={value => updateSignature({ drawing: value || undefined })}
              />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#968B7E] mb-1.5">رفع صورة توقيع أو ختم</p>
              <label className="flex flex-col items-center justify-center gap-2 h-36 rounded-2xl border border-dashed border-[#D9C7B2] bg-white cursor-pointer hover:border-[#8D6527] transition-colors overflow-hidden">
                {signature.image ? (
                  <img src={signature.image} alt="التوقيع المرفوع" className="max-h-28 max-w-full object-contain" />
                ) : (
                  <>
                    {uploading ? <Loader2 className="w-6 h-6 text-[#8D6527] animate-spin" /> : <Upload className="w-6 h-6 text-[#8D6527]" />}
                    <span className="text-[10px] text-[#968B7E]">اضغطي لاختيار صورة (PNG / JPG)</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={e => {
                    void handleUpload(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </label>
              {signature.image && (
                <button
                  type="button"
                  onClick={() => updateSignature({ image: undefined })}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] text-red-600 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  إزالة الصورة
                </button>
              )}
              {!signature.image && (
                <p className="text-[10px] text-[#968B7E] mt-2 flex items-center gap-1">
                  <ImagePlus className="w-3 h-3" />
                  يُفضل صورة بخلفية بيضاء أو شفافة.
                </p>
              )}
            </div>
          </div>

          {signatureNotice && (
            <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 mt-3 m-0 flex items-center gap-1.5">
              <Check className="w-3 h-3" />
              {signatureNotice}
            </p>
          )}
        </section>

        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 border-t border-[#EADBCE] bg-[#FAF7F2] flex items-center justify-between gap-3 shrink-0">
        <div className="text-xs text-[#685D52] hidden sm:block">
          الإجمالي: <strong className="text-[#8D6527]">{formatMoney(totals.total)}</strong>
          <span className="text-[10px] text-[#968B7E]"> · {settings.storeName}</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none rounded-xl border border-[#EADBCE] bg-white text-[#685D52] hover:text-[#221811] text-xs font-semibold px-5 py-2.5 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-none rounded-xl bg-[#8D6527] hover:bg-[#704F1E] disabled:opacity-60 text-white text-xs font-bold px-6 py-2.5 shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditing ? 'حفظ التعديلات' : 'حفظ الفاتورة'}
          </button>
        </div>
      </div>
    </form>
  )
}
