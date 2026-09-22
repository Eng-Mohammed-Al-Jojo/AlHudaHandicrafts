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

interface Props {
  products: Product[]
  categories: Category[]
  user: FirebaseUser
  onAdd: (p: Product) => void
  onDelete: (id: string) => void
  onUpdate: (p: Product) => void
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
    if (!draft.name.trim() || !draft.price || !draft.categoryId) {
      notify('يرجى ملء جميع الحقول الأساسية (الاسم، السعر، والقسم)', 'error')
      return
    }
    if (pendingImages.length > 0 && !user?.idToken) {
      notify('يتطلب رفع الصور تسجيل الدخول كمسؤول — يرجى إعادة تسجيل الدخول.', 'error')
      return
    }
    const cat = categories.find(c => c.id === draft.categoryId)
    try {
      setUploading(true)
      const uploadedUrls = await Promise.all(
        pendingImages.map(img => uploadProductImage(img.file, user.idToken))
      )
      const images = [...savedImageUrls, ...uploadedUrls].map((url, order) => ({
        url, fileId: '', alt: draft.name, order,
      }))

      if (editing) {
        onUpdate({
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
        onAdd({
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

      setShowForm(false)
      setEditing(null)
      setSavedImageUrls([])
      setPendingImages([])
    } catch (err: unknown) {
      console.error('Product save/upload error:', err)
      const errMsg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع'
      notify(`خطأ: ${errMsg}`, 'error')
    } finally {
      setUploading(false)
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#221811]/40 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-[#EADBCE] shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[92vh] overflow-hidden flex flex-col animate-scale-in">

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
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-xl border border-[#EADBCE] flex items-center justify-center text-[#685D52] hover:bg-white hover:text-[#221811] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
              <div className="p-5 sm:p-6 space-y-5">

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
                      شارة التميز (اختياري)
                    </label>
                    <input
                      value={draft.badge}
                      onChange={e => setDraft(d => ({ ...d, badge: e.target.value }))}
                      placeholder="مثال: الأكثر طلباً، تطريز يدوي"
                      className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-sm text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                    الوصف والمواصفات
                  </label>
                  <textarea
                    rows={3}
                    value={draft.description}
                    onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                    placeholder="نوع القماش، نوع الخيوط، المقاسات، وتعليمات الغسيل..."
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 text-sm text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white transition-all resize-none"
                  />
                </div>

                {/* Images Upload Section */}
                <div className="border border-dashed border-[#C59B4B] bg-[#FAF7F2]/60 rounded-2xl p-4 sm:p-5">
                  <label className="block text-xs font-bold text-[#221811] mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#8D6527]" />
                    <span>صور المنتج (حتى 6 صور)</span>
                  </label>

                  <div className="flex flex-col gap-3 mb-4">
                    <label className="w-full bg-white border border-[#EADBCE] hover:border-[#8D6527] rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-[#8D6527] cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-4 h-4" />
                      <span>اختيار صور من جهازكِ</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>

                    <div className="flex items-center gap-2 bg-white border border-[#EADBCE] rounded-xl px-3 py-2 shadow-xs">
                      <LinkIcon className="w-4 h-4 text-[#968B7E] shrink-0" />
                      <input
                        value={imageUrlInput}
                        onChange={e => setImageUrlInput(e.target.value)}
                        placeholder="أو ألصقي رابط صورة https://..."
                        dir="ltr"
                        className="border-0 outline-none text-sm text-[#221811] flex-1 bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={addImageUrl}
                        className="rounded-lg bg-[#FAF7F2] hover:bg-[#8D6527] hover:text-white text-[#8D6527] px-3 py-1 text-xs font-semibold transition-colors shrink-0"
                      >
                        إضافة
                      </button>
                    </div>
                  </div>

                  {(savedImageUrls.length + pendingImages.length) > 0 ? (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#EADBCE]">
                      {savedImageUrls.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[#EADBCE] group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setSavedImageUrls(urls => urls.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {pendingImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[#C59B4B] group">
                          <img src={img.preview} alt="" className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 right-1 bg-amber-500 text-white text-[8px] px-1 rounded">قيد الرفع</span>
                          <button
                            type="button"
                            onClick={() => setPendingImages(imgs => imgs.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#968B7E] m-0 text-center">
                      لم تتم إضافة أي صور بعد. يمكنكِ رفع صور متعددة.
                    </p>
                  )}
                </div>

                {/* Status Toggles */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer p-3 sm:p-0 bg-[#FAF7F2] sm:bg-transparent rounded-xl sm:rounded-none">
                    <input
                      type="checkbox"
                      checked={draft.isAvailable}
                      onChange={e => setDraft(d => ({ ...d, isAvailable: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#8D6527] focus:ring-[#8D6527]"
                    />
                    <span className="text-sm font-semibold text-[#221811]">متوفر للطلب في المخزن</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 sm:p-0 bg-[#FAF7F2] sm:bg-transparent rounded-xl sm:rounded-none">
                    <input
                      type="checkbox"
                      checked={draft.isPublished}
                      onChange={e => setDraft(d => ({ ...d, isPublished: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#8D6527] focus:ring-[#8D6527]"
                    />
                    <span className="text-sm font-semibold text-[#221811]">منشور وظاهر للعملاء</span>
                  </label>
                </div>
              </div>

              {/* Submit Footer */}
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4 border-t border-[#EADBCE] flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-[#EADBCE] text-sm font-semibold text-[#685D52] hover:bg-[#FAF7F2] py-3 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 rounded-xl bg-[#8D6527] hover:bg-[#704F1E] text-white text-sm font-bold py-3 shadow-sm transition-all disabled:opacity-50"
                >
                  {uploading ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#221811]/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#EADBCE] shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center animate-scale-in">
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
                className="flex-1 py-3 rounded-xl border border-[#EADBCE] text-sm font-semibold text-[#685D52] hover:bg-[#FAF7F2] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => { onDelete(deleteId); setDeleteId(null) }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-xs transition-colors"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
