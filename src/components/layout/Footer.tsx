import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, MessageCircle, Heart, Sparkles, ShieldCheck } from 'lucide-react'
import type { SiteSettings } from '../../types'

export default function Footer({ settings }: { settings: SiteSettings }) {
  const whatsappNumber = settings.whatsappNumber || settings.phone

  return (
    <footer className="bg-[#18110B] text-white border-t border-[#332317]">
      {/* Main Footer Content */}
      <div className="container py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          
          {/* Col 1: Brand & Identity */}
          <div>
            <Link to="/" className="flex items-center gap-3 no-underline text-white mb-5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C59B4B] to-[#8D6527] text-white flex items-center justify-center shadow-xs">
                <span className="font-serif text-2xl font-bold leading-none mt-0.5" style={{ fontFamily: 'Amiri, serif' }}>هـ</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold leading-none" style={{ fontFamily: 'Amiri, serif' }}>
                  {settings.storeName.replace(' للتطريز', '')}
                </span>
                <span className="text-[10px] tracking-[2px] text-[#DFB76C] font-semibold mt-0.5">
                  للتطريز اليدوي الفاخر
                </span>
              </div>
            </Link>

            <p className="text-white/60 text-xs sm:text-sm leading-relaxed mb-6">
              متجر عربي متخصص في تقديم أرقى تصاميم التطريز اليدوي المعاصر، بحرفية أصيلة وخيوط حريرية فاخرة تعانق تفاصيلكِ الأجمل.
            </p>

            <div className="inline-flex items-center gap-2 text-xs text-[#DFB76C]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>جودة وإتقان يدوم طويلاً</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 className="text-xs font-bold text-[#DFB76C] tracking-widest uppercase mb-6 flex items-center gap-2">
              <span>روابط سريعة</span>
            </h4>
            <ul className="space-y-3 list-none p-0 m-0">
              {[
                { label: 'الصفحة الرئيسية', to: '/' },
                { label: 'أقسام المتجر', to: '/categories' },
                { label: 'جميع المنتجات المطرزة', to: '/products' },
                { label: 'قصة الحرفية والبراند', to: '/#story' },
                { label: 'دخول لوحة الإدارة', to: '/admin/login' },
              ].map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-white/70 hover:text-[#DFB76C] text-xs sm:text-sm no-underline transition-colors flex items-center gap-2 group"
                  >
                    <span className="text-[#C59B4B] group-hover:-translate-x-1 transition-transform">←</span>
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Contact & Customer Care */}
          <div>
            <h4 className="text-xs font-bold text-[#DFB76C] tracking-widest uppercase mb-6">
              تواصلي واستشيري
            </h4>
            <div className="space-y-3.5 text-xs sm:text-sm text-white/75">
              {whatsappNumber && (
                <p className="m-0">
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-white/80 hover:text-emerald-400 no-underline transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>واتساب: {whatsappNumber}</span>
                  </a>
                </p>
              )}

              {settings.phone && (
                <p className="flex items-center gap-2.5 text-white/80 m-0">
                  <Phone className="w-4 h-4 text-[#C59B4B] shrink-0" />
                  <span>هاتف: {settings.phone}</span>
                </p>
              )}

              <p className="m-0">
                <a
                  href={`mailto:${settings.email || 'info@alhuda-embroidery.com'}`}
                  className="flex items-center gap-2.5 text-white/80 hover:text-[#DFB76C] no-underline transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#C59B4B] shrink-0" />
                  <span>{settings.email || 'info@alhuda-embroidery.com'}</span>
                </a>
              </p>

              <p className="flex items-center gap-2.5 text-white/80 m-0">
                <MapPin className="w-4 h-4 text-[#C59B4B] shrink-0" />
                <span>{settings.address || 'فلسطين — توصيل لكافة المناطق'}</span>
              </p>
            </div>
          </div>

          {/* Col 4: Quality Guarantee */}
          <div>
            <h4 className="text-xs font-bold text-[#DFB76C] tracking-widest uppercase mb-6">
              ضمان الهدى
            </h4>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#DFB76C] shrink-0 mt-0.5" />
                <p className="text-xs text-white/80 m-0 leading-relaxed">
                  تطريز يدوي أصلي ١٠٠٪ باستخدام خيوط حريرية متينة وغير قابلة للبهتان.
                </p>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-white/10">
                <Sparkles className="w-4 h-4 text-[#DFB76C] shrink-0 mt-0.5" />
                <p className="text-xs text-white/80 m-0 leading-relaxed">
                  تغليف هدايا فاخر مرفق مع بطاقة إهداء مخصصة لكل طلب.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sub-footer Strip */}
      <div className="border-t border-white/10 py-6 bg-[#130E09]">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p className="m-0">
            © {new Date().getFullYear()} {settings.storeName}. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-1.5 text-white/60">
            <span>صُنع بحب</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>لتتألقي بأجمل تفاصيلكِ</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
