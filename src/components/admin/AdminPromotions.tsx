import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import {
  Plus,
  Trash2,
  Sparkles,
  Upload,
  Link as LinkIcon,
  Package,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  X,
  Edit3,
  Check,
  Search,
  Eye,
  Power,
} from 'lucide-react'
import type { Promotion, Product, FirebaseUser } from '../../types'
import { uploadProductImage } from '../../firebase'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'

interface Props {
  promotions: Promotion[]
  products: Product[]
  user?: FirebaseUser | null
  onAdd: (p: Omit<Promotion, 'id'>) => Promise<void>
  onUpdate?: (id: string, patch: Partial<Promotion>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  notify: (msg: string, type?: 'success' | 'error') => void
}

type PromoMode = 'existing_product' | 'custom'

const EMPTY_FORM = {
  title: '',
  description: '',
  imageUrl: '',
  targetLink: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  isActive: true,
}

export default function AdminPromotions({
  promotions,
  products,
  user,
  onAdd,
  onUpdate,
  onDelete,
  notify,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Promotion mode: existing product vs custom promo
  const [mode, setMode] = useState<PromoMode>('existing_product')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [productSearch, setProductSearch] = useState('')

  // Draft state
  const [draft, setDraft] = useState(EMPTY_FORM)

  // Pending file upload
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Custom Confirm Dialog for Delete
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Deduplicate promotions by id
  const uniquePromotions = Array.from(
    new Map(promotions.map(p => [p.id, p])).values()
  )

  function openCreateModal() {
    setEditingPromotion(null)
    setMode('existing_product')
    setSelectedProductId('')
    setProductSearch('')
    setDraft({
      ...EMPTY_FORM,
      startDate: new Date().toISOString().slice(0, 10),
    })
    setPendingFile(null)
    setImagePreview('')
    setShowForm(true)
  }

  function openEditModal(p: Promotion) {
    setEditingPromotion(p)
    setDraft({
      title: p.title,
      description: p.description || '',
      imageUrl: p.imageUrl,
      targetLink: p.targetLink || '',
      startDate: p.startDate,
      endDate: p.endDate,
      isActive: p.isActive !== false,
    })
    setImagePreview(p.imageUrl)
    setPendingFile(null)
    setMode('custom')
    setSelectedProductId('')
    setShowForm(true)
  }

  function handleProductSelect(prod: Product) {
    setSelectedProductId(prod.id)
    const primaryImg = prod.images[0]?.url || ''
    setDraft(prev => ({
      ...prev,
      title: prod.name,
      description: prod.description || `عرض خاص على ${prod.name}`,
      imageUrl: primaryImg,
      targetLink: `/products?q=${encodeURIComponent(prod.name)}`,
    }))
    setImagePreview(primaryImg)
    setPendingFile(null)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify('يرجى اختيار ملف صورة صالح (JPEG, PNG, WebP).', 'error')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      notify('حجم الصورة كبير جداً. الحد الأقصى هو 8 ميغابايت.', 'error')
      return
    }
    setPendingFile(file)
    const preview = URL.createObjectURL(file)
    setImagePreview(preview)
    e.target.value = ''
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!draft.title.trim()) {
      notify('يرجى كتابة عنوان الترويج أو اختيار منتج.', 'error')
      return
    }

    if (!imagePreview && !draft.imageUrl) {
      notify('يرجى رفع صورة للترويج أو وضع رابط صورة.', 'error')
      return
    }

    if (!draft.startDate || !draft.endDate) {
      notify('يرجى تحديد فترة سريان الترويج (تاريخ البداية والنهاية).', 'error')
      return
    }

    if (new Date(draft.endDate) < new Date(draft.startDate)) {
      notify('تاريخ النهاية يجب أن يكون بعد أو مساوياً لتاريخ البداية.', 'error')
      return
    }

    setSubmitting(true)
    let finalImageUrl = draft.imageUrl

    try {
      // If there's a pending file, upload it first
      if (pendingFile) {
        if (!user?.idToken) {
          notify('يتطلب رفع الصور تسجيل الدخول كمسؤول — يرجى تسجيل الدخول مجدداً.', 'error')
          setSubmitting(false)
          return
        }
        setUploadingImage(true)
        try {
          finalImageUrl = await uploadProductImage(pendingFile, user.idToken)
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr)
          notify('تعذر رفع الصورة. تحققي من الاتصال أو استخدمي رابط مباشر.', 'error')
          setSubmitting(false)
          setUploadingImage(false)
          return
        }
        setUploadingImage(false)
      }

      if (editingPromotion && onUpdate) {
        await onUpdate(editingPromotion.id, {
          title: draft.title.trim(),
          description: draft.description.trim() || undefined,
          imageUrl: finalImageUrl,
          targetLink: draft.targetLink.trim() || undefined,
          startDate: draft.startDate,
          endDate: draft.endDate,
          isActive: draft.isActive,
        })
        notify(`تم تحديث الترويج «${draft.title.trim()}» بنجاح ✨`)
      } else {
        await onAdd({
          title: draft.title.trim(),
          description: draft.description.trim() || undefined,
          imageUrl: finalImageUrl,
          targetLink: draft.targetLink.trim() || undefined,
          startDate: draft.startDate,
          endDate: draft.endDate,
          isActive: draft.isActive,
        })
        notify('تمت إضافة الترويج بنجاح! سيظهر الآن في المتجر 🎉')
      }

      setShowForm(false)
      setEditingPromotion(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
      setUploadingImage(false)
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await onDelete(confirmDelete.id)
      notify(`تم حذف الترويج «${confirmDelete.title}» بنجاح.`)
      setConfirmDelete(null)
    } catch (err) {
      console.error(err)
      notify('تعذر حذف الترويج.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggleStatus(p: Promotion) {
    if (!onUpdate) return
    try {
      const nextStatus = !p.isActive
      await onUpdate(p.id, { isActive: nextStatus })
      notify(nextStatus ? `تم تفعيل الترويج «${p.title}»` : `تم تعطيل الترويج «${p.title}»`)
    } catch (err) {
      console.error(err)
    }
  }

  const now = new Date()

  // Filter products for the selector
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.categoryName && p.categoryName.toLowerCase().includes(productSearch.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EADBCE]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#8D6527]/10 text-[#8D6527] flex items-center justify-center shrink-0 border border-[#8D6527]/20 shadow-xs">
            <Sparkles className="w-5 h-5 text-[#8D6527]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                إدارة الترويج والبنرات الإعلانية
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#8D6527]/10 text-[#8D6527] border border-[#8D6527]/20">
                {uniquePromotions.length} إعلان
              </span>
            </div>
            <p className="text-xs text-[#685D52] m-0 mt-0.5">
              أنشئي عروضاً ترويجية لمنتجاتكِ الحالية أو حملات تسويقية خاصة تظهر بشكل بارز في واجهة المتجر مع إمكانية التعديل الشامل.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8D6527] to-[#704F1E] hover:from-[#A77933] hover:to-[#8D6527] active:scale-[0.98] text-white text-xs font-bold px-5 py-2.5 shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة ترويج جديد</span>
        </button>
      </div>

      {/* Promotions Cards Grid */}
      {uniquePromotions.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-[#EADBCE] bg-[#FAF7F2]/60">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#EADBCE] text-[#C59B4B] flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#221811] mb-1">لا توجد بنرات ترويجية حالياً</h4>
          <p className="text-xs text-[#685D52] max-w-sm mx-auto mb-4">
            أضيفي إعلانات لمنتجاتكِ المفضلة أو عروضكِ الموسمية لتظهر مباشرة أعلى المتجر وتجذب الزبائن.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-5 py-2.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول ترويج</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {uniquePromotions.map(p => {
            const isExpired = new Date(p.endDate) < now
            const isUpcoming = new Date(p.startDate) > now
            const isActive = p.isActive !== false && !isExpired && !isUpcoming
            const isDisabled = p.isActive === false

            return (
              <div
                key={p.id}
                className="group bg-white rounded-3xl border border-[#EADBCE] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
              >
                {/* Image */}
                <div className="relative h-44 w-full bg-[#FAF7F2] overflow-hidden">
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    {isDisabled ? (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(p)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-black/60 text-stone-200 backdrop-blur-md hover:bg-black/80 transition-colors"
                        title="معطّل — اضغطي للتفعيل"
                      >
                        معطّل مؤقتاً
                      </button>
                    ) : isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/90 text-white backdrop-blur-md shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        معروض في المتجر
                      </span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-black/60 text-white/90 backdrop-blur-md">
                        منتهي
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/90 text-white backdrop-blur-md">
                        يبدأ قريباً
                      </span>
                    )}
                  </div>

                  {/* Target link preview */}
                  {p.targetLink && (
                    <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-white/90 text-[11px]">
                      <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg">
                        <ExternalLink className="w-3 h-3" />
                        رابط الوجهة
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h4
                      className="font-serif text-base font-bold text-[#221811] m-0 line-clamp-1"
                      style={{ fontFamily: 'Amiri, serif' }}
                    >
                      {p.title}
                    </h4>
                    {p.description && (
                      <p className="text-xs text-[#685D52] m-0 mt-1 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#968B7E] mt-3">
                      <Calendar className="w-3.5 h-3.5 text-[#8D6527]" />
                      <span>من {p.startDate} إلى {p.endDate}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-[#FAF7F2] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(p)}
                      className="text-[11px] font-semibold text-[#8D6527] hover:underline cursor-pointer"
                    >
                      {p.isActive !== false ? 'تعطيل العرض' : 'تفعيل العرض'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="w-8 h-8 rounded-xl border border-[#EADBCE] inline-flex items-center justify-center text-[#685D52] hover:text-[#8D6527] hover:border-[#8D6527] hover:bg-[#FAF7F2] transition-all cursor-pointer"
                        title="تعديل الترويج"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setConfirmDelete({ id: p.id, title: p.title })}
                        className="w-8 h-8 rounded-xl border border-[#EADBCE] inline-flex items-center justify-center text-[#968B7E] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer"
                        title="حذف الترويج"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal - Premium Add / Edit Promotion */}
      {showForm && (
        <Modal
          onClose={() => {
            if (!submitting) setShowForm(false)
          }}
          size="md"
          className="rounded-3xl overflow-hidden p-0 border border-[#EADBCE]"
        >
          <div className="bg-white max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-l from-[#FAF7F2] to-white p-6 border-b border-[#EADBCE] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#8D6527]/10 text-[#8D6527] flex items-center justify-center border border-[#8D6527]/20">
                  {editingPromotion ? <Edit3 className="w-5 h-5 text-[#8D6527]" /> : <Sparkles className="w-5 h-5 text-[#8D6527]" />}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                    {editingPromotion ? `تعديل الترويج «${editingPromotion.title}»` : 'إضافة بنر ترويجي / إعلان جديد'}
                  </h3>
                  <p className="text-xs text-[#685D52] m-0 mt-0.5">
                    {editingPromotion ? 'تعديل بيانات وصورة وفترة عرض الترويج' : 'اختاري منتجاً من متجركِ للترويج له أو أنشئي إعلاناً مخصصاً'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-xl border border-[#EADBCE] flex items-center justify-center text-[#685D52] hover:bg-[#FAF7F2] hover:text-[#221811] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Mode Switch: Only when creating new */}
              {!editingPromotion && (
                <div className="bg-[#FAF7F2] p-1.5 rounded-2xl border border-[#EADBCE] flex gap-1">
                  <button
                    type="button"
                    onClick={() => setMode('existing_product')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      mode === 'existing_product'
                        ? 'bg-[#8D6527] text-white shadow-sm'
                        : 'text-[#685D52] hover:text-[#221811] hover:bg-white/60'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>الترويج لمنتج من متجري</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('custom')
                      setSelectedProductId('')
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      mode === 'custom'
                        ? 'bg-[#8D6527] text-white shadow-sm'
                        : 'text-[#685D52] hover:text-[#221811] hover:bg-white/60'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>إعلان أو عرض ترويجي خاص</span>
                  </button>
                </div>
              )}

              {/* MODE 1: Product Selector */}
              {mode === 'existing_product' && !editingPromotion && (
                <div className="space-y-3 p-4 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/50">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-[#221811] flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[#8D6527]" />
                      <span>اختاري المنتج المراد الترويج له:</span>
                    </label>
                    {selectedProductId && (
                      <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> تم اختيار منتج
                      </span>
                    )}
                  </div>

                  {/* Search box for products */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#968B7E] absolute right-3 top-3" />
                    <input
                      type="text"
                      placeholder="ابحثي عن منتج بالاسم أو القسم..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="w-full bg-white border border-[#EADBCE] rounded-xl pr-9 pl-3.5 py-2 text-xs text-[#221811] outline-none focus:border-[#8D6527] transition-all"
                    />
                  </div>

                  {/* Products Horizontal / Grid selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {filteredProducts.map(prod => {
                      const isSelected = selectedProductId === prod.id
                      const thumb = prod.images[0]?.url || ''

                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleProductSelect(prod)}
                          className={`p-2 rounded-xl border text-right transition-all flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? 'border-[#8D6527] bg-[#8D6527]/10 ring-2 ring-[#8D6527]/30'
                              : 'border-[#EADBCE] bg-white hover:border-[#8D6527]/50'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-[#FAF7F2] overflow-hidden shrink-0 border border-[#EADBCE]">
                            {thumb ? (
                              <img src={thumb} alt={prod.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-[#968B7E] m-auto" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#221811] truncate m-0">{prod.name}</p>
                            <p className="text-[10px] text-[#8D6527] font-semibold m-0">{prod.price} ₪</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                  عنوان الترويج / البنر *
                </label>
                <input
                  required
                  placeholder="مثال: خصم 20% على شالات الحرير المطرزة"
                  value={draft.title}
                  onChange={e => setDraft({ ...draft, title: e.target.value })}
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all font-bold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                  وصف مختصر أو تفاصيل العرض (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="اكتبي نصاً تشويقياً يوضح تفاصيل العرض للزبونة..."
                  value={draft.description}
                  onChange={e => setDraft({ ...draft, description: e.target.value })}
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Image Upload / URL Section */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#221811] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#8D6527]" />
                    <span>صورة الترويج * (رفع من الجهاز أو رابط مباشر)</span>
                  </span>
                  {imagePreview && (
                    <span className="text-[11px] text-emerald-700 font-bold">جاهزة للعرض</span>
                  )}
                </label>

                {/* Upload or Drop Area */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* File Upload Box */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-[#C59B4B]/60 hover:border-[#8D6527] bg-[#FAF7F2] hover:bg-[#FAF7F2]/80 rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#EADBCE] text-[#8D6527] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                        <Upload className="w-5 h-5 text-[#8D6527]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#221811] m-0">ارفعي صورة من جهازكِ</p>
                        <p className="text-[10px] text-[#968B7E] m-0 mt-0.5">JPEG, PNG, WebP (بحد أقصى 8MB)</p>
                      </div>
                    </button>
                  </div>

                  {/* Image Preview Box */}
                  <div className="h-28 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] overflow-hidden flex items-center justify-center relative">
                    {imagePreview ? (
                      <>
                        <img
                          src={imagePreview}
                          alt="معاينة الصورة"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview('')
                            setPendingFile(null)
                            setDraft({ ...draft, imageUrl: '' })
                          }}
                          className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
                          title="إزالة الصورة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-[#968B7E] p-3">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <span className="text-[11px]">معاينة الصورة ستظهر هنا</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Image URL fallback */}
                <div className="relative pt-1">
                  <LinkIcon className="w-3.5 h-3.5 text-[#968B7E] absolute right-3.5 top-3.5" />
                  <input
                    type="url"
                    placeholder="أو الصقي رابط صورة مباشر (https://...)"
                    value={draft.imageUrl}
                    onChange={e => {
                      setDraft({ ...draft, imageUrl: e.target.value })
                      setImagePreview(e.target.value)
                      setPendingFile(null)
                    }}
                    dir="ltr"
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl pr-9 pl-3.5 py-2 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all text-left"
                  />
                </div>
              </div>

              {/* Target Link */}
              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-[#8D6527]" />
                  <span>رابط الوجهة عند النقر على البنر (اختياري)</span>
                </label>
                <input
                  placeholder="مثال: /products أو /categories أو رابط خارجي"
                  value={draft.targetLink}
                  onChange={e => setDraft({ ...draft, targetLink: e.target.value })}
                  dir="ltr"
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all text-left"
                />
              </div>

              {/* Dates and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8D6527]" />
                    <span>تاريخ بدء العرض *</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={draft.startDate}
                    onChange={e => setDraft({ ...draft, startDate: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8D6527]" />
                    <span>تاريخ انتهاء العرض *</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={draft.endDate}
                    onChange={e => setDraft({ ...draft, endDate: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                  حالة الترويج
                </label>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, isActive: !draft.isActive })}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    draft.isActive
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-stone-100 border-stone-200 text-stone-600'
                  }`}
                >
                  <span>{draft.isActive ? 'مفعّل ومعروض للزبائن' : 'معطّل ومخفي عن الزبائن'}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${draft.isActive ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[#EADBCE] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl border border-[#EADBCE] text-xs font-semibold text-[#685D52] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="px-6 py-2.5 rounded-full bg-[#8D6527] hover:bg-[#704F1E] active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {uploadingImage
                      ? 'جارٍ رفع الصورة...'
                      : submitting
                        ? 'جارٍ الحفظ...'
                        : editingPromotion
                          ? 'حفظ التعديلات'
                          : 'نشر البنر الترويجي'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Custom Confirm Dialog for Delete */}
      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title="تأكيد حذف الترويج"
        message={`هل أنتِ متأكدة من حذف الترويج «${confirmDelete?.title}» نهائياً؟ ستتم إزالته فوراً من واجهة المتجر.`}
        confirmText="نعم، احذف الترويج"
        cancelText="إلغاء وتراجع"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
