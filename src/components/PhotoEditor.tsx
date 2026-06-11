'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import {
  Crop, Type, Droplets, Sun, RotateCcw, Check, X, Plus,
  Trash2, Palette, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Eye, Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  { value: 'Impact', label: 'Impact', css: 'Impact, "Arial Black", sans-serif' },
  { value: 'Bebas Neue', label: 'BEBAS NEUE', css: '"Bebas Neue", Impact, sans-serif' },
  { value: 'Lobster', label: 'Lobster', css: 'Lobster, cursive' },
  { value: 'Pacifico', label: 'Pacifico', css: 'Pacifico, cursive' },
  { value: 'Permanent Marker', label: 'PERMANENT', css: '"Permanent Marker", cursive' },
  { value: 'Oswald', label: 'Oswald', css: 'Oswald, sans-serif' },
  { value: 'Russo One', label: 'Russo One', css: '"Russo One", sans-serif' },
  { value: 'Staatliches', label: 'Staatliches', css: 'Staatliches, sans-serif' },
  { value: 'Dancing Script', label: 'Dancing', css: '"Dancing Script", cursive' },
  { value: 'Shadows Into Light', label: 'Shadows', css: '"Shadows Into Light", cursive' },
  { value: 'Press Start 2P', label: 'PIXEL', css: '"Press Start 2P", monospace' },
  { value: 'Arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { value: 'Georgia', label: 'Georgia', css: 'Georgia, serif' },
  { value: 'Verdana', label: 'Verdana', css: 'Verdana, sans-serif' },
  { value: 'Courier New', label: 'Courier', css: '"Courier New", monospace' },
]

const CROP_PRESETS = [
  { value: '16/9', label: '16:9 Twitter', ratio: 16 / 9 },
  { value: '1/1', label: '1:1 Cuadrado', ratio: 1 },
  { value: '4/5', label: '4:5 Instagram', ratio: 4 / 5 },
  { value: '9/16', label: '9:16 Story', ratio: 9 / 16 },
  { value: '3/4', label: '3:4 Retrato', ratio: 3 / 4 },
  { value: 'free', label: 'Libre', ratio: undefined },
]

const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#FF6B6B', '#FFD93D',
  '#6BCB77', '#4D96FF', '#9B59B6', '#FF69B4', '#FF8C00',
  '#00CED1', '#FF1493',
]

// ─── Helper: crop image ─────────────────────────────────────
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

// Helper: get pointer position
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

// Helper: pixelate a region of a canvas (circular)
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

