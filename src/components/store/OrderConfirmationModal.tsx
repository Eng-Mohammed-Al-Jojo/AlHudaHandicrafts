import { CheckCircle2, MessageCircle, X } from 'lucide-react'
import Modal from '../ui/Modal'

interface Props {
  orderId: string
  whatsappNumber?: string
  storeName?: string
  onClose: () => void
}

export default function OrderConfirmationModal({ orderId, whatsappNumber = '', storeName = 'متجر الهدى', onClose }: Props) {
  const normalizedWhatsApp = whatsappNumber.replace(/[^0-9]/g, '')

  function openWhatsApp() {
    if (!normalizedWhatsApp) return
    const message = [
      `السلام عليكم، بخصوص طلبي من ${storeName}`,
      `رقم الطلب: #${orderId.slice(0, 8)}`,
      'أرغب بالاستفسار عن تفاصيل الطلب والدفع.',
    ].join('\n')
    window.open(`https://wa.me/${normalizedWhatsApp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal onClose={onClose} size="sm" className="overflow-hidden border border-[#EADBCE]">
      <div className="bg-[#FAF7F2] border-b border-[#EADBCE] p-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#221811] m-0">تم استلام طلبك</h2>
            <p className="text-xs text-[#685D52] m-0 mt-1">سجّلنا طلبك في المتجر بنجاح</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl border border-[#EADBCE] bg-white text-[#685D52] hover:text-[#221811] flex items-center justify-center" aria-label="إغلاق">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 sm:p-7 text-center">
        <p className="text-xs text-[#685D52] m-0">رقم الطلب</p>
        <p className="font-mono text-xl font-bold tracking-wider text-[#8D6527] mt-1 mb-0" dir="ltr">#{orderId.slice(0, 8)}</p>

        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-right">
          <p className="text-sm font-bold text-[#221811] m-0">لأي استفسار عن الطلب أو الدفع</p>
          <p className="text-xs text-[#685D52] m-0 mt-1 leading-5">تواصلي معنا عبر واتساب فقط، وسنساعدك بكل التفاصيل.</p>
        </div>

        {normalizedWhatsApp ? (
          <button type="button" onClick={openWhatsApp} className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3.5 shadow-sm transition-colors">
            <MessageCircle className="w-5 h-5" />
            التواصل عبر واتساب
          </button>
        ) : (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
            لم يتم إعداد رقم واتساب للمتجر حالياً. يرجى التواصل مع المتجر بعد تفعيل الرقم من لوحة الإدارة.
          </div>
        )}
      </div>
    </Modal>
  )
}
