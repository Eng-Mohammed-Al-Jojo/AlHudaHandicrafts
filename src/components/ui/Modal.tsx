import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  showDefaultClose?: boolean
  /** When true, removes default overflow-y-auto so the caller can manage header/body/footer layout internally */
  structured?: boolean
}

export default function Modal({
  onClose,
  children,
  size = 'md',
  className = '',
  showDefaultClose = false,
  structured = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    const previousOverflow = document.body.style.overflow
    const previousPaddingInlineEnd = document.body.style.paddingInlineEnd
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.addEventListener('keydown', handler)
    // Keep the page from moving behind the dialog without causing a horizontal
    // layout shift when the browser scrollbar disappears.
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingInlineEnd = `${scrollbarWidth}px`
    ref.current?.focus()

    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingInlineEnd = previousPaddingInlineEnd
    }
  }, [])

  const maxW = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl',
  }[size]

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#221811]/55 p-3 sm:p-6 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className={`relative max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] w-full ${maxW} ${structured ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overscroll-contain'} rounded-2xl sm:rounded-3xl bg-white shadow-2xl animate-scale-in outline-none ${className}`}
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        {showDefaultClose && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 hover:bg-white text-[#221811] transition-colors shadow-sm"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
