import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import type { Book, FirebaseUser } from '../../types'
import { uploadBookCover, uploadBookPdf } from '../../firebase'
import Modal from '../ui/Modal'
import Pagination, { usePagination } from '../ui/Pagination'
import ImageSizeBadge, { formatBytesArabic } from '../ui/ImageSizeBadge'

interface Props {
  books: Book[]
  user: FirebaseUser
  onAdd: (book: Omit<Book, 'id'>) => Promise<void>
  onUpdate: (book: Book) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder: (books: Book[]) => Promise<void>
  notify: (msg: string, type?: 'success' | 'error') => void
}

const EMPTY_DRAFT = {
  title: '',
  author: 'هدى أمين القريناوي',
  badge: '',
  description: '',
  coverUrl: '',
  pdfUrl: '',
  order: 1,
  isPublished: true,
}

export default function AdminBooks({
  books,
  user,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  notify,
}: Props) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Book | null>(null)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [reordering, setReordering] = useState(false)

  const [coverMode, setCoverMode] = useState<'upload' | 'url'>('upload')
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('')
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [pdfMode, setPdfMode] = useState<'upload' | 'url'>('upload')
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const sortedBooks = useMemo(
    () => [...books].sort((a, b) => a.order - b.order),
    [books]
  )

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sortedBooks
    return sortedBooks.filter(b =>
      [b.title, b.author ?? '', b.description, b.badge ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [sortedBooks, search])

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const { pageItems: pagedBooks, totalItems, totalPages } = usePagination(
    filteredBooks,
    pageSize,
    currentPage
  )

  function openNew() {
    setEditing(null)
    const maxOrder = books.reduce((max, b) => Math.max(max, b.order), 0)
    setDraft({ ...EMPTY_DRAFT, order: maxOrder + 1 })
    setPendingCoverFile(null)
    setCoverPreviewUrl('')
    setCoverMode('upload')
    setPendingPdfFile(null)
    setPdfMode('upload')
    setShowModal(true)
  }

  function openEdit(book: Book) {
    setEditing(book)
    setDraft({
      title: book.title,
      author: book.author ?? '',
      badge: book.badge ?? '',
      description: book.description,
      coverUrl: book.coverUrl,
      pdfUrl: book.pdfUrl,
      order: book.order,
      isPublished: book.isPublished,
    })
    setPendingCoverFile(null)
    setCoverPreviewUrl(book.coverUrl)
    setCoverMode(book.coverUrl ? 'url' : 'upload')
    setPendingPdfFile(null)
    setPdfMode(book.pdfUrl ? 'url' : 'upload')
    setShowModal(true)
  }

  function closeModal() {
    if (saving) return
    setShowModal(false)
    setEditing(null)
    setPendingCoverFile(null)
    setCoverPreviewUrl('')
    setPendingPdfFile(null)
  }

  function handleCoverFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify('يرجى اختيار ملف صورة صالح لغلاف الكتاب.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('حجم صورة الغلاف كبير جداً، الحد الأقصى 5 ميغابايت.', 'error')
      return
    }
    setPendingCoverFile(file)
    setCoverPreviewUrl(URL.createObjectURL(file))
    setDraft(d => ({ ...d, coverUrl: '' }))
  }

  function handlePdfFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      notify('يرجى اختيار ملف بصيغة PDF فقط.', 'error')
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      notify('حجم ملف PDF كبير جداً، الحد الأقصى 25 ميغابايت.', 'error')
      return
    }
    setPendingPdfFile(file)
    setDraft(d => ({ ...d, pdfUrl: '' }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const title = draft.title.trim()
    const description = draft.description.trim()
    if (!title) {
      notify('يرجى إدخال عنوان الكتاب.', 'error')
      return
    }
    if (!description) {
      notify('يرجى إدخال وصف الكتاب.', 'error')
      return
    }

    let finalCoverUrl = draft.coverUrl.trim()
    let finalPdfUrl = draft.pdfUrl.trim()

    if (!pendingCoverFile && !finalCoverUrl) {
      notify('يرجى رفع صورة غلاف الكتاب أو إدخال رابطها.', 'error')
      return
    }
    if (!pendingPdfFile && !finalPdfUrl) {
      notify('يرجى رفع ملف الكتاب (PDF) أو إدخال رابطه.', 'error')
      return
    }

    setSaving(true)
    try {
      if (pendingCoverFile) {
        finalCoverUrl = await uploadBookCover(pendingCoverFile, user.idToken)
      }
      if (pendingPdfFile) {
        finalPdfUrl = await uploadBookPdf(pendingPdfFile, user.idToken)
      }

      const payload: Omit<Book, 'id'> = {
        title,
        author: draft.author.trim() || undefined,
        badge: draft.badge.trim() || undefined,
        description,
        coverUrl: finalCoverUrl,
        pdfUrl: finalPdfUrl,
        order: Math.max(1, Number(draft.order) || 1),
        isPublished: draft.isPublished,
      }

      if (editing) {
        await onUpdate({ ...editing, ...payload })
        notify(`تم تحديث كتاب «${title}» بنجاح.`)
      } else {
        await onAdd(payload)
        notify(`تمت إضافة كتاب «${title}» بنجاح.`)
      }
      setShowModal(false)
      setEditing(null)
    } catch (err) {
      console.error('Save book error:', err)
      notify(err instanceof Error ? err.message : 'تعذر حفظ الكتاب. حاولي مرة أخرى.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function moveBook(id: string, direction: 'up' | 'down') {
    const idx = sortedBooks.findIndex(b => b.id === id)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= sortedBooks.length) return

    const reordered = [...sortedBooks]
    ;[reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]]
    const normalized = reordered.map((b, i) => ({ ...b, order: i + 1 }))
    const changed = normalized.filter(b => {
      const orig = sortedBooks.find(x => x.id === b.id)
      return orig?.order !== b.order
    })
    if (changed.length === 0) return

    setReordering(true)
    try {
      await onReorder(changed)
    } catch {
      notify('تعذر تغيير ترتيب الكتب.', 'error')
    } finally {
      setReordering(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await onDelete(deleteTarget.id)
      notify(`تم حذف كتاب «${deleteTarget.title}».`)
      setDeleteTarget(null)
    } catch {
      notify('تعذر حذف الكتاب.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#EADBCE] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="eyebrow mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
            <span>مكتبة المتجر والإصدارات الرقمية</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
            إدارة الكتب
          </h1>
          <p className="text-xs text-[#685D52] m-0 mt-1">
            ارفعي الكتب بصيغة PDF مع صورة الغلاف والوصف، وحددي ترتيب عرضها في الصفحة الرئيسية وصفحة الكتب.
          </p>
        </div>

        <button
          onClick={openNew}
          className="rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-6 py-3 flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة كتاب جديد</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-[#EADBCE] px-4 py-3 flex items-center gap-3 shadow-xs">
        <Search className="w-4 h-4 text-[#8D6527] shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحثي عن كتاب بالعنوان أو الكاتبة أو الوصف..."
          className="border-0 outline-none text-sm text-[#221811] placeholder-[#968B7E] flex-1 bg-transparent"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-[#968B7E] hover:text-[#221811] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Empty state or Grid */}
      {filteredBooks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#EADBCE] p-10 sm:p-14 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] text-[#8D6527] flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="font-serif text-xl text-[#221811] m-0 mb-1">
            {search ? 'لا توجد كتب مطابقة' : 'لا توجد كتب مضافة بعد'}
          </h3>
          <p className="text-xs text-[#685D52] m-0 mb-5 max-w-md mx-auto">
            {search
              ? 'جرّبي كلمات بحث أخرى.'
              : 'أضيفي أول كتاب برفع صورة الغلاف وملف PDF ليظهر في الصفحة الرئيسية وصفحة الكتب المخصصة.'}
          </p>
          {!search && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={openNew}
                className="inline-flex items-center gap-2 rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold px-5 py-2.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة كتاب جديد</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pagedBooks.map((book, idx) => {
              const globalIdx = sortedBooks.findIndex(b => b.id === book.id)
              const isFirst = globalIdx === 0
              const isLast = globalIdx === sortedBooks.length - 1
              return (
                <div
                  key={book.id}
                  className="bg-white rounded-2xl border border-[#EADBCE] overflow-hidden shadow-xs hover:border-[#DFB76C] transition-all flex flex-col justify-between"
                >
                  {/* Cover Preview */}
                  <div className="h-56 bg-[#FAF7F2] relative overflow-hidden">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#968B7E]">
                        <BookOpen className="w-10 h-10 stroke-[1.5]" />
                      </div>
                    )}

                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <span className="bg-[#24180E]/90 backdrop-blur-md text-[#DFB76C] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                        ترتيب: {book.order}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs inline-flex items-center gap-1 ${
                          book.isPublished ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-white'
                        }`}
                      >
                        {book.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {book.isPublished ? 'منشور' : 'مسودة'}
                      </span>
                    </div>

                    {book.coverUrl && (
                      <ImageSizeBadge url={book.coverUrl} prefix="الغلاف: " className="absolute bottom-3 left-3" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-bold text-[#8D6527] truncate">
                          {book.author || 'متجر الهدى'}
                        </span>
                        {book.badge && (
                          <span className="text-[10px] font-bold bg-[#FAF7F2] border border-[#EADBCE] text-[#8D6527] px-2 py-0.5 rounded-full shrink-0">
                            {book.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif text-xl font-bold text-[#221811] m-0 mb-2 leading-snug" style={{ fontFamily: 'Amiri, serif' }}>
                        {book.title}
                      </h3>
                      <p className="text-xs text-[#685D52] m-0 line-clamp-3 leading-relaxed">
                        {book.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 mt-4 border-t border-[#FAF7F2] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          disabled={isFirst || reordering}
                          onClick={() => void moveBook(book.id, 'up')}
                          className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="تقديم في الترتيب"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          disabled={isLast || reordering}
                          onClick={() => void moveBook(book.id, 'down')}
                          className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="تأخير في الترتيب"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/book/${book.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors"
                          title="معاينة صفحة الكتاب"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => openEdit(book)}
                          className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-[#8D6527] text-[#685D52] hover:text-[#8D6527] flex items-center justify-center transition-colors cursor-pointer"
                          title="تعديل الكتاب"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(book)}
                          className="w-8 h-8 rounded-lg border border-[#EADBCE] hover:border-red-300 text-[#685D52] hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="حذف الكتاب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={size => { setPageSize(size); setCurrentPage(1) }}
            className="bg-white rounded-3xl border border-[#EADBCE] p-4"
          />
        </>
      )}

      {/* Add / Edit Book Modal */}
      {showModal && (
        <Modal onClose={closeModal} size="lg" structured className="p-0 border border-[#EADBCE]">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="bg-[#FAF7F2] p-5 sm:p-6 border-b border-[#EADBCE] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                  {editing ? 'تعديل بيانات الكتاب' : 'إضافة كتاب جديد'}
                </h3>
                <p className="text-xs text-[#685D52] m-0 mt-0.5">
                  أدخلي عنوان الكتاب، الوصف، صورة الغلاف، وملف PDF للعرض والتحميل
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="w-9 h-9 rounded-xl border border-[#EADBCE] hover:bg-white text-[#685D52] hover:text-[#221811] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {/* Title & Author */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                    عنوان الكتاب <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={draft.title}
                    onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                    placeholder="مثلاً: غرز البلاد: دليل التطريز الفلسطيني"
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                    اسم الكاتبة / المؤلف
                  </label>
                  <input
                    value={draft.author}
                    onChange={e => setDraft(d => ({ ...d, author: e.target.value }))}
                    placeholder="هدى أمين القريناوي"
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                  وصف الكتاب <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="اكتبي نبذة عن محتوى الكتاب وما يميزه..."
                  className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white resize-y"
                />
              </div>

              {/* Cover Image */}
              <div className="rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#221811] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#8D6527]" />
                    صورة غلاف الكتاب <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-lg border border-[#EADBCE] bg-white p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCoverMode('upload')}
                      className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${coverMode === 'upload' ? 'bg-[#8D6527] text-white' : 'text-[#685D52]'}`}
                    >
                      رفع صورة
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverMode('url')}
                      className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${coverMode === 'url' ? 'bg-[#8D6527] text-white' : 'text-[#685D52]'}`}
                    >
                      رابط صورة
                    </button>
                  </div>
                </div>

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileChange}
                  className="hidden"
                />

                {coverMode === 'upload' ? (
                  coverPreviewUrl ? (
                    <div className="flex items-center gap-3 bg-white border border-[#EADBCE] rounded-xl p-2.5">
                      <img src={coverPreviewUrl} alt="غلاف" className="w-16 h-20 object-cover rounded-lg border border-[#EADBCE] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#221811] m-0 truncate">
                          {pendingCoverFile ? pendingCoverFile.name : 'صورة الغلاف الحالية'}
                        </p>
                        <div className="mt-1">
                          <ImageSizeBadge
                            url={pendingCoverFile ? undefined : coverPreviewUrl}
                            bytes={pendingCoverFile?.size}
                            variant="pill"
                            prefix="الحجم: "
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          className="mt-2 text-[11px] font-bold text-[#8D6527] hover:underline cursor-pointer"
                        >
                          تغيير صورة الغلاف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-[#EADBCE] hover:border-[#8D6527] bg-white rounded-xl p-4 flex flex-col items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Upload className="w-5 h-5 text-[#8D6527]" />
                      <span className="text-xs font-bold text-[#221811]">اختاري صورة غلاف الكتاب</span>
                      <span className="text-[10px] text-[#968B7E]">PNG, JPG, WEBP حتى 5 ميجا</span>
                    </button>
                  )
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-white border border-[#EADBCE] rounded-xl px-3 py-2">
                      <LinkIcon className="w-4 h-4 text-[#968B7E] shrink-0" />
                      <input
                        value={draft.coverUrl}
                        onChange={e => {
                          setDraft(d => ({ ...d, coverUrl: e.target.value }))
                          setCoverPreviewUrl(e.target.value)
                          setPendingCoverFile(null)
                        }}
                        placeholder="https://ik.imagekit.io/..."
                        dir="ltr"
                        className="w-full border-0 outline-none text-xs text-[#221811] bg-transparent text-left"
                      />
                    </div>
                    {draft.coverUrl && (
                      <div className="flex items-center gap-2">
                        <img src={draft.coverUrl} alt="معاينة" className="w-10 h-12 rounded-lg object-cover border border-[#EADBCE]" />
                        <ImageSizeBadge url={draft.coverUrl} variant="pill" prefix="الحجم: " />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PDF File */}
              <div className="rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#221811] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#8D6527]" />
                    ملف الكتاب (PDF) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-lg border border-[#EADBCE] bg-white p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPdfMode('upload')}
                      className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${pdfMode === 'upload' ? 'bg-[#8D6527] text-white' : 'text-[#685D52]'}`}
                    >
                      رفع PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfMode('url')}
                      className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${pdfMode === 'url' ? 'bg-[#8D6527] text-white' : 'text-[#685D52]'}`}
                    >
                      رابط PDF
                    </button>
                  </div>
                </div>

                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePdfFileChange}
                  className="hidden"
                />

                {pdfMode === 'upload' ? (
                  pendingPdfFile || draft.pdfUrl ? (
                    <div className="flex items-center justify-between gap-3 bg-white border border-[#EADBCE] rounded-xl p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#8D6527]/10 text-[#8D6527] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#221811] m-0 truncate">
                            {pendingPdfFile ? pendingPdfFile.name : 'ملف PDF محفوظ'}
                          </p>
                          <p className="text-[10px] text-[#685D52] m-0 truncate" dir={pendingPdfFile ? 'rtl' : 'ltr'}>
                            {pendingPdfFile ? `الحجم: ${formatBytesArabic(pendingPdfFile.size)}` : draft.pdfUrl}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        className="text-[11px] font-bold text-[#8D6527] hover:underline shrink-0 cursor-pointer"
                      >
                        تغيير الملف
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-[#EADBCE] hover:border-[#8D6527] bg-white rounded-xl p-4 flex flex-col items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Upload className="w-5 h-5 text-[#8D6527]" />
                      <span className="text-xs font-bold text-[#221811]">اختاري ملف الكتاب PDF من جهازكِ</span>
                      <span className="text-[10px] text-[#968B7E]">حتى 25 ميجا</span>
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-2 bg-white border border-[#EADBCE] rounded-xl px-3 py-2">
                    <LinkIcon className="w-4 h-4 text-[#968B7E] shrink-0" />
                    <input
                      value={draft.pdfUrl}
                      onChange={e => {
                        setDraft(d => ({ ...d, pdfUrl: e.target.value }))
                        setPendingPdfFile(null)
                      }}
                      placeholder="https://ik.imagekit.io/..."
                      dir="ltr"
                      className="w-full border-0 outline-none text-xs text-[#221811] bg-transparent text-left"
                    />
                  </div>
                )}
              </div>

              {/* Order, Badge, Published */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                    ترتيب العرض
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={draft.order}
                    onChange={e => setDraft(d => ({ ...d, order: Number(e.target.value) }))}
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#221811] mb-1.5">
                    شارة مميزة (اختياري)
                  </label>
                  <input
                    value={draft.badge}
                    onChange={e => setDraft(d => ({ ...d, badge: e.target.value }))}
                    placeholder="مثلاً: إصدار خاص"
                    className="w-full bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 text-xs text-[#221811] outline-none focus:border-[#8D6527] focus:bg-white"
                  />
                </div>
                <label className="flex items-center gap-2.5 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3.5 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.isPublished}
                    onChange={e => setDraft(d => ({ ...d, isPublished: e.target.checked }))}
                    className="w-4 h-4 accent-[#8D6527]"
                  />
                  <span className="text-xs font-bold text-[#221811]">نشر الكتاب في المتجر</span>
                </label>
              </div>
            </div>

            <div className="p-5 sm:p-6 border-t border-[#EADBCE] bg-white flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-[#EADBCE] text-xs font-bold text-[#685D52] hover:bg-[#FAF7F2] cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#8D6527] hover:bg-[#704F1E] text-white text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{saving ? 'جارٍ الحفظ والرفع...' : editing ? 'حفظ التعديلات' : 'إضافة الكتاب'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal onClose={() => !isDeleting && setDeleteTarget(null)} size="sm">
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#221811] m-0 mb-2">حذف الكتاب</h3>
            <p className="text-xs text-[#685D52] leading-relaxed mb-5">
              هل تريدين حذف كتاب <strong>«{deleteTarget.title}»</strong> نهائياً؟
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#EADBCE] text-xs font-bold text-[#685D52] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void confirmDelete()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'جارٍ الحذف...' : 'حذف نهائياً'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
