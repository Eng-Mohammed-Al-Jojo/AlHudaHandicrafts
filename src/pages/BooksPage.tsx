import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock, Download, ShoppingBag, Sparkles } from 'lucide-react'
import type { Book } from '../types'
import Pagination, { usePagination } from '../components/ui/Pagination'

interface Props {
  books: Book[]
}

export default function BooksPage({ books }: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 3

  useEffect(() => {
    document.title = 'مكتبة الكتب | متجر الهدى'
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  const visibleBooks = useMemo(
    () =>
      books
        .filter(b => b.isPublished !== false)
        .sort((a, b) => a.order - b.order),
    [books]
  )

  const { pageItems: pagedBooks, totalItems, totalPages, safePage } = usePagination(
    visibleBooks,
    pageSize,
    currentPage
  )

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-10 sm:py-14 animate-fade-in">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-[#685D52] mb-6 sm:mb-8">
          <Link to="/" className="text-[#8D6527] hover:underline flex items-center gap-1 font-semibold no-underline">
            <ArrowRight className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>
          <span className="text-[#C59B4B]">•</span>
          <span className="text-[#221811] font-bold">مكتبة الكتب</span>
        </nav>

        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 bg-[#EADBCE]/60 border border-[#C59B4B]/30 rounded-full px-4 py-1.5 text-xs text-[#8D6527] font-bold mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
            <span>إصدارات ومراجع التطريز والتراث</span>
          </div>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl text-[#221811] m-0 mb-3 font-normal leading-tight"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            مكتبة <span className="text-[#8D6527] font-bold">كتب الهدى</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#685D52] max-w-2xl mx-auto leading-relaxed">
            {visibleBooks.length > 0
              ? 'اختاري أي كتاب بالنقر على صورته لفتح صفحة المعاينة التفاعلية وقراءته أو تحميله بصيغة PDF.'
              : 'مكتبتنا الرقمية قيد الإعداد والتجهيز — ترقبوا إطلاق أحدث الكتب والمراجع قريباً.'}
          </p>
        </div>

        {/* Books Grid or Coming Soon */}
        {visibleBooks.length === 0 ? (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-[#EADBCE] p-8 sm:p-14 text-center shadow-sm">
            <div className="w-20 h-20 rounded-3xl bg-[#FAF7F2] border border-[#EADBCE] text-[#8D6527] flex items-center justify-center mx-auto mb-5">
              <Clock className="w-9 h-9" />
            </div>
            <span className="inline-flex items-center gap-1.5 bg-[#8D6527]/10 text-[#8D6527] text-xs font-bold px-4 py-1.5 rounded-full mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>قريباً... انتظرونا</span>
            </span>
            <h2
              className="font-serif text-2xl sm:text-3xl font-bold text-[#221811] m-0 mb-3"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              لا توجد كتب منشورة حالياً — قريباً بإذن الله
            </h2>
            <p className="text-xs sm:text-sm text-[#685D52] leading-relaxed max-w-md mx-auto mb-7">
              نعمل على تجهيز إصدارات ومراجع قيّمة حول التطريز الفلسطيني الأصيل. يسعدنا عودتكم قريباً، ويمكنكم في الأثناء تصفح قطعنا المطرزة في المتجر.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-full bg-[#8D6527] hover:bg-[#6e4e1d] text-white text-xs font-bold px-6 py-3 transition-colors no-underline shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>تصفح منتجات المتجر</span>
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-[#EADBCE] bg-[#FAF7F2] hover:border-[#8D6527] text-[#8D6527] text-xs font-bold px-6 py-3 transition-colors no-underline"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة للرئيسية</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex flex-wrap justify-center gap-7 lg:gap-8">
              {pagedBooks.map(book => {
                const previewPath = `/book/${book.id}`
                return (
                  <div
                    key={book.id}
                    className="group bg-white rounded-3xl border border-[#EADBCE] overflow-hidden shadow-xs hover:shadow-xl hover:border-[#C59B4B] transition-all duration-300 flex flex-col justify-between w-full sm:w-[calc(50%-14px)] lg:w-[calc(33.333%-22px)] max-w-[380px]"
                  >
                    {/* Clickable Cover Image */}
                    <Link
                      to={previewPath}
                      className="block relative aspect-[3/4] bg-[#FAF7F2] overflow-hidden no-underline"
                    >
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#221811]/70 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                      {book.badge && (
                        <div className="absolute top-4 right-4 bg-[#24180E]/90 backdrop-blur-md text-[#DFB76C] border border-[#DFB76C]/30 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                          <Sparkles className="w-3 h-3" />
                          <span>{book.badge}</span>
                        </div>
                      )}

                      <div className="absolute bottom-4 inset-x-4 flex items-center justify-between gap-2 text-white">
                        <span className="inline-flex items-center gap-1.5 bg-[#8D6527] group-hover:bg-[#A77933] text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-colors">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>معاينة وتصفح الكتاب</span>
                        </span>
                      </div>
                    </Link>

                    {/* Book Info */}
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        {book.author && (
                          <span className="text-[11px] font-bold text-[#8D6527] block mb-1">
                            {book.author}
                          </span>
                        )}
                        <Link to={previewPath} className="no-underline">
                          <h2
                            className="font-serif text-xl sm:text-2xl font-bold text-[#221811] group-hover:text-[#8D6527] transition-colors m-0 mb-2 leading-snug"
                            style={{ fontFamily: 'Amiri, serif' }}
                          >
                            {book.title}
                          </h2>
                        </Link>
                        <p className="text-xs text-[#685D52] m-0 line-clamp-3 leading-relaxed">
                          {book.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-[#FAF7F2]">
                        <Link
                          to={previewPath}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#8D6527] hover:bg-[#6e4e1d] text-white text-xs font-bold py-2.5 px-4 transition-colors no-underline"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>تصفح الآن</span>
                        </Link>
                        <a
                          href={book.pdfUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EADBCE] bg-[#FAF7F2] hover:border-[#8D6527] text-[#8D6527] text-xs font-bold py-2.5 px-4 transition-colors no-underline"
                          title="تحميل PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={page => {
                  setCurrentPage(page)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="bg-white rounded-2xl border border-[#EADBCE] p-4 max-w-2xl mx-auto shadow-xs"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
