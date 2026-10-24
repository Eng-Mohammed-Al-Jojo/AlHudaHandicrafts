import { AlertTriangle, Trash2, X } from 'lucide-react'
import Modal from './Modal'

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'تأكيد الحذف',
  cancelText = 'إلغاء',
  isDestructive = true,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null

  return (
    <Modal onClose={onCancel} size="sm" className="rounded-3xl overflow-hidden p-0 border border-[#EADBCE]">
      <div className="bg-white">
        <div className="p-6 text-center space-y-4">
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border ${
              isDestructive
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-[#FAF7F2] text-[#8D6527] border-[#EADBCE]'
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-6 h-6 animate-bounce" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div>
            <h3
              className="font-serif text-lg font-bold text-[#221811] m-0"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              {title}
            </h3>
            <p className="text-xs text-[#685D52] m-0 mt-2 leading-relaxed max-w-xs mx-auto">
              {message}
            </p>
          </div>

          <div className="pt-3 border-t border-[#FAF7F2] flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-[#EADBCE] text-xs font-semibold text-[#685D52] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2 ${
                isDestructive
                  ? 'bg-red-600 hover:bg-red-700 active:scale-[0.98]'
                  : 'bg-[#8D6527] hover:bg-[#704F1E]'
              }`}
            >
              {isDestructive && <Trash2 className="w-3.5 h-3.5" />}
              <span>{loading ? 'جارٍ التنفيذ...' : confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