// ─── Main Editor Component ───────────────────────────────────
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

  // Fonts loaded
  const [fontsLoaded, setFontsLoaded] = useState(false)

  // Refs
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const originalImageRef = useRef<HTMLImageElement | null>(null)
  const lastPaintedPoint = useRef<number>(0)

  const selectedText = textLayers.find(t => t.id === selectedTextId)

  // ─── Load fonts ────────────────────────────────────────────
  useEffect(() => {
    document.fonts.ready.then(() => {
      setFontsLoaded(true)
    })
    // Fallback timeout
    const t = setTimeout(() => setFontsLoaded(true), 3000)
    return () => clearTimeout(t)
  }, [])

  // ─── Load original image for blur canvas ──────────────────
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { originalImageRef.current = img }
    img.src = imageSrc
  }, [imageSrc])

  // ─── Render blur preview in real-time on canvas ───────────
  const renderBlurPreview = useCallback(() => {
    const canvas = previewCanvasRef.current
    const container = imageContainerRef.current
    const img = originalImageRef.current
    if (!canvas || !container || !img) return

    const imgEl = container.querySelector('img')
    if (!imgEl) return

    const w = imgEl.clientWidth
    const h = imgEl.clientHeight
    if (w === 0 || h === 0) return

    // Only re-render if size changed
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, w, h)

    // Draw the image on the preview canvas
    ctx.filter = [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturate}%)`,
    ].join(' ')
    ctx.drawImage(img, 0, 0, w, h)
    ctx.filter = 'none'

    // Apply all blur strokes as pixelation
    const scaleX = img.naturalWidth / w
    const scaleY = img.naturalHeight / h

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
      for (const point of stroke.points) {
        const px = point.x / 100 * w
        const py = point.y / 100 * h
        const radius = stroke.brushSize / 100 * w / 2

        // Pixelate a circular region
        pixelateCircle(ctx, px, py, radius, pixelSize)
      }
    }
  }, [blurStrokes, isPaintingBlur, currentStrokePoints, blurBrushSize, blurIntensity, brightness, contrast, saturate])

  // Re-render blur preview when strokes change
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
      lastPaintedPoint.current = 0
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

  // ─── FULL render ──────────────────────────────────────────
  const renderFinalImage = async (): Promise<Blob> => {
    // Wait for fonts to be ready
    await document.fonts.ready

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = imageSrc
    await new Promise(r => { image.onload = r })

    let sourceCanvas: HTMLCanvasElement

    // Step 1: Crop
    if (croppedAreaPixels && croppedAreaPixels.width > 0 && croppedAreaPixels.height > 0) {
      sourceCanvas = await getCroppedImg(imageSrc, croppedAreaPixels)
    } else {
      sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = image.naturalWidth
      sourceCanvas.height = image.naturalHeight
      sourceCanvas.getContext('2d')!.drawImage(image, 0, 0)
    }

    // Step 2: Adjustments
    const adjustedCanvas = document.createElement('canvas')
    adjustedCanvas.width = sourceCanvas.width
    adjustedCanvas.height = sourceCanvas.height
    const adjustedCtx = adjustedCanvas.getContext('2d')!
    adjustedCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`
    adjustedCtx.drawImage(sourceCanvas, 0, 0)
    adjustedCtx.filter = 'none'

    // Step 3: Blur strokes (pixelate)
    const blurCanvas = document.createElement('canvas')
    blurCanvas.width = adjustedCanvas.width
    blurCanvas.height = adjustedCanvas.height
    const blurCtx = blurCanvas.getContext('2d')!
    blurCtx.drawImage(adjustedCanvas, 0, 0)

    for (const stroke of blurStrokes) {
      const pixelSize = Math.max(3, stroke.intensity)
      for (const point of stroke.points) {
        const px = point.x / 100 * blurCanvas.width
        const py = point.y / 100 * blurCanvas.height
        const radius = stroke.brushSize / 100 * blurCanvas.width / 2
        pixelateCircle(blurCtx, px, py, radius, pixelSize)
      }
    }

    // Step 4: Text layers
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

  // ─── Preview modal ───────────────────────────────────────
  if (previewUrl) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-white/10">
          <h2 className="text-white font-bold text-sm">Vista Previa Final</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-white/10 text-white/60 h-8" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}>
              <X className="w-4 h-4 mr-1" />Volver
            </Button>
            <a href={previewUrl} download="foto-editada.jpg" className="inline-flex items-center h-8 px-3 rounded-md bg-white/10 border border-white/20 text-white/60 text-xs hover:bg-white/20">
              <Download className="w-3.5 h-3.5 mr-1" />Descargar
            </a>
            <Button size="sm" onClick={handleApply} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white border-0 h-8">
              <Check className="w-4 h-4 mr-1" />Confirmar
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
        <div className="bg-zinc-900 border-t border-white/10 px-4 py-2 flex items-center justify-between">
          <p className="text-white/40 text-xs">Asi se va a ver la imagen publicada.</p>
          <div className="flex items-center gap-2">
            {textLayers.length > 0 && <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px]">{textLayers.length} textos</Badge>}
            {blurStrokes.length > 0 && <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]">{blurStrokes.length} blur</Badge>}
            {(brightness !== 100 || contrast !== 100 || saturate !== 100) && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">ajustes</Badge>}
          </div>
        </div>
      </div>
    )
  }

  // Check if we should show blur canvas (when blur strokes exist or tool is active)
  const showBlurCanvas = blurStrokes.length > 0 || isPaintingBlur

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-bold text-sm">Editor de Foto</h2>
          <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px]">
            {activeTool === 'crop' ? 'Recorte' : activeTool === 'text' ? 'Texto' : activeTool === 'blur' ? 'Blur' : 'Ajustes'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="border-white/10 text-white/60 h-8 text-xs" onClick={onCancel}>
            <X className="w-3.5 h-3.5 mr-1" />X
          </Button>
          <Button size="sm" variant="outline" className="border-sky-500/30 text-sky-400 h-8 text-xs hover:bg-sky-500/10" onClick={handlePreview} disabled={isProcessing}>
            {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
            Preview
          </Button>
          <Button size="sm" onClick={handleApply} disabled={isProcessing} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white border-0 h-8 text-xs">
            {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 relative overflow-hidden bg-zinc-950 min-h-0">
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
            <div className="w-full h-full flex items-center justify-center p-2 min-h-0">
              <div
                ref={imageContainerRef}
                className="relative inline-block max-w-full max-h-full"
                onMouseDown={handleCanvasPointerDown}
                onMouseMove={handleCanvasPointerMove}
                onMouseUp={handleCanvasPointerUp}
                onTouchStart={handleCanvasPointerDown}
                onTouchMove={handleCanvasPointerMove}
                onTouchEnd={handleCanvasPointerUp}
                style={{ cursor: activeTool === 'blur' ? 'crosshair' : activeTool === 'text' ? 'default' : 'default' }}
              >
                {/* Base image - hidden when blur canvas is showing to avoid double-render */}
                <img
                  src={imageSrc}
                  alt="Edit"
                  className="max-w-full max-h-[55vh] object-contain select-none"
                  style={{ filter: showBlurCanvas ? 'none' : previewFilter, visibility: showBlurCanvas ? 'hidden' : 'visible' }}
                  draggable={false}
                />

                {/* Blur preview canvas - shows actual pixelated image in real-time */}
                <canvas
                  ref={previewCanvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                  style={{
                    display: showBlurCanvas ? 'block' : 'none',
                    pointerEvents: 'none',
                  }}
                />

                {/* When no blur, show the regular image with filters */}
                {!showBlurCanvas && (
                  <img
                    src={imageSrc}
                    alt="EditFiltered"
                    className="absolute top-0 left-0 max-w-full max-h-[55vh] object-contain select-none pointer-events-none"
                    style={{ filter: previewFilter }}
                    draggable={false}
                  />
                )}

                {/* Text layers overlay */}
                {textLayers.map(layer => (
                  <div
                    key={layer.id}
                    className={`absolute cursor-move select-none touch-none z-20 ${
                      selectedTextId === layer.id ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-transparent' : ''
                    }`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      transform: layer.align === 'center' ? 'translateX(-50%)' : layer.align === 'right' ? 'translateX(-100%)' : undefined,
                    }}
                    onMouseDown={e => { if (activeTool === 'text') handleTextPointerDown(e, layer.id) }}
                    onTouchStart={e => { if (activeTool === 'text') handleTextPointerDown(e, layer.id) }}
                  >
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

        {/* Tool Controls */}
        <div className="bg-zinc-900 border-t border-white/10 max-h-[35vh] overflow-y-auto shrink-0">
          {activeTool === 'crop' && (
            <div className="p-3 space-y-3">
              <div>
                <label className="text-white/50 text-xs mb-2 block">Formato</label>
                <div className="flex flex-wrap gap-2">
                  {CROP_PRESETS.map(preset => (
                    <button key={preset.value} onClick={() => setCropPreset(preset.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${cropPreset === preset.value ? 'bg-sky-500/20 border border-sky-500/40 text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'}`}>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-2 block">Zoom: {Math.round(zoom * 100)}%</label>
                <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={1} max={3} step={0.1} className="w-full" />
              </div>
            </div>
          )}

          {activeTool === 'text' && (
            <div className="p-3 space-y-3">
              <div className="flex gap-2">
                <Input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTextLayer()}
                  placeholder="Escribí tu texto acá..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-sky-500 text-sm" />
                <Button onClick={addTextLayer} disabled={!newText.trim()} className="bg-sky-500 hover:bg-sky-600 text-white border-0 shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {selectedText && (
                <div className="space-y-3 p-3 bg-white/[0.03] rounded-lg border border-sky-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs">Editando texto</span>
                    <Button size="sm" variant="ghost" className="text-red-400 h-6 w-6 p-0" onClick={() => removeTextLayer(selectedText.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Font - with real font preview */}
                  <div>
                    <label className="text-white/40 text-[10px] mb-1 block">Fuente</label>
                    <Select value={selectedText.fontFamily} onValueChange={v => updateTextLayer(selectedText.id, { fontFamily: v })}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 max-h-[200px]">
                        {FONTS.map(f => (
                          <SelectItem key={f.value} value={f.value}>
                            <span style={{ fontFamily: f.css, fontSize: '14px', fontWeight: 'bold' }}>{f.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font size */}
                  <div>
                    <label className="text-white/40 text-[10px] mb-1 block">Tamaño: {selectedText.fontSize}px</label>
                    <Slider value={[selectedText.fontSize]} onValueChange={([v]) => updateTextLayer(selectedText.id, { fontSize: v })} min={12} max={100} step={1} />
                  </div>

                  {/* Style */}
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => updateTextLayer(selectedText.id, { bold: !selectedText.bold })}
                      className={`w-8 h-8 rounded flex items-center justify-center ${selectedText.bold ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'}`}>
                      <Bold className="w-4 h-4" />
                    </button>
                    <button onClick={() => updateTextLayer(selectedText.id, { italic: !selectedText.italic })}
                      className={`w-8 h-8 rounded flex items-center justify-center ${selectedText.italic ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'}`}>
                      <Italic className="w-4 h-4" />
                    </button>
                    <button onClick={() => updateTextLayer(selectedText.id, { stroke: !selectedText.stroke })}
                      className={`w-8 h-8 rounded flex items-center justify-center ${selectedText.stroke ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'}`}>
                      <Underline className="w-4 h-4" />
                    </button>
                    <div className="w-px bg-white/10 mx-1" />
                    <button onClick={() => updateTextLayer(selectedText.id, { align: 'left' })}
                      className={`w-8 h-8 rounded flex items-center justify-center ${selectedText.align === 'left' ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'}`}>
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => updateTextLayer(selectedText.id, { align: 'center' })}
                      className={`w-8 h-8 rounded flex items-center justify-center ${selectedText.align === 'center' ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'}`}>
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button onClick={() => updateTextLayer(selectedText.id, { align: 'right' })}
                      className={`w-8 h-8 rounded flex items-center justify-center ${selectedText.align === 'right' ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'}`}>
                      <AlignRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="text-white/40 text-[10px] mb-1 block flex items-center gap-1"><Palette className="w-3 h-3" /> Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => updateTextLayer(selectedText.id, { color: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${selectedText.color === c ? 'border-white scale-125' : 'border-white/20'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>

                  {selectedText.stroke && (
                    <div>
                      <label className="text-white/40 text-[10px] mb-1 block">Contorno</label>
                      <div className="flex flex-wrap gap-1.5">
                        {COLORS.map(c => (
                          <button key={c} onClick={() => updateTextLayer(selectedText.id, { strokeColor: c })}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${selectedText.strokeColor === c ? 'border-white scale-125' : 'border-white/20'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-white/30 text-[10px] text-center">Arrastrá el texto en la imagen para moverlo</p>
                </div>
              )}

              {textLayers.length > 0 && !selectedText && (
                <div className="space-y-1">
                  <label className="text-white/40 text-[10px] mb-1 block">Capas ({textLayers.length})</label>
                  {textLayers.map(layer => (
                    <div key={layer.id} className="flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer"
                      onClick={() => setSelectedTextId(layer.id)}>
                      <Type className="w-3 h-3 text-white/30" />
                      <span className="text-white/70 text-xs flex-1 truncate" style={{ fontFamily: FONTS.find(f => f.value === layer.fontFamily)?.css }}>{layer.text}</span>
                      <button onClick={e => { e.stopPropagation(); removeTextLayer(layer.id) }} className="text-white/20 hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {textLayers.length === 0 && !selectedText && (
                <p className="text-white/30 text-xs text-center py-3">Escribí texto y tocá + para agregar</p>
              )}
            </div>
          )}

          {activeTool === 'blur' && (
            <div className="p-3 space-y-3">
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <Droplets className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-200 text-xs font-medium">Pintá con el dedo o cursor</p>
                  <p className="text-yellow-200/60 text-[10px] mt-1">Pasá por la zona que querés difuminar. Se ve el efecto en tiempo real.</p>
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs mb-2 flex items-center justify-between">
                  <span>Tamaño del pincel</span>
                  <span className="text-white/30">{blurBrushSize}%</span>
                </label>
                <Slider value={[blurBrushSize]} onValueChange={([v]) => setBlurBrushSize(v)} min={2} max={25} step={1} />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-2 flex items-center justify-between">
                  <span>Intensidad del blur</span>
                  <span className="text-white/30">{blurIntensity}px</span>
                </label>
                <Slider value={[blurIntensity]} onValueChange={([v]) => setBlurIntensity(v)} min={3} max={25} step={1} />
              </div>

              {blurStrokes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-white/40 text-[10px]">Pinceladas ({blurStrokes.length})</label>
                    <Button size="sm" variant="ghost" className="text-red-400 h-5 text-[10px] px-1" onClick={() => setBlurStrokes([])}>
                      <Trash2 className="w-2.5 h-2.5 mr-0.5" />Borrar todo
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {blurStrokes.map((stroke, i) => (
                      <div key={stroke.id} className="flex items-center gap-2 p-1.5 rounded bg-white/[0.03]">
                        <Droplets className="w-3 h-3 text-rose-400" />
                        <span className="text-white/60 text-[10px] flex-1">Pincelada {i + 1}</span>
                        <button onClick={() => setBlurStrokes(prev => prev.filter(s => s.id !== stroke.id))} className="text-white/20 hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {blurStrokes.length === 0 && (
                <p className="text-white/30 text-xs text-center py-2">Pintá sobre la imagen para difuminar</p>
              )}
            </div>
          )}

          {activeTool === 'adjust' && (
            <div className="p-3 space-y-3">
              <div>
                <label className="text-white/50 text-xs mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> Brillo</span>
                  <span className="text-white/30">{brightness}%</span>
                </label>
                <Slider value={[brightness]} onValueChange={([v]) => setBrightness(v)} min={30} max={200} step={1} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-2 flex items-center justify-between">
                  <span>Contraste</span><span className="text-white/30">{contrast}%</span>
                </label>
                <Slider value={[contrast]} onValueChange={([v]) => setContrast(v)} min={30} max={200} step={1} />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-2 flex items-center justify-between">
                  <span>Saturacion</span><span className="text-white/30">{saturate}%</span>
                </label>
                <Slider value={[saturate]} onValueChange={([v]) => setSaturate(v)} min={0} max={300} step={1} />
              </div>
              <Button variant="outline" size="sm" className="border-white/10 text-white/40 text-xs h-7"
                onClick={() => { setBrightness(100); setContrast(100); setSaturate(100) }}>
                <RotateCcw className="w-3 h-3 mr-1" />Resetear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tool Bar */}
      <div className="bg-zinc-900 border-t border-white/10 px-2 py-2 shrink-0">
        <div className="flex items-center justify-around">
          {[
            { id: 'crop' as const, icon: Crop, label: 'Recorte' },
            { id: 'text' as const, icon: Type, label: 'Texto' },
            { id: 'blur' as const, icon: Droplets, label: 'Blur' },
            { id: 'adjust' as const, icon: Sun, label: 'Ajustes' },
          ].map(tool => (
            <button key={tool.id}
              onClick={() => { setActiveTool(tool.id); if (tool.id !== 'text') setSelectedTextId(null) }}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-all ${activeTool === tool.id ? 'text-sky-400' : 'text-white/40 hover:text-white/60'}`}>
              <tool.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
