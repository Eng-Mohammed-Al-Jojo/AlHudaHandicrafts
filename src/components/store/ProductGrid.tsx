import { useEffect, useRef, useState, useMemo } from 'react'
import { Search, X, Sparkles, SlidersHorizontal, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product, Category } from '../../types'
import ProductCard from './ProductCard'
import ProductModal from './ProductModal'
import SelectMenu from '../ui/SelectMenu'

interface Props {
  products: Product[]
  categories: Category[]
  initialCategory?: string
  initialQuery?: string
  onAddToCart: (p: Product, quantity?: number) => void
  heading?: string
  subheading?: string
  featured?: boolean
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث أولاً' },
  { value: 'price-asc', label: 'السعر: من الأقل للأعلى' },
  { value: 'price-desc', label: 'السعر: من الأعلى للأقل' },
  { value: 'name', label: 'الترتيب الأبجدي' },
]

const PAGE_SIZE = 8

function pageItems(total: number, current: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set<number>([1, total, current - 1, current, current + 1])
  if (current <= 3) [2, 3, 4].forEach(page => pages.add(page))
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach(page => pages.add(page))
  const sorted = [...pages].filter(page => page >= 1 && page <= total).sort((a, b) => a - b)
  return sorted.reduce<Array<number | '…'>>((items, page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push('…')
    items.push(page)
    return items
  }, [])
}

