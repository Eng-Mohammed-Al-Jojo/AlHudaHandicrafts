import { useState, useEffect } from 'react'
import { Download, X, Share, PlusSquare, Sparkles, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'alhuda_pwa_dismissed'
const DISMISS_DAYS = 5

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    // Check if already in standalone mode (installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (isStandalone) {
      return
    }

    // Check if dismissed recently
    const dismissedTime = localStorage.getItem(DISMISS_KEY)
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < DISMISS_DAYS) {
        return
      }
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    if (iosDevice) {
      setIsIos(true)
      // Delay showing prompt slightly for smoother page load
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 3500)
      return () => clearTimeout(timer)
    }

    // Android / Desktop Chromium beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Small timeout to allow user to see the page first
      setTimeout(() => {
        setIsVisible(true)
      }, 2500)
    }

    const handleAppInstalled = () => {
      setIsVisible(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true)
      return
    }

    if (!deferredPrompt) {
      return
    }

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setIsVisible(false)
      }
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Error during PWA installation:', error)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  if (!isVisible) return null

  return (
    <div
      role="region"
      aria-label="تثبيت التطبيق"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/95 backdrop-blur-md p-4 shadow-2xl transition-all">
        {/* Decorative Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C59B4B] via-[#8D6527] to-[#7A572A]" />

        <div className="flex items-start gap-3.5">
          {/* App Icon */}
          <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden shadow-md border border-[#EADBCE] bg-white">
            <img src="/logo.jpeg" alt="شعار متجر الهدى" className="w-full h-full object-cover" />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#8D6527] text-white">
              <Sparkles className="h-2.5 w-2.5 text-[#edd8a8]" />
            </span>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-[#221811] font-serif leading-tight" style={{ fontFamily: 'Amiri, serif' }}>
                تثبيت متجر الهدى للتطريز
              </h4>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[#968B7E] hover:text-[#221811] p-1 rounded-lg hover:bg-[#EADBCE]/50 transition-colors"
                aria-label="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-1 text-xs text-[#685D52] leading-relaxed">
              ثبّتي التطبيق على هاتفكِ لتصفح أسرع، وتتبع الطلبات، وتجربة تسوق أسهل بدون الحاجة لفتح المتصفح في كل مرة.
            </p>

            {/* iOS Instructions Accordion / Popover */}
            {isIos && showIosGuide && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-[#7A572A] space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>طريقة التثبيت على آيفون / آيباد:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pr-1 text-[11px] text-[#685D52]">
                  <li>
                    اضغطي على أيقونة المشاركة <Share className="w-3 h-3 inline mx-0.5 text-[#8D6527]" /> في شريط متصفح سفاري.
                  </li>
                  <li>
                    مرري للأسفل واختاري <span className="font-semibold text-[#221811]">«إضافة إلى الصفحة الرئيسية»</span>{' '}
                    <PlusSquare className="w-3 h-3 inline mx-0.5 text-[#8D6527]" />.
                  </li>
                  <li>اضغطي على <span className="font-semibold text-[#221811]">«إضافة»</span> أعلى الزاوية.</li>
                </ol>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#8D6527] hover:bg-[#704F1E] active:scale-[0.98] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIos ? 'عرض طريقة التثبيت' : 'تثبيت التطبيق الآن'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex items-center justify-center rounded-xl border border-[#EADBCE] bg-white hover:bg-[#FAF7F2] px-3 py-2 text-xs font-medium text-[#685D52] hover:text-[#221811] transition-all"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
