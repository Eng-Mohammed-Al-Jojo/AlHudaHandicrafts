import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, MessageCircle, Heart, Sparkles, ShieldCheck, Camera, ThumbsUp, Music2, Code2 } from 'lucide-react'
import type { SiteSettings } from '../../types'

export default function Footer({ settings }: { settings: SiteSettings }) {
  const whatsappNumber = settings.whatsappNumber || settings.phone
  const socialLinks = [
    { name: 'إنستغرام', href: settings.socialLinks?.instagram, icon: Camera, hoverClass: 'hover:text-pink-400' },
    { name: 'فيسبوك', href: settings.socialLinks?.facebook, icon: ThumbsUp, hoverClass: 'hover:text-blue-400' },
    { name: 'تيك توك', href: settings.socialLinks?.tiktok, icon: Music2, hoverClass: 'hover:text-white' },
  ].filter((link): link is typeof link & { href: string } => Boolean(link.href))

  return (
    <footer className="bg-[#18110B] text-white border-t border-[#332317]">
      {/* Main Footer Content */}
      <div className="container py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

          {/* Col 1: Brand & Identity */}
          <div>
            <Link to="/" className="flex items-center gap-3 no-underline text-white mb-5 group">
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-[#332317] group-hover:border-[#DFB76C] transition-colors shrink-0 bg-white">
                <img
                  src="/logo.jpeg"
                  alt={settings.storeName || 'متجر الهدى'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold leading-none text-white group-hover:text-[#DFB76C] transition-colors" style={{ fontFamily: 'Amiri, serif' }}>
                  {settings.storeName.replace(' للتطريز', '')}
                </span>
                <span className="text-[10px] tracking-[1.5px] text-[#DFB76C] font-semibold mt-0.5">
                  للمشغولات اليدوية والتطريز
                </span>
              </div>
            </Link>

            <p className="text-white/70 text-xs sm:text-sm leading-relaxed mb-3 font-serif italic" style={{ fontFamily: 'Amiri, serif' }}>
              «في كل خيط وغرزة .. تكتمل فصول الجمال»
            </p>

            <p className="text-white/50 text-xs leading-relaxed mb-6">
              متجر متخصص في تقديم أرقى تصاميم التطريز اليدوي المعاصر، بحرفية أصيلة وخيوط حريرية وذهبية فاخرة تعانق تفاصيلكِ الأجمل.
            </p>

            <div className="inline-flex items-center gap-2 text-xs text-[#DFB76C]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>جودة وإتقان وحرفية أصيلة</span>
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

          {/* Col 4: Quality Guarantee & Social Links */}
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
            {socialLinks.length > 0 && (
              <div className="mt-5">
                <h5 className="text-xs font-bold text-[#DFB76C] mb-3">تابعينا على</h5>
                <div className="flex items-center gap-2">
                  {socialLinks.map(({ name, href, icon: Icon, hoverClass }) => (
                    <a
                      key={name}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`زيارة ${name}`}
                      title={name}
                      className={`w-9 h-9 rounded-xl bg-white/10 border border-white/10 text-white/75 flex items-center justify-center transition-colors ${hoverClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            )}
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
          <a
            href="https://wa.me/972592133357"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-white/70 hover:border-emerald-400/60 hover:bg-emerald-400/10 hover:text-emerald-300 no-underline transition-all group"
            aria-label="Contact developer Eng. Mohammed El Joujo on WhatsApp"
            dir="ltr"
          >
            <Code2 className="w-3.5 h-3.5 text-[#DFB76C] group-hover:text-emerald-400 transition-colors" />
            <span className="text-[11px] font-semibold tracking-wide">Eng. Mohammed El Joujo</span>
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </a>
        </div>
      </div>
    </footer>
  )
}
