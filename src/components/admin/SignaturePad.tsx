import { useEffect, useRef } from 'react'
import { Eraser, PenLine } from 'lucide-react'

const CANVAS_WIDTH = 900
const CANVAS_HEIGHT = 260

interface Props {
  value?: string
  onChange: (dataUrl: string) => void
}

export default function SignaturePad({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  function paintBackground(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Initialize the canvas with a white background.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    paintBackground(canvas)
  }, [])

  // Reflect an externally loaded signature (saved signature, edit mode, reset).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!value) {
      if (canvas.toDataURL() !== canvasEmptyDataUrl(canvas)) {
        paintBackground(canvas)
      }
      return
    }
    if (canvas.toDataURL() === value) return
    const image = new Image()
    image.onload = () => {
      paintBackground(canvas)
      const context = canvas.getContext('2d')
      if (!context) return
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
    }
    image.src = value
  }, [value])

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    event.preventDefault()
    canvas.setPointerCapture(event.pointerId)
    isDrawingRef.current = true
    const point = getPoint(event)
    lastPointRef.current = point
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#1F2937'
    context.beginPath()
    context.arc(point.x, point.y, 2.4, 0, Math.PI * 2)
    context.fill()
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const last = lastPointRef.current
    if (!canvas || !last) return
    const context = canvas.getContext('2d')
    if (!context) return
    const point = getPoint(event)
    context.strokeStyle = '#1F2937'
    context.lineWidth = 3.2
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(last.x, last.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    lastPointRef.current = point
  }

  function finishStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null
    const canvas = canvasRef.current
    if (!canvas) return
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    onChange(canvas.toDataURL('image/png'))
  }

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    paintBackground(canvas)
    onChange('')
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl border border-dashed border-[#D9C7B2] bg-white overflow-hidden">
        <span className="absolute top-2 left-3 text-[10px] text-[#B4A898] pointer-events-none select-none flex items-center gap-1">
          <PenLine className="w-3 h-3" />
          ارسمي التوقيع هنا
        </span>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onPointerLeave={finishStroke}
          className="block w-full h-36 cursor-crosshair"
          style={{ touchAction: 'none' }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-[#968B7E]">يعمل باللمس أو بالفأرة</span>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#EADBCE] hover:border-red-300 hover:bg-red-50 text-[#685D52] hover:text-red-600 text-[10px] font-bold px-2.5 py-1.5 transition-colors cursor-pointer"
        >
          <Eraser className="w-3 h-3" />
          مسح الرسم
        </button>
      </div>
    </div>
  )
}

function canvasEmptyDataUrl(canvas: HTMLCanvasElement) {
  const scratch = document.createElement('canvas')
  scratch.width = canvas.width
  scratch.height = canvas.height
  const context = scratch.getContext('2d')
  if (context) {
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, scratch.width, scratch.height)
  }
  return scratch.toDataURL()
}
