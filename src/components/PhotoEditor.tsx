'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import {
  Crop, Type, Droplets, Sun, RotateCcw, Check, X, Plus,
  Minus, Move, Trash2, Palette, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Square, Circle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
}

interface PhotoEditorProps {
  imageSrc: string
  onApply: (editedBlob: Blob) => void
  onCancel: () => void
}

// ─── Constants ───────────────────────────────────────────────
const FONTS = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Courier New", monospace', label: 'Courier' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: '"Comic Sans MS", cursive', label: 'Comic Sans' },
  { value: '"Palatino Linotype", serif', label: 'Palatino' },
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
  const [isDrawingBlur, setIsDrawingBlur] = useState(false)
  const [blurStart, setBlurStart] = useState({ x: 0, y: 0 })
  const [blurCurrent, setBlurCurrent] = useState({ x: 0, y: 0 })

  // Adjustments
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturate, setSaturate] = useState(100)
  const [blurAmount, setBlurAmount] = useState(0)

  // Canvas ref for final render
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const selectedText = textLayers.find(t => t.id === selectedTextId)

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
      fontFamily: 'Arial, sans-serif',
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

  const updateTextLayer = (id: string, updates: Partial<TextLayer>) => {
    setTextLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  const removeTextLayer = (id: string) => {
    setTextLayers(prev => prev.filter(l => l.id !== id))
    if (selectedTextId === id) setSelectedTextId(null)
  }

  // ─── Text drag handlers ───────────────────────────────────
  const handleTextMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedTextId(layerId)
    setDraggingText(layerId)
    const rect = editorRef.current?.getBoundingClientRect()
    if (!rect) return
    const layer = textLayers.find(l => l.id === layerId)
    if (!layer) return
    setDragOffset({
      x: (e.clientX - rect.left) / rect.width * 100 - layer.x,
      y: (e.clientY - rect.top) / rect.height * 100 - layer.y,
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingText) return
    const rect = editorRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width * 100 - dragOffset.x
    const y = (e.clientY - rect.top) / rect.height * 100 - dragOffset.y
    updateTextLayer(draggingText, { x: Math.max(0, Math.min(95, x)), y: Math.max(0, Math.min(95, y)) })
  }, [draggingText, dragOffset])

  const handleMouseUp = useCallback(() => {
    setDraggingText(null)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // ─── Blur handlers ────────────────────────────────────────
  const handleEditorMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== 'blur') return
    const rect = editorRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width * 100
    const y = (e.clientY - rect.top) / rect.height * 100
    setIsDrawingBlur(true)
    setBlurStart({ x, y })
    setBlurCurrent({ x, y })
  }

  const handleEditorMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingBlur) return
    const rect = editorRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width * 100
    const y = (e.clientY - rect.top) / rect.height * 100
    setBlurCurrent({ x, y })
  }

  const handleEditorMouseUp = () => {
    if (!isDrawingBlur) return
    setIsDrawingBlur(false)
    const x = Math.min(blurStart.x, blurCurrent.x)
    const y = Math.min(blurStart.y, blurCurrent.y)
    const width = Math.abs(blurCurrent.x - blurStart.x)
    const height = Math.abs(blurCurrent.y - blurStart.y)
    if (width > 2 && height > 2) {
      setBlurRegions(prev => [...prev, {
        id: Date.now().toString(),
        x, y, width, height,
      }])
    }
  }

  const removeBlurRegion = (id: string) => {
    setBlurRegions(prev => prev.filter(r => r.id !== id))
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

    // Step 2: Apply adjustments + blur + text on a new canvas
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

      // Pixelate the region
      const pixelSize = Math.max(8, Math.min(rw, rh) / 15)
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')!
      const smallW = Math.max(1, Math.floor(rw / pixelSize))
      const smallH = Math.max(1, Math.floor(rh / pixelSize))
      tempCanvas.width = smallW
      tempCanvas.height = smallH

      tempCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, smallW, smallH)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, rx, ry, rw, rh)
      ctx.imageSmoothingEnabled = true
    }

    // Step 4: Draw text layers
    for (const layer of textLayers) {
      const x = layer.x / 100 * canvas.width
      const y = layer.y / 100 * canvas.height
      const scaledSize = layer.fontSize * (canvas.width / 500)

      let fontStyle = ''
      if (layer.italic) fontStyle += 'italic '
      if (layer.bold) fontStyle += 'bold '
      fontStyle += `${scaledSize}px ${layer.fontFamily}`

      ctx.font = fontStyle
      ctx.textAlign = layer.align
      ctx.textBaseline = 'top'

      const offsetX = layer.align === 'center' ? 0 : layer.align === 'right' ? -canvas.width * 0.02 : canvas.width * 0.02

      // Stroke
      if (layer.stroke) {
        ctx.strokeStyle = layer.strokeColor
        ctx.lineWidth = scaledSize / 10
        ctx.lineJoin = 'round'
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
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-white/10">
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
            className="border-white/10 text-white/60 h-8"
          >
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-0 h-8"
          >
            <Check className="w-4 h-4 mr-1" />
            Aplicar
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Canvas area */}
        <div
          ref={editorRef}
          className="flex-1 relative overflow-hidden bg-zinc-950"
          onMouseDown={handleEditorMouseDown}
          onMouseMove={handleEditorMouseMove}
          onMouseUp={handleEditorMouseUp}
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
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="relative max-w-full max-h-full">
                <img
                  src={imageSrc}
                  alt="Edit"
                  className="max-w-full max-h-[60vh] object-contain"
                  style={{ filter: previewFilter }}
                  draggable={false}
                />

                {/* Text layers overlay */}
                {textLayers.map(layer => (
                  <div
                    key={layer.id}
                    className={`absolute cursor-move select-none ${
                      selectedTextId === layer.id ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-transparent' : ''
                    }`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      transform: layer.align === 'center' ? 'translateX(-50%)' : layer.align === 'right' ? 'translateX(-100%)' : undefined,
                    }}
                    onMouseDown={e => handleTextMouseDown(e, layer.id)}
                  >
                    <span
                      style={{
                        fontSize: `${layer.fontSize}px`,
                        fontFamily: layer.fontFamily,
                        color: layer.color,
                        fontWeight: layer.bold ? 'bold' : 'normal',
                        fontStyle: layer.italic ? 'italic' : 'normal',
                        textAlign: layer.align,
                        WebkitTextStroke: layer.stroke ? `1px ${layer.strokeColor}` : undefined,
                        paintOrder: 'stroke fill',
                        whiteSpace: 'pre-wrap',
                        textShadow: layer.stroke ? `2px 2px 4px ${layer.strokeColor}` : undefined,
                      }}
                    >
                      {layer.text}
                    </span>
                  </div>
                ))}

                {/* Blur regions overlay */}
                {blurRegions.map(region => (
                  <div
                    key={region.id}
                    className="absolute border-2 border-dashed border-red-400/60 bg-red-400/10 cursor-pointer group"
                    style={{
                      left: `${region.x}%`,
                      top: `${region.y}%`,
                      width: `${region.width}%`,
                      height: `${region.height}%`,
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                    }}
                    onClick={() => removeBlurRegion(region.id)}
                  >
                    <button
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full items-center justify-center text-white text-xs hidden group-hover:flex"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Drawing blur region */}
                {isDrawingBlur && (
                  <div
                    className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/10"
                    style={{
                      left: `${Math.min(blurStart.x, blurCurrent.x)}%`,
                      top: `${Math.min(blurStart.y, blurCurrent.y)}%`,
                      width: `${Math.abs(blurCurrent.x - blurStart.x)}%`,
                      height: `${Math.abs(blurCurrent.y - blurStart.y)}%`,
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tool Controls */}
        <div className="bg-zinc-900 border-t border-white/10 max-h-[40vh] overflow-y-auto">
          {activeTool === 'crop' && (
            <div className="p-4 space-y-4">
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
            <div className="p-4 space-y-4">
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
                          <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
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
                      max={80}
                      step={1}
                    />
                  </div>

                  {/* Style buttons */}
                  <div className="flex gap-1">
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
                            selectedText.color === c ? 'border-white scale-110' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Stroke color */}
                  {selectedText.stroke && (
                    <div>
                      <label className="text-white/40 text-[10px] mb-1 block">Contorno</label>
                      <div className="flex flex-wrap gap-1.5">
                        {COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => updateTextLayer(selectedText.id, { strokeColor: c })}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              selectedText.strokeColor === c ? 'border-white scale-110' : 'border-white/20'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Text layers list */}
              {textLayers.length > 0 && !selectedText && (
                <div className="space-y-1">
                  <label className="text-white/40 text-[10px] mb-1 block">Capas de texto ({textLayers.length})</label>
                  {textLayers.map(layer => (
                    <div
                      key={layer.id}
                      className="flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer"
                      onClick={() => setSelectedTextId(layer.id)}
                    >
                      <Type className="w-3 h-3 text-white/30" />
                      <span className="text-white/70 text-xs flex-1 truncate">{layer.text}</span>
                      <button
                        onClick={e => { e.stopPropagation(); removeBlurRegion(layer.id) }}
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
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <Droplets className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-200 text-xs font-medium">Modo Blur</p>
                  <p className="text-yellow-200/60 text-[10px] mt-1">
                    Dibujá un rectángulo sobre la zona que querés difuminar. Tocá una zona borrosa para eliminarla.
                  </p>
                </div>
              </div>

              {blurRegions.length > 0 && (
                <div>
                  <label className="text-white/40 text-[10px] mb-1 block">Zonas blur ({blurRegions.length})</label>
                  <div className="space-y-1">
                    {blurRegions.map((region, i) => (
                      <div key={region.id} className="flex items-center gap-2 p-2 rounded bg-white/[0.03]">
                        <Square className="w-3 h-3 text-red-400" />
                        <span className="text-white/60 text-xs flex-1">Zona {i + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/20 hover:text-red-400 h-6 w-6 p-0"
                          onClick={() => removeBlurRegion(region.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {blurRegions.length === 0 && (
                <p className="text-white/30 text-xs text-center py-4">
                  Dibujá sobre la imagen para difuminar zonas
                </p>
              )}
            </div>
          )}

          {activeTool === 'adjust' && (
            <div className="p-4 space-y-4">
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
                  <span>Saturación</span>
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
      <div className="bg-zinc-900 border-t border-white/10 px-2 py-2">
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