export default function ProductGrid({
  products,
  categories,
  initialCategory = '',
  initialQuery = '',
  onAddToCart,
  heading = 'تشكيلة مختارة',
  subheading = 'فن التطريز بين يديكِ',
  featured = false,
}: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [selectedCat, setSelectedCat] = useState(initialCategory)
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [quickView, setQuickView] = useState<Product | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  // The same page instance stays mounted when only its URL query changes.
  // Keep filter state in sync when a shopper opens another category or search.
  useEffect(() => {
    setSelectedCat(initialCategory)
    setPage(1)
  }, [initialCategory])

  useEffect(() => {
    setQuery(initialQuery)
    setPage(1)
  }, [initialQuery])

  const published = useMemo(() => products.filter(p => p.isPublished), [products])

  const filtered = useMemo(() => {
    let list = published
    if (selectedCat) list = list.filter(p => p.categoryId === selectedCat)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.categoryName.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
      )
    }
    switch (sort) {
      case 'price-asc':  return [...list].sort((a, b) => a.price - b.price)
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price)
      case 'name':       return [...list].sort((a, b) => a.name.localeCompare(b.name))
      default:           return [...list].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    }
  }, [published, selectedCat, query, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const displayList = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [selectedCat, query, sort])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function goToPage(nextPage: number) {
    const target = Math.min(Math.max(1, nextPage), totalPages)
    if (target === currentPage) return
    setPage(target)
    window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <section ref={sectionRef} className={`py-20 ${featured ? 'bg-[#FAF7F2]' : 'bg-white'}`} id="products">
      <div className="container">
        
        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="eyebrow">
              <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
              <span>{subheading}</span>
            </div>
            <h2
              className="font-normal text-3xl sm:text-4xl lg:text-5xl text-[#221811] m-0"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              {heading}
            </h2>
          </div>
          
          {featured && (
            <a
              href="/products"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#8D6527] hover:text-[#C59B4B] no-underline pb-1 border-b border-[#C59B4B]/40 transition-colors group"
            >
              <span>استعراض المتجر بالكامل ({published.length} منتج)</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </a>
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#EADBCE] p-4 mb-8 shadow-xs">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] rounded-full px-4 py-2.5 sm:w-80 focus-within:border-[#C59B4B] focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-[#8D6527] shrink-0" />
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1) }}
                placeholder="ابحثي عن قطعة أو تصميم..."
                className="border-0 outline-none flex-1 text-xs text-[#221811] placeholder-[#968B7E] bg-transparent"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setPage(1) }}
                  className="text-[#968B7E] hover:text-[#221811] p-0.5"
                  aria-label="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <button
                onClick={() => { setSelectedCat(''); setPage(1) }}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  !selectedCat
                    ? 'bg-[#8D6527] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#685D52] border border-[#EADBCE] hover:border-[#C59B4B]'
                }`}
              >
                الكل
              </button>
              {categories.filter(c => c.isVisible).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCat(cat.id === selectedCat ? '' : cat.id); setPage(1) }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    selectedCat === cat.id
                      ? 'bg-[#8D6527] text-white shadow-xs'
                      : 'bg-[#FAF7F2] text-[#685D52] border border-[#EADBCE] hover:border-[#C59B4B]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#8D6527] shrink-0 hidden sm:block" />
              <SelectMenu
                value={sort}
                options={SORT_OPTIONS}
                onChange={value => { setSort(value); setPage(1) }}
                variant="store"
                className="w-full sm:w-auto"
                menuMinWidth={220}
                ariaLabel="ترتيب المنتجات"
              />
            </div>

          </div>
        </div>

        {/* Results Counter */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#685D52] mb-6 px-1">
          <span className="flex flex-wrap items-center gap-2">
            {filtered.length > 0 ? (
              <>يتم عرض <strong className="text-[#221811]">{displayList.length}</strong> من إجمالي <strong className="text-[#221811]">{filtered.length}</strong> منتج</>
            ) : null}
            {selectedCat && ` في قسم «${categories.find(c => c.id === selectedCat)?.name}»`}
            {filtered.length > 0 && totalPages > 1 && (
              <span className="text-[#968B7E]">
                — الصفحة <strong className="text-[#221811]">{currentPage}</strong> من <strong className="text-[#221811]">{totalPages}</strong>
              </span>
            )}
          </span>

          {(query || selectedCat) && (
            <button
              onClick={() => { setQuery(''); setSelectedCat(''); setPage(1) }}
              className="text-[#8D6527] hover:underline font-medium text-xs"
            >
              إلغاء الفلاتر والبحث
            </button>
          )}
        </div>

        {/* Products Grid */}
        {displayList.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayList.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={onAddToCart}
                onQuickView={setQuickView}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#EADBCE] p-8">
            <div className="w-16 h-16 rounded-full bg-[#FAF7F2] flex items-center justify-center mx-auto mb-4 text-[#C59B4B]">
              <Search className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h4 className="font-serif text-2xl text-[#221811] m-0 mb-2" style={{ fontFamily: 'Amiri, serif' }}>
              لم نعثر على نتائج مطابقة
            </h4>
            <p className="text-xs text-[#685D52] max-w-sm mx-auto mb-6 leading-relaxed">
              جرّبي تغيير كلمات البحث أو استعراض قسم آخر من أقسام التطريز الفاخرة لدينا.
            </p>
            <button
              onClick={() => { setQuery(''); setSelectedCat(''); setPage(1) }}
              className="rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white px-6 py-2.5 text-xs font-semibold transition-all shadow-sm"
            >
              عرض جميع المنتجات
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav aria-label="التنقل بين صفحات المنتجات" className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#EADBCE] bg-white px-4 py-2 text-xs font-bold text-[#685D52] transition-all hover:border-[#C59B4B] hover:text-[#8D6527] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </button>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {pageItems(totalPages, currentPage).map((item, index) =>
                item === '…' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-xs text-[#968B7E]">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToPage(item)}
                    aria-label={`الصفحة ${item}`}
                    aria-current={item === currentPage ? 'page' : undefined}
                    className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                      item === currentPage
                        ? 'bg-[#8D6527] text-white shadow-xs'
                        : 'border border-[#EADBCE] bg-white text-[#685D52] hover:border-[#C59B4B] hover:text-[#8D6527]'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#EADBCE] bg-white px-4 py-2 text-xs font-bold text-[#685D52] transition-all hover:border-[#C59B4B] hover:text-[#8D6527] disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </button>
          </nav>
        )}

        {/* Quick View Modal */}
        {quickView && (
          <ProductModal
            product={quickView}
            onAddToCart={onAddToCart}
            onClose={() => setQuickView(null)}
          />
        )}

      </div>
    </section>
  )
}
