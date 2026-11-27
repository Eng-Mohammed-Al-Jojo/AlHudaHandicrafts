import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Clock, Sparkles } from 'lucide-react'
import type { Book } from '../../types'
import Pagination, { usePagination } from '../ui/Pagination'

interface Props {
  books?: Book[]
}

export default function BookSection({ books = [] }: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 3

  const displayBooks = useMemo(
    () =>
      books
        .filter(b => b.isPublished !== false)
        .sort((a, b) => a.order - b.order),
    [books]
  )

  const { pageItems: pagedBooks, totalItems, totalPages, safePage } = usePagination(
    displayBooks,
    pageSize,
    currentPage
  )

  return (
    <section id="book" className="py-20 lg:py-28 bg-[#FAF7F2] relative overflow-hidden border-t border-[#EADBCE]">
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C59B4B]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#8D6527]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 lg:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#EADBCE]/60 border border-[#C59B4B]/30 rounded-full px-4 py-1.5 text-xs text-[#8D6527] font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
              <span>مكتبة متجر الهدى الرقمية</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-normal text-[#221811] m-0 leading-tight"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              إصدارات وكتب <span className="text-[#8D6527] font-bold">الهدى</span>
            </h2>
            <p className="text-[#685D52] text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              {displayBooks.length > 0
                ? 'انقري على صورة أي كتاب لمعاينته وتصفح صفحاته مباشرة أو تحميله، أو تصفحي مكتبة الكتب كاملة.'
                : 'نعمل حالياً على تجهيز مجموعة مميزة من الكتب والإصدارات التوثيقية في التطريز والتراث.'}
            </p>
          </div>

          <Link
            to="/books"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8D6527] hover:bg-[#6e4e1d] text-white px-7 py-3.5 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 no-underline shrink-0"
          >
            <BookOpen className="w-4 h-4" />
            <span>زيارة صفحة الكتب والتصفح</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Books Cover Showcase or Coming Soon */}
        {displayBooks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EADBCE] p-8 sm:p-12 text-center shadow-xs max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] text-[#8D6527] flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7" />
            </div>
            <span className="inline-flex items-center gap-1.5 bg-[#8D6527]/10 text-[#8D6527] text-xs font-bold px-3.5 py-1 rounded-full mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>قريباً... انتظرونا</span>
            </span>
            <h3
              className="font-serif text-2xl sm:text-3xl font-bold text-[#221811] m-0 mb-2"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              إصداراتنا القادمة قيد التجهيز
            </h3>
            <p className="text-xs sm:text-sm text-[#685D52] max-w-lg mx-auto leading-relaxed mb-6">
              سنشارككم قريباً كتباً ومراجع رقمية مميزة عن فنون التطريز الفلسطيني والأشغال اليدوية. ترقبونا في مكتبة الهدى!
            </p>
            <Link
              to="/books"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#EADBCE] bg-[#FAF7F2] hover:border-[#8D6527] text-[#8D6527] px-6 py-2.5 text-xs font-bold transition-colors no-underline"
            >
              <BookOpen className="w-4 h-4" />
              <span>الانتقال إلى صفحة الكتب</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap justify-center gap-6 lg:gap-8">
              {pagedBooks.map(book => (
                <Link
                  key={book.id}
                  to={`/book/${book.id}`}
                  className="group relative rounded-3xl overflow-hidden bg-white border border-[#EADBCE] shadow-sm hover:shadow-2xl hover:border-[#C59B4B] transition-all duration-300 no-underline flex flex-col w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-22px)] max-w-[380px]"
                >
                  <div className="relative aspect-[3/4] bg-[#FAF7F2] overflow-hidden">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#221811]/75 via-transparent to-transparent" />

                    {book.badge && (
                      <div className="absolute top-4 right-4 bg-[#24180E]/90 backdrop-blur-md text-[#DFB76C] border border-[#DFB76C]/30 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                        <Sparkles className="w-3 h-3" />
                        <span>{book.badge}</span>
                      </div>
                    )}

                    <div className="absolute bottom-4 inset-x-4 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-[#8D6527] group-hover:bg-[#A77933] text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-colors">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>معاينة الكتاب</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    {book.author && (
                      <span className="text-[11px] font-bold text-[#8D6527] block mb-1">
                        {book.author}
                      </span>
                    )}
                    <h3
                      className="font-serif text-xl font-bold text-[#221811] group-hover:text-[#8D6527] transition-colors m-0 mb-1.5 leading-snug"
                      style={{ fontFamily: 'Amiri, serif' }}
                    >
                      {book.title}
                    </h3>
                    <p className="text-xs text-[#685D52] m-0 line-clamp-2 leading-relaxed">
                      {book.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                className="bg-white rounded-2xl border border-[#EADBCE] p-4 max-w-2xl mx-auto shadow-xs"
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
