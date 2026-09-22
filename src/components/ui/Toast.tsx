import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import type { Toast } from '../../types'

interface Props {
  toasts: Toast[]
  dismiss: (id: string) => void
}

export default function ToastContainer({ toasts, dismiss }: Props) {
  return (
    <div
      className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none"
      role="region"
      aria-live="polite"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3200)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const isSuccess = toast.type === 'success'
  const isError = toast.type === 'error'

  return (
    <div
      className={`pointer-events-auto animate-slide-up flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-xl backdrop-blur-md text-xs sm:text-sm font-medium border transition-all ${
        isSuccess
          ? 'bg-[#221811]/95 text-white border-[#C59B4B]/40'
          : isError
          ? 'bg-red-950/95 text-white border-red-500/40'
          : 'bg-[#18110B]/95 text-white border-white/20'
      }`}
    >
      {isSuccess && <CheckCircle2 className="w-5 h-5 text-[#DFB76C] shrink-0" />}
      {isError && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
      {!isSuccess && !isError && <Info className="w-5 h-5 text-[#C59B4B] shrink-0" />}

      <p className="flex-1 leading-snug m-0 text-white/95">{toast.message}</p>

      <button
        onClick={onDismiss}
        className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        aria-label="إغلاق التنبيه"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
