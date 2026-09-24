import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { Plus, Edit3, Trash2, Layers, Sparkles, X, AlertCircle, Upload, Link as LinkIcon, Image as ImageIcon, Loader2 } from 'lucide-react'
import type { Category, FirebaseUser, Product } from '../../types'
import { uploadCategoryImage } from '../../firebase'
import Modal from '../ui/Modal'

interface Props {
  categories: Category[]
  products: Product[]
  user?: FirebaseUser
  onAdd: (c: Category) => Promise<void>
  onUpdate: (c: Category) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onMoveAndDelete: (sourceId: string, targetId: string) => Promise<void>
  notify: (msg: string, type?: 'success' | 'error') => void
}

const EMPTY_CAT: Omit<Category, 'id'> = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  isVisible: true,
  order: 1,
}

export default function AdminCategories({ categories, products, user, onAdd, onUpdate, onDelete, onMoveAndDelete, notify }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [draft, setDraft] = useState(EMPTY_CAT)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [moveTargetId, setMoveTargetId] = useState('')

  // Image Upload States
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function openNew() {
    setEditing(null)
    setDraft({ ...EMPTY_CAT, order: categories.length + 1 })
    setPendingImageFile(null)
    setPreviewUrl('')
    setImageMode('upload')
    setShowModal(true)
  }

  function openEdit(c: Category) {
    setEditing(c)
    setDraft({
      name: c.name,
      slug: c.slug,
      description: c.description ?? '',
      imageUrl: c.imageUrl ?? '',
      isVisible: c.isVisible,
      order: c.order,
    })
    setPendingImageFile(null)
    setPreviewUrl(c.imageUrl ?? '')
    setImageMode(c.imageUrl ? 'url' : 'upload')
    setShowModal(true)
  }

  function handleCloseModal() {
    if (uploading) return
    setShowModal(false)
    setEditing(null)
    setPendingImageFile(null)
    setPreviewUrl('')
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify('يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP...)', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('حجم الصورة كبير جداً، الحد الأقصى هو 5 ميغابايت', 'error')
      return
    }
    setPendingImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setDraft(d => ({ ...d, imageUrl: '' }))
  }

  function handleRemoveImage() {
    setPendingImageFile(null)
    setPreviewUrl('')
    setDraft(d => ({ ...d, imageUrl: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (uploading) return
    if (!draft.name.trim()) {
      notify('الرجاء كتابة اسم القسم', 'error')
      return
    }

    const slug = draft.slug.trim() || draft.name.trim().toLowerCase().replace(/\s+/g, '-')
    let finalImageUrl = draft.imageUrl?.trim() || ''
    setUploading(true)

    try {
      if (pendingImageFile) {
        if (!user?.idToken) {
          notify('يتطلب رفع الصورة من الجهاز تسجيل الدخول كمسؤول في فايربيس', 'error')
          return
        }
        try {
          finalImageUrl = await uploadCategoryImage(pendingImageFile, user.idToken)
          setPendingImageFile(null)
          setDraft(current => ({ ...current, imageUrl: finalImageUrl }))
          setPreviewUrl(finalImageUrl)
          if (fileInputRef.current) fileInputRef.current.value = ''
        } catch (uploadError) {
          console.error('Category image upload error:', uploadError)
          const message = uploadError instanceof Error ? uploadError.message : 'فشل رفع الصورة إلى السيرفر'
          notify(message, 'error')
          return
        }
      }

      try {
        if (editing) {
          await onUpdate({
            ...editing,
            name: draft.name.trim(),
            slug,
            description: draft.description?.trim(),
            imageUrl: finalImageUrl,
            isVisible: draft.isVisible,
            order: Number(draft.order),
          })
        } else {
          await onAdd({
            id: `cat-${Date.now()}`,
            name: draft.name.trim(),
            slug,
            description: draft.description?.trim(),
            imageUrl: finalImageUrl,
            isVisible: draft.isVisible,
            order: Number(draft.order),
            createdAt: new Date().toISOString(),
          })
        }
      } catch (saveError) {
        console.error('Category save error:', saveError)
        return
      }

      setShowModal(false)
      setEditing(null)
      setPendingImageFile(null)
      setPreviewUrl('')
    } finally {
      setUploading(false)
    }
  }

  function openDeleteDialog(id: string) {
    setDeleteId(id)
    setMoveTargetId(categories.find(category => category.id !== id)?.id ?? '')
  }

  async function confirmDelete() {
    if (!deleteId || isDeleting) return
    setIsDeleting(true)
    try {
      if (linkedProducts.length > 0) {
        if (!moveTargetId) {
          notify('اختاري قسماً بديلاً أولاً لنقل المنتجات.', 'error')
          return
        }
        await onMoveAndDelete(deleteId, moveTargetId)
      } else {
        await onDelete(deleteId)
      }
      setDeleteId(null)
      setMoveTargetId('')
    } catch {
      // Parent shows the Firestore error and keeps the category unchanged.
    } finally {
      setIsDeleting(false)
    }
  }

  const categoryToDelete = categories.find(category => category.id === deleteId)
  const linkedProducts = deleteId ? products.filter(product => product.categoryId === deleteId) : []
  const targetCategories = deleteId ? categories.filter(category => category.id !== deleteId) : []

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl border border-[#EADBCE] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="eyebrow mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
            <span>هيكلية الأقسام والتبويبات</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
            إدارة أقسام المتجر
          </h1>
          <p className="text-xs text-[#685D52] m-0 mt-1">
            تنظيم مجموعات وتصنيفات المنتجات وتحديد ظهورها وترتيبها في الواجهة.
          </p>
        </div>

        <button
          onClick={openNew}
          className="rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-6 py-3 flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قسم جديد</span>
        </button>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...categories].sort((a, b) => a.order - b.order).map(cat => (
          <div
            key={cat.id}
            className="bg-white rounded-2xl border border-[#EADBCE] overflow-hidden shadow-xs hover:border-[#DFB76C] transition-all flex flex-col justify-between"
          >
            {/* Image Preview */}
            <div className="h-44 bg-[#FAF7F2] relative overflow-hidden">
              {cat.imageUrl ? (
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#968B7E]">
                  <Layers className="w-10 h-10 stroke-[1.5]" />
                </div>
              )}

              {/* Status and Order Pill */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="bg-[#24180E]/90 backdrop-blur-md text-[#DFB76C] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                  ترتيب: {cat.order}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs ${
                  cat.isVisible ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-white'
                }`}>
                  {cat.isVisible ? 'ظاهر' : 'مخفي'}
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-serif text-xl font-normal text-[#221811] m-0 mb-1" style={{ fontFamily: 'Amiri, serif' }}>
                  {cat.name}
                </h3>
                <span className="text-[11px] text-[#8D6527] font-medium block mb-2" dir="ltr">
                  /{cat.slug}
                </span>
                <p className="text-xs text-[#685D52] m-0 line-clamp-2 leading-relaxed">
                  {cat.description || 'لا يوجد وصف مدخل لهذا القسم.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-[#FAF7F2] flex items-center justify-end gap-2">
                <button
                  onClick={() => openEdit(cat)}
                  className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors cursor-pointer"
                  title="تعديل القسم"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDeleteDialog(cat.id)}
                  className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-red-300 text-[#685D52] hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                  title="حذف القسم"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Category Modal (Add / Edit) */}
      {showModal && (
        <Modal onClose={handleCloseModal} size="lg" className="overflow-hidden p-0">
          <div className="bg-white rounded-3xl border border-[#EADBCE] shadow-2xl max-w-3xl w-full mx-auto overflow-hidden">
            
            <div className="bg-[#FAF7F2] p-5 sm:p-6 lg:px-8 border-b border-[#EADBCE] flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                {editing ? 'تعديل بيانات القسم' : 'إضافة قسم جديد'}
              </h3>
              <button
                onClick={handleCloseModal}
                disabled={uploading}
                className="w-8 h-8 rounded-xl border border-[#EADBCE] flex items-center justify-center text-[#685D52] hover:bg-white hover:text-[#221811] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 lg:p-8 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                  اسم القسم <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="مثلاً: عبايات مطرّزة"
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                  الرابط الدائم (Slug)
                </label>
                <input
                  value={draft.slug}
                  onChange={e => setDraft(d => ({ ...d, slug: e.target.value }))}
                  placeholder="abayas"
                  dir="ltr"
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all text-left"
                />
              </div>

              {/* ── Image Upload & Selection Area ── */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-[#221811]">
                    صورة القسم
                  </label>
                  <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#EADBCE]">
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
                        imageMode === 'upload' ? 'bg-[#8D6527] text-white shadow-xs' : 'text-[#685D52] hover:text-[#221811]'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>رفع من الجهاز</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
                        imageMode === 'url' ? 'bg-[#8D6527] text-white shadow-xs' : 'text-[#685D52] hover:text-[#221811]'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>رابط مباشر</span>
                    </button>
                  </div>
                </div>

                {imageMode === 'upload' ? (
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {previewUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border border-[#EADBCE] bg-[#FAF7F2] p-2 flex items-center gap-3">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border border-[#EADBCE] shrink-0">
                          <img
                            src={previewUrl}
                            alt="معاينة صورة القسم"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-[#221811] block truncate">
                            {pendingImageFile ? pendingImageFile.name : 'الصورة الحالية للقسم'}
                          </span>
                          {pendingImageFile && (
                            <span className="text-[11px] text-[#8D6527] block mt-0.5">
                              {(pendingImageFile.size / (1024 * 1024)).toFixed(2)} MB • جاهزة للرفع
                            </span>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[11px] font-semibold text-[#8D6527] hover:underline cursor-pointer"
                            >
                              استبدال الصورة
                            </button>
                            <span className="text-gray-300">•</span>
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                            >
                              إزالة
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                        onDrop={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          const file = e.dataTransfer.files?.[0]
                          if (file && file.type.startsWith('image/')) {
                            setPendingImageFile(file)
                            setPreviewUrl(URL.createObjectURL(file))
                            setDraft(d => ({ ...d, imageUrl: '' }))
                          }
                        }}
                        className="border-2 border-dashed border-[#EADBCE] hover:border-[#8D6527] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                      >
                        <div className="w-10 h-10 rounded-full bg-white text-[#8D6527] flex items-center justify-center shadow-xs">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-[#221811] m-0">
                          انقري هنا لاختيار صورة من جهازكِ أو اسحبيها وأفلتيها
                        </p>
                        <span className="text-[11px] text-[#968B7E]">
                          يدعم PNG, JPG, WEBP حتى 5 ميغابايت
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={draft.imageUrl}
                      onChange={e => {
                        setDraft(d => ({ ...d, imageUrl: e.target.value }))
                        setPreviewUrl(e.target.value)
                        setPendingImageFile(null)
                      }}
                      placeholder="https://images.unsplash.com/..."
                      dir="ltr"
                      className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all text-left"
                    />
                    {draft.imageUrl && (
                      <div className="flex items-center gap-2 pt-1">
                        <img
                          src={draft.imageUrl}
                          alt="معاينة"
                          className="w-10 h-10 rounded-lg object-cover border border-[#EADBCE]"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                        />
                        <span className="text-[11px] text-emerald-700 font-medium">تم ضبط الرابط للمعاينة</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                  وصف مختصر
                </label>
                <textarea
                  rows={2}
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="مجموعة مختارة من التصاميم..."
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 lg:col-span-2">
                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                    الترتيب
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={draft.order}
                    onChange={e => setDraft(d => ({ ...d, order: Number(e.target.value) }))}
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.isVisible}
                      onChange={e => setDraft(d => ({ ...d, isVisible: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#8D6527] focus:ring-[#8D6527]"
                    />
                    <span className="text-xs font-semibold text-[#221811]">ظاهر في المتجر</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EADBCE] flex items-center justify-end gap-3 lg:col-span-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleCloseModal}
                  className="rounded-xl border border-[#EADBCE] text-xs font-semibold text-[#685D52] hover:bg-[#FAF7F2] px-5 py-2.5 cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-xl bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-7 py-2.5 shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ رفع الصورة والحفظ...</span>
                    </>
                  ) : (
                    <span>{editing ? 'تحديث القسم' : 'إضافة القسم'}</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <Modal onClose={() => !isDeleting && setDeleteId(null)} size="sm">
          <div className="bg-white rounded-3xl border border-[#EADBCE] shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#221811] m-0 mb-2" style={{ fontFamily: 'Amiri, serif' }}>
              {linkedProducts.length > 0 ? 'القسم يحتوي على منتجات' : 'حذف القسم؟'}
            </h3>
            {linkedProducts.length > 0 ? (
              <>
                <p className="text-xs text-[#685D52] mb-4 leading-relaxed">
                  يحتوي «{categoryToDelete?.name}» على {linkedProducts.length} منتج. لا يمكن حذفه قبل نقل المنتجات إلى قسم آخر.
                </p>
                <label className="block text-xs font-semibold text-[#221811] text-right mb-1.5">
                  القسم البديل لنقل المنتجات
                </label>
                <select
                  value={moveTargetId}
                  onChange={event => setMoveTargetId(event.target.value)}
                  disabled={isDeleting || targetCategories.length === 0}
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] disabled:opacity-60"
                >
                  <option value="">اختاري القسم البديل</option>
                  {targetCategories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                {targetCategories.length === 0 && (
                  <p className="text-[11px] text-red-700 mt-2 mb-0">أضيفي قسمًا بديلًا أولًا قبل حذف هذا القسم.</p>
                )}
              </>
            ) : (
              <p className="text-xs text-[#685D52] mb-6 leading-relaxed">
                هل أنتِ متأكدة من حذف هذا القسم الفارغ؟ لا يمكن التراجع عن هذه العملية.
              </p>
            )}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => { setDeleteId(null); setMoveTargetId('') }}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-[#EADBCE] text-xs font-semibold text-[#685D52] hover:bg-[#FAF7F2] disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting || (linkedProducts.length > 0 && !moveTargetId)}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-60 ${linkedProducts.length > 0 ? 'bg-[#8D6527] hover:bg-[#704F1E]' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isDeleting
                  ? 'جارٍ التنفيذ...'
                  : linkedProducts.length > 0
                    ? 'نقل المنتجات وحذف القسم'
                    : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}

