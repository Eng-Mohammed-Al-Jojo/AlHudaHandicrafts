import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, Share2, Sparkles, ArrowRight, CheckCircle, ExternalLink, Clock, BookOpen } from 'lucide-react'
import BookReader from '../components/store/BookReader'
import type { Book, SiteSettings } from '../types'

interface Props {
  books?: Book[]
  settings?: SiteSettings
}

export default function BookPage({ books = [], settings: _settings }: Props) {
  const { id } = useParams<{ id?: string }>()

  const book = useMemo(() => {
    const published = books
      .filter(b => b.isPublished !== false)
      .sort((a, b) => a.order - b.order)
    if (id) {
      return books.find(b => b.id === id) ?? null
    }
    return published[0] ?? null
  }, [books, id])

  useEffect(() => {
    document.title = book
      ? `${book.title}${book.author ? ` — ${book.author}` : ''} | متجر الهدى`
      : 'مكتبة الكتب | متجر الهدى'
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [book])

  if (!book) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen py-16 animate-fade-in">
        <div className="container max-w-2xl">
          <div className="bg-white rounded-3xl border border-[#EADBCE] p-8 sm:p-14 text-center shadow-sm">
            <div className="w-20 h-20 rounded-3xl bg-[#FAF7F2] border border-[#EADBCE] text-[#8D6527] flex items-center justify-center mx-auto mb-5">
              <Clock className="w-9 h-9" />
            </div>
            <span className="inline-flex items-center gap-1.5 bg-[#8D6527]/10 text-[#8D6527] text-xs font-bold px-4 py-1.5 rounded-full mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>قريباً... انتظرونا</span>
            </span>
            <h1
              className="font-serif text-2xl sm:text-3xl font-bold text-[#221811] m-0 mb-3"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              الكتاب غير متوفر حالياً
            </h1>
            <p className="text-xs sm:text-sm text-[#685D52] leading-relaxed mb-7">
              لم يتم نشر هذا الكتاب بعد أو قد يكون قيد التحديث. تصفحي مكتبة الكتب أو عودي للرئيسية.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/books"
                className="inline-flex items-center gap-2 rounded-full bg-[#8D6527] hover:bg-[#6e4e1d] text-white text-xs font-bold px-6 py-3 no-underline"
              >
                <BookOpen className="w-4 h-4" />
                <span>مكتبة الكتب</span>
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-[#EADBCE] bg-[#FAF7F2] hover:border-[#8D6527] text-[#8D6527] text-xs font-bold px-6 py-3 no-underline"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الرئيسية</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const pdfUrl = book.pdfUrl
  const coverUrl = book.coverUrl
  const bookFileName = `${book.title.replace(/\s+/g, '_')}.pdf`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title,
          text: book.description,
          url: window.location.href,
        })
      } catch {
        // Ignored if cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert('تم نسخ رابط الكتاب بنجاح!')
    }
  }

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8 sm:py-12 animate-fade-in">
      <div className="container">
        {/* Breadcrumb & Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-[#685D52]">
            <Link to="/" className="text-[#8D6527] hover:underline flex items-center gap-1 font-semibold no-underline">
              <ArrowRight className="w-4 h-4" />
              <span>الرئيسية</span>
            </Link>
            <span className="text-[#C59B4B]">•</span>
            <Link to="/books" className="text-[#8D6527] hover:underline font-semibold no-underline">
              مكتبة الكتب
            </Link>
            <span className="text-[#C59B4B]">•</span>
            <span className="text-[#221811] font-bold truncate max-w-[180px] sm:max-w-xs">{book.title}</span>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-[#FAF7F2] border border-[#EADBCE] text-[#8D6527] px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors shadow-xs cursor-pointer"
              title="مشاركة رابط الكتاب"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>مشاركة</span>
            </button>

            <a
              href={pdfUrl}
              download={bookFileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#8D6527] hover:bg-[#6e4e1d] text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-xs no-underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل النسخة</span>
            </a>
          </div>
        </div>

        {/* Hero Title Banner */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-[#EADBCE]/60 border border-[#C59B4B]/30 rounded-full px-4 py-1.5 text-xs text-[#8D6527] font-bold mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
            <span>{book.badge || 'إصدار رقمي'} {book.author ? `• تأليف ${book.author}` : ''}</span>
          </div>

          <h1
            className="text-3xl sm:text-4xl lg:text-5xl text-[#221811] m-0 mb-3 font-normal leading-tight"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            {book.title}
          </h1>

          <p className="text-xs sm:text-sm text-[#685D52] max-w-2xl mx-auto leading-relaxed">
            {book.description}
          </p>
        </div>

        {/* Interactive Book Reader */}
        <div className="max-w-6xl mx-auto mb-16 shadow-2xl rounded-2xl overflow-hidden">
          <BookReader key={pdfUrl} pdfUrl={pdfUrl} className="w-full" />
        </div>

        {/* Book Description & Details */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-[#EADBCE] shadow-sm mb-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4 flex justify-center">
              <div className="w-48 sm:w-56 rounded-2xl overflow-hidden shadow-xl border-4 border-white transform hover:scale-105 transition-transform duration-300">
                <img
                  src={coverUrl}
                  alt={book.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div className="md:col-span-8">
              <span className="text-xs font-bold text-[#8D6527] tracking-wider uppercase block mb-1">
                عن هذا الكتاب
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif text-[#221811] m-0 mb-4" style={{ fontFamily: 'Amiri, serif' }}>
                {book.title}
              </h2>

              <p className="text-xs sm:text-sm text-[#685D52] leading-relaxed mb-4">
                {book.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#221811] mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#8D6527] shrink-0" />
                  <span>تصفح تفاعلي مريح للصفحات</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#8D6527] shrink-0" />
                  <span>متاح للقراءة الفورية والتحميل</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={pdfUrl}
                  download={bookFileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#8D6527] hover:bg-[#6e4e1d] text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm no-underline"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل النسخة الكاملة (PDF)</span>
                </a>

                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#FAF7F2] hover:bg-[#EADBCE] text-[#8D6527] border border-[#EADBCE] px-5 py-2.5 rounded-full text-xs font-bold transition-all no-underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح الملف في نافذة مستقلة</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Connection to Store Products */}
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-[#24180E] to-[#3D2C1E] rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="text-center sm:text-right">
            <h3 className="text-lg sm:text-xl font-bold font-serif text-[#DFB76C] m-0 mb-1" style={{ fontFamily: 'Amiri, serif' }}>
              شاهدي غرز البلاد مجسدة في قطعنا المطرزة
            </h3>
            <p className="text-xs sm:text-sm text-white/75 m-0 max-w-xl">
              تصفحي تشكيلة متجر الهدى المصنوعة يدوياً بأيدي حرفياتنا، والمستوحاة من تراث وأصالة التطريز الفلسطيني.
            </p>
          </div>

          <Link
            to="/products"
            className="shrink-0 bg-[#DFB76C] hover:bg-[#c9a157] text-[#24180E] px-6 py-3 rounded-full text-xs font-bold transition-colors no-underline shadow-md"
          >
            تصفح منتجات المتجر
          </Link>
        </div>
      </div>
    </div>
  )
}
