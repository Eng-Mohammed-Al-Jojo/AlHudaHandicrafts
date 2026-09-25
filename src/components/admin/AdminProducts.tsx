import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Image as ImageIcon,
  X,
  Sparkles,
  Upload,
  Link as LinkIcon,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Package,
} from 'lucide-react'
import type { Product, Category, FirebaseUser } from '../../types'
import { uploadProductImage } from '../../firebase'
import Modal from '../ui/Modal'

interface Props {
  products: Product[]
  categories: Category[]
  user: FirebaseUser
  onAdd: (p: Product) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onUpdate: (p: Product) => Promise<void>
  notify: (msg: string, type?: 'success' | 'error') => void
}

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  isAvailable: true,
  isPublished: true,
  badge: '',
}

export default function AdminProducts({
  products,
  categories,
  user,
  onAdd,
  onDelete,
  onUpdate,
  notify,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [draft, setDraft] = useState(EMPTY_FORM)
  const [savedImageUrls, setSavedImageUrls] = useState<string[]>([])
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState('')

  function openNewForm() {
    setEditing(null)
    setDraft({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? '' })
    setSavedImageUrls([])
    setPendingImages([])
    setImageUrlInput('')
    setShowForm(true)
  }

  function openEditForm(p: Product) {
    setEditing(p)
    setDraft({
      name: p.name,
      description: p.description,
      price: String(p.price),
      categoryId: p.categoryId,
      isAvailable: p.isAvailable,
      isPublished: p.isPublished,
      badge: p.badge ?? '',
    })
    setSavedImageUrls([...p.images].sort((a, b) => a.order - b.order).map(i => i.url))
    setPendingImages([])
    setImageUrlInput('')
    setShowForm(true)
  }

  function handleCloseForm() {
    if (uploading) return
    setShowForm(false)
    setEditing(null)
    setSavedImageUrls([])
    setPendingImages([])
    setImageUrlInput('')
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024)
    if (valid.length !== files.length) {
      notify('يرجى اختيار ملفات صور فقط، وحجم كل صورة أقل من 5 ميغابايت.', 'error')
    }
    if (savedImageUrls.length + pendingImages.length + valid.length > 6) {
      notify('الحد الأقصى المسموح به هو 6 صور للمنتج الواحد.', 'error')
      return
    }
    setPendingImages(current => [
      ...current,
      ...valid.map(file => ({ file, preview: URL.createObjectURL(file) })),
    ])
    e.target.value = ''
  }

  function addImageUrl() {
    const url = imageUrlInput.trim()
    if (!url) return
    if (savedImageUrls.length + pendingImages.length >= 6) {
      notify('الحد الأقصى هو 6 صور للمنتج.', 'error')
      return
    }
    try { new URL(url) } catch {
      notify('الرجاء إدخال رابط صورة صالح يبدأ بـ https://', 'error')
      return
    }
    setSavedImageUrls(current => [...current, url])
    setImageUrlInput('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (uploading) return
    if (!draft.name.trim() || !draft.price || !draft.categoryId) {
      notify('يرجى ملء جميع الحقول الأساسية (الاسم، السعر، والقسم)', 'error')
      return
    }
    if (pendingImages.length > 0 && !user?.idToken) {
      notify('يتطلب رفع الصور تسجيل الدخول كمسؤول — يرجى إعادة تسجيل الدخول.', 'error')
      return
    }

    const cat = categories.find(c => c.id === draft.categoryId)
    setUploading(true)
    try {
      let uploadedUrls: string[] = []
      if (pendingImages.length > 0) {
        try {
          uploadedUrls = await Promise.all(
            pendingImages.map(img => uploadProductImage(img.file, user.idToken))
          )
          setSavedImageUrls(current => [...current, ...uploadedUrls])
          setPendingImages([])
        } catch (uploadError) {
          console.error('Product image upload error:', uploadError)
          const message = uploadError instanceof Error ? uploadError.message : 'فشل رفع إحدى الصور'
          notify(`تعذر حفظ المنتج: ${message}`, 'error')
          return
        }
      }

      const images = [...savedImageUrls, ...uploadedUrls].map((url, order) => ({
        url, fileId: '', alt: draft.name, order,
      }))

      try {
        if (editing) {
          await onUpdate({
            ...editing,
            name: draft.name.trim(),
            description: draft.description.trim(),
            price: Number(draft.price),
            categoryId: draft.categoryId,
            categoryName: cat?.name ?? '',
            isAvailable: draft.isAvailable,
            isPublished: draft.isPublished,
            badge: draft.badge.trim() || undefined,
            images: images.length > 0 ? images : editing.images,
            updatedAt: new Date().toISOString(),
          })
        } else {
          await onAdd({
            id: `prod-${Date.now()}`,
            name: draft.name.trim(),
            slug: draft.name.trim().toLowerCase().replace(/\s+/g, '-'),
            description: draft.description.trim(),
            price: Number(draft.price),
            categoryId: draft.categoryId,
            categoryName: cat?.name ?? '',
            isAvailable: draft.isAvailable,
            isPublished: draft.isPublished,
            badge: draft.badge.trim() || undefined,
            images: images.length > 0 ? images : [
              { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80', alt: draft.name, order: 0 },
            ],
            createdAt: new Date().toISOString(),
          })
        }
      } catch (saveError) {
        console.error('Product save error:', saveError)
        return
      }

      setShowForm(false)
      setEditing(null)
      setSavedImageUrls([])
      setPendingImages([])
      setImageUrlInput('')
    } finally {
      setUploading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId || isDeleting) return
    setIsDeleting(true)
    try {
      await onDelete(deleteId)
      setDeleteId(null)
    } catch {
      // Parent shows the Firestore error and keeps the product unchanged.
    } finally {
      setIsDeleting(false)
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.categoryName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">

      {/* ── Page Header ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] p-5 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="eyebrow mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
              <span>كتالوج المعروضات</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
              إدارة المنتجات والتطريزات
            </h1>
            <p className="text-xs text-[#685D52] m-0 mt-1">
              إضافة منتجات جديدة، تعديل الأسعار، الصور، وحالة التوفر بالمخزن.
            </p>
          </div>
          <button
            onClick={openNewForm}
            className="w-full sm:w-auto rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white text-sm font-bold px-6 py-3 flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="bg-white rounded-2xl border border-[#EADBCE] px-4 py-3 flex items-center gap-3 shadow-xs">
        <Search className="w-4 h-4 text-[#8D6527] shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحثي عن منتج بالاسم أو القسم..."
          className="border-0 outline-none text-sm text-[#221811] placeholder-[#968B7E] flex-1 bg-transparent"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-[#968B7E] hover:text-[#221811] transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Products — Desktop Table ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EADBCE] p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] text-[#8D6527] flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h4 className="font-serif text-lg text-[#221811] m-0 mb-1">لا توجد منتجات</h4>
          <p className="text-xs text-[#685D52] m-0">
            {search ? 'لم يتطابق أي منتج مع بحثكِ.' : 'أضيفي أول منتج لتظهر هنا.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block bg-white rounded-3xl border border-[#EADBCE] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF7F2] text-[#685D52] font-bold border-b border-[#EADBCE]">
                  <tr>
                    <th className="p-4">المنتج</th>
                    <th className="p-4">القسم</th>
                    <th className="p-4">السعر</th>
                    <th className="p-4">المخزن</th>
                    <th className="p-4">النشر</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {filtered.map(p => {
                    const img = p.images[0]?.url
                    return (
                      <tr key={p.id} className="hover:bg-[#FAF7F2]/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {img ? (
                              <img src={img} alt="" className="w-12 h-12 rounded-xl object-cover border border-[#EADBCE] bg-[#FAF7F2] shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] flex items-center justify-center text-[#968B7E] shrink-0">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-[#221811] m-0 text-sm">{p.name}</p>
                              {p.badge && (
                                <span className="inline-block bg-[#FAF7F2] border border-[#C59B4B]/30 text-[#8D6527] text-[10px] font-bold px-2 py-0.5 rounded-full mt-1">
                                  {p.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-[#685D52] font-medium">{p.categoryName}</td>
                        <td className="p-4 font-bold text-[#8D6527]">{p.price} شيكل</td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${p.isAvailable ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {p.isAvailable ? 'متوفر' : 'نفد'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${p.isPublished ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                            {p.isPublished ? 'منشور' : 'مسودة'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditForm(p)}
                              className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors"
                              title="تعديل المنتج"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(p.id)}
                              className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-red-300 text-[#685D52] hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                              title="حذف المنتج"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Product Cards ── */}
          <div className="sm:hidden space-y-3">
            {filtered.map(p => {
              const img = p.images[0]?.url
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-[#EADBCE] p-4 shadow-xs flex items-start gap-3"
                >
                  {/* Thumbnail */}
                  {img ? (
                    <img src={img} alt="" className="w-16 h-16 rounded-xl object-cover border border-[#EADBCE] shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#FAF7F2] border border-[#EADBCE] flex items-center justify-center text-[#968B7E] shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-[#221811] m-0 text-sm leading-tight truncate">{p.name}</p>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => openEditForm(p)}
                          className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-red-300 text-[#685D52] hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <span className="text-xs text-[#685D52]">{p.categoryName}</span>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="font-bold text-[#8D6527] text-sm">{p.price} شيكل</span>
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${p.isAvailable ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {p.isAvailable ? 'متوفر' : 'نفد'}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${p.isPublished ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                        {p.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {p.isPublished ? 'منشور' : 'مسودة'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <Modal onClose={handleCloseForm} size="xl" structured className="p-0 border border-[#EADBCE]">
          <div className="flex flex-col flex-1 min-h-0">

            {/* Modal Header */}
            <div className="bg-[#FAF7F2] px-5 py-4 sm:p-6 border-b border-[#EADBCE] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                  {editing ? 'تعديل بيانات المنتج' : 'إضافة منتج مطرز جديد'}
                </h3>
                <p className="text-[11px] text-[#685D52] m-0 mt-0.5">
                  أدخلي تفاصيل القطعة وصورها لظهورها في المتجر
                </p>
              </div>
              <button
                onClick={handleCloseForm}
                disabled={uploading}
                className="w-8 h-8 rounded-xl border border-[#EADBCE] flex items-center justify-center text-[#685D52] hover:bg-white hover:text-[#221811] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form id="product-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1">
              <div className="p-5 sm:p-6 lg:p-8 space-y-5">

                {/* ── Row 1: Two columns — Fields (left) | Images (right) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">

                  {/* LEFT: All text fields */}
                  <div className="space-y-4">

                    {/* Name + Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                          اسم المنتج <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          value={draft.name}
                          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                          placeholder="مثلاً: عباية ورد الجوري المطرزة"
                          className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-sm text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                          القسم <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={draft.categoryId}
                          onChange={e => setDraft(d => ({ ...d, categoryId: e.target.value }))}
                          className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-sm text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all cursor-pointer"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Price + Badge */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                          السعر (بالشيكل) <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="number"
                          min="1"
                          value={draft.price}
                          onChange={e => setDraft(d => ({ ...d, price: e.target.value }))}
                          placeholder="مثال: 280"
                          className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-sm text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                          شارة التميز <span className="text-[#968B7E] font-normal">(اختياري)</span>
                        </label>
                        <input
                          value={draft.badge}
                          onChange={e => setDraft(d => ({ ...d, badge: e.target.value }))}
                          placeholder="مثال: الأكثر طلباً"
                          className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-sm text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                        الوصف والمواصفات
                      </label>
                      <textarea
                        rows={4}
                        value={draft.description}
                        onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                        placeholder="نوع القماش، نوع الخيوط، المقاسات، وتعليمات الغسيل..."
                        className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-sm text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all resize-none"
                      />
                    </div>

                    {/* Status Toggles */}
                    <div className="flex flex-col sm:flex-row gap-3 bg-[#FAF7F2] rounded-2xl p-4 border border-[#EADBCE]">
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={draft.isAvailable}
                          onChange={e => setDraft(d => ({ ...d, isAvailable: e.target.checked }))}
                          className="w-4 h-4 rounded text-[#8D6527] focus:ring-[#8D6527] shrink-0"
                        />
                        <div>
                          <span className="text-xs font-bold text-[#221811] block">متوفر في المخزن</span>
                          <span className="text-[10px] text-[#968B7E]">قابل للطلب من العملاء</span>
                        </div>
                      </label>

                      <div className="w-px bg-[#EADBCE] hidden sm:block" />

                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={draft.isPublished}
                          onChange={e => setDraft(d => ({ ...d, isPublished: e.target.checked }))}
                          className="w-4 h-4 rounded text-[#8D6527] focus:ring-[#8D6527] shrink-0"
                        />
                        <div>
                          <span className="text-xs font-bold text-[#221811] block">منشور للعملاء</span>
                          <span className="text-[10px] text-[#968B7E]">ظاهر في صفحة المتجر</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* RIGHT: Images upload — sticky and full-height */}
                  <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-[#EADBCE] hover:border-[#C59B4B] bg-[#FAF7F2]/50 p-4 sm:p-5 transition-colors">

                    {/* Section Label */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#8D6527]/10 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-[#8D6527]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#221811] m-0">صور المنتج</p>
                          <p className="text-[10px] text-[#968B7E] m-0">حتى 6 صور • PNG, JPG, WEBP</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8D6527]/10 text-[#8D6527]">
                        {savedImageUrls.length + pendingImages.length}/6
                      </span>
                    </div>

                    {/* Upload Buttons */}
                    <label className="w-full bg-white border border-[#EADBCE] hover:border-[#8D6527] hover:bg-[#FAF7F2] rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-[#8D6527] cursor-pointer transition-all group shadow-xs">
                      <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span>اختيار صور من جهازكِ</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>

                    <div className="flex items-center gap-2 bg-white border border-[#EADBCE] focus-within:border-[#8D6527] rounded-xl px-3 py-2 shadow-xs transition-colors">
                      <LinkIcon className="w-4 h-4 text-[#968B7E] shrink-0" />
                      <input
                        value={imageUrlInput}
                        onChange={e => setImageUrlInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl() } }}
                        placeholder="أو ألصقي رابط صورة https://..."
                        dir="ltr"
                        className="border-0 outline-none text-sm text-[#221811] flex-1 bg-transparent placeholder:text-[#C8B89F]"
                      />
                      <button
                        type="button"
                        onClick={addImageUrl}
                        className="rounded-lg bg-[#FAF7F2] hover:bg-[#8D6527] hover:text-white text-[#8D6527] px-3 py-1 text-xs font-bold transition-colors shrink-0"
                      >
                        إضافة
                      </button>
                    </div>

                    {/* Images Preview Grid */}
                    {(savedImageUrls.length + pendingImages.length) > 0 ? (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EADBCE]">
                        {savedImageUrls.map((url, idx) => (
                          <div key={`saved-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#EADBCE] group shadow-xs">
                            <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                            <button
                              type="button"
                              onClick={() => setSavedImageUrls(urls => urls.filter((_, i) => i !== idx))}
                              className="absolute top-1 left-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                              title="حذف الصورة"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {idx === 0 && (
                              <span className="absolute bottom-1 right-1 bg-[#8D6527] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                                رئيسية
                              </span>
                            )}
                          </div>
                        ))}
                        {pendingImages.map((img, idx) => (
                          <div key={`pending-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-amber-300 group shadow-xs">
                            <img src={img.preview} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-amber-500/10" />
                            <span className="absolute bottom-1 right-1 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                              قيد الرفع
                            </span>
                            <button
                              type="button"
                              onClick={() => setPendingImages(imgs => imgs.filter((_, i) => i !== idx))}
                              className="absolute top-1 left-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                              title="حذف الصورة"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {/* Empty slots */}
                        {Array.from({ length: Math.max(0, 6 - savedImageUrls.length - pendingImages.length) }).slice(0, 3).map((_, idx) => (
                          <label key={`empty-${idx}`} className="aspect-square rounded-xl border-2 border-dashed border-[#EADBCE] flex items-center justify-center cursor-pointer hover:border-[#8D6527] hover:bg-white transition-all">
                            <Plus className="w-5 h-5 text-[#C8B89F] group-hover:text-[#8D6527]" />
                            <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6 border-t border-[#EADBCE]">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-[#EADBCE] flex items-center justify-center shadow-xs">
                          <ImageIcon className="w-6 h-6 text-[#C8B89F]" />
                        </div>
                        <p className="text-xs text-[#968B7E] text-center m-0 font-medium">
                          لم تُضَف أي صور بعد
                        </p>
                        <p className="text-[10px] text-[#C8B89F] text-center m-0">
                          ارفعي صور المنتج لتحسين تجربة العملاء
                        </p>
                      </div>
                    )}

                  </div>
                </div>

              </div>

            </form>

            {/* Submit Footer - fixed outside scrollable area */}
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4 border-t border-[#EADBCE] bg-white flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCloseForm}
                disabled={uploading}
                className="flex-1 rounded-xl border border-[#EADBCE] text-sm font-semibold text-[#685D52] hover:bg-[#FAF7F2] py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إلغاء
              </button>
              <button
                type="submit"
                form="product-form"
                disabled={uploading}
                className="flex-1 rounded-xl bg-[#8D6527] hover:bg-[#704F1E] text-white text-sm font-bold py-3 shadow-sm transition-all disabled:opacity-50"
              >
                {uploading ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteId && (
        <Modal onClose={() => !isDeleting && setDeleteId(null)} size="sm">
          <div className="p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#221811] m-0 mb-2" style={{ fontFamily: 'Amiri, serif' }}>
              حذف المنتج؟
            </h3>
            <p className="text-xs text-[#685D52] mb-6 leading-relaxed">
              هل أنتِ متأكدة من حذف هذا المنتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl border border-[#EADBCE] text-sm font-semibold text-[#685D52] hover:bg-[#FAF7F2] transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-xs transition-colors disabled:opacity-60"
              >
                {isDeleting ? 'جارٍ الحذف...' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
