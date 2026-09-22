import { Link } from 'react-router-dom'
import { Sparkles, ArrowLeft, Layers } from 'lucide-react'
import type { Category } from '../types'

interface Props {
  categories: Category[]
}

export default function CategoriesPage({ categories }: Props) {
  const visible = categories.filter(c => c.isVisible).sort((a, b) => a.order - b.order)

  return (
    <div className="min-h-screen animate-fade-in bg-white">
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-[#F4EFE6] to-[#FAF7F2] py-14 sm:py-18 border-b border-[#EADBCE]">
        <div className="container text-center max-w-2xl mx-auto">
          <div className="eyebrow mx-auto justify-center mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
            <span>عوالم التطريز والإبداع</span>
          </div>
          <h1
            className="font-normal text-3xl sm:text-5xl text-[#221811] m-0 mb-3"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            أقسام المتجر
          </h1>
          <p className="text-xs sm:text-sm text-[#685D52] m-0 leading-relaxed">
            تنقلي بين تشكيلاتنا المتنوعة من العبايات والمفارش والإكسسوارات الفاخرة المطرزة يدوياً.
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <section className="py-16 sm:py-20">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {visible.map((cat, i) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className="group relative bg-[#FAF7F2] rounded-3xl overflow-hidden border border-[#EADBCE] hover:border-[#DFB76C] hover:shadow-xl transition-all duration-300 flex flex-col no-underline"
              >
                {/* Image Section */}
                <div className="h-64 overflow-hidden bg-[#FAF7F2] relative">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#EADBCE] text-[#C59B4B]/40">
                      <Layers className="w-12 h-12 stroke-[1.5]" />
                    </div>
                  )}

                  {/* Gradient Veil */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#18110B]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Index badge */}
                  <span className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-[#8D6527] font-serif font-bold text-xs flex items-center justify-center shadow-xs">
                    0{i + 1}
                  </span>
                </div>

                {/* Content Section */}
                <div className="p-6 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    <h2
                      className="font-normal text-2xl text-[#221811] m-0 mb-2 group-hover:text-[#8D6527] transition-colors"
                      style={{ fontFamily: 'Amiri, serif' }}
                    >
                      {cat.name}
                    </h2>
                    {cat.description ? (
                      <p className="text-xs text-[#685D52] leading-relaxed m-0 mb-4 line-clamp-2">
                        {cat.description}
                      </p>
                    ) : (
                      <p className="text-xs text-[#968B7E] m-0 mb-4">
                        مجموعة مطرزة يدوياً مصممة خصيصاً لأصحاب الذوق الرفيع.
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#FAF7F2] flex items-center justify-between text-xs font-bold text-[#8D6527]">
                    <span>استكشفي المجموعة</span>
                    <span className="w-7 h-7 rounded-full bg-[#FAF7F2] group-hover:bg-[#8D6527] group-hover:text-white flex items-center justify-center transition-colors">
                      <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
