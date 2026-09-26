import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, X, Share, Smartphone, ChevronDown, ChevronUp, MonitorSmartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORE_DISMISS_KEY  = 'alhuda_pwa_dismissed_store'
const ADMIN_DISMISS_KEY  = 'alhuda_pwa_dismissed_admin'
const DISMISS_DAYS       = 7

// ─── Detect iOS ──────────────────────────────────────────────────────────────
function detectIos() {
  const ua = window.navigator.userAgent
  return (
    /iphone|ipad|ipod/i.test(ua) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  )
}

// ─── iOS Instructions ─────────────────────────────────────────────────────────
function IosSteps({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-xs text-[#7A572A] space-y-2.5 animate-in fade-in duration-200">
      <p className="font-bold flex items-center gap-1.5 text-[#5c3d10]">
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        {isAdmin ? 'طريقة تثبيت لوحة الإدارة على آيفون:' : 'طريقة تثبيت المتجر على آيفون:'}
      </p>
      <ol className="space-y-2 pr-1">
        <li className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[#8D6527] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">١</span>
          <span>
            افتح{' '}
            <strong className="text-[#221811]">Safari</strong>
            {' '}وانتقل إلى{' '}
            <strong className="text-[#221811] font-mono text-[10px] bg-amber-100 px-1.5 py-0.5 rounded-lg">
              {isAdmin ? 'الموقع/admin' : 'الموقع الرئيسي'}
            </strong>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[#8D6527] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">٢</span>
          <span>
            اضغط على أيقونة{' '}
            <strong className="text-[#221811]">المشاركة</strong>
            {' '}
            <span className="inline-flex items-center gap-0.5 bg-amber-100 px-1.5 py-0.5 rounded-lg text-[10px] font-bold">
              <Share className="w-3 h-3" />
            </span>
            {' '}في شريط أدوات Safari (أسفل الشاشة)
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[#8D6527] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">٣</span>
          <span>
            مرر للأسفل واختر{' '}
            <strong className="text-[#221811]">«إضافة إلى الشاشة الرئيسية»</strong>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[#8D6527] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">٤</span>
          <span>
            اضغط <strong className="text-[#221811]">«إضافة»</strong> أعلى اليمين — ستجد أيقونة التطبيق على شاشتك!
          </span>
        </li>
      </ol>
      <p className="text-[10px] text-[#968B7E] mt-1 flex items-center gap-1">
        <span>⚠️</span>
        <span>ميزة التثبيت متاحة فقط عبر متصفح Safari على آيفون وآيباد</span>
      </p>
    </div>
  )
}

// ─── Android Manual Guide (for browsers that don't fire beforeinstallprompt) ──
function AndroidManualSteps({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/70 text-xs text-blue-900 space-y-2.5 animate-in fade-in duration-200">
      <p className="font-bold flex items-center gap-1.5">
        <MonitorSmartphone className="w-3.5 h-3.5 shrink-0" />
        {isAdmin ? 'تثبيت لوحة الإدارة يدوياً:' : 'تثبيت المتجر يدوياً:'}
      </p>
      <ol className="space-y-2 pr-1">
        <li className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">١</span>
          <span>اضغط على قائمة المتصفح <strong>(⋮ أو ☰)</strong> في الزاوية العلوية</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">٢</span>
          <span>اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> أو <strong>«تثبيت التطبيق»</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">٣</span>
          <span>أكد التثبيت — ستجد الأيقونة على شاشتك الرئيسية فوراً</span>
        </li>
      </ol>
    </div>
  )
}

// ─── Prompt Card ──────────────────────────────────────────────────────────────
interface PromptCardProps {
  isAdmin: boolean
  isIos: boolean
  isAndroidManual: boolean
  onInstall: () => void
  onDismiss: () => void
  showIosSteps: boolean
  showAndroidSteps: boolean
  onToggleIosSteps: () => void
  onToggleAndroidSteps: () => void
}

function PromptCard({
  isAdmin,
  isIos,
  isAndroidManual,
  onInstall,
  onDismiss,
  showIosSteps,
  showAndroidSteps,
  onToggleIosSteps,
  onToggleAndroidSteps,
}: PromptCardProps) {
  const accentGradient = isAdmin
    ? 'from-[#1a0f00] via-[#7a572a] to-[#C59B4B]'
    : 'from-[#C59B4B] via-[#8D6527] to-[#7A572A]'

  const title = isAdmin
    ? 'تثبيت لوحة إدارة الهدى'
    : 'تثبيت متجر الهدى للتطريز'

  const description = isAdmin
    ? 'أضف لوحة التحكم لشاشتك الرئيسية للوصول السريع إلى الطلبات والمنتجات في أي وقت — حتى بدون متصفح.'
    : 'ثبّت المتجر على هاتفك للتصفح الأسرع، وتتبع الطلبات، وتجربة تسوق أسهل بدون فتح المتصفح.'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#EADBCE] bg-[#FAF7F2]/96 backdrop-blur-lg p-4 shadow-2xl">
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentGradient}`} />

      <div className="flex items-start gap-3.5 mt-0.5">
        {/* App icon */}
        <div className="relative shrink-0 w-13 h-13 rounded-xl overflow-hidden shadow-md border border-[#EADBCE] bg-white">
          <img src="/logo.jpeg" alt="شعار متجر الهدى" className="w-full h-full object-cover" />
          {isAdmin && (
            <span className="absolute bottom-0 left-0 right-0 bg-[#7a572a]/80 text-white text-[8px] font-bold text-center py-0.5">
              ADMIN
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-bold text-[#221811] leading-tight" style={{ fontFamily: 'Amiri, serif' }}>
              {title}
            </h4>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 text-[#968B7E] hover:text-[#221811] p-1 rounded-lg hover:bg-[#EADBCE]/50 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-1 text-xs text-[#685D52] leading-relaxed">
            {description}
          </p>

          {/* iOS Steps */}
          {isIos && showIosSteps && <IosSteps isAdmin={isAdmin} />}

          {/* Android Manual Steps */}
          {isAndroidManual && showAndroidSteps && <AndroidManualSteps isAdmin={isAdmin} />}

          {/* Buttons */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {isIos ? (
              <button
                type="button"
                onClick={onToggleIosSteps}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#8D6527] hover:bg-[#704F1E] active:scale-[0.98] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all"
              >
                <Share className="w-3.5 h-3.5" />
                <span>طريقة التثبيت</span>
                {showIosSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            ) : isAndroidManual ? (
              <button
                type="button"
                onClick={onToggleAndroidSteps}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.98] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all"
              >
                <MonitorSmartphone className="w-3.5 h-3.5" />
                <span>كيفية التثبيت</span>
                {showAndroidSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={onInstall}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#8D6527] hover:bg-[#704F1E] active:scale-[0.98] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تثبيت الآن</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center justify-center rounded-xl border border-[#EADBCE] bg-white hover:bg-[#FAF7F2] px-3 py-2 text-xs font-medium text-[#685D52] hover:text-[#221811] transition-all"
            >
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PWAInstallPrompt() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')

  const dismissKey = isAdmin ? ADMIN_DISMISS_KEY : STORE_DISMISS_KEY

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible]           = useState(false)
  const [isIos, setIsIos]                   = useState(false)
  // True when on Android but the browser didn't fire beforeinstallprompt
  // (e.g. Firefox, Samsung Internet after first dismiss, Opera)
  const [isAndroidManual, setIsAndroidManual] = useState(false)
  const [showIosSteps, setShowIosSteps]       = useState(false)
  const [showAndroidSteps, setShowAndroidSteps] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  // Listen for PWA updates
  useEffect(() => {
    const handleUpdate = () => setUpdateAvailable(true)
    window.addEventListener('pwa-update-available', handleUpdate)
    return () => window.removeEventListener('pwa-update-available', handleUpdate)
  }, [])

  useEffect(() => {
    // Already installed as PWA — don't show prompt
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://')
    if (isStandalone) return

    // Check dismiss cooldown
    const dismissedAt = localStorage.getItem(dismissKey)
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24)
      if (days < DISMISS_DAYS) return
    }

    const ua = window.navigator.userAgent.toLowerCase()

    // ── iOS ──────────────────────────────────────────────────────────────────
    if (detectIos()) {
      setIsIos(true)
      const t = setTimeout(() => setIsVisible(true), 3500)
      return () => clearTimeout(t)
    }

    // ── Android / Desktop with native install prompt ──────────────────────────
    let androidTimer: ReturnType<typeof setTimeout>

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      clearTimeout(androidTimer)
      setTimeout(() => setIsVisible(true), 2500)
    }

    const handleAppInstalled = () => {
      setIsVisible(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // ── Android fallback: show manual guide if prompt doesn't fire in 4s ─────
    const isAndroid = /android/i.test(ua)
    if (isAndroid) {
      androidTimer = setTimeout(() => {
        // beforeinstallprompt didn't fire yet → manual browser
        if (!deferredPrompt) {
          setIsAndroidManual(true)
          setIsVisible(true)
        }
      }, 4000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(androidTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissKey])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setIsVisible(false)
      } else {
        setIsVisible(false)
        localStorage.setItem(dismissKey, Date.now().toString())
      }
      setDeferredPrompt(null)
    } catch (err) {
      console.error('PWA install error:', err)
      setIsVisible(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(dismissKey, Date.now().toString())
  }

  function handleApplyUpdate() {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      } else {
        window.location.reload()
      }
    })
  }

  return (
    <>
      {/* Update Available Toast */}
      {updateAvailable && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed top-4 inset-x-4 sm:inset-x-auto sm:left-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="bg-[#24180E] text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-[#C59B4B]/50 flex items-center justify-between gap-3 max-w-md">
            <div>
              <p className="text-xs font-bold text-white m-0">تحديث جديد متوفر للمتجر 🚀</p>
              <p className="text-[11px] text-[#EADBCE] m-0 mt-0.5">انقري لتحديث المتجر والحصول على أحدث التحسينات</p>
            </div>
            <button
              type="button"
              onClick={handleApplyUpdate}
              className="px-3.5 py-1.5 rounded-xl bg-[#8D6527] hover:bg-[#A3752C] text-white text-xs font-bold shrink-0 transition-colors shadow-xs cursor-pointer"
            >
              تحديث الآن
            </button>
          </div>
        </div>
      )}

      {/* Install Prompt Card */}
      {isVisible && (
        <div
          role="region"
          aria-label="تثبيت التطبيق"
          className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
        >
          <PromptCard
            isAdmin={isAdmin}
            isIos={isIos}
            isAndroidManual={isAndroidManual}
            onInstall={handleInstall}
            onDismiss={handleDismiss}
            showIosSteps={showIosSteps}
            showAndroidSteps={showAndroidSteps}
            onToggleIosSteps={() => setShowIosSteps(p => !p)}
            onToggleAndroidSteps={() => setShowAndroidSteps(p => !p)}
          />
        </div>
      )}
    </>
  )
}
