'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Crown, Loader2, Download, Upload, Sparkles, Wand2,
  Image as ImageIcon, Shirt, Mountain, AlertTriangle, X, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

type Mode = 'enhance' | 'background' | 'outfit' | 'custom'

interface UsageInfo {
  hasAccess: boolean
  usedToday: number
  remaining: number | string
  limit: number | string
}

const BACKGROUND_PRESETS = [
  { id: 'penthouse', label: 'Penthouse', description: 'Penthouse moderno al atardecer con vista a la ciudad' },
  { id: 'playa', label: 'Playa', description: 'Playa tropical con palmeras, mar turquesa y arena blanca al atardecer' },
  { id: 'loft', label: 'Loft', description: 'Loft industrial moderno con ladrillos vistos, ventanas grandes y luz natural' },
  { id: 'dormitorio', label: 'Dormitorio', description: 'Dormitorio elegante con cama king, sábanas blancas y luz cálida suave' },
  { id: 'estudio', label: 'Estudio photo', description: 'Estudio fotográfico profesional con fondo gris claro, luces softbox y reflectores' },
  { id: 'ciudad', label: 'Ciudad noche', description: 'Azotea con vista a la ciudad de noche, luces de la ciudad y edificios brillantes' },
]

const OUTFIT_PRESETS = [
  { id: 'latex-negro', label: 'Látex negro', description: 'Catsuit de látex negro brillante, cuerpo entero, mangas y piernas largas, con cierre frontal y reflejos realistas' },
  { id: 'lenceria-negra', label: 'Lencería negra', description: 'Conjunto de lencería negra de encaje, sostén y panty, con medias altas' },
  { id: 'corset-cuero', label: 'Corset cuero', description: 'Corset de cuero negro ajustado con cordones, pantys de cuero combinando' },
  { id: 'vestido-rojo', label: 'Vestido rojo', description: 'Vestido rojo largo elegante con abertura en la pierna, escote pronunciado' },
  { id: 'bikini-dorado', label: 'Bikini dorado', description: 'Bikini dorado de dos piezas con brillos, muy ajustado' },
  { id: 'arneses-bdsm', label: 'Arneses BDSM', description: 'Conjunto de arneses negros de cuero con tiras, pechería y pantys, estilo fetish' },
]

