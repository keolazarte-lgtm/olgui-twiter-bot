'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import {
  Crop, Type, Droplets, Sun, RotateCcw, Check, X, Plus,
  Trash2, Palette, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Eye, Download,
  Sparkles, Move, ChevronDown, Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'

// ─── Types ───────────────────────────────────────────────────
interface TextLayer {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
  bold: boolean
  italic: boolean
  stroke: boolean
  strokeColor: string
  align: 'left' | 'center' | 'right'
}

interface BlurStroke {
  id: string
  points: { x: number; y: number }[]
  brushSize: number
  intensity: number
}

interface PhotoEditorProps {
  imageSrc: string
  onApply: (editedBlob: Blob) => void
  onCancel: () => void
}

// ─── Constants ───────────────────────────────────────────────
const FONTS = [
  { value: 'Impact', label: 'IMPACT', css: 'Impact, "Arial Black", sans-serif' },
  { value: 'BebasNeue', label: 'BEBAS', css: '"Bebas Neue", Impact, sans-serif' },
  { value: 'Lobster', label: 'Lobster', css: 'Lobster, cursive' },
  { value: 'Pacifico', label: 'Pacifico', css: 'Pacifico, cursive' },
  { value: 'PermanentMarker', label: 'MARKER', css: '"Permanent Marker", cursive' },
  { value: 'Oswald', label: 'Oswald', css: 'Oswald, sans-serif' },
  { value: 'RussoOne', label: 'Russo', css: '"Russo One", sans-serif' },
  { value: 'Staatliches', label: 'Staat.', css: 'Staatliches, sans-serif' },
  { value: 'DancingScript', label: 'Dancing', css: '"Dancing Script", cursive' },
  { value: 'ShadowsIntoLight', label: 'Shadows', css: '"Shadows Into Light", cursive' },
  { value: 'PressStart2P', label: 'PIXEL', css: '"Press Start 2P", monospace' },
  { value: 'Arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { value: 'Georgia', label: 'Georgia', css: 'Georgia, serif' },
  { value: 'Verdana', label: 'Verdana', css: 'Verdana, sans-serif' },
  { value: 'CourierNew', label: 'Courier', css: '"Courier New", monospace' },
]

const CROP_PRESETS = [
  { value: '16/9', label: '16:9', sublabel: 'Twitter', ratio: 16 / 9 },
  { value: '1/1', label: '1:1', sublabel: 'Square', ratio: 1 },
  { value: '4/5', label: '4:5', sublabel: 'IG Post', ratio: 4 / 5 },
  { value: '9/16', label: '9:16', sublabel: 'Story', ratio: 9 / 16 },
  { value: '3/4', label: '3:4', sublabel: 'Portrait', ratio: 3 / 4 },
  { value: 'free', label: 'Free', sublabel: 'Libre', ratio: undefined },
]

const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#FF6B6B', '#FFD93D',
  '#6BCB77', '#4D96FF', '#9B59B6', '#FF69B4', '#FF8C00',
  '#00CED1', '#FF1493',
]

// ─── Helpers ─────────────────────────────────────────────────
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<HTMLCanvasElement> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = imageSrc
  await new Promise(r => { image.onload = r })
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return canvas
}

function getPointerPos(e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, rect: DOMRect) {
  let clientX: number, clientY: number
  if ('touches' in e) {
    if (e.touches.length === 0) return null
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = (e as MouseEvent).clientX
    clientY = (e as MouseEvent).clientY
  }
  return {
    x: (clientX - rect.left) / rect.width * 100,
    y: (clientY - rect.top) / rect.height * 100,
  }
}

function pixelateCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, pixelSize: number) {
  const x0 = Math.max(0, Math.floor(cx - radius))
  const y0 = Math.max(0, Math.floor(cy - radius))
  const x1 = Math.min(ctx.canvas.width, Math.ceil(cx + radius))
  const y1 = Math.min(ctx.canvas.height, Math.ceil(cy + radius))
  const rw = x1 - x0
  const rh = y1 - y0
  if (rw <= 0 || rh <= 0) return

  const regionCanvas = document.createElement('canvas')
  regionCanvas.width = rw
  regionCanvas.height = rh
  const regionCtx = regionCanvas.getContext('2d')!
  regionCtx.drawImage(ctx.canvas, x0, y0, rw, rh, 0, 0, rw, rh)

  const smallW = Math.max(1, Math.floor(rw / pixelSize))
  const smallH = Math.max(1, Math.floor(rh / pixelSize))
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = smallW
  tempCanvas.height = smallH
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.drawImage(regionCanvas, 0, 0, rw, rh, 0, 0, smallW, smallH)

  regionCtx.clearRect(0, 0, rw, rh)
  regionCtx.imageSmoothingEnabled = false
  regionCtx.drawImage(tempCanvas, 0, 0, smallW, smallH, 0, 0, rw, rh)
  regionCtx.imageSmoothingEnabled = true

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(regionCanvas, x0, y0)
  ctx.restore()
}

