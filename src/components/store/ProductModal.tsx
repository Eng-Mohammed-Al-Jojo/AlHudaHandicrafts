import { useState } from 'react'
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Maximize2, 
  ShoppingBag, 
  Check, 
  Sparkles, 
  Plus, 
  Minus,
  MessageCircle,
  ShieldCheck
} from 'lucide-react'
import type { Product } from '../../types'
import Modal from '../ui/Modal'
import { useCurrency } from '../../context/CurrencyContext'

interface Props {
  product: Product
  onAddToCart: (p: Product) => void
  onClose: () => void
}

export default function ProductModal({ product, onAddToCart, onClose }: Props) {
  const images = product.images.length > 0
    ? [...product.images].sort((a, b) => a.order - b.order)
    : [{ url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80', alt: product.name, order: 0 }]
  
  const [activeIdx, setActiveIdx] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const { formatPrice } = useCurrency()

  const prev = () => setActiveIdx(i => (i - 1 + images.length) % images.length)
  const next = () => setActiveIdx(i => (i + 1) % images.length)

  function handleAdd() {
    for (let i = 0; i < qty; i++) {
      onAddToCart(product)
    }
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
      onClose()
    }, 900)
  }

  const whatsappMsg = encodeURIComponent(`مرحباً متجر الهدى، أود الاستفسار عن تفاصيل وطلب قطعة: «${product.name}» (سعر العرض: ${formatPrice(product.price)}، السعر الأصلي: ${product.price} ₪)`)

  return (
    <Modal onClose={onClose} size="xl" className="rounded-2xl sm:rounded-3xl p-0 border border-[#EADBCE] shadow-2xl relative">
      {/* Floating Close Button — always visible, top-left */}
      <button
        onClick={onClose}
        className="absolute top-3 left-3 z-30 w-9 h-9 rounded-full bg-white/95 hover:bg-[#8D6527] text-[#221811] hover:text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all border border-[#EADBCE] cursor-pointer group"
        title="إغلاق المعاينة (Esc)"
        aria-label="إغلاق المعاينة"
      >
        <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
      </button>

      {/* Main Layout: stacked on mobile, side-by-side on lg+. The dialog itself
          owns vertical scrolling, so every action remains reachable on short screens. */}
      <div className="flex flex-col lg:grid lg:grid-cols-12">
        
        {/* ── Image Gallery Side ── */}
        <div className="lg:col-span-5 bg-[#FAF7F2] p-4 sm:p-6 flex flex-col border-b lg:border-b-0 lg:border-l border-[#EADBCE]">
          
          {/* Main Image */}
          <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-[#EADBCE] shadow-sm group flex-shrink-0">
            <img
              src={images[activeIdx]?.url}
              alt={images[activeIdx]?.alt || product.name}
              className="w-full h-full object-cover transition-opacity duration-200"
              loading="eager"
              onClick={() => setFullscreen(true)}
              style={{ cursor: 'zoom-in' }}
            />

            {/* Fullscreen Button */}
            <button
              onClick={() => setFullscreen(true)}
              className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-[#221811] flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="تكبير الصورة"
              aria-label="تكبير الصورة"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); prev() }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-[#221811] hover:bg-[#8D6527] hover:text-white flex items-center justify-center shadow-md transition-colors"
                  aria-label="الصورة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); next() }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-[#221811] hover:bg-[#8D6527] hover:text-white flex items-center justify-center shadow-md transition-colors"
                  aria-label="الصورة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Image counter badge */}
            {images.length > 1 && (
              <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                {activeIdx + 1}/{images.length}
              </span>
            )}
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 scrollbar-none">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    i === activeIdx ? 'border-[#8D6527] shadow-sm scale-105' : 'border-transparent hover:border-[#EADBCE]'
                  }`}
                  aria-label={`صورة ${i + 1}`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}

          {/* Handmade badge — hidden on mobile to save space */}
          <div className="hidden sm:flex mt-3 pt-3 border-t border-[#EADBCE]/80 items-center gap-1 text-[10px] text-[#685D52]">
            <Sparkles className="w-3 h-3 text-[#C59B4B]" />
            صنع يدوي متقن وخيوط فاخرة
          </div>
        </div>

        {/* ── Product Details Side ── */}
        <div className="lg:col-span-7 p-5 sm:p-7 lg:p-9 flex flex-col bg-white">
          {/* Padding top on mobile so content doesn't hide behind close btn */}
          <div className="pt-6 sm:pt-4 lg:pt-0">

            {/* Category & Badge */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold text-[#8D6527] uppercase tracking-wider">
                {product.categoryName}
              </span>
              {product.badge && (
                <span className="bg-[#FAF7F2] border border-[#C59B4B]/40 text-[#8D6527] text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  {product.badge}
                </span>
              )}
            </div>

            {/* Title */}
            <h2
              className="font-normal text-xl sm:text-2xl lg:text-3xl text-[#221811] m-0 mb-2"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              {product.name}
            </h2>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-4">
              <strong className="text-2xl sm:text-3xl font-bold text-[#8D6527]" dir="ltr">{formatPrice(product.price * qty)}</strong>
              {qty > 1 && (
                <span className="text-xs text-[#968B7E]">
                  ({formatPrice(product.price)} للقطعة)
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[#685D52] leading-relaxed mb-4 whitespace-pre-line">
              {product.description || 'قطعة مميزة مطرزة يدوياً بأيدي حرفيات ماهرات وبأفضل الخامات المختارة بعناية.'}
            </p>

            {/* Stock status */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full ${product.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-xs font-semibold ${product.isAvailable ? 'text-emerald-800' : 'text-red-700'}`}>
                {product.isAvailable ? 'متوفر وجاهز للطلب والتوصيل' : 'غير متوفر حالياً بالمخزن'}
              </span>
            </div>

            {/* Quantity Selector */}
            {product.isAvailable && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-[#221811]">الكمية:</span>
                <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-1.5">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-6 h-6 rounded-lg hover:bg-white flex items-center justify-center text-[#685D52] hover:text-[#221811] transition-colors"
                    aria-label="تقليل الكمية"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-sm text-[#221811] w-5 text-center">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-6 h-6 rounded-lg hover:bg-white flex items-center justify-center text-[#685D52] hover:text-[#221811] transition-colors"
                    aria-label="زيادة الكمية"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Guarantee note */}
            <div className="flex items-center gap-2 text-xs text-[#685D52] bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EADBCE] mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8D6527] shrink-0" />
              <span>ضمان أصالة التطريز اليدوي وخيوط الحرير المقاومة للبهتان</span>
            </div>
          </div>

          {/* Action Buttons — pushed to bottom on large screens */}
          <div className="space-y-2 mt-auto pt-3 border-t border-[#EADBCE]">
            <button
              onClick={handleAdd}
              disabled={!product.isAvailable}
              className={`w-full py-3 rounded-full font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                added 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-[#8D6527] hover:bg-[#704F1E] text-white hover:shadow-lg'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {added ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تمت الإضافة بنجاح إلى السلة!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>إضافة للسلة ({formatPrice(product.price * qty)})</span>
                </>
              )}
            </button>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-full border border-[#EADBCE] hover:border-emerald-500 bg-white hover:bg-emerald-50/50 text-[#221811] text-xs font-semibold flex items-center justify-center gap-2 transition-all no-underline"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>طلب خاص أو استفسار عبر واتساب</span>
            </a>

            {/* Continue browsing */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-full border border-[#EADBCE] hover:border-[#C59B4B] text-[#685D52] hover:text-[#221811] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#FAF7F2] transition-all cursor-pointer"
            >
              <span>متابعة تصفح المتجر</span>
            </button>
          </div>
        </div>

      </div>

      {/* Fullscreen Image Overlay */}
      {fullscreen && images[activeIdx] && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-5 left-5 text-white hover:text-[#DFB76C] transition-colors z-10"
            aria-label="إغلاق"
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={images[activeIdx].url}
            alt={images[activeIdx].alt}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </Modal>
  )
}