export default function EditorPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [mode, setMode] = useState<Mode>('enhance')
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [selectedBackground, setSelectedBackground] = useState(BACKGROUND_PRESETS[0].id)
  const [selectedOutfit, setSelectedOutfit] = useState(OUTFIT_PRESETS[0].id)

  // Auth + access check
  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch('/api/editor/usage')
        if (!res.ok) {
          router.push('/campus')
          return
        }
        const data = await res.json()
        if (!data.hasAccess) {
          toast({
            title: 'Sin acceso al editor',
            description: 'Contactate con soporte para activar el editor en tu cuenta.',
            variant: 'destructive',
          })
          router.push('/campus')
          return
        }
        setUsage(data)
        setLoading(false)
      } catch (e) {
        router.push('/campus')
      }
    }
    checkAccess()
  }, [router, toast])

  // Refresh usage after each process
  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/editor/usage')
      if (res.ok) {
        const data = await res.json()
        setUsage(data)
      }
    } catch {}
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Archivo inválido', description: 'Subí una imagen (JPG, PNG, WEBP)', variant: 'destructive' })
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Imagen muy grande', description: 'Máximo 8MB. Usá una más chica.', variant: 'destructive' })
      return
    }

    setOriginalFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setOriginalImage(reader.result as string)
      setResultImage(null)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const fakeEvent = { target: { files: [file] } } as any
      handleFileSelect(fakeEvent)
    }
  }

  const handleProcess = async () => {
    if (!originalImage) {
      toast({ title: 'Subí una imagen primero', variant: 'destructive' })
      return
    }

    if (usage && typeof usage.remaining === 'number' && usage.remaining <= 0) {
      toast({
        title: 'Límite diario alcanzado',
        description: `Alcanzaste las ${usage.limit} fotos de hoy. Volvé mañana.`,
        variant: 'destructive',
      })
      return
    }

    if (mode === 'custom' && !customPrompt.trim()) {
      toast({ title: 'Escribí un prompt', description: 'Describí qué querés hacerle a la imagen', variant: 'destructive' })
      return
    }

    setProcessing(true)
    setResultImage(null)

    try {
      const body: any = {
        image: originalImage,
        mode,
      }

      if (mode === 'background') {
        const preset = BACKGROUND_PRESETS.find(b => b.id === selectedBackground)
        body.background = preset?.description
      } else if (mode === 'outfit') {
        const preset = OUTFIT_PRESETS.find(o => o.id === selectedOutfit)
        body.outfit = preset?.description
      } else if (mode === 'custom') {
        body.prompt = customPrompt
      }

      const res = await fetch('/api/editor/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'No se pudo procesar', variant: 'destructive' })
        return
      }

      setResultImage(data.image)
      if (data.usage) {
        setUsage(prev => ({ ...prev!, ...data.usage }))
      }
      await refreshUsage()
      toast({ title: 'Imagen procesada', description: 'Listo para descargar' })
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo procesar', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!resultImage) return
    const link = document.createElement('a')
    link.href = resultImage
    link.download = `dinasty-editor-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleReset = () => {
    setOriginalImage(null)
    setOriginalFile(null)
    setResultImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="border-b border-amber-500/10 bg-[#050505]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/campus')}
              variant="ghost"
              className="text-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10 h-9 px-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="font-cinzel text-xs tracking-wider hidden sm:inline">CAMPUS</span>
            </Button>
            <div className="w-px h-6 bg-amber-500/10" />
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-yellow-500 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-black" />
            </div>
            <div>
              <h1 className="font-cinzel text-white font-semibold text-xs sm:text-sm tracking-wide">
                Editor de Fotos <span className="gold-text">IA</span>
              </h1>
              {usage && (
                <p className="font-inter text-amber-400/40 text-[10px]">
                  {typeof usage.remaining === 'string'
                    ? `Ilimitado (admin)`
                    : `${usage.remaining} de ${usage.limit} restantes hoy`}
                </p>
              )}
            </div>
          </div>

          <Image
            src="/dinasty-crest-v3.png"
            alt="Dinasty Academy"
            width={28}
            height={28}
            className="opacity-40"
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Mode selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <p className="font-cinzel text-amber-500/60 text-xs tracking-[0.2em]">ELEGÍ EL MODO</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ModeButton
              active={mode === 'enhance'}
              onClick={() => setMode('enhance')}
              icon={<Sparkles className="w-4 h-4" />}
              label="Mejorar"
              sublabel="Calidad HD"
            />
            <ModeButton
              active={mode === 'background'}
              onClick={() => setMode('background')}
              icon={<Mountain className="w-4 h-4" />}
              label="Fondo"
              sublabel="Cambiar entorno"
            />
            <ModeButton
              active={mode === 'outfit'}
              onClick={() => setMode('outfit')}
              icon={<Shirt className="w-4 h-4" />}
              label="Outfit"
              sublabel="Cambiar ropa"
            />
            <ModeButton
              active={mode === 'custom'}
              onClick={() => setMode('custom')}
              icon={<Wand2 className="w-4 h-4" />}
              label="Custom"
              sublabel="Prompt libre"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT: Upload + Original */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-cinzel text-amber-500/60 text-xs tracking-[0.2em]">IMAGEN ORIGINAL</p>
              {originalImage && (
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="sm"
                  className="text-amber-500/50 hover:text-amber-400 h-7 px-2 text-[10px]"
                >
                  <X className="w-3 h-3 mr-1" /> Quitar
                </Button>
              )}
            </div>

            {!originalImage ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-500/20 rounded-xl p-8 sm:p-12 text-center cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition-all"
              >
                <Upload className="w-10 h-10 text-amber-500/30 mx-auto mb-3" />
                <p className="font-cinzel text-white/60 text-sm mb-1">Subí tu foto</p>
                <p className="font-inter text-white/30 text-xs">Click o arrastrá una imagen (JPG, PNG, WEBP — máx 8MB)</p>
              </div>
            ) : (
              <Card className="bg-white/[0.02] border-amber-500/[0.08] overflow-hidden">
                <CardContent className="p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={originalImage}
                    alt="Original"
                    className="w-full rounded-lg object-contain max-h-[500px]"
                  />
                </CardContent>
              </Card>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* RIGHT: Result */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-cinzel text-amber-500/60 text-xs tracking-[0.2em]">RESULTADO</p>
              {resultImage && (
                <Button
                  onClick={handleDownload}
                  size="sm"
                  className="gold-btn-glow text-black font-cinzel font-bold tracking-wider text-[10px] h-7 px-3"
                >
                  <Download className="w-3 h-3 mr-1" /> DESCARGAR
                </Button>
              )}
            </div>

            <Card className="bg-white/[0.02] border-amber-500/[0.08] overflow-hidden min-h-[300px] flex items-center justify-center">
              <CardContent className="p-2 w-full">
                {processing ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
                    <p className="font-cinzel text-amber-400/60 text-xs tracking-wider">PROCESANDO...</p>
                    <p className="font-inter text-white/30 text-[10px] mt-1">20-60 segundos</p>
                  </div>
                ) : resultImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={resultImage}
                    alt="Resultado"
                    className="w-full rounded-lg object-contain max-h-[500px]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <ImageIcon className="w-10 h-10 text-amber-500/20 mb-2" />
                    <p className="font-inter text-white/30 text-xs">El resultado va a aparecer acá</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {resultImage && !processing && (
              <Button
                onClick={handleProcess}
                variant="outline"
                size="sm"
                className="mt-2 w-full border-amber-500/20 text-amber-400 hover:bg-amber-500/10 font-cinzel text-[10px] tracking-wider"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> PROBAR OTRA VARIANTE
              </Button>
            )}
          </div>
        </div>

        {/* Mode-specific options */}
        <Card className="bg-white/[0.02] border-amber-500/[0.08] mt-6">
          <CardContent className="p-4">
            {mode === 'enhance' && (
              <div>
                <p className="font-cinzel text-amber-400 text-sm mb-2">Mejorar calidad</p>
                <p className="font-inter text-white/50 text-xs">
                  Sube resolución, saca ruido, afila detalles y mejora iluminación. Mantiene todo igual,
                  solo mejora la calidad técnica de la foto. Ideal para fotos viejas, borrosas o pixeladas.
                </p>
              </div>
            )}

            {mode === 'background' && (
              <div>
                <p className="font-cinzel text-amber-400 text-sm mb-3">Elegí el nuevo fondo</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BACKGROUND_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedBackground(preset.id)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        selectedBackground === preset.id
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20'
                      }`}
                    >
                      <p className="font-cinzel text-white text-xs">{preset.label}</p>
                      <p className="font-inter text-white/30 text-[10px] mt-0.5 line-clamp-2">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'outfit' && (
              <div>
                <p className="font-cinzel text-amber-400 text-sm mb-3">Elegí el outfit</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {OUTFIT_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedOutfit(preset.id)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        selectedOutfit === preset.id
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20'
                      }`}
                    >
                      <p className="font-cinzel text-white text-xs">{preset.label}</p>
                      <p className="font-inter text-white/30 text-[10px] mt-0.5 line-clamp-2">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'custom' && (
              <div>
                <p className="font-cinzel text-amber-400 text-sm mb-2">Prompt personalizado</p>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ej: Cambiar el color del vestido a rojo, agregar collar de perlas, iluminación de estudio..."
                  className="bg-white/[0.02] border-amber-500/20 text-white text-xs font-inter resize-none"
                  rows={4}
                />
                <p className="font-inter text-white/30 text-[10px] mt-2">
                  Sé específica. Decí qué cambiar y qué mantener (cara, pose, fondo, etc.).
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleProcess}
                disabled={!originalImage || processing}
                className="flex-1 gold-btn-glow text-black font-cinzel font-bold tracking-wider text-xs h-10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    PROCESANDO...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    PROCESAR IMAGEN
                  </>
                )}
              </Button>
            </div>

            {usage && typeof usage.remaining === 'number' && usage.remaining <= 5 && (
              <div className="mt-3 flex items-center gap-2 bg-amber-500/5 border border-amber-500/15 rounded-lg p-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="font-inter text-amber-400/80 text-[10px]">
                  Te quedan {usage.remaining} fotos hoy. Usalas con criterio.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer notice */}
        <div className="mt-6 text-center">
          <p className="font-inter text-white/20 text-[10px]">
            El editor respeta la privacidad de tu contenido. Las imágenes no se guardan en nuestros servidores.
          </p>
        </div>
      </main>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  sublabel,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  sublabel: string
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border transition-all flex flex-col items-center text-center ${
        active
          ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
          : 'bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20'
      }`}
    >
      <div className={`${active ? 'text-amber-400' : 'text-amber-500/40'} mb-1`}>{icon}</div>
      <p className={`font-cinzel text-xs ${active ? 'text-white' : 'text-white/60'}`}>{label}</p>
      <p className="font-inter text-white/30 text-[9px] mt-0.5">{sublabel}</p>
    </button>
  )
}
