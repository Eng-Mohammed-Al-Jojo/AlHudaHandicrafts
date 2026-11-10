import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Download, Sparkles, ExternalLink, X, FileText, CheckCircle2, Bookmark, Layers } from 'lucide-react'
import BookReader from './BookReader'

export default function BookSection() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const bookPdfUrl = '/huda_book.pdf'
  const bookCoverUrl = '/huda_book_cover.jpg'
  const bookFileName = 'غرز_البلاد_دليل_التطريز_الفلسطيني_هدى_القريناوي.pdf'

  return (
    <>
      <section id="book" className="py-20 lg:py-28 bg-[#FAF7F2] relative overflow-hidden border-t border-[#EADBCE]">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C59B4B]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#8D6527]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

            {/* Book Visual Showcase with 3D Effect */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative group max-w-[340px] sm:max-w-[380px] w-full">
                {/* Book shadow effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-[#8D6527]/25 to-[#C59B4B]/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-70" />

                {/* Book Cover Frame */}
                <div className="relative rounded-2xl overflow-hidden bg-white shadow-2xl border-4 border-white transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_25px_50px_-12px_rgba(34,24,17,0.35)]">
                  <img
                    src={bookCoverUrl}
                    alt="غلاف كتاب غرز البلاد - دليل التطريز الفلسطيني - هدى أمين القريناوي"
                    className="w-full h-auto object-cover block"
                    loading="lazy"
                  />

                  {/* Gradient sheen overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/10 pointer-events-none" />

                  {/* Floating Exclusive Badge */}
                  <div className="absolute top-4 right-4 bg-[#24180E]/90 backdrop-blur-md text-[#F7F1E5] border border-[#DFB76C]/40 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                    <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
                    <span>إصدار توثيقي خاص</span>
                  </div>

                  {/* Quick Preview overlay on hover */}
                  <div className="absolute inset-0 bg-[#221811]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 gap-2.5">
                    <Link
                      to="/book"
                      className="bg-[#8D6527] text-white hover:bg-[#6e4e1d] px-5 py-2.5 rounded-full text-xs font-bold shadow-xl transition-all flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 no-underline"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>تصفح صفحات الكتاب</span>
                    </Link>

                  </div>
                </div>

                {/* Subtle Book Spine Reflection */}
                <div className="mt-4 flex items-center justify-between text-xs text-[#685D52] px-2 font-medium">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#8D6527]" />
                    ملف رقمي عالي الدقة (PDF)
                  </span>

                </div>
              </div>
            </div>

            {/* Book Content Narrative & Actions */}
            <div className="lg:col-span-7">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 bg-[#EADBCE]/50 border border-[#C59B4B]/30 rounded-full px-4 py-1.5 text-xs text-[#8D6527] font-bold mb-4">
                <Bookmark className="w-3.5 h-3.5 text-[#C59B4B]" />
                <span>إهداء خاص من صاحبة المتجر • هدى أمين القريناوي</span>
              </div>

              {/* Title */}
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-normal text-[#221811] leading-tight mb-4"
                style={{ fontFamily: 'Amiri, serif' }}
              >
                كتاب <span className="text-[#8D6527] font-bold">غرز البلاد</span>
                <br />
                <span className="text-2xl sm:text-3xl lg:text-4xl text-[#685D52]">
                  دليل التطريز الفلسطيني الأصيل
                </span>
              </h2>

              {/* Description */}
              <p className="text-[#685D52] text-sm sm:text-base leading-relaxed mb-6">
                انطلاقاً من الإيمان بأن التطريز الفلسطيني ليس مجرد خيوط وأقمشة، بل هو ذاكرة وطن وهوية متجذرة تُحكى عبر الأجيال، وضعت الحرفية والباحثة <strong>هدى أمين القريناوي</strong> هذا الدليل التوثيقي بين أيديكم، ليكون مرجعاً لكل سيدة وعاشقة لهذا الفن التراثي العريق.
              </p>

              {/* Highlights & Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
                <div className="flex items-start gap-3 bg-white/80 border border-[#EADBCE] rounded-2xl p-3.5">
                  <CheckCircle2 className="w-5 h-5 text-[#8D6527] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#221811] m-0">تصفح مثل كتاب حقيقي</h3>
                    <p className="text-[11px] sm:text-xs text-[#685D52] m-0 mt-0.5">صفحات متجاورة بجوار بعضها البعض، مع سهولة التنقل والتقريب.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/80 border border-[#EADBCE] rounded-2xl p-3.5">
                  <CheckCircle2 className="w-5 h-5 text-[#8D6527] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#221811] m-0">دليل عملي وتطبيقي</h3>
                    <p className="text-[11px] sm:text-xs text-[#685D52] m-0 mt-0.5">خطوات مبسطة وتقنيات احترافية تناسب المبتدئات وصانعات الحرف اليدوية.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/80 border border-[#EADBCE] rounded-2xl p-3.5">
                  <CheckCircle2 className="w-5 h-5 text-[#8D6527] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#221811] m-0">نسخة رقمية مجانية كاملة</h3>
                    <p className="text-[11px] sm:text-xs text-[#685D52] m-0 mt-0.5">متاحة للقراءة الفورية والتنزيل المباشر كهدية معرفية لجميع زوار المتجر.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/80 border border-[#EADBCE] rounded-2xl p-3.5">
                  <CheckCircle2 className="w-5 h-5 text-[#8D6527] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#221811] m-0">جودة طباعة عالية</h3>
                    <p className="text-[11px] sm:text-xs text-[#685D52] m-0 mt-0.5">ملف PDF مجهز بأعلى دقة للصور والنصوص جاهز للطباعة أو القراءة الرقمية.</p>
                  </div>
                </div>
              </div>

              {/* Call to Actions (Buttons) */}
              <div className="flex flex-wrap items-center gap-3.5">
                {/* View / Read Dedicated Page Button */}
                <Link
                  to="/book"
                  className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#8D6527] hover:bg-[#6e4e1d] text-white px-7 py-3.5 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 no-underline"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>تصفح الكتاب</span>
                </Link>

                {/* Download Button */}
                <a
                  href={bookPdfUrl}
                  download={bookFileName}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-[#FAF7F2] border-2 border-[#8D6527] text-[#8D6527] hover:text-[#6e4e1d] px-6 py-3.5 text-xs sm:text-sm font-bold transition-all duration-300 shadow-xs no-underline"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل PDF</span>
                </a>
              </div>

            </div>

          </div>
        </div>
      </section>


    </>
  )
}
