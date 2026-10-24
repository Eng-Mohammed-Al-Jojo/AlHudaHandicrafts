import { Link } from 'react-router-dom'
import { Sparkles, ArrowLeft, Calendar, Tag } from 'lucide-react'
import type { Promotion } from '../../types'

interface Props {
  promotions: Promotion[]
}

export default function PromotionBanners({ promotions }: Props) {
  const now = new Date()

  // Filter only active promotions within date range
  const activePromotions = promotions.filter(p => {
    if (!p.isActive) return false
    const start = new Date(p.startDate)
    const end = new Date(p.endDate)
    return now >= start && now <= end
  })

  if (activePromotions.length === 0) return null

  return (
    <section className="py-8 bg-gradient-to-b from-[#FAF7F2]/40 to-[#FAF7F2]/90 border-y border-[#EADBCE]">
      <div className="container">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8D6527] to-[#704F1E] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-[#DFB76C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-xl sm:text-2xl font-normal text-[#221811] m-0"
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  عروض وبنرات حصرية
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8D6527]/10 text-[#8D6527] border border-[#8D6527]/20 uppercase">
                  لفترة محدودة
                </span>
              </div>
              <p className="text-xs text-[#685D52] m-0 mt-0.5">
                اكتشفي أحدث التخفيضات والقطع المميزة بتطريز فلسطيني فاخر
              </p>
            </div>
          </div>
        </div>

        {/* Promotions Carousel / Grid */}
        <div
          className={`grid gap-5 ${
            activePromotions.length === 1
              ? 'grid-cols-1'
              : activePromotions.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {activePromotions.map(promo => {
            const isSingle = activePromotions.length === 1
            const CardContent = (
              <div
                className={`group relative rounded-3xl overflow-hidden border border-[#EADBCE] bg-[#1E1712] shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer ${
                  isSingle ? 'h-64 sm:h-72 md:h-80' : 'h-60 sm:h-64'
                }`}
              >
                {/* Background Image with zoom */}
                <img
                  src={promo.imageUrl}
                  alt={promo.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
                />

                {/* Luxury gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#18110B] via-[#18110B]/60 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(197,155,75,0.25),transparent_70%)]" />

                {/* Badge top right */}
                <div className="absolute top-4 right-4 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#FAF7F2]/90 text-[#8D6527] backdrop-blur-md shadow-sm border border-[#EADBCE]">
                    <Tag className="w-3 h-3 text-[#8D6527]" />
                    <span>عرض خاص</span>
                  </span>
                </div>

                {/* Text Content Bottom */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 z-10 flex flex-col justify-end">
                  <div className="space-y-1.5 max-w-xl">
                    <h3
                      className={`font-normal text-white m-0 group-hover:text-[#DFB76C] transition-colors leading-snug ${
                        isSingle ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'
                      }`}
                      style={{ fontFamily: 'Amiri, serif' }}
                    >
                      {promo.title}
                    </h3>

                    {promo.description && (
                      <p className="text-white/80 text-xs sm:text-sm line-clamp-2 m-0 font-light leading-relaxed">
                        {promo.description}
                      </p>
                    )}
                  </div>

                  {/* CTA Arrow & dates */}
                  <div className="pt-3 mt-2 border-t border-white/15 flex items-center justify-between text-white/90 text-xs">
                    <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                      <Calendar className="w-3 h-3 text-[#DFB76C]" />
                      <span>ينتهي في: {promo.endDate}</span>
                    </div>

                    <span className="inline-flex items-center gap-2 font-bold text-xs text-[#DFB76C] group-hover:translate-x-[-4px] transition-transform">
                      <span>تسوّقي العرض</span>
                      <ArrowLeft className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            )

            // Wrap in Link or div
            if (promo.targetLink) {
              const isExternal = promo.targetLink.startsWith('http')
              if (isExternal) {
                return (
                  <a
                    key={promo.id}
                    href={promo.targetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline block"
                  >
                    {CardContent}
                  </a>
                )
              }
              return (
                <Link key={promo.id} to={promo.targetLink} className="no-underline block">
                  {CardContent}
                </Link>
              )
            }

            return <div key={promo.id}>{CardContent}</div>
          })}
        </div>
      </div>
    </section>
  )
}
