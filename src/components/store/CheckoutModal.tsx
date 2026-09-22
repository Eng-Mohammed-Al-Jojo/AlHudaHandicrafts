import { useState, type FormEvent } from 'react'
import { User, Phone, FileText, ShoppingBag, ArrowLeft, MessageCircle, X, ShieldCheck, Truck, AlertCircle } from 'lucide-react'
import type { CartItem, CurrencyCode, SiteSettings } from '../../types'
import Modal from '../ui/Modal'
import { useCurrency } from '../../context/CurrencyContext'

export type CheckoutCurrencyDetails = {
  currency: CurrencyCode
  rate: number
  displayedTotal: string
}

interface Props {
  items: CartItem[]
  total: number
  settings: SiteSettings
  onSubmit: (customer: string, phone: string, notes: string, currencyDetails: CheckoutCurrencyDetails) => Promise<void>
  onClose: () => void
}

export default function CheckoutModal({ items, total, settings, onSubmit, onClose }: Props) {
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { currency, currentRate, formatPrice } = useCurrency()

  const isWhatsApp = settings.orderRouting === 'whatsapp'
  const freeShippingLimit = Number(settings.freeShippingThreshold ?? 350) || 350
  const isFreeShipping = freeShippingLimit > 0 && total >= freeShippingLimit
  const remainingForFreeShipping = Math.max(0, freeShippingLimit - total)
  const ordersEnabled = settings.ordersEnabled !== false

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!ordersEnabled) return
    if (!customer.trim() || !phone.trim()) return
    setSaving(true)
    try {
      await onSubmit(customer.trim(), phone.trim(), notes.trim(), {
        currency,
        rate: currentRate,
        displayedTotal: formatPrice(total, { showCode: true }),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} size="sm" className="rounded-3xl overflow-hidden p-0 border border-[#EADBCE]">
      <div className="bg-white">
        
        {/* Header */}
        <div className="bg-[#FAF7F2] p-6 border-b border-[#EADBCE] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7F1E5] text-[#8D6527] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#221811] m-0" style={{ fontFamily: 'Amiri, serif' }}>
                تأكيد وإتمام الطلب
              </h3>
              <p className="text-[11px] text-[#685D52] m-0">
                أدخلي بياناتكِ للتواصل وتجهيز طلبكِ بعناية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-[#EADBCE] flex items-center justify-center text-[#685D52] hover:bg-white hover:text-[#221811]"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Preview Strip */}
        <div className="p-6 bg-[#FAF7F2]/40 border-b border-[#EADBCE]">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="text-[#685D52]">الملخص:</span>
            <span className="font-bold text-[#221811]">{items.length} منتجات في السلة</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1 mb-3">
            {items.map(item => (
              <div key={item.id} className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-[#EADBCE] bg-white">
                <img
                  src={item.images[0]?.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {item.quantity > 1 && (
                  <span className="absolute bottom-0 right-0 bg-[#8D6527] text-white text-[9px] font-bold px-1 rounded-tl">
                    ×{item.quantity}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Totals & Shipping Breakdown */}
          <div className="space-y-1.5 py-2.5 border-t border-[#EADBCE]/60 text-xs">
            <div className="flex items-center justify-between text-[#685D52]">
              <span>مجموع المنتجات:</span>
              <span dir="ltr">{formatPrice(total)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-[#685D52] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#8D6527]" />
                <span>الشحن:</span>
              </span>
              {isFreeShipping ? (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200">
                  شحن مجاني 🎉 (تجاوزت {formatPrice(freeShippingLimit)})
                </span>
              ) : (
                <span className="text-[#8D6527] font-medium text-[11px]">
                  {remainingForFreeShipping > 0
                    ? `شحن عادي (متبقي ${formatPrice(remainingForFreeShipping)} للشحن المجاني)`
                    : 'شحن مجاني'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#EADBCE]/60">
            <span className="text-xs font-semibold text-[#221811]">المبلغ الإجمالي</span>
            <div className="text-left">
              <strong className="text-lg font-bold text-[#8D6527] block" dir="ltr">{formatPrice(total, { showCode: true })}</strong>
              {currency !== 'ILS' && <span className="text-[10px] text-[#968B7E]">القيمة الأصلية: {total.toLocaleString('en-US')} ₪</span>}
            </div>
          </div>
        </div>

        {/* Orders Paused Alert if applicable */}
        {!ordersEnabled && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>نعتذر، استقبال وتأكيد الطلبات متوقف مؤقتاً في الوقت الحالي.</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={submit} className="p-6 space-y-4">
          
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-[#221811] mb-1.5">
              الاسم الكريم <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 focus-within:border-[#8D6527] focus-within:bg-white transition-all">
              <User className="w-4 h-4 text-[#8D6527] shrink-0" />
              <input
                required
                disabled={!ordersEnabled}
                value={customer}
                onChange={e => setCustomer(e.target.value)}
                placeholder="اسمكِ بالكامل..."
                className="border-0 outline-none text-xs text-[#221811] bg-transparent flex-1 placeholder-[#968B7E] disabled:opacity-60"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-[#221811] mb-1.5">
              رقم الجوال / واتساب <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2.5 focus-within:border-[#8D6527] focus-within:bg-white transition-all">
              <Phone className="w-4 h-4 text-[#8D6527] shrink-0" />
              <input
                required
                disabled={!ordersEnabled}
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="059xxxxxxx أو 056xxxxxxx"
                dir="ltr"
                className="border-0 outline-none text-xs text-[#221811] bg-transparent flex-1 text-right placeholder-[#968B7E] disabled:opacity-60"
              />
            </div>
          </div>

          {/* Order Notes / Customization */}
          <div>
            <label className="block text-xs font-semibold text-[#221811] mb-1.5">
              ملاحظات أو تفاصيل تطريز خاصة (اختياري)
            </label>
            <div className="flex items-start gap-2 bg-[#FAF7F2] border border-[#EADBCE] rounded-xl px-3 py-2 focus-within:border-[#8D6527] focus-within:bg-white transition-all">
              <FileText className="w-4 h-4 text-[#8D6527] shrink-0 mt-1" />
              <textarea
                rows={2}
                disabled={!ordersEnabled}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="مثلاً: تطريز حرف معين، تغليف هدية، مقاس محدد..."
                className="border-0 outline-none text-xs text-[#221811] bg-transparent flex-1 placeholder-[#968B7E] resize-none disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#685D52] pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C59B4B] shrink-0" />
            <span>بياناتكِ آمنة تماماً وسنتواصل معكِ فوراً لتأكيد التفاصيل والشحن</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving || !ordersEnabled}
            className={`w-full py-3.5 rounded-full font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-white ${
              !ordersEnabled
                ? 'bg-stone-300 text-stone-600 cursor-not-allowed shadow-none hover:shadow-none'
                : isWhatsApp 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-[#8D6527] hover:bg-[#704F1E]'
            } disabled:opacity-60`}
          >
            {saving ? (
              <span>جارٍ حفظ وتسجيل الطلب...</span>
            ) : !ordersEnabled ? (
              <span>استقبال الطلبات متوقف مؤقتاً</span>
            ) : isWhatsApp ? (
              <>
                <MessageCircle className="w-4 h-4" />
                <span>إرسال الطلب عبر واتساب مباشرة</span>
              </>
            ) : (
              <>
                <span>تأكيد الطلب وحفظه</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

      </div>
    </Modal>
  )
}