// ─── Main Component ──────────────────────────────────────────
export default function PhotoEditor({ imageSrc, onApply, onCancel }: PhotoEditorProps) {
  const [activeTool, setActiveTool] = useState<'crop' | 'text' | 'blur' | 'adjust'>('crop')
  const [cropPreset, setCropPreset] = useState('16/9')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  // Text
  const [textLayers, setTextLayers] = useState<TextLayer[]>([])
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [newText, setNewText] = useState('')
  const [draggingText, setDraggingText] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showFontPicker, setShowFontPicker] = useState(false)

  // Blur paint
  const [blurStrokes, setBlurStrokes] = useState<BlurStroke[]>([])
  const [isPaintingBlur, setIsPaintingBlur] = useState(false)
  const [currentStrokePoints, setCurrentStrokePoints] = useState<{ x: number; y: number }[]>([])
  const [blurBrushSize, setBlurBrushSize] = useState(8)
  const [blurIntensity, setBlurIntensity] = useState(12)

  // Adjustments
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturate, setSaturate] = useState(100)

  // Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Refs
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const blurCanvasRef = useRef<HTMLCanvasElement>(null)
  const originalImageRef = useRef<HTMLImageElement | null>(null)
  const fontPickerRef = useRef<HTMLDivElement>(null)

  const selectedText = textLayers.find(t => t.id === selectedTextId)

  // ─── Load fonts ────────────────────────────────────────────
  useEffect(() => {
    document.fonts.ready.then(() => {
      // Force re-render by triggering a no-op state change
      setTextLayers(prev => [...prev])
    })
  }, [])

  // ─── Load original image ───────────────────────────────────
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { originalImageRef.current = img }
    img.src = imageSrc
  }, [imageSrc])

  // ─── Render blur preview ───────────────────────────────────
  const renderBlurPreview = useCallback(() => {
    const canvas = blurCanvasRef.current
    const container = imageContainerRef.current
    const img = originalImageRef.current
    if (!canvas || !container || !img) return

    const imgEl = container.querySelector('[data-img-base]') as HTMLElement
    if (!imgEl) return

    const w = imgEl.offsetWidth
    const h = imgEl.offsetHeight
    if (w === 0 || h === 0) return

    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, w, h)

    // Draw image with filters
    ctx.filter = [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturate}%)`,
    ].join(' ')
    ctx.drawImage(img, 0, 0, w, h)
    ctx.filter = 'none'

    // Apply blur strokes
    const allStrokes = [...blurStrokes]
    if (isPaintingBlur && currentStrokePoints.length > 0) {
      allStrokes.push({
        id: 'current',
        points: currentStrokePoints,
        brushSize: blurBrushSize,
        intensity: blurIntensity,
      })
    }

    for (const stroke of allStrokes) {
      const pixelSize = Math.max(3, stroke.intensity)
      // Interpolate points for smoother strokes
      for (let i = 0; i < stroke.points.length; i++) {
        const point = stroke.points[i]
        const px = point.x / 100 * w
        const py = point.y / 100 * h
        const radius = stroke.brushSize / 100 * w / 2
        pixelateCircle(ctx, px, py, radius, pixelSize)
      }
      // Also interpolate between consecutive points for continuous stroke
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1]
        const curr = stroke.points[i]
        const dist = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2)
        const steps = Math.max(1, Math.floor(dist / 0.5))
        for (let s = 1; s < steps; s++) {
          const t = s / steps
          const interpX = (prev.x + (curr.x - prev.x) * t) / 100 * w
          const interpY = (prev.y + (curr.y - prev.y) * t) / 100 * h
          const radius = stroke.brushSize / 100 * w / 2
          pixelateCircle(ctx, interpX, interpY, radius, pixelSize)
        }
      }
    }
  }, [blurStrokes, isPaintingBlur, currentStrokePoints, blurBrushSize, blurIntensity, brightness, contrast, saturate])

  useEffect(() => {
    if (activeTool === 'blur' || blurStrokes.length > 0) {
      renderBlurPreview()
    }
  }, [activeTool, renderBlurPreview, blurStrokes])

  // ─── Crop handlers ────────────────────────────────────────
  const onCropChange = useCallback((location: { x: number; y: number }) => setCrop(location), [])
  const onZoomChange = useCallback((z: number) => setZoom(z), [])
  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => setCroppedAreaPixels(croppedAreaPixels), [])

  // ─── Text handlers ────────────────────────────────────────
  const addTextLayer = () => {
    if (!newText.trim()) return
    const layer: TextLayer = {
      id: Date.now().toString(),
      text: newText,
      x: 50, y: 50,
      fontSize: 32,
      fontFamily: 'Impact',
      color: '#FFFFFF',
      bold: true, italic: false,
      stroke: true, strokeColor: '#000000',
      align: 'center',
    }
    setTextLayers(prev => [...prev, layer])
    setSelectedTextId(layer.id)
    setNewText('')
  }

  const updateTextLayer = useCallback((id: string, updates: Partial<TextLayer>) => {
    setTextLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }, [])

  const removeTextLayer = (id: string) => {
    setTextLayers(prev => prev.filter(l => l.id !== id))
    if (selectedTextId === id) setSelectedTextId(null)
  }

  // ─── Text drag ────────────────────────────────────────────
  const handleTextPointerDown = (e: React.MouseEvent | React.TouchEvent, layerId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedTextId(layerId)
    setDraggingText(layerId)
    const rect = imageContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    const pos = getPointerPos(e, rect)
    if (!pos) return
    const layer = textLayers.find(l => l.id === layerId)
    if (!layer) return
    setDragOffset({ x: pos.x - layer.x, y: pos.y - layer.y })
  }

  // ─── Blur paint ───────────────────────────────────────────
  const handleCanvasPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = imageContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    const pos = getPointerPos(e, rect)
    if (!pos) return

    if (activeTool === 'blur') {
      setIsPaintingBlur(true)
      setCurrentStrokePoints([pos])
      e.preventDefault()
    }
  }

  const handleCanvasPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = imageContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    const pos = getPointerPos(e, rect)
    if (!pos) return

    if (isPaintingBlur) {
      setCurrentStrokePoints(prev => [...prev, pos])
      e.preventDefault()
    }
  }

  const handleCanvasPointerUp = () => {
    if (isPaintingBlur && currentStrokePoints.length > 0) {
      const stroke: BlurStroke = {
        id: Date.now().toString(),
        points: currentStrokePoints,
        brushSize: blurBrushSize,
        intensity: blurIntensity,
      }
      setBlurStrokes(prev => [...prev, stroke])
      setCurrentStrokePoints([])
    }
    setIsPaintingBlur(false)
  }

  // Global event listeners
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      const rect = imageContainerRef.current?.getBoundingClientRect()
      if (!rect) return
      if (draggingText) {
        const pos = getPointerPos(e, rect)
        if (!pos) return
        const x = pos.x - dragOffset.x
        const y = pos.y - dragOffset.y
        updateTextLayer(draggingText, { x: Math.max(0, Math.min(95, x)), y: Math.max(0, Math.min(95, y)) })
      }
    }

    const handleGlobalUp = () => {
      if (isPaintingBlur && currentStrokePoints.length > 0) {
        const stroke: BlurStroke = {
          id: Date.now().toString(),
          points: currentStrokePoints,
          brushSize: blurBrushSize,
          intensity: blurIntensity,
        }
        setBlurStrokes(prev => [...prev, stroke])
        setCurrentStrokePoints([])
      }
      setDraggingText(null)
      setIsPaintingBlur(false)
    }

    window.addEventListener('mousemove', handleGlobalMove)
    window.addEventListener('mouseup', handleGlobalUp)
    window.addEventListener('touchmove', handleGlobalMove, { passive: false })
    window.addEventListener('touchend', handleGlobalUp)
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove)
      window.removeEventListener('mouseup', handleGlobalUp)
      window.removeEventListener('touchmove', handleGlobalMove)
      window.removeEventListener('touchend', handleGlobalUp)
    }
  }, [draggingText, dragOffset, updateTextLayer, isPaintingBlur, currentStrokePoints, blurBrushSize, blurIntensity])

  // Close font picker on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target as Node)) {
        setShowFontPicker(false)
      }
    }
    if (showFontPicker) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showFontPicker])

  // ─── FULL render ──────────────────────────────────────────
  const renderFinalImage = async (): Promise<Blob> => {
    await document.fonts.ready

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = imageSrc
    await new Promise(r => { image.onload = r })

    let sourceCanvas: HTMLCanvasElement

    if (croppedAreaPixels && croppedAreaPixels.width > 0 && croppedAreaPixels.height > 0) {
      sourceCanvas = await getCroppedImg(imageSrc, croppedAreaPixels)
    } else {
      sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = image.naturalWidth
      sourceCanvas.height = image.naturalHeight
      sourceCanvas.getContext('2d')!.drawImage(image, 0, 0)
    }

    // Adjustments
    const adjustedCanvas = document.createElement('canvas')
    adjustedCanvas.width = sourceCanvas.width
    adjustedCanvas.height = sourceCanvas.height
    const adjustedCtx = adjustedCanvas.getContext('2d')!
    adjustedCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`
    adjustedCtx.drawImage(sourceCanvas, 0, 0)
    adjustedCtx.filter = 'none'

    // Blur
    const blurCanvas = document.createElement('canvas')
    blurCanvas.width = adjustedCanvas.width
    blurCanvas.height = adjustedCanvas.height
    const blurCtx = blurCanvas.getContext('2d')!
    blurCtx.drawImage(adjustedCanvas, 0, 0)

    for (const stroke of blurStrokes) {
      const pixelSize = Math.max(3, stroke.intensity)
      for (let i = 0; i < stroke.points.length; i++) {
        const point = stroke.points[i]
        const px = point.x / 100 * blurCanvas.width
        const py = point.y / 100 * blurCanvas.height
        const radius = stroke.brushSize / 100 * blurCanvas.width / 2
        pixelateCircle(blurCtx, px, py, radius, pixelSize)
      }
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1]
        const curr = stroke.points[i]
        const dist = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2)
        const steps = Math.max(1, Math.floor(dist / 0.5))
        for (let s = 1; s < steps; s++) {
          const t = s / steps
          const interpX = (prev.x + (curr.x - prev.x) * t) / 100 * blurCanvas.width
          const interpY = (prev.y + (curr.y - prev.y) * t) / 100 * blurCanvas.height
          const radius = stroke.brushSize / 100 * blurCanvas.width / 2
          pixelateCircle(blurCtx, interpX, interpY, radius, pixelSize)
        }
      }
    }

    // Text
    for (const layer of textLayers) {
      const x = layer.x / 100 * blurCanvas.width
      const y = layer.y / 100 * blurCanvas.height
      const scaledSize = layer.fontSize * (blurCanvas.width / 500)
      const fontDef = FONTS.find(f => f.value === layer.fontFamily)
      const fontCss = fontDef?.css || layer.fontFamily

      let fontStyle = ''
      if (layer.italic) fontStyle += 'italic '
      if (layer.bold) fontStyle += 'bold '
      fontStyle += `${scaledSize}px ${fontCss}`

      blurCtx.font = fontStyle
      blurCtx.textAlign = layer.align
      blurCtx.textBaseline = 'top'
      const offsetX = layer.align === 'center' ? 0 : layer.align === 'right' ? -blurCanvas.width * 0.02 : blurCanvas.width * 0.02

      if (layer.stroke) {
        blurCtx.strokeStyle = layer.strokeColor
        blurCtx.lineWidth = scaledSize / 8
        blurCtx.lineJoin = 'round'
        blurCtx.miterLimit = 2
        blurCtx.strokeText(layer.text, x + offsetX, y)
      }
      blurCtx.fillStyle = layer.color
      blurCtx.fillText(layer.text, x + offsetX, y)
    }

    return new Promise(resolve => {
      blurCanvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.92)
    })
  }

  const handlePreview = async () => {
    setIsProcessing(true)
    try {
      const blob = await renderFinalImage()
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (err) {
      console.error('Preview error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApply = async () => {
    setIsProcessing(true)
    try {
      const blob = await renderFinalImage()
      onApply(blob)
    } catch (err) {
      console.error('Apply error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const previewFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`
  const cropRatio = CROP_PRESETS.find(p => p.value === cropPreset)?.ratio
  const hasBlur = blurStrokes.length > 0 || isPaintingBlur

  // ─── Preview Modal ────────────────────────────────────────
  if (previewUrl) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-zinc-900/90 to-zinc-800/90 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Vista Previa</h2>
              <p className="text-white/30 text-[10px]">Asi se va a ver publicada</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-white/50 hover:text-white hover:bg-white/5 h-9" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}>
              <X className="w-4 h-4 mr-1.5" />Volver
            </Button>
            <a href={previewUrl} download="foto-editada.jpg" className="inline-flex items-center h-9 px-4 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs hover:bg-white/10 transition-all">
              <Download className="w-3.5 h-3.5 mr-1.5" />Descargar
            </a>
            <Button size="sm" onClick={handleApply} className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white border-0 h-9 px-5 rounded-xl shadow-lg shadow-sky-500/20">
              <Check className="w-4 h-4 mr-1.5" />Confirmar
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
        </div>
      </div>
    )
  }

  // ─── Main Editor ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col select-none">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm leading-tight">Photo Editor</h2>
            <p className="text-white/25 text-[10px]">
              {textLayers.length > 0 && `${textLayers.length} textos `}
              {blurStrokes.length > 0 && `${blurStrokes.length} blur `}
              {(brightness !== 100 || contrast !== 100 || saturate !== 100) && 'ajustes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 h-9 w-9 p-0 rounded-xl" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 h-9 px-4 rounded-xl gap-1.5" onClick={handlePreview} disabled={isProcessing}>
            {isProcessing ? <div className="w-4 h-4 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" /> : <Eye className="w-4 h-4" />}
            <span className="text-xs font-medium">Preview</span>
          </Button>
          <Button size="sm" onClick={handleApply} disabled={isProcessing} className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white border-0 h-9 px-5 rounded-xl shadow-lg shadow-sky-500/20 gap-1.5">
            {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            <span className="text-xs font-medium">Guardar</span>
          </Button>
        </div>
      </div>

      {/* ─── Canvas Area ─── */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 relative overflow-hidden bg-zinc-950 min-h-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(56,189,248,0.03) 0%, transparent 70%)' }}>
          {activeTool === 'crop' ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={cropRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropComplete}
              style={{ containerStyle: { filter: previewFilter } }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-3 min-h-0">
              <div
                ref={imageContainerRef}
                className="relative inline-block max-w-full max-h-full"
                onMouseDown={handleCanvasPointerDown}
                onMouseMove={handleCanvasPointerMove}
                onMouseUp={handleCanvasPointerUp}
                onTouchStart={handleCanvasPointerDown}
                onTouchMove={handleCanvasPointerMove}
                onTouchEnd={handleCanvasPointerUp}
                style={{ cursor: activeTool === 'blur' ? 'crosshair' : 'default' }}
              >
                {/* Base image (spacers - always visible but may be hidden visually) */}
                <img
                  data-img-base
                  src={imageSrc}
                  alt="Edit"
                  className="max-w-full max-h-[55vh] object-contain select-none rounded-lg"
                  style={{ filter: hasBlur ? 'none' : previewFilter, visibility: hasBlur ? 'hidden' : 'visible' }}
                  draggable={false}
                />

                {/* Blur canvas overlay - shows actual pixelated preview */}
                <canvas
                  ref={blurCanvasRef}
                  className="absolute top-0 left-0 rounded-lg"
                  style={{
                    display: hasBlur ? 'block' : 'none',
                    pointerEvents: 'none',
                    width: '100%',
                    height: '100%',
                  }}
                />

                {/* When no blur, show the filtered image overlay */}
                {!hasBlur && (
                  <img
                    src={imageSrc}
                    alt="EditFiltered"
                    className="absolute top-0 left-0 max-w-full max-h-[55vh] object-contain select-none pointer-events-none rounded-lg"
                    style={{ filter: previewFilter }}
                    draggable={false}
                  />
                )}

                {/* Brush size cursor indicator for blur */}
                {activeTool === 'blur' && (
                  <div className="absolute top-2 right-2 z-30 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 pointer-events-none">
                    <span className="text-white/50 text-[10px]">Pincel: {blurBrushSize}% | Blur: {blurIntensity}px</span>
                  </div>
                )}

                {/* Text layers overlay */}
                {textLayers.map(layer => (
                  <div
                    key={layer.id}
                    className={`absolute cursor-move select-none touch-none z-20 transition-shadow duration-150 ${
                      selectedTextId === layer.id
                        ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                        : ''
                    }`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      transform: layer.align === 'center' ? 'translateX(-50%)' : layer.align === 'right' ? 'translateX(-100%)' : undefined,
                    }}
                    onMouseDown={e => { if (activeTool === 'text') handleTextPointerDown(e, layer.id) }}
                    onTouchStart={e => { if (activeTool === 'text') handleTextPointerDown(e, layer.id) }}
                  >
                    {/* Selection indicator */}
                    {selectedTextId === layer.id && (
                      <div className="absolute -inset-2 border-2 border-sky-400/60 rounded-md pointer-events-none" style={{ borderStyle: 'dashed' }} />
                    )}
                    <span
                      style={{
                        fontSize: `${layer.fontSize}px`,
                        fontFamily: FONTS.find(f => f.value === layer.fontFamily)?.css || layer.fontFamily,
                        color: layer.color,
                        fontWeight: layer.bold ? 'bold' : 'normal',
                        fontStyle: layer.italic ? 'italic' : 'normal',
                        textAlign: layer.align,
                        WebkitTextStroke: layer.stroke ? `2px ${layer.strokeColor}` : undefined,
                        paintOrder: 'stroke fill',
                        whiteSpace: 'pre-wrap',
                        textShadow: layer.stroke ? `3px 3px 6px ${layer.strokeColor}80` : undefined,
                        lineHeight: 1.1,
                      }}
                    >
                      {layer.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Tool Controls Panel ─── */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-t border-white/5 max-h-[40vh] overflow-y-auto shrink-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

          {/* CROP CONTROLS */}
          {activeTool === 'crop' && (
            <div className="p-4 space-y-4">
              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-wider mb-2 block font-medium">Formato</label>
                <div className="flex flex-wrap gap-2">
                  {CROP_PRESETS.map(preset => (
                    <button key={preset.value} onClick={() => setCropPreset(preset.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex flex-col items-center min-w-[60px] ${
                        cropPreset === preset.value
                          ? 'bg-sky-500/15 border border-sky-500/30 text-sky-300 shadow-sm shadow-sky-500/10'
                          : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/60'
                      }`}>
                      <span className="font-bold">{preset.label}</span>
                      <span className="text-[9px] opacity-60">{preset.sublabel}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-wider mb-2 block font-medium">Zoom: {Math.round(zoom * 100)}%</label>
                <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={1} max={3} step={0.1} className="w-full" />
              </div>
            </div>
          )}

          {/* TEXT CONTROLS */}
          {activeTool === 'text' && (
            <div className="p-4 space-y-3">
              {/* Add text input */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={newText}
                    onChange={e => setNewText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTextLayer()}
                    placeholder="Escribi tu texto aca..."
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-sky-500/50 focus:bg-white/[0.06] text-sm rounded-xl h-10 pr-10"
                  />
                  {newText && (
                    <button onClick={() => setNewText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Button onClick={addTextLayer} disabled={!newText.trim()} className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white border-0 shrink-0 h-10 w-10 rounded-xl shadow-lg shadow-sky-500/20">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Selected text editing panel */}
              {selectedText && (
                <div className="space-y-3 p-4 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-sky-500/20 flex items-center justify-center">
                        <Type className="w-3 h-3 text-sky-400" />
                      </div>
                      <span className="text-white/50 text-xs font-medium">Editando texto</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 p-0 rounded-lg" onClick={() => removeTextLayer(selectedText.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* ─── FONT PICKER (Custom - No Dropdown) ─── */}
                  <div className="relative" ref={fontPickerRef}>
                    <label className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5 block font-medium">Fuente</label>
                    <button
                      onClick={() => setShowFontPicker(!showFontPicker)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
                    >
                      <span
                        className="text-white text-sm"
                        style={{
                          fontFamily: FONTS.find(f => f.value === selectedText.fontFamily)?.css || selectedText.fontFamily,
                          fontWeight: 'bold',
                        }}
                      >
                        {FONTS.find(f => f.value === selectedText.fontFamily)?.label || selectedText.fontFamily}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${showFontPicker ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Font picker panel - slides up, not a portal/dropdown */}
                    {showFontPicker && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-900/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50" style={{ maxHeight: '220px' }}>
                        <div className="p-2 overflow-y-auto" style={{ maxHeight: '210px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                          {FONTS.map(f => (
                            <button
                              key={f.value}
                              onClick={() => {
                                updateTextLayer(selectedText.id, { fontFamily: f.value })
                                setShowFontPicker(false)
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                                selectedText.fontFamily === f.value
                                  ? 'bg-sky-500/15 text-sky-300'
                                  : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                              }`}
                            >
                              <span
                                className="text-base"
                                style={{
                                  fontFamily: f.css,
                                  fontWeight: 'bold',
                                  minWidth: '60px',
                                }}
                              >
                                {f.label}
                              </span>
                              <span className="text-[10px] text-white/20">{f.value.replace(/([A-Z])/g, ' $1').trim()}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Font size */}
                  <div>
                    <label className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5 block font-medium">Tamano: {selectedText.fontSize}px</label>
                    <Slider value={[selectedText.fontSize]} onValueChange={([v]) => updateTextLayer(selectedText.id, { fontSize: v })} min={12} max={100} step={1} />
                  </div>

                  {/* Style buttons */}
                  <div>
                    <label className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5 block font-medium">Estilo</label>
                    <div className="flex gap-1.5">
                      {[
                        { key: 'bold' as const, icon: Bold, active: selectedText.bold },
                        { key: 'italic' as const, icon: Italic, active: selectedText.italic },
                        { key: 'stroke' as const, icon: Underline, active: selectedText.stroke },
                      ].map(btn => (
                        <button
                          key={btn.key}
                          onClick={() => updateTextLayer(selectedText.id, { [btn.key]: !btn.active })}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            btn.active
                              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10'
                              : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/50'
                          }`}
                        >
                          <btn.icon className="w-4 h-4" />
                        </button>
                      ))}
                      <div className="w-px bg-white/[0.06] mx-1 self-stretch" />
                      {[
                        { key: 'left' as const, icon: AlignLeft, active: selectedText.align === 'left' },
                        { key: 'center' as const, icon: AlignCenter, active: selectedText.align === 'center' },
                        { key: 'right' as const, icon: AlignRight, active: selectedText.align === 'right' },
                      ].map(btn => (
                        <button
                          key={btn.key}
                          onClick={() => updateTextLayer(selectedText.id, { align: btn.key })}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            btn.active
                              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10'
                              : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/50'
                          }`}
                        >
                          <btn.icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5 block font-medium flex items-center gap-1.5">
                      <Palette className="w-3 h-3" /> Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => updateTextLayer(selectedText.id, { color: c })}
                          className={`w-7 h-7 rounded-lg transition-all border-2 ${
                            selectedText.color === c
                              ? 'border-white scale-110 shadow-lg'
                              : 'border-white/10 hover:border-white/30 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c, boxShadow: selectedText.color === c ? `0 0 12px ${c}40` : undefined }} />
                      ))}
                      {/* Custom color input */}
                      <label className="w-7 h-7 rounded-lg border-2 border-dashed border-white/10 hover:border-white/30 flex items-center justify-center cursor-pointer transition-all hover:scale-105 overflow-hidden relative">
                        <Plus className="w-3 h-3 text-white/30" />
                        <input
                          type="color"
                          value={selectedText.color}
                          onChange={e => updateTextLayer(selectedText.id, { color: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Stroke color */}
                  {selectedText.stroke && (
                    <div>
                      <label className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5 block font-medium">Contorno</label>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map(c => (
                          <button key={c} onClick={() => updateTextLayer(selectedText.id, { strokeColor: c })}
                            className={`w-7 h-7 rounded-lg transition-all border-2 ${
                              selectedText.strokeColor === c
                                ? 'border-white scale-110 shadow-lg'
                                : 'border-white/10 hover:border-white/30 hover:scale-105'
                            }`}
                            style={{ backgroundColor: c }} />
                        ))}
                        <label className="w-7 h-7 rounded-lg border-2 border-dashed border-white/10 hover:border-white/30 flex items-center justify-center cursor-pointer transition-all hover:scale-105 overflow-hidden relative">
                          <Plus className="w-3 h-3 text-white/30" />
                          <input
                            type="color"
                            value={selectedText.strokeColor}
                            onChange={e => updateTextLayer(selectedText.id, { strokeColor: e.target.value })}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Move className="w-3 h-3 text-white/20" />
                    <p className="text-white/20 text-[10px]">Arrastra el texto en la imagen para moverlo</p>
                  </div>
                </div>
              )}

              {/* Text layers list */}
              {!selectedText && textLayers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5 block font-medium flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> Capas ({textLayers.length})
                  </label>
                  {textLayers.map(layer => (
                    <div key={layer.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] cursor-pointer transition-all group"
                      onClick={() => setSelectedTextId(layer.id)}>
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                        <Type className="w-3 h-3 text-sky-400/60" />
                      </div>
                      <span className="text-white/60 text-xs flex-1 truncate" style={{ fontFamily: FONTS.find(f => f.value === layer.fontFamily)?.css }}>{layer.text}</span>
                      <button onClick={e => { e.stopPropagation(); removeTextLayer(layer.id) }} className="text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!selectedText && textLayers.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                    <Type className="w-5 h-5 text-white/15" />
                  </div>
                  <p className="text-white/25 text-xs">Escribi texto y toca + para agregar</p>
                </div>
              )}
            </div>
          )}

          {/* BLUR CONTROLS */}
          {activeTool === 'blur' && (
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-500/[0.07] to-orange-500/[0.07] border border-amber-500/15 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Droplets className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-amber-200/90 text-xs font-medium">Pinta con el dedo o cursor</p>
                  <p className="text-amber-200/40 text-[10px] mt-1">Pasa por la zona que queres difuminar. Se ve el efecto pixelado en tiempo real.</p>
                </div>
              </div>

              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-wider mb-2 flex items-center justify-between font-medium">
                  <span>Tamano del pincel</span>
                  <span className="text-white/20 normal-case">{blurBrushSize}%</span>
                </label>
                <Slider value={[blurBrushSize]} onValueChange={([v]) => setBlurBrushSize(v)} min={2} max={25} step={1} />
              </div>

              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-wider mb-2 flex items-center justify-between font-medium">
                  <span>Intensidad del blur</span>
                  <span className="text-white/20 normal-case">{blurIntensity}px</span>
                </label>
                <Slider value={[blurIntensity]} onValueChange={([v]) => setBlurIntensity(v)} min={3} max={25} step={1} />
              </div>

              {blurStrokes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white/30 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1.5">
                      <Layers className="w-3 h-3" /> Pinceladas ({blurStrokes.length})
                    </label>
                    <Button size="sm" variant="ghost" className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 h-7 text-[10px] px-2 rounded-lg" onClick={() => setBlurStrokes([])}>
                      <Trash2 className="w-3 h-3 mr-1" />Borrar todo
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {blurStrokes.map((stroke, i) => (
                      <div key={stroke.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] group">
                        <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                          <Droplets className="w-3 h-3 text-rose-400/60" />
                        </div>
                        <span className="text-white/50 text-xs flex-1">Pincelada {i + 1}</span>
                        <button onClick={() => setBlurStrokes(prev => prev.filter(s => s.id !== stroke.id))} className="text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {blurStrokes.length === 0 && (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                    <Droplets className="w-5 h-5 text-white/15" />
                  </div>
                  <p className="text-white/25 text-xs">Pinta sobre la imagen para difuminar</p>
                </div>
              )}
            </div>
          )}

          {/* ADJUST CONTROLS */}
          {activeTool === 'adjust' && (
            <div className="p-4 space-y-4">
              {[
                { label: 'Brillo', icon: <Sun className="w-3.5 h-3.5" />, value: brightness, setter: setBrightness, min: 30, max: 200 },
                { label: 'Contraste', icon: <span className="text-[10px] font-bold">C</span>, value: contrast, setter: setContrast, min: 30, max: 200 },
                { label: 'Saturacion', icon: <Palette className="w-3.5 h-3.5" />, value: saturate, setter: setSaturate, min: 0, max: 300 },
              ].map(adj => (
                <div key={adj.label}>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider mb-2 flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5">{adj.icon} {adj.label}</span>
                    <span className="text-white/20 normal-case">{adj.value}%</span>
                  </label>
                  <Slider value={[adj.value]} onValueChange={([v]) => adj.setter(v)} min={adj.min} max={adj.max} step={1} />
                </div>
              ))}

              <Button variant="ghost" size="sm" className="text-white/30 hover:text-white/50 hover:bg-white/5 text-xs h-9 px-4 rounded-xl gap-1.5 border border-white/[0.04]"
                onClick={() => { setBrightness(100); setContrast(100); setSaturate(100) }}>
                <RotateCcw className="w-3 h-3" />Resetear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Bottom Tool Bar ─── */}
      <div className="bg-gradient-to-b from-zinc-900 to-black border-t border-white/5 px-3 py-2 shrink-0">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {[
            { id: 'crop' as const, icon: Crop, label: 'Recorte' },
            { id: 'text' as const, icon: Type, label: 'Texto' },
            { id: 'blur' as const, icon: Droplets, label: 'Blur' },
            { id: 'adjust' as const, icon: Sun, label: 'Ajustes' },
          ].map(tool => (
            <button key={tool.id}
              onClick={() => { setActiveTool(tool.id); if (tool.id !== 'text') { setSelectedTextId(null); setShowFontPicker(false) } }}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all relative ${
                activeTool === tool.id
                  ? 'text-sky-400'
                  : 'text-white/30 hover:text-white/50'
              }`}>
              {activeTool === tool.id && (
                <div className="absolute -top-2 w-8 h-1 rounded-full bg-sky-400 shadow-lg shadow-sky-500/50" />
              )}
              <tool.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
