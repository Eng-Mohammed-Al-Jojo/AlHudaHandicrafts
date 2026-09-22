import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

type Option = { value: string; label: string }

export default function AdminSelect({
  value,
  options,
  onChange,
  className = ''
}: {
  value: string
  options: Option[]
  onChange: (value: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(option => option.value === value)

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full bg-[#FAF7F2] border border-[#EADBCE] focus:border-[#8D6527] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-[#221811] flex items-center justify-between outline-none transition-all cursor-pointer shadow-2xs"
      >
        <span className="font-semibold">{selected?.label ?? 'اختاري...'}</span>
        <ChevronDown className={`w-4 h-4 text-[#8D6527] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+6px)] right-0 left-0 bg-white border border-[#EADBCE] rounded-2xl shadow-xl p-1.5 z-30 max-h-56 overflow-y-auto animate-scale-in"
          role="listbox"
        >
          {options.map(option => {
            const isSelected = option.value === value
            return (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#FAF7F2] text-[#8D6527] font-bold'
                    : 'text-[#685D52] hover:bg-[#FAF7F2] hover:text-[#221811]'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#8D6527]" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
