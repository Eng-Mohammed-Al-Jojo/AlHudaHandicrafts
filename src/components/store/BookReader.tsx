import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  BookOpen,
  FileText,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Layers,
  Smartphone
} from 'lucide-react'

interface Props {
  pdfUrl?: string
  className?: string
  initialPage?: number
  onClose?: () => void
  isModal?: boolean
}

declare global {
  interface Window {
    pdfjsLib?: any
  }
}

export default function BookReader({
  pdfUrl = '/huda_book.pdf',
  className = '',
  initialPage = 1,
  onClose,
  isModal = false
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rightCanvasRef = useRef<HTMLCanvasElement>(null)
  const leftCanvasRef = useRef<HTMLCanvasElement>(null)

  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [isDoublePage, setIsDoublePage] = useState<boolean>(true)
  const [zoomScale, setZoomScale] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isRendering, setIsRendering] = useState<boolean>(false)

  // Track active render tasks so we can cancel them if page changes rapidly
  const rightRenderTaskRef = useRef<any>(null)
  const leftRenderTaskRef = useRef<any>(null)

  // Touch swipe support
  const touchStartXRef = useRef<number>(0)

  // Determine initial view mode based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsDoublePage(false)
      }
    }
    handleResize()
  }, [])

  // 1. Load PDF.js library & Document
  useEffect(() => {
    let isMounted = true

    async function initPdf() {
      try {
        setLoading(true)
        setLoadError(null)

        // Ensure PDF.js script is loaded
        if (!window.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.getElementById('pdfjs-local-script')
            if (existingScript) {
              existingScript.addEventListener('load', () => resolve())
              existingScript.addEventListener('error', () => reject(new Error('Failed to load PDF script')))
              return
            }
            const script = document.createElement('script')
            script.id = 'pdfjs-local-script'
            script.src = '/vendor/pdfjs/pdf.min.js'
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load local PDF.js'))
            document.head.appendChild(script)
          })
        }

        if (!window.pdfjsLib) {
          throw new Error('تعذر تحميل محرك قراءة الكتب (PDF.js)')
        }

        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js'

        const loadingTask = window.pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        })

        const doc = await loadingTask.promise
        if (!isMounted) return

        setPdfDoc(doc)
        setNumPages(doc.numPages)
        setLoading(false)
      } catch (err: any) {
        console.error('PDF Load Error:', err)
        if (isMounted) {
          setLoadError('تعذر تحميل صفحات الكتاب تلقائياً. يمكنك تحميله مباشرة أو فتحه في نافذة مستقلة.')
          setLoading(false)
        }
      }
    }

    initPdf()

    return () => {
      isMounted = false
    }
  }, [pdfUrl])

  // 2. Render Page Helper
  const renderSinglePage = useCallback(
    async (
      pageNumber: number,
      canvas: HTMLCanvasElement,
      renderTaskRef: React.MutableRefObject<any>
    ) => {
      if (!pdfDoc || !canvas) return

      try {
        // Cancel ongoing render for this canvas
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
          renderTaskRef.current = null
        }

        const page = await pdfDoc.getPage(pageNumber)
        const unscaledViewport = page.getViewport({ scale: 1 })

        // Calculate available display width per page
        const container = containerRef.current
        const containerWidth = container ? container.clientWidth : 800
        const containerHeight = container ? container.clientHeight - 130 : 600

        // Target width per page depends on mode
        let availableWidth = isDoublePage && pageNumber > 1 ? (containerWidth - 60) / 2 : containerWidth - 40
        availableWidth = Math.min(availableWidth, 650) // Max page width limit for crisp readability
        availableWidth = Math.max(availableWidth, 260) // Min width

        // Base scale to fit container width/height nicely
        const scaleX = availableWidth / unscaledViewport.width
        const scaleY = containerHeight > 300 ? (containerHeight / unscaledViewport.height) : scaleX
        const baseScale = Math.min(scaleX, scaleY > 0 ? scaleY : scaleX)
        const finalScale = baseScale * zoomScale

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: finalScale * pixelRatio })

        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${viewport.width / pixelRatio}px`
        canvas.style.height = `${viewport.height / pixelRatio}px`

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        }

        const task = page.render(renderContext)
        renderTaskRef.current = task
        await task.promise
        renderTaskRef.current = null
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber}:`, err)
        }
      }
    },
    [pdfDoc, isDoublePage, zoomScale]
  )

  // 3. Trigger Render whenever page, spread mode, or zoom changes
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return

    let cancelled = false
    setIsRendering(true)

    async function executeRender() {
      // Arabic Reading Order:
      // In Arabic, reading is Right-to-Left (RTL).
      // Cover page (1): displayed solo.
      // Spread: Page 2 is on the RIGHT, Page 3 is on the LEFT.
      // Page 4 is on the RIGHT, Page 5 is on the LEFT.
      if (isDoublePage && currentPage > 1) {
        // Right Page (Even number in Arabic spread)
        const rightPageNum = currentPage % 2 === 0 ? currentPage : currentPage - 1
        // Left Page (Odd number in Arabic spread)
        const leftPageNum = rightPageNum + 1

        const tasks: Promise<void>[] = []

        if (rightCanvasRef.current && rightPageNum <= numPages) {
          tasks.push(renderSinglePage(rightPageNum, rightCanvasRef.current, rightRenderTaskRef))
        }

        if (leftCanvasRef.current && leftPageNum <= numPages) {
          tasks.push(renderSinglePage(leftPageNum, leftCanvasRef.current, leftRenderTaskRef))
        }

        await Promise.all(tasks)
      } else {
        // Single Page mode or Cover Page
        if (rightCanvasRef.current) {
          await renderSinglePage(currentPage, rightCanvasRef.current, rightRenderTaskRef)
        }
      }

      if (!cancelled) {
        setIsRendering(false)
      }
    }

    executeRender()

    return () => {
      cancelled = true
    }
  }, [pdfDoc, currentPage, isDoublePage, zoomScale, numPages, renderSinglePage])

  // Navigation Handlers (Arabic RTL Flow)
  // "Next" (التقدم في الكتاب) advances page numbers
  const handleNext = () => {
    if (currentPage >= numPages) return

    if (isDoublePage) {
      if (currentPage === 1) {
        setCurrentPage(2)
      } else {
        const next = currentPage % 2 === 0 ? currentPage + 2 : currentPage + 1
        if (next <= numPages) setCurrentPage(next)
      }
    } else {
      setCurrentPage(prev => Math.min(prev + 1, numPages))
    }
  }

  // "Prev" (الرجوع للخلف في الكتاب)
  const handlePrev = () => {
    if (currentPage <= 1) return

    if (isDoublePage) {
      if (currentPage <= 3) {
        setCurrentPage(1)
      } else {
        const prev = currentPage % 2 === 0 ? currentPage - 2 : currentPage - 3
        setCurrentPage(Math.max(prev, 1))
      }
    } else {
      setCurrentPage(prev => Math.max(prev - 1, 1))
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        // In Arabic RTL, left arrow moves forwards in the book
        handleNext()
      } else if (e.key === 'ArrowRight') {
        // Right arrow moves backwards in the book
        handlePrev()
      } else if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, numPages, isDoublePage, onClose])

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchEndX - touchStartXRef.current
    if (Math.abs(diff) > 45) {
      if (diff < 0) {
        // Swiped Left -> Next page in Arabic RTL
        handleNext()
      } else {
        // Swiped Right -> Prev page
        handlePrev()
      }
    }
  }

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Active spread page numbers label
  const getPageIndicatorText = () => {
    if (numPages === 0) return 'جاري التحميل...'
    if (!isDoublePage || currentPage === 1) {
      return `صفحة ${currentPage} من ${numPages}`
    }
    const rightPageNum = currentPage % 2 === 0 ? currentPage : currentPage - 1
    const leftPageNum = rightPageNum + 1
    if (leftPageNum <= numPages) {
      return `صفحتا ${rightPageNum} - ${leftPageNum} من ${numPages}`
    }
    return `صفحة ${rightPageNum} من ${numPages}`
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#1A120B] text-[#FAF7F2] select-none rounded-2xl overflow-hidden shadow-2xl border border-[#3D2C1E] ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      dir="rtl"
    >
      {/* ── Top Bar / Controls Header ── */}
      <div className="bg-[#24180E] px-4 py-3 border-b border-[#3D2C1E] flex flex-wrap items-center justify-between gap-3 text-xs z-20 shrink-0">
        {/* Book Info & Status */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#8D6527]/30 border border-[#DFB76C]/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-[#DFB76C]" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#F7F1E5] m-0 line-clamp-1" style={{ fontFamily: 'Amiri, serif' }}>
              غرز البلاد — دليل التطريز الفلسطيني
            </h3>
            <span className="text-[11px] text-[#C59B4B] block">هدى أمين القريناوي</span>
          </div>
        </div>

        {/* Center: Page Navigation Indicator */}
        <div className="flex items-center gap-1.5 bg-[#18100A] px-3 py-1.5 rounded-full border border-[#3D2C1E]">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage <= 1 || loading}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#8D6527]/40 text-[#DFB76C] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="الصفحة السابقة (سهم يمين)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold px-2 text-[#F7F1E5] min-w-[120px] text-center">
            {getPageIndicatorText()}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage >= numPages || loading}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#8D6527]/40 text-[#DFB76C] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="الصفحة التالية (سهم يسار)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls: View mode, Zoom, Download, Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* View Mode Toggle (Single vs Double Spread) */}
          <button
            type="button"
            onClick={() => setIsDoublePage(v => !v)}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isDoublePage
                ? 'bg-[#8D6527] text-white border-[#8D6527]'
                : 'bg-[#18100A] text-[#DFB76C] border-[#3D2C1E] hover:border-[#DFB76C]'
            }`}
            title={isDoublePage ? 'التبديل إلى صفحة واحدة' : 'التبديل إلى عرض كتاب (صفحتان)'}
          >
            {isDoublePage ? (
              <>
                <Layers className="w-3.5 h-3.5" />
                <span>صفحتان</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span>صفحة واحدة</span>
              </>
            )}
          </button>

          {/* Zoom Controls */}
          <div className="hidden md:flex items-center bg-[#18100A] border border-[#3D2C1E] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setZoomScale(s => Math.max(0.7, s - 0.15))}
              className="w-7 h-7 flex items-center justify-center text-[#DFB76C] hover:bg-white/10 rounded-md transition-colors"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-white/70">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale(s => Math.min(1.8, s + 0.15))}
              className="w-7 h-7 flex items-center justify-center text-[#DFB76C] hover:bg-white/10 rounded-md transition-colors"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomScale !== 1 && (
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="إعادة ضبط الحجم"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Direct Download PDF */}
          <a
            href={pdfUrl}
            download="غرز_البلاد_دليل_التطريز_الفلسطيني_هدى_القريناوي.pdf"
            className="inline-flex items-center gap-1.5 bg-[#8D6527] hover:bg-[#6e4e1d] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors no-underline shadow-xs"
            title="تنزيل نسخة PDF الأصلية"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تحميل PDF</span>
          </a>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-lg bg-[#18100A] hover:bg-white/10 border border-[#3D2C1E] text-[#DFB76C] flex items-center justify-center transition-colors"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close button if inside modal */}
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/40 text-red-200 flex items-center justify-center transition-colors text-sm font-bold"
              title="إغلاق المعاينة"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Reader Main Display Area (The Book Experience) ── */}
      <div className="flex-1 relative flex items-center justify-center overflow-auto p-4 sm:p-8 min-h-[440px] sm:min-h-[580px] bg-gradient-to-b from-[#160E08] to-[#1F1610]">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#1A120B]/90 backdrop-blur-sm">
            <div className="w-12 h-12 border-3 border-[#C59B4B] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-[#DFB76C] flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>جاري فتح صفحات كتاب «غرز البلاد» بدقة عالية...</span>
            </p>
            <span className="text-xs text-white/50 mt-1">تأليف: هدى أمين القريناوي</span>
          </div>
        )}

        {/* Load Error State with fallback */}
        {loadError && (
          <div className="text-center p-6 bg-[#24180E] border border-amber-800/50 rounded-2xl max-w-md mx-auto">
            <p className="text-amber-300 text-sm mb-4 leading-relaxed">{loadError}</p>
            <div className="flex items-center justify-center gap-3">
              <a
                href={pdfUrl}
                download="غرز_البلاد_دليل_التطريز_الفلسطيني_هدى_القريناوي.pdf"
                className="inline-flex items-center gap-2 bg-[#8D6527] text-white px-5 py-2.5 rounded-full text-xs font-bold no-underline"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الكتاب مباشرة (8.2 MB)</span>
              </a>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-full text-xs font-semibold no-underline"
              >
                <ExternalLink className="w-4 h-4" />
                <span>فتح في تبويب مستقل</span>
              </a>
            </div>
          </div>
        )}

        {/* Book Spine & Pages Container */}
        {!loadError && (
          <div className="relative flex items-center justify-center max-w-full">
            {/* Ambient Book Drop Shadow */}
            <div className="absolute -inset-4 bg-black/60 rounded-3xl blur-2xl pointer-events-none" />

            {/* Book Body (Paper Spreads) */}
            <div
              className={`relative flex items-center justify-center bg-[#FDFBF7] text-[#221811] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden border border-[#EADBCE] transition-all duration-300 ${
                isRendering ? 'opacity-90' : 'opacity-100'
              }`}
            >
              {/* ── Arabic Reading Order: Page 2 on Right, Page 3 on Left ── */}
              {isDoublePage && currentPage > 1 ? (
                <div className="flex items-stretch relative">
                  {/* Right Page Canvas (Even number in Arabic) */}
                  <div className="relative bg-white flex flex-col items-center justify-between p-2 sm:p-4 border-l border-[#EADBCE]/70">
                    <canvas
                      ref={rightCanvasRef}
                      className="block max-w-full h-auto shadow-xs rounded-sm"
                    />
                    <div className="text-[11px] font-serif text-[#8D6527] font-bold mt-2">
                      صفحة {currentPage % 2 === 0 ? currentPage : currentPage - 1}
                    </div>
                  </div>

                  {/* Realistic Center Book Spine Crease / Binding Shadow */}
                  <div className="w-4 sm:w-8 shrink-0 bg-gradient-to-r from-black/25 via-black/10 to-transparent pointer-events-none z-10 -mr-2 sm:-mr-4" />
                  <div className="w-4 sm:w-8 shrink-0 bg-gradient-to-l from-black/25 via-black/10 to-transparent pointer-events-none z-10 -ml-2 sm:-ml-4" />

                  {/* Left Page Canvas (Odd number in Arabic) */}
                  {((currentPage % 2 === 0 ? currentPage : currentPage - 1) + 1) <= numPages && (
                    <div className="relative bg-white flex flex-col items-center justify-between p-2 sm:p-4 border-r border-[#EADBCE]/70">
                      <canvas
                        ref={leftCanvasRef}
                        className="block max-w-full h-auto shadow-xs rounded-sm"
                      />
                      <div className="text-[11px] font-serif text-[#8D6527] font-bold mt-2">
                        صفحة {(currentPage % 2 === 0 ? currentPage : currentPage - 1) + 1}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Single Page (Cover or Mobile Single View) */
                <div className="relative bg-white flex flex-col items-center justify-between p-3 sm:p-6">
                  {currentPage === 1 && (
                    <div className="mb-2 text-center">
                      <span className="inline-block bg-[#8D6527]/10 text-[#8D6527] border border-[#8D6527]/20 px-3 py-1 rounded-full text-[11px] font-bold">
                        غلاف الكتاب الأصلي
                      </span>
                    </div>
                  )}
                  <canvas
                    ref={rightCanvasRef}
                    className="block max-w-full h-auto shadow-md rounded-md"
                  />
                  <div className="text-[11px] font-serif text-[#8D6527] font-bold mt-2">
                    صفحة {currentPage} من {numPages}
                  </div>
                </div>
              )}
            </div>

            {/* Side Floating Page Flip Arrows (Large clickable areas) */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentPage <= 1 || loading}
              className="absolute -right-3 sm:-right-6 top-1/2 -translate-y-1/2 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-[#24180E]/90 hover:bg-[#8D6527] border border-[#DFB76C]/40 text-[#DFB76C] hover:text-white flex items-center justify-center shadow-xl disabled:opacity-0 transition-all z-20 cursor-pointer"
              title="السابق (سهم يمين)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentPage >= numPages || loading}
              className="absolute -left-3 sm:-left-6 top-1/2 -translate-y-1/2 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-[#24180E]/90 hover:bg-[#8D6527] border border-[#DFB76C]/40 text-[#DFB76C] hover:text-white flex items-center justify-center shadow-xl disabled:opacity-0 transition-all z-20 cursor-pointer"
              title="التالي (سهم يسار)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom Quick Navigation Slider ── */}
      <div className="bg-[#1F150D] px-4 sm:px-6 py-3 border-t border-[#3D2C1E] flex items-center justify-between gap-4 text-xs shrink-0">
        <div className="flex items-center gap-2 text-white/60 text-[11px] hidden sm:flex">
          <FileText className="w-3.5 h-3.5 text-[#C59B4B]" />
          <span>اسحبي للتنقل السريع بين الصفحات:</span>
        </div>

        <div className="flex-1 max-w-md flex items-center gap-3">
          <span className="text-[11px] text-[#DFB76C] font-mono">1</span>
          <input
            type="range"
            min={1}
            max={numPages || 1}
            value={currentPage}
            onChange={e => setCurrentPage(Number(e.target.value))}
            className="w-full accent-[#DFB76C] cursor-pointer h-1.5 bg-[#3D2C1E] rounded-lg"
          />
          <span className="text-[11px] text-[#DFB76C] font-mono">{numPages || '...'}</span>
        </div>

        <div className="text-[11px] text-[#C59B4B] flex items-center gap-2">
          <span className="hidden md:inline">يمكنكِ استخدام الأسهم (← و →) في لوحة المفاتيح</span>
        </div>
      </div>
    </div>
  )
}

