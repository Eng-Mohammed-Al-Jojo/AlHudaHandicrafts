import { useState } from 'react'
import { Eye, Plus, Check } from 'lucide-react'
import type { Product } from '../../types'
import { useCurrency } from '../../context/CurrencyContext'

interface Props {
  product: Product
  onAddToCart: (product: Product) => void
  onQuickView: (product: Product) => void
}

export default function ProductCard({ product, onAddToCart, onQuickView }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const { formatPrice } = useCurrency()
  
  const mainImage = product.images.length > 0 
    ? [...product.images].sort((a, b) => a.order - b.order)[0]
    : null

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (!product.isAvailable) return
    onAddToCart(product)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  return (
    <article
      onClick={() => onQuickView(product)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onQuickView(product) }}
      role="button"
      tabIndex={0}
      aria-label={`عرض تفاصيل ${product.name}`}
      className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-[#EADBCE] hover:border-[#DFB76C] hover:shadow-xl transition-all duration-300 flex flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C59B4B]"
    >
      {/* Product Image Box */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#FAF7F2]">
        {mainImage ? (
          <img
            src={mainImage.url}
            alt={mainImage.alt || product.name}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-106 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#968B7E] text-xs">
            لا توجد صورة
          </div>
        )}

        {/* Badge Ribbon */}
        {product.badge && (
          <span className="absolute top-3 right-3 z-10 bg-[#24180E]/90 backdrop-blur-md text-[#DFB76C] text-[10px] font-bold px-3 py-1 rounded-full shadow-xs border border-[#C59B4B]/30 tracking-wide">
            {product.badge}
          </span>
        )}

        {/* Not Available Overlay */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex items-center justify-center z-10">
            <span className="bg-[#221811] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
              غير متوفر حالياً
            </span>
          </div>
        )}

        {/* Quick View Button Hover Overlay */}
        <div className="absolute inset-x-0 bottom-3 px-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button
            onClick={e => { e.stopPropagation(); onQuickView(product) }}
            className="w-full py-2.5 rounded-xl bg-white/95 backdrop-blur-md text-[#221811] hover:text-[#8D6527] text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 transition-all"
          >
            <Eye className="w-3.5 h-3.5 text-[#C59B4B]" />
            <span>معاينة سريعة</span>
          </button>
        </div>

        {/* Multiple Images Dots Indicator */}
        {product.images.length > 1 && (
          <div className="absolute top-3 left-3 flex items-center gap-1 z-10 bg-black/30 backdrop-blur-xs px-2 py-1 rounded-full">
            {product.images.slice(0, 3).map((_, i) => (
              <span
                key={i}
                className={`block w-1.5 h-1.5 rounded-full ${
                  i === 0 ? 'bg-[#DFB76C]' : 'bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-semibold text-[#8D6527] uppercase tracking-wider block mb-1">
            {product.categoryName}
          </span>
          <h3 className="font-bold text-sm sm:text-base text-[#221811] m-0 mb-2 leading-snug group-hover:text-[#8D6527] transition-colors line-clamp-2">
            {product.name}
          </h3>
        </div>

        <div className="pt-3 border-t border-[#FAF7F2] flex items-center justify-between mt-auto">
          {/* Price */}
          <span className="text-base sm:text-lg font-bold text-[#8D6527]" dir="ltr">{formatPrice(product.price)}</span>

          {/* Add to Cart Button */}
          <button
            onClick={handleAdd}
            disabled={!product.isAvailable}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 shadow-xs ${
              justAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-[#FAF7F2] text-[#8D6527] border border-[#EADBCE] hover:bg-[#8D6527] hover:text-white hover:border-[#8D6527]'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            aria-label={`إضافة ${product.name} للسلة`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>أُضيفت</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">أضيفي</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}
