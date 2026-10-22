import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export type SelectOption = {
  value: string
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
  className?: string
}

export type SelectVariant = 'admin' | 'store' | 'bare'

interface Props {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  variant?: SelectVariant
  /** Classes applied to the wrapper. Use `w-full` for form fields. */
  className?: string
  /** Replaces the default trigger skin while keeping layout and keyboard behaviour. */
  triggerClassName?: string
  menuClassName?: string
  optionClassName?: string
  chevronClassName?: string
  leadingIcon?: ReactNode
  ariaLabel?: string
  id?: string
  name?: string
  menuMinWidth?: number
  menuMaxHeight?: number
}

const VARIANT_CLASSES: Record<SelectVariant, string> = {
  admin:
    'bg-[#FAF7F2] border border-[#EADBCE] hover:border-[#C59B4B] focus-visible:border-[#8D6527] focus-visible:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#221811] shadow-2xs',
  store:
    'bg-[#FAF7F2] border border-[#EADBCE] hover:border-[#C59B4B] focus-visible:border-[#8D6527] rounded-full px-4 py-2.5 text-xs font-medium text-[#221811]',
  bare: 'text-xs text-[#221811]',
}

export default function SelectMenu({
  value,
  options,
  onChange,
  placeholder = 'اختاري...',
  disabled = false,
  variant = 'admin',
  className = '',
  triggerClassName,
  menuClassName = '',
  optionClassName = '',
  chevronClassName,
  leadingIcon,
  ariaLabel,
  id,
  name,
  menuMinWidth = 160,
  menuMaxHeight = 280,
}: Props) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const lastScrolledKeyRef = useRef('')
  const reactId = useId()
  const listboxId = `${id ?? 'select'}-${reactId.replace(/:/g, '')}-listbox`
  const optionId = useCallback((index: number) => `${listboxId}-option-${index}`, [listboxId])

  const isDisabled = disabled || options.length === 0
  const selectedIndex = options.findIndex(option => option.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined

  const firstEnabledIndex = useCallback(() => {
    const index = options.findIndex(option => !option.disabled)
    return index >= 0 ? index : 0
  }, [options])

  const lastEnabledIndex = useCallback(() => {
    for (let index = options.length - 1; index >= 0; index -= 1) {
      if (!options[index].disabled) return index
    }
    return 0
  }, [options])

  const openMenu = useCallback(() => {
    const preferred = selectedIndex >= 0 && !options[selectedIndex]?.disabled
      ? selectedIndex
      : firstEnabledIndex()
    setActiveIndex(preferred)
    setOpen(true)
  }, [firstEnabledIndex, options, selectedIndex])

  const closeMenu = useCallback((focusTrigger = false) => {
    setOpen(false)
    if (focusTrigger) window.requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  const moveActive = useCallback((direction: 1 | -1) => {
    setActiveIndex(current => {
      if (options.length === 0) return -1
      let next = current
      for (let step = 0; step < options.length; step += 1) {
        next = (next + direction + options.length) % options.length
        if (!options[next].disabled) return next
      }
      return current
    })
  }, [options])

  const selectOption = useCallback((option: SelectOption) => {
    if (option.disabled) return
    onChange(option.value)
    closeMenu(true)
  }, [closeMenu, onChange])

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      setOpen(false)
      return
    }

    const viewportPadding = 8
    const availableWidth = Math.max(120, window.innerWidth - viewportPadding * 2)
    const width = Math.min(Math.max(rect.width, menuMinWidth), availableWidth)
    // The interface is RTL: align the menu's right edge with the trigger.
    const alignedLeft = rect.right - width
    const left = Math.max(
      viewportPadding,
      Math.min(alignedLeft, window.innerWidth - width - viewportPadding),
    )

    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
    const spaceAbove = rect.top - viewportPadding
    const shouldOpenAbove = spaceBelow < Math.min(menuMaxHeight, 200) && spaceAbove > spaceBelow
    const height = Math.max(120, Math.min(
      menuMaxHeight,
      shouldOpenAbove ? spaceAbove - 6 : spaceBelow - 6,
    ))

    setMenuStyle(shouldOpenAbove
      ? {
          position: 'fixed',
          left,
          width,
          bottom: window.innerHeight - rect.top + 6,
          maxHeight: height,
          zIndex: 120,
        }
      : {
          position: 'fixed',
          left,
          width,
          top: rect.bottom + 6,
          maxHeight: height,
          zIndex: 120,
        })
  }, [menuMaxHeight, menuMinWidth])

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null)
      return
    }
    updatePosition()
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const handleResize = () => updatePosition()
    const handleScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return
      updatePosition()
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (wrapperRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  useEffect(() => {
    if (!open) lastScrolledKeyRef.current = ''
  }, [open])

  useLayoutEffect(() => {
    if (!open || activeIndex < 0 || !menuStyle) return
    const key = `${listboxId}-${activeIndex}`
    if (lastScrolledKeyRef.current === key) return
    lastScrolledKeyRef.current = key
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeIndex, listboxId, menuStyle, open, optionId])

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (isDisabled) return

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        if (!open) {
          openMenu()
          if (event.key === 'ArrowUp') setActiveIndex(lastEnabledIndex())
        } else {
          moveActive(event.key === 'ArrowDown' ? 1 : -1)
        }
        break
      }
      case 'Home':
        if (open) {
          event.preventDefault()
          setActiveIndex(firstEnabledIndex())
        }
        break
      case 'End':
        if (open) {
          event.preventDefault()
          setActiveIndex(lastEnabledIndex())
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (!open) {
          openMenu()
        } else {
          const option = options[activeIndex]
          if (option) selectOption(option)
          else closeMenu(true)
        }
        break
      case 'Escape':
        if (open) {
          event.preventDefault()
          event.stopPropagation()
          closeMenu(true)
        }
        break
      case 'Tab':
        if (open) setOpen(false)
        break
      default:
        break
    }
  }

  const triggerVisual = triggerClassName ?? VARIANT_CLASSES[variant]

  return (
    <div ref={wrapperRef} className={`relative inline-block max-w-full align-middle ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={isDisabled}
        onClick={() => {
          if (isDisabled) return
          if (open) closeMenu()
          else openMenu()
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-label={ariaLabel}
        className={`w-full min-w-0 flex items-center justify-between gap-2 text-right outline-none transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#8D6527]/20 disabled:opacity-60 disabled:cursor-not-allowed ${triggerVisual}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {leadingIcon}
          {selectedOption?.icon}
          <span className={`truncate ${selectedOption ? '' : 'font-medium text-[#968B7E]'}`}>
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${chevronClassName ?? 'text-[#8D6527]'}`}
        />
      </button>

      {name && <input type="hidden" name={name} value={value} />}

      {open && menuStyle && createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          dir="rtl"
          style={menuStyle}
          className={`overflow-y-auto overscroll-contain rounded-2xl border border-[#EADBCE] bg-white p-1.5 shadow-2xl animate-scale-in ${menuClassName}`}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === activeIndex
            return (
              <button
                key={`${option.value}-${index}`}
                id={optionId(index)}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={isSelected}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
                className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-right text-xs transition-colors ${option.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${
                  isSelected
                    ? 'bg-[#FAF7F2] font-bold text-[#8D6527]'
                    : isActive
                      ? 'bg-[#FAF7F2] text-[#221811]'
                      : 'text-[#685D52] hover:bg-[#FAF7F2] hover:text-[#221811]'
                } ${option.className ?? ''} ${optionClassName}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {option.icon}
                  <span className="min-w-0">
                    <span className="block whitespace-normal break-words">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block text-[10px] font-normal text-[#968B7E]">{option.description}</span>
                    )}
                  </span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-[#8D6527]" />}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}
