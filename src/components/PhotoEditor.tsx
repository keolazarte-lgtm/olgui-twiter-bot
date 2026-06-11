'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import {
  Crop, Type, Droplets, Sun, RotateCcw, Check, X, Plus,
  Minus, Move, Trash2, Palette, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Square, Circle,
  GripHorizontal, GripVertical, Maximize2
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
  x: number // percentage 0-100
  y: number // percentage 0-100
  fontSize: number
  fontFamily: string
  color: string
  bold: boolean
  italic: boolean
  stroke: boolean
  strokeColor: string
  align: 'left' | 'center' | 'right'
}

interface BlurRegion {
  id: string
  x: number // percentage
  y: number
  width: number // percentage
  height: number
  shape: 'rect' | 'circle' | 'ellipse'
  intensity: number // 1-20 (pixel size)
}

interface PhotoEditorProps {
  imageSrc: string
  onApply: (editedBlob: Blob) => void
  onCancel: () => void
}

// ─── Constants ───────────────────────────────────────────────
// Use simple font names that actually render in canvas
const FONTS = [
  { value: 'Arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { value: 'Georgia', label: 'Georgia', css: 'Georgia, serif' },
  { value: 'Impact', label: 'Impact', css: 'Impact, Charcoal, sans-serif' },
  { value: 'Courier New', label: 'Courier', css: '"Courier New", Courier, monospace' },
  { value: 'Verdana', label: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { value: 'Trebuchet MS', label: 'Trebuchet', css: '"Trebuchet MS", Helvetica, sans-serif' },
  { value: 'Palatino', label: 'Palatino', css: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { value: 'Lucida Console', label: 'Lucida', css: '"Lucida Console", Monaco, monospace' },
  { value: 'Tahoma', label: 'Tahoma', css: 'Tahoma, Geneva, sans-serif' },
  { value: 'Comic Sans MS', label: 'Comic Sans', css: '"Comic Sans MS", cursive' },
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

const BLUR_SHAPES = [
  { value: 'rect', label: 'Rectangulo', icon: Square },
  { value: 'circle', label: 'Circulo', icon: Circle },
  { value: 'ellipse', label: 'Ovalo', icon: Maximize2 },
] as const

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

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return canvas
}

// Helper: get pointer position (mouse or touch) relative to element
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

// ─── Main Editor Component ───────────────────────────────────
export default function PhotoEditor({ imageSrc, onApply, onCancel }: PhotoEditorProps) {
  const [activeTool, setActiveTool] = useState<'crop' | 'text' | 'blur' | 'adjust'>('crop')
  const [cropPreset, setCropPreset] = useState('16/9')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  // Text layers
  const [textLayers, setTextLayers] = useState<TextLayer[]>([])
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [newText, setNewText] = useState('')
  const [draggingText, setDraggingText] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Blur regions
  const [blurRegions, setBlurRegions] = useState<BlurRegion[]>([])
  const [selectedBlurId, setSelectedBlurId] = useState<string | null>(null)
  const [isDrawingBlur, setIsDrawingBlur] = useState(false)
  const [blurStart, setBlurStart] = useState({ x: 0, y: 0 })
  const [blurCurrent, setBlurCurrent] = useState({ x: 0, y: 0 })
  const [draggingBlur, setDraggingBlur] = useState<string | null>(null)
  const [blurDragOffset, setBlurDragOffset] = useState({ x: 0, y: 0 })
  const [blurShape, setBlurShape] = useState<'rect' | 'circle' | 'ellipse'>('rect')
  const [defaultBlurIntensity, setDefaultBlurIntensity] = useState(10)

  // Adjustments
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturate, setSaturate] = useState(100)

  // Canvas ref for final render
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const selectedText = textLayers.find(t => t.id === selectedTextId)
  const selectedBlur = blurRegions.find(r => r.id === selectedBlurId)

  // ─── Crop handlers ────────────────────────────────────────
  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location)
  }, [])

  const onZoomChange = useCallback((z: number) => {
    setZoom(z)
  }, [])

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  // ─── Text handlers ────────────────────────────────────────
  const addTextLayer = () => {
    if (!newText.trim()) return
    const layer: TextLayer = {
      id: Date.now().toString(),
      text: newText,
      x: 50,
      y: 50,
      fontSize: 32,
      fontFamily: 'Impact',
      color: '#FFFFFF',
      bold: true,
      italic: false,
      stroke: true,
      strokeColor: '#000000',
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

  // ─── Text drag handlers (mouse + touch) ──────────────────
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
    setDragOffset({
      x: pos.x - layer.x,
      y: pos.y - layer.y,
    })
  }

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    const rect = imageContainerRef.current?.getBoundingClientRect()
    if (!rect) return

    // Text dragging
    if (draggingText) {
      const pos = getPointerPos(e, rect)
      if (!pos) return
      const x = pos.x - dragOffset.x
      const y = pos.y - dragOffset.y
      updateTextLayer(draggingText, { x: Math.max(0, Math.min(95, x)), y: Math.max(0, Math.min(95, y)) })
      return
    }

    // Blur dragging
    if (draggingBlur) {
      const pos = getPointerPos(e, rect)
      if (!pos) return
      const region = blurRegions.find(r => r.id === draggingBlur)
      if (!region) return
      const newX = pos.x - blurDragOffset.x
      const newY = pos.y - blurDragOffset.y
      setBlurRegions(prev => prev.map(r => r.id === draggingBlur ? {
        ...r,
        x: Math.max(0, Math.min(100 - r.width, newX)),
        y: Math.max(0, Math.min(100 - r.height, newY)),
      } : r))
      return
    }

    // Drawing blur
    if (isDrawingBlur) {
      const pos = getPointerPos(e, rect)
      if (!pos) return
      setBlurCurrent(pos)
    }
  }, [draggingText, dragOffset, draggingBlur, blurDragOffset, isDrawingBlur, updateTextLayer, blurRegions])

  const handlePointerUp = useCallback(() => {
    if (isDrawingBlur) {
      setIsDrawingBlur(false)
      const x = Math.min(blurStart.x, blurCurrent.x)
      const y = Math.min(blurStart.y, blurCurrent.y)
      const width = Math.abs(blurCurrent.x - blurStart.x)
      const height = Math.abs(blurCurrent.y - blurStart.y)
      if (width > 2 && height > 2) {
        const newRegion: BlurRegion = {
          id: Date.now().toString(),
          x, y, width, height,
          shape: blurShape,
          intensity: defaultBlurIntensity,
        }
        setBlurRegions(prev => [...prev, newRegion])
        setSelectedBlurId(newRegion.id)
      }
    }
    setDraggingText(null)
    setDraggingBlur(null)
  }, [isDrawingBlur, blurStart, blurCurrent, blurShape, defaultBlurIntensity])

  useEffect(() => {
    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)
    window.addEventListener('touchmove', handlePointerMove, { passive: false })
    window.addEventListener('touchend', handlePointerUp)
    return () => {
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
      window.removeEventListener('touchmove', handlePointerMove)
      window.removeEventListener('touchend', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  // ─── Blur handlers ────────────────────────────────────────
  const handleCanvasPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === 'blur') {
      const rect = imageContainerRef.current?.getBoundingClientRect()
      if (!rect) return
      const pos = getPointerPos(e, rect)
      if (!pos) return

      // Check if clicking on an existing blur region
      const clickedRegion = blurRegions.find(r => {
        return pos.x >= r.x && pos.x <= r.x + r.width &&
               pos.y >= r.y && pos.y <= r.y + r.height
      })

      if (clickedRegion) {
        // Start dragging existing region
        setSelectedBlurId(clickedRegion.id)
        setDraggingBlur(clickedRegion.id)
        setBlurDragOffset({
          x: pos.x - clickedRegion.x,
          y: pos.y - clickedRegion.y,
        })
        e.preventDefault()
        return
      }

      // Start drawing new region
      setSelectedBlurId(null)
      setIsDrawingBlur(true)
      setBlurStart(pos)
      setBlurCurrent(pos)
      e.preventDefault()
    }
  }

  const removeBlurRegion = (id: string) => {
    setBlurRegions(prev => prev.filter(r => r.id !== id))
    if (selectedBlurId === id) setSelectedBlurId(null)
  }

  const updateBlurRegion = (id: string, updates: Partial<BlurRegion>) => {
    setBlurRegions(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  // ─── Final render ─────────────────────────────────────────
  const handleApply = async () => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = imageSrc
    await new Promise(r => { image.onload = r })

    let sourceCanvas: HTMLCanvasElement

    // Step 1: Crop
    if (croppedAreaPixels) {
      sourceCanvas = await getCroppedImg(imageSrc, croppedAreaPixels)
    } else {
      sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = image.naturalWidth
      sourceCanvas.height = image.naturalHeight
      sourceCanvas.getContext('2d')!.drawImage(image, 0, 0)
    }

    // Step 2: Apply adjustments on a new canvas
    const canvas = document.createElement('canvas')
    canvas.width = sourceCanvas.width
    canvas.height = sourceCanvas.height
    const ctx = canvas.getContext('2d')!

    // Apply filters (brightness, contrast, saturate)
    const filterStr = [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturate}%)`,
    ].join(' ')
    ctx.filter = filterStr
    ctx.drawImage(sourceCanvas, 0, 0)
    ctx.filter = 'none'

    // Step 3: Apply blur regions
    for (const region of blurRegions) {
      const rx = region.x / 100 * canvas.width
      const ry = region.y / 100 * canvas.height
      const rw = region.width / 100 * canvas.width
      const rh = region.height / 100 * canvas.height

      const pixelSize = Math.max(4, region.intensity)

      // Create a temp canvas for the blur region
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')!

      if (region.shape === 'circle' || region.shape === 'ellipse') {
        // For circle/ellipse: clip to shape, pixelate, then draw back clipped
        const clipCanvas = document.createElement('canvas')
        const clipCtx = clipCanvas.getContext('2d')!
        clipCanvas.width = rw
        clipCanvas.height = rh

        // Draw the region portion
        clipCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, rw, rh)

        // Pixelate
        const smallW = Math.max(1, Math.floor(rw / pixelSize))
        const smallH = Math.max(1, Math.floor(rh / pixelSize))
        tempCanvas.width = smallW
        tempCanvas.height = smallH
        tempCtx.drawImage(clipCanvas, 0, 0, rw, rh, 0, 0, smallW, smallH)

        // Draw back with pixelation
        clipCtx.clearRect(0, 0, rw, rh)
        clipCtx.imageSmoothingEnabled = false
        clipCtx.drawImage(tempCanvas, 0, 0, smallW, smallH, 0, 0, rw, rh)
        clipCtx.imageSmoothingEnabled = true

        // Clip to ellipse/circle shape when drawing to main canvas
        ctx.save()
        ctx.beginPath()
        if (region.shape === 'circle') {
          const radius = Math.min(rw, rh) / 2
          ctx.ellipse(rx + rw / 2, ry + rh / 2, radius, radius, 0, 0, Math.PI * 2)
        } else {
          ctx.ellipse(rx + rw / 2, ry + rh / 2, rw / 2, rh / 2, 0, 0, Math.PI * 2)
        }
        ctx.clip()
        ctx.drawImage(clipCanvas, rx, ry)
        ctx.restore()
      } else {
        // Rectangle: straightforward pixelate
        const smallW = Math.max(1, Math.floor(rw / pixelSize))
        const smallH = Math.max(1, Math.floor(rh / pixelSize))
        tempCanvas.width = smallW
        tempCanvas.height = smallH

        tempCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, smallW, smallH)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, rx, ry, rw, rh)
        ctx.imageSmoothingEnabled = true
      }
    }

    // Step 4: Draw text layers
    for (const layer of textLayers) {
      const x = layer.x / 100 * canvas.width
      const y = layer.y / 100 * canvas.height
      const scaledSize = layer.fontSize * (canvas.width / 500)

      // Find the font CSS value
      const fontDef = FONTS.find(f => f.value === layer.fontFamily)
      const fontCss = fontDef?.css || layer.fontFamily

      let fontStyle = ''
      if (layer.italic) fontStyle += 'italic '
      if (layer.bold) fontStyle += 'bold '
      fontStyle += `${scaledSize}px ${fontCss}`

      ctx.font = fontStyle
      ctx.textAlign = layer.align
      ctx.textBaseline = 'top'

      const offsetX = layer.align === 'center' ? 0 : layer.align === 'right' ? -canvas.width * 0.02 : canvas.width * 0.02

      // Stroke
      if (layer.stroke) {
        ctx.strokeStyle = layer.strokeColor
        ctx.lineWidth = scaledSize / 8
        ctx.lineJoin = 'round'
        ctx.miterLimit = 2
        ctx.strokeText(layer.text, x + offsetX, y)
      }

      // Fill
      ctx.fillStyle = layer.color
      ctx.fillText(layer.text, x + offsetX, y)
    }

    // Step 5: Export as blob
    canvas.toBlob(blob => {
      if (blob) onApply(blob)
    }, 'image/jpeg', 0.92)
  }

  // ─── Image CSS filter for live preview ────────────────────
  const previewFilter = [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturate}%)`,
  ].join(' ')

  const cropRatio = CROP_PRESETS.find(p => p.value === cropPreset)?.ratio

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-white/10">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-bold text-sm">Editor de Foto</h2>
          <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px]">
            {activeTool === 'crop' ? 'Recorte' : activeTool === 'text' ? 'Texto' : activeTool === 'blur' ? 'Blur' : 'Ajustes'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="border-white/10 text-white/60 h-8 text-xs"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            X
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-0 h-8 text-xs"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Aplicar
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Canvas area */}
        <div
          ref={editorRef}
          className="flex-1 relative overflow-hidden bg-zinc-950 min-h-0"
        >
          {activeTool === 'crop' ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={cropRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { filter: previewFilter },
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2 min-h-0">
              <div
                ref={imageContainerRef}
                className="relative inline-block max-w-full max-h-full"
                onMouseDown={handleCanvasPointerDown}
                onTouchStart={handleCanvasPointerDown}
              >
                <img
                  src={imageSrc}
                  alt="Edit"
                  className="max-w-full max-h-[55vh] object-contain select-none"
                  style={{ filter: previewFilter }}
                  draggable={false}
                />

                {/* Text layers overlay */}
                {textLayers.map(layer => (
                  <div
                    key={layer.id}
                    className={`absolute cursor-move select-none touch-none ${
                      selectedTextId === layer.id ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-transparent' : ''
                    }`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      transform: layer.align === 'center' ? 'translateX(-50%)' : layer.align === 'right' ? 'translateX(-100%)' : undefined,
                    }}
                    onMouseDown={e => handleTextPointerDown(e, layer.id)}
                    onTouchStart={e => handleTextPointerDown(e, layer.id)}
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

                {/* Blur regions overlay */}
                {blurRegions.map(region => {
                  const isCircle = region.shape === 'circle'
                  const isEllipse = region.shape === 'ellipse'
                  return (
                    <div
                      key={region.id}
                      className={`absolute cursor-move group touch-none ${
                        selectedBlurId === region.id
                          ? 'ring-2 ring-sky-400 z-10'
                          : 'border-2 border-dashed border-red-400/60'
                      }`}
                      style={{
                        left: `${region.x}%`,
                        top: `${region.y}%`,
                        width: `${region.width}%`,
                        height: `${region.height}%`,
                        backdropFilter: `blur(${region.intensity}px)`,
                        WebkitBackdropFilter: `blur(${region.intensity}px)`,
                        borderRadius: isCircle ? '50%' : isEllipse ? '50%' : '4px',
                      }}
                      onMouseDown={e => handleCanvasPointerDown(e)}
                      onTouchStart={e => handleCanvasPointerDown(e)}
                    >
                      {/* Shape indicator */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {isCircle && <Circle className="w-6 h-6 text-white/30" />}
                        {isEllipse && <Maximize2 className="w-6 h-6 text-white/30" />}
                      </div>
                      {/* Delete button */}
                      <button
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => { e.stopPropagation(); removeBlurRegion(region.id) }}
                        onTouchEnd={e => { e.stopPropagation(); removeBlurRegion(region.id) }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}

                {/* Drawing blur region (preview) */}
                {isDrawingBlur && (
                  <div
                    className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/10 pointer-events-none"
                    style={{
                      left: `${Math.min(blurStart.x, blurCurrent.x)}%`,
                      top: `${Math.min(blurStart.y, blurCurrent.y)}%`,
                      width: `${Math.abs(blurCurrent.x - blurStart.x)}%`,
                      height: `${Math.abs(blurCurrent.y - blurStart.y)}%`,
                      borderRadius: blurShape === 'rect' ? '4px' : '50%',
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tool Controls */}
        <div className="bg-zinc-900 border-t border-white/10 max-h-[35vh] overflow-y-auto shrink-0">
          {activeTool === 'crop' && (
            <div className="p-3 space-y-3">
              {/* Crop presets */}
              <div>
                <label className="text-white/50 text-xs mb-2 block">Formato de recorte</label>
                <div className="flex flex-wrap gap-2">
                  {CROP_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => setCropPreset(preset.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        cropPreset === preset.value
                          ? 'bg-sky-500/20 border border-sky-500/40 text-white'
                          : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zoom */}
              <div>
                <label className="text-white/50 text-xs mb-2 block">Zoom: {Math.round(zoom * 100)}%</label>
                <Slider
                  value={[zoom]}
                  onValueChange={([v]) => setZoom(v)}
                  min={1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {activeTool === 'text' && (
            <div className="p-3 space-y-3">
              {/* Add text */}
              <div className="flex gap-2">
                <Input
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTextLayer()}
                  placeholder="Escribí tu texto acá..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-sky-500 text-sm"
                />
                <Button
                  onClick={addTextLayer}
                  disabled={!newText.trim()}
                  className="bg-sky-500 hover:bg-sky-600 text-white border-0 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Selected text controls */}
              {selectedText && (
                <div className="space-y-3 p-3 bg-white/[0.03] rounded-lg border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs">Editando texto</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 h-6 w-6 p-0"
                      onClick={() => removeTextLayer(selectedText.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Font family */}
                  <div>
                    <label className="text-white/40 text-[10px] mb-1 block">Fuente</label>
                    <Select
                      value={selectedText.fontFamily}
                      onValueChange={v => updateTextLayer(selectedText.id, { fontFamily: v })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {FONTS.map(f => (
                          <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.css }}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font size */}
                  <div>
                    <label className="text-white/40 text-[10px] mb-1 block">Tamaño: {selectedText.fontSize}px</label>
                    <Slider
                      value={[selectedText.fontSize]}
                      onValueChange={([v]) => updateTextLayer(selectedText.id, { fontSize: v })}
                      min={12}
                      max={100}
                      step={1}
                    />
                  </div>

                  {/* Style buttons */}
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={() => updateTextLayer(selectedText.id, { bold: !selectedText.bold })}
                      className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
                        selectedText.bold ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'
                      }`}
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateTextLayer(selectedText.id, { italic: !selectedText.italic })}
                      className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
                        selectedText.italic ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'
                      }`}
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateTextLayer(selectedText.id, { stroke: !selectedText.stroke })}
                      className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
                        selectedText.stroke ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'
                      }`}
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                    <div className="w-px bg-white/10 mx-1" />
                    <button
                      onClick={() => updateTextLayer(selectedText.id, { align: 'left' })}
                      className={`w-8 h-8 rounded flex items-center justify-center ${
                        selectedText.align === 'left' ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'
                      }`}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateTextLayer(selectedText.id, { align: 'center' })}
                      className={`w-8 h-8 rounded flex items-center justify-center ${
                        selectedText.align === 'center' ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'
                      }`}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateTextLayer(selectedText.id, { align: 'right' })}
                      className={`w-8 h-8 rounded flex items-center justify-center ${
                        selectedText.align === 'right' ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-white/40'
                      }`}
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Color picker */}
                  <div>
                    <label className="text-white/40 text-[10px] mb-1 block flex items-center gap-1">
                      <Palette className="w-3 h-3" /> Color del texto
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => updateTextLayer(selectedText.id, { color: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            selectedText.color === c ? 'border-white scale-125' : 'border-white/20 hover:border-white/40'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Stroke color */}
                  {selectedText.stroke && (
                    <div>
                      <label className="text-white/40 text-[10px] mb-1 block">Color contorno</label>
                      <div className="flex flex-wrap gap-1.5">
                        {COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => updateTextLayer(selectedText.id, { strokeColor: c })}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              selectedText.strokeColor === c ? 'border-white scale-125' : 'border-white/20 hover:border-white/40'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hint to drag */}
                  <p className="text-white/30 text-[10px] text-center">
                    Arrastrá el texto en la imagen para moverlo
                  </p>
                </div>
              )}

              {/* Text layers list */}
              {textLayers.length > 0 && !selectedText && (
                <div className="space-y-1">
                  <label className="text-white/40 text-[10px] mb-1 block">Capas de texto ({textLayers.length}) - tocá para editar</label>
                  {textLayers.map(layer => (
                    <div
                      key={layer.id}
                      className="flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer"
                      onClick={() => setSelectedTextId(layer.id)}
                    >
                      <Type className="w-3 h-3 text-white/30" />
                      <span
                        className="text-white/70 text-xs flex-1 truncate"
                        style={{ fontFamily: FONTS.find(f => f.value === layer.fontFamily)?.css }}
                      >
                        {layer.text}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); removeTextLayer(layer.id) }}
                        className="text-white/20 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {textLayers.length === 0 && !selectedText && (
                <p className="text-white/30 text-xs text-center py-4">
                  Escribí texto arriba y tocá + para agregar
                </p>
              )}
            </div>
          )}

          {activeTool === 'blur' && (
            <div className="p-3 space-y-3">
              {/* Blur shape selector */}
              <div>
                <label className="text-white/50 text-xs mb-2 block">Forma del blur</label>
                <div className="flex gap-2">
                  {BLUR_SHAPES.map(shape => (
                    <button
                      key={shape.value}
                      onClick={() => setBlurShape(shape.value)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        blurShape === shape.value
                          ? 'bg-sky-500/20 border border-sky-500/40 text-white'
                          : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      <shape.icon className="w-3.5 h-3.5" />
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blur intensity for new regions */}
              <div>
                <label className="text-white/50 text-xs mb-2 flex items-center justify-between">
                  <span>Intensidad del blur</span>
                  <span className="text-white/30">{defaultBlurIntensity}px</span>
                </label>
                <Slider
                  value={[defaultBlurIntensity]}
                  onValueChange={([v]) => setDefaultBlurIntensity(v)}
                  min={2}
                  max={25}
                  step={1}
                />
              </div>

              {/* Selected blur region controls */}
              {selectedBlur && (
                <div className="space-y-3 p-3 bg-white/[0.03] rounded-lg border border-sky-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs flex items-center gap-1">
                      <Move className="w-3 h-3" /> Editando zona blur
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 h-6 w-6 p-0"
                      onClick={() => removeBlurRegion(selectedBlur.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Change shape */}
                  <div>
                    <label className="text-white/40 text-[10px] mb-1 block">Forma</label>
                    <div className="flex gap-1">
                      {BLUR_SHAPES.map(shape => (
                        <button
                          key={shape.value}
                          onClick={() => updateBlurRegion(selectedBlur.id, { shape: shape.value })}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium transition-all ${
                            selectedBlur.shape === shape.value
                              ? 'bg-sky-500/20 border border-sky-500/40 text-sky-400'
                              : 'bg-white/5 border border-white/10 text-white/40'
                          }`}
                        >
                          <shape.icon className="w-3 h-3" />
                          {shape.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Adjust intensity */}
                  <div>
                    <label className="text-white/40 text-[10px] mb-1 flex items-center justify-between">
                      <span>Intensidad</span>
                      <span className="text-white/30">{selectedBlur.intensity}px</span>
                    </label>
                    <Slider
                      value={[selectedBlur.intensity]}
                      onValueChange={([v]) => updateBlurRegion(selectedBlur.id, { intensity: v })}
                      min={2}
                      max={25}
                      step={1}
                    />
                  </div>

                  {/* Adjust size */}
                  <div>
                    <label className="text-white/40 text-[10px] mb-1 block">Ancho: {selectedBlur.width.toFixed(1)}%</label>
                    <Slider
                      value={[selectedBlur.width]}
                      onValueChange={([v]) => updateBlurRegion(selectedBlur.id, { width: v })}
                      min={3}
                      max={90}
                      step={0.5}
                    />
                  </div>
                  <div>
                    <label className="text-white/40 text-[10px] mb-1 block">Alto: {selectedBlur.height.toFixed(1)}%</label>
                    <Slider
                      value={[selectedBlur.height]}
                      onValueChange={([v]) => updateBlurRegion(selectedBlur.id, { height: v })}
                      min={3}
                      max={90}
                      step={0.5}
                    />
                  </div>

                  <p className="text-white/30 text-[10px] text-center">
                    Arrastrá la zona en la imagen para moverla
                  </p>
                </div>
              )}

              {/* Blur regions list */}
              {!selectedBlur && blurRegions.length > 0 && (
                <div>
                  <label className="text-white/40 text-[10px] mb-1 block">Zonas blur ({blurRegions.length}) - tocá para editar</label>
                  <div className="space-y-1">
                    {blurRegions.map((region, i) => {
                      const ShapeIcon = BLUR_SHAPES.find(s => s.value === region.shape)?.icon || Square
                      return (
                        <div
                          key={region.id}
                          className="flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer"
                          onClick={() => setSelectedBlurId(region.id)}
                        >
                          <ShapeIcon className="w-3 h-3 text-sky-400" />
                          <span className="text-white/60 text-xs flex-1">Zona {i + 1} ({region.shape})</span>
                          <span className="text-white/30 text-[10px]">{region.intensity}px</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white/20 hover:text-red-400 h-6 w-6 p-0"
                            onClick={e => { e.stopPropagation(); removeBlurRegion(region.id) }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!selectedBlur && blurRegions.length === 0 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <Droplets className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-200 text-xs font-medium">Modo Blur</p>
                    <p className="text-yellow-200/60 text-[10px] mt-1">
                      Dibujá sobre la imagen para difuminar. Elegí forma (rectangulo, circulo, ovalo) e intensidad. Despues podes mover y ajustar cada zona.
                    </p>
                  </div>
                </div>
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
                <Slider
                  value={[brightness]}
                  onValueChange={([v]) => setBrightness(v)}
                  min={30}
                  max={200}
                  step={1}
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-2 flex items-center justify-between">
                  <span>Contraste</span>
                  <span className="text-white/30">{contrast}%</span>
                </label>
                <Slider
                  value={[contrast]}
                  onValueChange={([v]) => setContrast(v)}
                  min={30}
                  max={200}
                  step={1}
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-2 flex items-center justify-between">
                  <span>Saturacion</span>
                  <span className="text-white/30">{saturate}%</span>
                </label>
                <Slider
                  value={[saturate]}
                  onValueChange={([v]) => setSaturate(v)}
                  min={0}
                  max={300}
                  step={1}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-white/40 text-xs h-7"
                onClick={() => { setBrightness(100); setContrast(100); setSaturate(100) }}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Resetear ajustes
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
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id)
                if (tool.id !== 'text') setSelectedTextId(null)
                if (tool.id !== 'blur') setSelectedBlurId(null)
              }}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-all ${
                activeTool === tool.id
                  ? 'text-sky-400'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <tool.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
