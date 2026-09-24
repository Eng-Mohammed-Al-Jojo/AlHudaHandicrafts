import { useSearchParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import ProductGrid from '../components/store/ProductGrid'
import type { Product, Category } from '../types'

interface Props {
  products: Product[]
  categories: Category[]
  onAddToCart: (p: Product) => void
}

export default function ProductsPage({ products, categories, onAddToCart }: Props) {
  const [params] = useSearchParams()
  const cat = params.get('category') ?? ''
  const q = params.get('q') ?? ''

  const hasActiveCategory = categories.some(category => category.id === cat)
  const effectiveCategory = hasActiveCategory ? cat : ''
  const activeCategoryName = categories.find(c => c.id === effectiveCategory)?.name

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Page Header Banner */}
      <div className="bg-gradient-to-b from-[#F4EFE6] to-[#FAF7F2] py-14 sm:py-18 border-b border-[#EADBCE]">
        <div className="container text-center max-w-2xl mx-auto">
          <div className="eyebrow mx-auto justify-center mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
            <span>تشكيلتنا المطرزة بالكامل</span>
          </div>
          <h1
            className="font-normal text-3xl sm:text-5xl text-[#221811] m-0 mb-3"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            {activeCategoryName ? `قسم «${activeCategoryName}»` : 'متجر الهدى للتطريز'}
          </h1>
          <p className="text-xs sm:text-sm text-[#685D52] m-0 leading-relaxed">
            استكشفي أروع القطع المصممة والمطرزة يدوياً بحرفية عالية لخلق إطلالة تأسر القلوب في كل مناسبة.
          </p>
        </div>
      </div>

      <ProductGrid
        products={products}
        categories={categories}
        initialCategory={effectiveCategory}
        initialQuery={q}
        onAddToCart={onAddToCart}
        heading={activeCategoryName ? `منتجات ${activeCategoryName}` : 'جميع المعروضات'}
        subheading="اختاري ما يبهج روحكِ"
        featured={false}
      />
    </div>
  )
}
