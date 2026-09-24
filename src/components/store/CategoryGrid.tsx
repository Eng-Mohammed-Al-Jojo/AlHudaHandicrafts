import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import type { Category } from '../../types'

interface Props {
  categories: Category[]
}

export default function CategoryGrid({ categories }: Props) {
  const visible = [...categories].filter(c => c.isVisible).sort((a, b) => a.order - b.order)

  return (
    <section className="py-20 bg-white" id="categories">
      <div className="container">

        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <div className="eyebrow">
              <Sparkles className="w-3.5 h-3.5 text-[#C59B4B]" />
              <span>اكتشفي عالمنا الراقي</span>
            </div>
            <h2
              className="font-normal text-3xl sm:text-4xl lg:text-5xl text-[#221811] mt-6 sm:mt-4"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              أقسام صُممت لتلهمكِ
            </h2>
          </div>

          <Link
            to="/categories"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#8D6527] hover:text-[#C59B4B] no-underline pb-1 border-b border-[#C59B4B]/40 transition-colors group"
          >
            <span>استعراض كافة الأقسام</span>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {visible.map((cat, i) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.id}`}
              className="group relative h-84 rounded-2xl overflow-hidden no-underline block bg-[#FAF7F2] border border-[#EADBCE] hover:border-[#C59B4B] shadow-xs hover:shadow-xl transition-all duration-500"
            >
              {/* Category Image */}
              {cat.imageUrl ? (
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#FAF7F2] to-[#EADBCE] flex items-center justify-center">
                  <span className="font-serif text-5xl text-[#C59B4B]/40">الهدى</span>
                </div>
              )}

              {/* Protective Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#18110B]/90 via-[#18110B]/40 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

              {/* Number Badge */}
              <div className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center text-xs font-bold font-serif">
                0{i + 1}
              </div>

              {/* Text Information */}
              <div className="absolute bottom-0 inset-x-0 p-6 text-white z-10">
                <h3
                  className="font-normal text-2xl m-0 mb-2 leading-tight group-hover:text-[#DFB76C] transition-colors"
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  {cat.name}
                </h3>
                {cat.description && (
                  <p className="text-xs text-white/70 m-0 mb-4 line-clamp-1 leading-relaxed">
                    {cat.description}
                  </p>
                )}

                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#DFB76C] group-hover:text-white transition-colors">
                  <span>تصفحي المنتجات</span>
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1.5 transition-transform" />
                </div>
              </div>

              {/* Fine Gold Accent Border On Hover */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#DFB76C]/80 rounded-2xl transition-all duration-300 pointer-events-none" />
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
