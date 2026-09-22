import { useState } from 'react'
import { Mail, CheckCircle2, Sparkles, Send, Loader2, AlertCircle } from 'lucide-react'
import { addSubscriberToFirestore } from '../../firebase'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

    // Simple email regex check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('الرجاء إدخال بريد إلكتروني صالح')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      await addSubscriberToFirestore(trimmed)
      setSubmitted(true)
      setEmail('')
    } catch (err: unknown) {
      console.warn('Newsletter subscribe error:', err)
      setErrorMsg('تعذر حفظ اشتراككِ الآن. يرجى التحقق من الاتصال والمحاولة مجدداً.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <section className="py-20 bg-gradient-to-br from-[#1E1712] via-[#2A1D15] to-[#1E1712] text-white relative overflow-hidden border-t border-[#3D2C1E]">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C59B4B]/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-[#DFB76C]/30 px-4 py-1.5 mb-6 text-[#DFB76C] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نادي نخبة الهدى للتطريز</span>
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-normal text-white m-0 mb-4"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            كوني الأولى بمعرفة جديد مجموعاتنا
          </h2>

          <p className="text-white/75 text-xs sm:text-sm max-w-lg mx-auto mb-8 leading-relaxed font-light">
            انضمي إلى قائمتنا البريدية الخاصة لتصلكِ أولى صور التصاميم الجديدة والعروض الحصرية والاستشارات الموسمية.
          </p>

          {submitted ? (
            <div className="bg-white/10 border border-emerald-500/40 rounded-2xl p-6 max-w-md mx-auto backdrop-blur-md animate-scale-in">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h4 className="font-serif text-xl text-white m-0 mb-1" style={{ fontFamily: 'Amiri, serif' }}>
                أهلاً بكِ في عائلتنا الراقية!
              </h4>
              <p className="text-xs text-white/80 m-0 mb-4">
                تم تسجيل بريدكِ بنجاح؛ ستصلكِ رسائلنا المبهجة قريباً.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs text-[#DFB76C] hover:underline"
              >
                الاشتراك ببريد إلكتروني آخر
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-3 w-full focus-within:border-[#DFB76C] focus-within:bg-white/15 transition-all">
                  <Mail className="w-4 h-4 text-[#DFB76C] shrink-0" />
                  <input
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="أدخلي بريدكِ الإلكتروني..."
                    dir="ltr"
                    className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/40 flex-1 text-right disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto rounded-full bg-[#C59B4B] hover:bg-[#DFB76C] text-[#1E1712] font-bold text-xs px-8 py-3.5 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <span>انضمام</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

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
