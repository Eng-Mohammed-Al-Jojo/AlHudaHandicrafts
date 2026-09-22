import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles, Compass, ShieldCheck, Heart } from 'lucide-react'

export default function HeroBanner() {
  return (
    <section
      id="home"
      className="relative min-h-[600px] lg:min-h-[680px] flex items-center overflow-hidden bg-[#1E1712]"
    >
      {/* Ambient Textured Background from Custom Embroidery */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105 opacity-25 filter blur-sm"
        style={{
          backgroundImage: "url('/hero-custom.jpg')"
        }}
      />
      {/* Dark & Gold luxury overlays for high readability */}
      <div className="absolute inset-0 bg-gradient-to-l from-[#18110B]/95 via-[#1F140C]/85 to-[#18110B]/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(197,155,75,0.22),transparent_70%)]" />

      <div className="container relative z-10 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Text Content Column (Right in RTL) */}
          <div className="lg:col-span-7 animate-fade-in">
            
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FAF7F2]/10 border border-[#DFB76C]/30 backdrop-blur-md px-4 py-1.5 mb-5 text-[#DFB76C] text-xs font-semibold tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
              <span>حكاية تُطرّز بأدق تفاصيلكِ • متجر الهدى</span>
            </div>

            {/* Headline */}
            <h1
              className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-normal leading-[1.14] text-white m-0 mb-5 tracking-tight"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              أناقة تتحدث
              <br />
              بلغة <span className="text-[#DFB76C] italic font-semibold">الخيط والذهب</span>
            </h1>

            {/* Description */}
            <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-xl mb-7 font-light">
              قطع استثنائية مطرزة يدوياً بحرفية عالية وخيوط حريرية أصلية، صُممت لترافق لحظاتكِ الأغلى وتمنحكِ هيبة الحضور ودفء الأصالة الفلسطينية العريقة.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 mb-10">
              <Link
                to="/products"
                className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#C59B4B] to-[#8D6527] hover:from-[#DFB76C] hover:to-[#A77933] text-white px-7 sm:px-8 py-3.5 sm:py-4 font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl hover:shadow-[#C59B4B]/25 transition-all duration-300 no-underline group"
              >
                <span>تسوّقي التشكيلة الحصرية</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/categories"
                className="inline-flex items-center gap-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-[#DFB76C]/60 text-white px-6 sm:px-7 py-3.5 sm:py-4 font-semibold text-xs sm:text-sm backdrop-blur-sm transition-all duration-300 no-underline"
              >
                <Compass className="w-4 h-4 text-[#DFB76C]" />
                <span>استكشفي الأقسام</span>
              </Link>
            </div>

            {/* Trust Highlights Strip */}
            <div className="pt-6 border-t border-white/15 grid grid-cols-3 gap-3 sm:gap-4 text-white">
              <div>
                <strong className="block text-lg sm:text-2xl text-[#DFB76C] font-serif" style={{ fontFamily: 'Amiri, serif' }}>١٠٠٪</strong>
                <span className="text-[10px] sm:text-xs text-white/70">تطريز يدوي أصيل</span>
              </div>
              <div className="border-r border-white/15 pr-3 sm:pr-4">
                <strong className="block text-lg sm:text-2xl text-[#DFB76C] font-serif" style={{ fontFamily: 'Amiri, serif' }}>حرير خالص</strong>
                <span className="text-[10px] sm:text-xs text-white/70">أجود الخيوط العالمية</span>
              </div>
              <div className="border-r border-white/15 pr-3 sm:pr-4">
                <strong className="block text-lg sm:text-2xl text-[#DFB76C] font-serif" style={{ fontFamily: 'Amiri, serif' }}>تخصيص كامل</strong>
                <span className="text-[10px] sm:text-xs text-white/70">حسب طلبكِ ومناسبتكِ</span>
              </div>
            </div>

          </div>

          {/* Visual Showcase Column (Left in RTL) */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div className="relative w-full max-w-sm sm:max-w-md">
              
              {/* Luxury Ambient Glow Behind Frame */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-[#DFB76C]/25 to-[#8D6527]/20 blur-xl opacity-70 transform -rotate-1" />
              
              {/* Outer Golden Border Frame */}
              <div className="relative rounded-3xl p-2.5 sm:p-3 bg-gradient-to-b from-[#DFB76C]/40 via-[#8D6527]/20 to-[#DFB76C]/30 border border-[#DFB76C]/50 shadow-2xl backdrop-blur-xs">
                
                {/* Image Container with precise portrait ratio */}
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-[#24180E] group">
                  <img
                    src="/hero-custom.jpg"
                    alt="تطريز يدوي فاخر - متجر الهدى"
                    className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="eager"
                  />

                  {/* Gradient Shading on image for contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Top Floating Badge */}
                  <div className="absolute top-3.5 right-3.5 bg-[#18110B]/80 backdrop-blur-md border border-[#DFB76C]/40 text-[#DFB76C] text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
                    <span>تطريز يدوي متقن</span>
                  </div>

                  {/* Bottom Floating Badge */}
                  <div className="absolute bottom-3.5 inset-x-3.5 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-[#DFB76C]/30 shadow-lg flex items-center justify-between text-[#221811]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#8D6527] flex items-center justify-center font-serif text-sm font-bold border border-[#EADBCE]">
                        الهدى
                      </div>
                      <div>
                        <h4 className="text-xs font-bold m-0 text-[#221811]">أصالة وفخامة</h4>
                        <span className="text-[10px] text-[#685D52]">صُنِع بحب وإتقان لأجلكِ</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[#8D6527] text-xs font-bold">
                      <Heart className="w-3.5 h-3.5 fill-[#8D6527]" />
                      <span>إصدار حصري</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
