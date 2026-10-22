import { useState } from 'react'
import { CheckCircle2, Sparkles, Send, Loader2, AlertCircle, UserRound, MessageCircle } from 'lucide-react'
import { addSubscriberToFirestore } from '../../firebase'
import { isValidWhatsAppNumber } from '../../utils/whatsapp'

export default function Newsletter() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [joinedName, setJoinedName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()

    if (trimmedName.length < 2) {
      setErrorMsg('الرجاء إدخال اسمكِ الكريم')
      return
    }

    if (!isValidWhatsAppNumber(trimmedPhone)) {
      setErrorMsg('الرجاء إدخال رقم واتساب صحيح')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      await addSubscriberToFirestore(trimmedName, trimmedPhone)
      setJoinedName(trimmedName)
      setSubmitted(true)
      setName('')
      setPhone('')
    } catch (err: unknown) {
      console.warn('WhatsApp list subscribe error:', err)
      setErrorMsg('تعذر إتمام الانضمام الآن. يرجى التحقق من الاتصال والمحاولة مجدداً.')
    } finally {
      setLoading(false)
    }
  }

  function handleJoinAnother() {
    setSubmitted(false)
    setJoinedName('')
    setErrorMsg('')
  }

  return (
    <section className="py-20 bg-gradient-to-br from-[#1E1712] via-[#2A1D15] to-[#1E1712] text-white relative overflow-hidden border-t border-[#3D2C1E]">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C59B4B]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-[#C59B4B]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">

          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-[#DFB76C]/30 px-4 py-1.5 mb-6 text-[#DFB76C] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>أصدقاء الهدى · واتساب</span>
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-normal text-white m-0 mb-4"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            كوني الأولى بمعرفة جديد مجموعاتنا
          </h2>

          <p className="text-white/75 text-xs sm:text-sm max-w-lg mx-auto mb-8 leading-relaxed font-light">
            انضمي إلى قائمة أصدقاء الهدى على واتساب لتصلكِ أولى صور التصاميم الجديدة والعروض الحصرية والاستشارات الموسمية.
          </p>

          {submitted ? (
            <div className="relative bg-white/10 border border-[#DFB76C]/40 rounded-3xl p-7 sm:p-8 max-w-md mx-auto backdrop-blur-md animate-scale-in overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(223,183,108,0.28),transparent_70%)] pointer-events-none" />
              <div className="relative">
                <div className="relative w-16 h-16 mx-auto mb-4 rounded-full border border-[#DFB76C]/50 bg-[#DFB76C]/15 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full border border-[#DFB76C]/20 animate-ping" />
                  <CheckCircle2 className="w-8 h-8 text-[#DFB76C]" />
                </div>

                <p className="text-[#DFB76C] text-[10px] tracking-[0.35em] font-semibold mb-2">أصدقاء الهدى</p>

                <h4 className="font-serif text-2xl text-white m-0 mb-2" style={{ fontFamily: 'Amiri, serif' }}>
                  تم انضمامكِ بنجاح
                </h4>

                <p className="text-xs text-white/80 m-0 mb-1 leading-relaxed">
                  {joinedName ? `أهلاً بكِ ${joinedName} في دائرتنا الخاصة؛` : 'أهلاً بكِ في دائرتنا الخاصة؛'} أصبحتِ الآن من أصدقاء الهدى المميزين.
                </p>
                <p className="text-xs text-white/60 m-0 mb-5 leading-relaxed">
                  ستصلكِ أجمل التصاميم والعروض الحصرية على واتساب قبل الجميع.
                </p>

                <button
                  onClick={handleJoinAnother}
                  className="text-xs text-[#DFB76C] hover:underline cursor-pointer"
                >
                  انضمام صديقة أخرى
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-3 w-full focus-within:border-[#DFB76C] focus-within:bg-white/15 transition-all">
                  <UserRound className="w-4 h-4 text-[#DFB76C] shrink-0" />
                  <input
                    type="text"
                    required
                    disabled={loading}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="اسمكِ الكريم..."
                    className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/40 flex-1 disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-3 w-full focus-within:border-[#DFB76C] focus-within:bg-white/15 transition-all">
                  <MessageCircle className="w-4 h-4 text-[#DFB76C] shrink-0" />
                  <input
                    type="tel"
                    required
                    disabled={loading}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="رقم الواتساب..."
                    dir="ltr"
                    inputMode="tel"
                    autoComplete="tel"
                    className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/40 flex-1 text-right disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#C59B4B] hover:bg-[#DFB76C] text-[#1E1712] font-bold text-xs px-8 py-3.5 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جارٍ الانضمام...</span>
                  </>
                ) : (
                  <>
                    <span>انضمام</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {errorMsg && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-red-300 bg-red-950/40 py-1.5 px-3 rounded-lg border border-red-500/30">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </form>
          )}

          <p className="text-[11px] text-white/40 mt-4">
            نحترم خصوصيتكِ تماماً ولن نرسل سوى ما يُسعدكِ ويليق بذوقكِ.
          </p>

        </div>
      </div>
    </section>
  )
}
