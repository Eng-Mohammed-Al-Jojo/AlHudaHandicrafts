import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Download, Share2, Sparkles, Heart, ArrowRight, BookOpen, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react'
import BookReader from '../components/store/BookReader'
import type { SiteSettings } from '../types'

interface Props {
  settings?: SiteSettings
}

export default function BookPage({ settings }: Props) {
  const pdfUrl = '/huda_book.pdf'
  const bookFileName = 'غرز_البلاد_دليل_التطريز_الفلسطيني_هدى_القريناوي.pdf'

  useEffect(() => {
    document.title = 'كتاب غرز البلاد: دليل التطريز الفلسطيني — هدى أمين القريناوي | متجر الهدى'
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'كتاب غرز البلاد: دليل التطريز الفلسطيني',
          text: 'تصفحي وحملي كتاب غرز البلاد - دليل التطريز الفلسطيني للكاتبة هدى أمين القريناوي إهداء من متجر الهدى',
          url: window.location.href,
        })
      } catch {
        // Ignored if cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('تم نسخ رابط الكتاب بنجاح!')
    }
  }

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8 sm:py-12 animate-fade-in">
      <div className="container">

        {/* ── Breadcrumb & Top Navigation ── */}
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-[#685D52]">
            <Link to="/" className="text-[#8D6527] hover:underline flex items-center gap-1 font-semibold">
              <ArrowRight className="w-4 h-4" />
              <span>الرئيسية</span>
            </Link>
            <span className="text-[#C59B4B]">•</span>
            <span className="text-[#221811] font-bold">كتاب غرز البلاد</span>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-[#FAF7F2] border border-[#EADBCE] text-[#8D6527] px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors shadow-xs"
              title="مشاركة رابط الكتاب"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>مشاركة</span>
            </button>

            <a
              href={pdfUrl}
              download={bookFileName}
              className="inline-flex items-center gap-1.5 bg-[#8D6527] hover:bg-[#6e4e1d] text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-xs no-underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل النسخة </span>
            </a>
          </div>
        </div>

        {/* ── Hero Title Banner ── */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-[#EADBCE]/60 border border-[#C59B4B]/30 rounded-full px-4 py-1.5 text-xs text-[#8D6527] font-bold mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
            <span>توثيق الهوية والتراث الفلسطيني • تأليف هدى أمين القريناوي</span>
          </div>

          <h1
            className="text-3xl sm:text-4xl lg:text-5xl text-[#221811] m-0 mb-3 font-normal leading-tight"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            كتاب <span className="text-[#8D6527] font-bold">غرز البلاد</span>: دليل التطريز الفلسطيني
          </h1>

          <p className="text-xs sm:text-sm text-[#685D52] max-w-2xl mx-auto leading-relaxed">
            استمتعي بتصفح صفحات الكتاب التراثي الشامل مثل كتاب حقيقي مفتوح بين يديكِ، مع إمكانية التنقل السلس، التقريب والتبعيد، والتنزيل المباشر كنسخة PDF أصلية.
          </p>
        </div>

        {/* ── Interactive Book Reader (Flip / Spread Canvas) ── */}
        <div className="max-w-6xl mx-auto mb-16 shadow-2xl rounded-2xl overflow-hidden">
          <BookReader pdfUrl={pdfUrl} className="w-full" />
        </div>

        {/* ── Book Description & Heritage Highlights ── */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-[#EADBCE] shadow-sm mb-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">

            <div className="md:col-span-4 flex justify-center">
              <div className="w-48 sm:w-56 rounded-2xl overflow-hidden shadow-xl border-4 border-white transform hover:scale-105 transition-transform duration-300">
                <img
                  src="/huda_book_cover.jpg"
                  alt="غلاف كتاب غرز البلاد"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div className="md:col-span-8">
              <span className="text-xs font-bold text-[#8D6527] tracking-wider uppercase block mb-1">
                عن هذا الكتاب التوثيقي
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif text-[#221811] m-0 mb-4" style={{ fontFamily: 'Amiri, serif' }}>
                ذاكرة خيط، وروح وطن لا تغيب
              </h2>

              <p className="text-xs sm:text-sm text-[#685D52] leading-relaxed mb-4">
                يأتي كتاب <strong>«غرز البلاد»</strong> من منطلق الشغف والمسؤولية التوثيقية للحرفية <strong>هدى أمين القريناوي</strong> لحفظ تقنيات وأسماء وتاريخ غرز التطريز الفلسطيني الأصيل ونقلها للأجيال القادمة بأسلوب عصري مصور وموثق.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#221811] mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#8D6527] shrink-0" />
                  <span>دليل مصور لغرز القرى والمدن الفلسطينية</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#8D6527] shrink-0" />
                  <span>شروحات تطبيقية وخطوات الخياطة والتطريز</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#8D6527] shrink-0" />
                  <span>أنواع الخيوط والأقمشة التقليدية والفاخرة</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#8D6527] shrink-0" />
                  <span>إهداء مجاني ومفتوح لجميع عشاق التراث</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={pdfUrl}
                  download={bookFileName}
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

        {/* ── Connection to Store Products ── */}
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
            className="inline-flex items-center gap-2.5 bg-[#8D6527] hover:bg-[#DFB76C] hover:text-[#221811] text-white px-7 py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 no-underline shrink-0 shadow-lg"
          >
            <BookOpen className="w-4 h-4" />
            <span>تسوقي القطع المطرزة</span>
          </Link>
        </div>

      </div>
    </div>
  )
}

