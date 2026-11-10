import { useState, useEffect } from 'react'
import { Clock, Flame, Timer, Sparkles, AlertCircle } from 'lucide-react'
import { getSaleTimeRemaining, SaleTimeRemaining } from '../../utils/commerce'

interface Props {
  saleEndDate?: string
  variant?: 'compact' | 'detailed'
  className?: string
}

export default function SaleCountdown({ saleEndDate, variant = 'compact', className = '' }: Props) {
  const [timeLeft, setTimeLeft] = useState<SaleTimeRemaining | null>(() => getSaleTimeRemaining(saleEndDate))

  useEffect(() => {
    if (!saleEndDate) return

    // Update time immediately
    setTimeLeft(getSaleTimeRemaining(saleEndDate))

    // Update every second for live countdown
    const timer = setInterval(() => {
      const remaining = getSaleTimeRemaining(saleEndDate)
      setTimeLeft(remaining)
      if (!remaining || remaining.isExpired) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [saleEndDate])

  if (!saleEndDate || !timeLeft || timeLeft.isExpired) {
    return null
  }

  // ── 1. Compact Variant (for Product Cards) ──
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs select-none ${
          timeLeft.days === 0
            ? 'bg-red-600/95 text-white animate-pulse'
            : 'bg-[#24180E]/90 text-[#DFB76C] border border-[#DFB76C]/30 backdrop-blur-md'
        } ${className}`}
        title={`ينتهي العرض بتاريخ: ${saleEndDate}`}
      >
        <Clock className="w-3 h-3 text-[#DFB76C] shrink-0" />
        <span className="text-white/80 font-normal">ينتهي خلال:</span>
        <span className="font-bold tracking-tight text-[#FAF7F2]">{timeLeft.formattedArabic}</span>
      </div>
    )
  }

  // ── 2. Detailed Variant (for Product Modal / Detail View) ──
  return (
    <div
      className={`bg-gradient-to-r from-[#24180E] via-[#2F2013] to-[#24180E] text-white rounded-2xl p-4 sm:p-5 border border-[#DFB76C]/30 shadow-lg select-none relative overflow-hidden ${className}`}
      dir="rtl"
    >
      {/* Background ambient gold glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#DFB76C]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3.5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#8D6527]/30 border border-[#DFB76C]/40 flex items-center justify-center">
            <Flame className="w-4 h-4 text-[#DFB76C] animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#F7F1E5] m-0 flex items-center gap-1.5">
              <span>عرض خاص لفترة محدودة</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h4>
            <p className="text-[10px] text-white/60 m-0">اغتنمي التخفيض قبل انتهاء الوقت المحدد</p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-[#DFB76C] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
          ينتهي: {saleEndDate}
        </span>
      </div>

      {/* Countdown Grid (Days, Hours, Minutes, Seconds) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center relative z-10">
        {/* Days */}
        <div className="bg-white/10 backdrop-blur-sm border border-[#DFB76C]/20 rounded-xl p-2 sm:p-2.5 flex flex-col items-center">
          <span className="text-base sm:text-xl font-bold font-mono text-[#DFB76C] leading-none mb-1">
            {String(timeLeft.days).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-white/70">أيام</span>
        </div>

        {/* Hours */}
        <div className="bg-white/10 backdrop-blur-sm border border-[#DFB76C]/20 rounded-xl p-2 sm:p-2.5 flex flex-col items-center">
          <span className="text-base sm:text-xl font-bold font-mono text-[#DFB76C] leading-none mb-1">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-white/70">ساعة</span>
        </div>

        {/* Minutes */}
        <div className="bg-white/10 backdrop-blur-sm border border-[#DFB76C]/20 rounded-xl p-2 sm:p-2.5 flex flex-col items-center">
          <span className="text-base sm:text-xl font-bold font-mono text-[#DFB76C] leading-none mb-1">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-white/70">دقيقة</span>
        </div>

        {/* Seconds */}
        <div className="bg-white/10 backdrop-blur-sm border border-[#DFB76C]/20 rounded-xl p-2 sm:p-2.5 flex flex-col items-center">
          <span className="text-base sm:text-xl font-bold font-mono text-[#DFB76C] leading-none mb-1">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-white/70">ثانية</span>
        </div>
      </div>
    </div>
  )
}

