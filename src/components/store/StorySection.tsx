import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles, Heart, Award, CheckCircle } from 'lucide-react'

export default function StorySection() {
  return (
    <section className="bg-white py-20 lg:py-28 overflow-hidden" id="story">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Visual Showcase with Decorative Frame */}
          <div className="relative">
            {/* Ambient gold glow */}
            <div className="absolute -top-6 -right-6 w-64 h-64 bg-[#C59B4B]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Framing border */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-[#FAF7F2]">
              <img
                src="/story-img.jpeg"
                alt="حرفية التطريز اليدوي متجر الهدى"
                className="w-full h-[420px] sm:h-[480px] object-cover hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1E1712]/80 via-transparent to-transparent" />

              {/* Floating Quote Badge */}
              <div className="absolute bottom-6 inset-x-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-[#EADBCE] shadow-lg">
                <p className="text-xs sm:text-sm text-[#221811] font-medium m-0 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C59B4B] shrink-0" />
                  <span>«كل غرزة نصنعها هي لمسة وفاء للفن، وتعبير عن أنوثة وأناقة لا تزول.»</span>
                </p>
              </div>
            </div>
          </div>

          {/* Text & Craftsmanship Narrative */}
          <div>
            <div className="eyebrow">
              <Heart className="w-3.5 h-3.5 text-[#C59B4B]" />
              <span>أصالة الحكاية والحرفية</span>
            </div>

            <h2
              className="font-normal text-3xl sm:text-4xl lg:text-5xl text-[#221811] m-0 mb-6 leading-[1.2]"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              في كل خيط وغرزة،
              <br />
              <span className="text-[#8D6527] font-semibold">تكتمل فصول الجمال.</span>
            </h2>

            <p className="text-[#685D52] text-sm sm:text-base leading-relaxed mb-4">
              انطلقت فكرة <strong>متجر الهدى للتطريز</strong> من شغف عميق بإحياء التطريز اليدوي وإعادة تقديمه بروح عصرية تناسب المرأة الباحثة عن التميز والرقي.
            </p>

            <p className="text-[#685D52] text-sm sm:text-base leading-relaxed mb-8">
              لا نعتمد على الآلات الصامتة، بل تتناغم أصابع حرفياتنا مع أجود أنواع خيوط الحرير والذهب الفرنسي والأقمشة الفاخرة لابتكار قطع تحمل روحاً وهوية فريدة.
            </p>

            {/* Credibility Stats */}
            <div className="grid grid-cols-3 gap-4 py-6 border-y border-[#EADBCE] mb-8">
              <div>
                <strong className="block text-2xl sm:text-3xl text-[#8D6527] font-serif mb-1" style={{ fontFamily: 'Amiri, serif' }}>
                  +٥٠٠
                </strong>
                <span className="text-xs text-[#685D52]">قطعة صُنعت بحب</span>
              </div>
              <div className="border-r border-[#EADBCE] pr-4">
                <strong className="block text-2xl sm:text-3xl text-[#8D6527] font-serif mb-1" style={{ fontFamily: 'Amiri, serif' }}>
                  ١٠٠٪
                </strong>
                <span className="text-xs text-[#685D52]">تطريز يدوي متقن</span>
              </div>
              <div className="border-r border-[#EADBCE] pr-4">
                <strong className="block text-2xl sm:text-3xl text-[#8D6527] font-serif mb-1" style={{ fontFamily: 'Amiri, serif' }}>
                  +٣٥٠
                </strong>
                <span className="text-xs text-[#685D52]">عميلة راضية وسعيدة</span>
              </div>
            </div>

            <Link
              to="/products"
              className="inline-flex items-center gap-3 rounded-full bg-[#FAF7F2] hover:bg-[#8D6527] border border-[#EADBCE] hover:border-[#8D6527] text-[#8D6527] hover:text-white px-7 py-3.5 text-xs sm:text-sm font-bold transition-all duration-300 no-underline shadow-xs group"
            >
              <span>اكتشفي تصاميمنا الخاصة</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>

          </div>

        </div>
      </div>
    </section>
  )
}
