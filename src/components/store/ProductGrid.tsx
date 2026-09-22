import { useEffect, useState, useMemo } from 'react'
import { Search, X, Sparkles, SlidersHorizontal, ArrowLeft } from 'lucide-react'
import type { Product, Category } from '../../types'
import ProductCard from './ProductCard'
import ProductModal from './ProductModal'

interface Props {
  products: Product[]
  categories: Category[]
  initialCategory?: string
  initialQuery?: string
  onAddToCart: (p: Product) => void
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
  const [quickView, setQuickView] = useState<Product | null>(null)

  // The same page instance stays mounted when only its URL query changes.
  // Keep filter state in sync when a shopper opens another category or search.
  useEffect(() => {
    setSelectedCat(initialCategory)
  }, [initialCategory])

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const published = products.filter(p => p.isPublished)

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

  const displayList = featured ? filtered.slice(0, 8) : filtered

  return (
    <section className={`py-20 ${featured ? 'bg-[#FAF7F2]' : 'bg-white'}`} id="products">
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
                onChange={e => setQuery(e.target.value)}
                placeholder="ابحثي عن قطعة أو تصميم..."
                className="border-0 outline-none flex-1 text-xs text-[#221811] placeholder-[#968B7E] bg-transparent"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
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
                onClick={() => setSelectedCat('')}
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
                  onClick={() => setSelectedCat(cat.id === selectedCat ? '' : cat.id)}
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
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="w-full sm:w-auto bg-[#FAF7F2] border border-[#EADBCE] text-[#221811] text-xs font-medium rounded-full px-4 py-2.5 outline-none focus:border-[#C59B4B] cursor-pointer"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-[#685D52] mb-6 px-1">
          <span>
            {filtered.length > 0 ? (
              <>يتم عرض <strong className="text-[#221811]">{displayList.length}</strong> من إجمالي <strong className="text-[#221811]">{filtered.length}</strong> منتج</>
            ) : null}
            {selectedCat && ` في قسم «${categories.find(c => c.id === selectedCat)?.name}»`}
          </span>

          {(query || selectedCat) && (
            <button
              onClick={() => { setQuery(''); setSelectedCat('') }}
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
              onClick={() => { setQuery(''); setSelectedCat('') }}
              className="rounded-full bg-[#8D6527] hover:bg-[#704F1E] text-white px-6 py-2.5 text-xs font-semibold transition-all shadow-sm"
            >
              عرض جميع المنتجات
            </button>
          </div>
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
