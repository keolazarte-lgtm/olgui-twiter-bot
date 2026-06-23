'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Crown, Loader2, Wand2, Image as ImageIcon,
  Plus, X, ChevronUp, ChevronDown, Download, Sparkles, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

interface Escena {
  id: string
  imagen: string | null  // data URL
  titulo: string
  subtitulo: string
  colorTitulo: string  // hex
  colorSubtitulo: string  // hex
}

interface ImagenGenerada {
  id: string
  url: string  // data URL
  prompt: string
  changes: string[]
}

const ESTILOS = [
  { id: 'elegante', label: 'Elegante', desc: 'Oscuro con dorado, lujo' },
  { id: 'moderno', label: 'Moderno', desc: 'Minimalista, limpio' },
  { id: 'sensual', label: 'Sensual', desc: 'Cálido, íntimo, sin explicit' },
  { id: 'epico', label: 'Épico', desc: 'Dramático, impactante' },
]

export default function GeneradorPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [estilo, setEstilo] = useState<string>('elegante')
  const [prompt, setPrompt] = useState('')
  const [generando, setGenerando] = useState(false)
  const [ultimosCambios, setUltimosCambios] = useState<string[]>([])
  const [imagenes, setImagenes] = useState<ImagenGenerada[]>([])
  const [escenas, setEscenas] = useState<Escena[]>([])
  const [imgSeleccionada, setImgSeleccionada] = useState<string | null>(null)

  // Auth check
  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          router.push('/login')
          return
        }
        const data = await res.json()
        if (data.user?.role !== 'admin') {
          toast({
            title: 'Acceso denegado',
            description: 'Solo el admin puede usar el generador.',
            variant: 'destructive',
          })
          router.push('/campus')
          return
        }
        setLoading(false)
      } catch {
        router.push('/login')
      }
    }
    checkAccess()
  }, [router, toast])

  // Init con 5 escenas vacías
  useEffect(() => {
    if (escenas.length === 0) {
      setEscenas([
        crearEscenaVacia(),
        crearEscenaVacia(),
        crearEscenaVacia(),
        crearEscenaVacia(),
        crearEscenaVacia(),
      ])
    }
  }, [])

  function crearEscenaVacia(): Escena {
    return {
      id: `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imagen: null,
      titulo: '',
      subtitulo: '',
      colorTitulo: '#ffffff',
      colorSubtitulo: '#ffd700',
    }
  }

  async function handleGenerarImagen() {
    if (!prompt.trim()) {
      toast({ title: 'Escribí un prompt primero', variant: 'destructive' })
      return
    }

    setGenerando(true)
    setUltimosCambios([])

    try {
      const res = await fetch('/api/generador/generar-imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), estilo }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'No se pudo generar', variant: 'destructive' })
        return
      }

      const nuevaImg: ImagenGenerada = {
        id: `img_${Date.now()}`,
        url: data.image,
        prompt: prompt.trim(),
        changes: data.changes || [],
      }

      setImagenes(prev => [nuevaImg, ...prev])
      setUltimosCambios(data.changes || [])

      if (data.changes && data.changes.length > 0) {
        toast({
          title: 'Imagen generada',
          description: `Filtro aplicó ${data.changes.length} cambio(s)`,
        })
      } else {
        toast({ title: 'Imagen generada', description: 'Lista para usar' })
      }
    } catch (e: any) {
      toast({ title: 'Error de conexión', description: e.message, variant: 'destructive' })
    } finally {
      setGenerando(false)
    }
  }

  function asignarImagenAEscena(escenaId: string, imgUrl: string) {
    setEscenas(prev => prev.map(e => e.id === escenaId ? { ...e, imagen: imgUrl } : e))
    setImgSeleccionada(null)
    toast({ title: 'Imagen asignada', description: 'La escena ya tiene su imagen' })
  }

  function abrirSelectorImagen(escenaId: string) {
    if (imagenes.length === 0) {
      toast({ title: 'Sin imágenes', description: 'Generá al menos una imagen primero', variant: 'destructive' })
      return
    }
    setImgSeleccionada(escenaId)
  }

  function updateEscena(id: string, field: keyof Escena, value: string) {
    setEscenas(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  function addEscena() {
    if (escenas.length >= 8) {
      toast({ title: 'Máximo 8 escenas', variant: 'destructive' })
      return
    }
    setEscenas(prev => [...prev, crearEscenaVacia()])
  }

  function removeEscena(id: string) {
    if (escenas.length <= 1) {
      toast({ title: 'Mínimo 1 escena', variant: 'destructive' })
      return
    }
    setEscenas(prev => prev.filter(e => e.id !== id))
  }

  function moveEscena(idx: number, dir: number) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= escenas.length) return
    setEscenas(prev => {
      const arr = [...prev]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return arr
    })
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
              onClick={() => router.push('/admin/dashboard')}
              variant="ghost"
              className="text-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10 h-9 px-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="font-cinzel text-xs tracking-wider hidden sm:inline">ADMIN</span>
            </Button>
            <div className="w-px h-6 bg-amber-500/10" />
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-yellow-500 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-black" />
            </div>
            <div>
              <h1 className="font-cinzel text-white font-semibold text-xs sm:text-sm tracking-wide">
                Generador de <span className="gold-text">Reels IA</span>
              </h1>
              <p className="font-inter text-amber-400/40 text-[10px]">
                Armá tus propios reels desde el celu
              </p>
            </div>
          </div>
          <Image src="/dinasty-crest-v3.png" alt="Dinasty Academy" width={28} height={28} className="opacity-40" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-4">
            {/* Configuración */}
            <Card className="bg-white/[0.02] border-amber-500/[0.08]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <p className="font-cinzel text-amber-400 text-xs tracking-[0.2em]">CONFIGURACIÓN</p>
                </div>
                <label className="font-cinzel text-amber-500/60 text-[10px] tracking-wider mb-1.5 block">ESTILO VISUAL</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {ESTILOS.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setEstilo(e.id)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        estilo === e.id
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20'
                      }`}
                    >
                      <p className="font-cinzel text-white text-xs">{e.label}</p>
                      <p className="font-inter text-white/30 text-[10px] mt-0.5">{e.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Generar imagen */}
            <Card className="bg-white/[0.02] border-amber-500/[0.08]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="w-4 h-4 text-amber-400" />
                  <p className="font-cinzel text-amber-400 text-xs tracking-[0.2em]">GENERAR IMAGEN CON IA</p>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: mujer elegante en penthouse al atardecer, sin mostrar la cara"
                  className="bg-white/[0.02] border-amber-500/20 text-white text-sm font-inter resize-none mb-3"
                  rows={3}
                />
                <Button
                  onClick={handleGenerarImagen}
                  disabled={generando}
                  className="w-full gold-btn-glow text-black font-cinzel font-bold tracking-wider text-xs h-10"
                >
                  {generando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      GENERANDO...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      GENERAR IMAGEN
                    </>
                  )}
                </Button>

                {ultimosCambios.length > 0 && (
                  <div className="mt-3 bg-amber-500/5 border border-amber-500/15 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-amber-400 text-[10px] mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="font-cinzel font-semibold tracking-wider">FILTRO APLICADO</span>
                    </div>
                    <p className="font-inter text-white/60 text-[10px]">{ultimosCambios.join(', ')}</p>
                  </div>
                )}

                <p className="font-inter text-white/30 text-[10px] mt-3 leading-relaxed">
                  El filtro reescribe palabras como "fetiche", "desnudo", "erótico" automáticamente para que la IA no las rechace.
                  Los textos del reel (títulos) no se filtran — escribí lo que quieras.
                </p>
              </CardContent>
            </Card>

            {/* Galería */}
            <Card className="bg-white/[0.02] border-amber-500/[0.08]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <p className="font-cinzel text-amber-400 text-xs tracking-[0.2em]">IMÁGENES GENERADAS ({imagenes.length})</p>
                </div>
                {imagenes.length === 0 ? (
                  <p className="font-inter text-white/30 text-xs text-center py-6">
                    Generá tu primera imagen arriba
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                    {imagenes.map(img => (
                      <button
                        key={img.id}
                        onClick={() => imgSeleccionada && asignarImagenAEscena(imgSeleccionada, img.url)}
                        className={`relative aspect-[9/16] rounded-lg overflow-hidden border transition-all ${
                          imgSeleccionada
                            ? 'border-amber-500/40 hover:border-amber-500/70 cursor-pointer'
                            : 'border-amber-500/20 cursor-default'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        {imgSeleccionada && (
                          <div className="absolute bottom-0 inset-x-0 bg-black/70 text-amber-400 text-[8px] text-center py-0.5 font-cinzel">
                            {imgSeleccionada ? 'CLICK PARA ASIGNAR' : ''}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {imgSeleccionada && (
                  <Button
                    onClick={() => setImgSeleccionada(null)}
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-white/40 text-[10px]"
                  >
                    CANCELAR ASIGNACIÓN
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-4">
            {/* Escenas */}
            <Card className="bg-white/[0.02] border-amber-500/[0.08]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <p className="font-cinzel text-amber-400 text-xs tracking-[0.2em]">ESCENAS ({escenas.length})</p>
                  </div>
                  <Button
                    onClick={addEscena}
                    size="sm"
                    variant="ghost"
                    className="text-amber-400 text-[10px] h-7 px-2"
                  >
                    <Plus className="w-3 h-3 mr-1" /> AGREGAR
                  </Button>
                </div>
                <p className="font-inter text-white/30 text-[10px] mb-3">
                  Cada escena = 1 imagen + título + subtítulo. Para asignar imagen: click en el cuadro de la escena y después click en una imagen de la galería.
                </p>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {escenas.map((escena, idx) => (
                    <div key={escena.id} className="bg-black/30 border border-amber-500/10 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-cinzel text-amber-400 text-[10px] font-bold tracking-wider">ESCENA {idx + 1}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveEscena(idx, -1)}
                            disabled={idx === 0}
                            className="text-white/40 hover:text-amber-400 disabled:opacity-20 p-1"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveEscena(idx, 1)}
                            disabled={idx === escenas.length - 1}
                            className="text-white/40 hover:text-amber-400 disabled:opacity-20 p-1"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeEscena(escena.id)}
                            className="text-red-400/60 hover:text-red-400 p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => abrirSelectorImagen(escena.id)}
                        className={`w-full aspect-[9/16] max-h-32 rounded-lg overflow-hidden border transition-all mb-2 ${
                          escena.imagen
                            ? 'border-amber-500/30'
                            : 'border-dashed border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5'
                        }`}
                      >
                        {escena.imagen ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={escena.imagen} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                            <ImageIcon className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-inter">CLICK PARA ASIGNAR</span>
                          </div>
                        )}
                      </button>

                      <Input
                        value={escena.titulo}
                        onChange={(e) => updateEscena(escena.id, 'titulo', e.target.value)}
                        placeholder="Título principal"
                        className="bg-white/[0.02] border-amber-500/20 text-white text-xs font-inter mb-2 h-8"
                      />
                      <Input
                        value={escena.subtitulo}
                        onChange={(e) => updateEscena(escena.id, 'subtitulo', e.target.value)}
                        placeholder="Subtítulo (opcional)"
                        className="bg-white/[0.02] border-amber-500/20 text-white text-xs font-inter mb-2 h-8"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-cinzel text-amber-500/40 text-[9px] tracking-wider block mb-1">COLOR TÍTULO</label>
                          <input
                            type="color"
                            value={escena.colorTitulo}
                            onChange={(e) => updateEscena(escena.id, 'colorTitulo', e.target.value)}
                            className="w-full h-7 rounded border border-amber-500/20 bg-transparent cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="font-cinzel text-amber-500/40 text-[9px] tracking-wider block mb-1">COLOR SUBTÍTULO</label>
                          <input
                            type="color"
                            value={escena.colorSubtitulo}
                            onChange={(e) => updateEscena(escena.id, 'colorSubtitulo', e.target.value)}
                            className="w-full h-7 rounded border border-amber-500/20 bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Generar reel */}
            <Card className="bg-white/[0.02] border-amber-500/[0.08]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <p className="font-cinzel text-amber-400 text-xs tracking-[0.2em]">GENERAR REEL FINAL</p>
                </div>
                <p className="font-inter text-white/40 text-[10px] mb-3 leading-relaxed">
                  Cuando termines de armar las escenas, mandame un mensaje y yo te genero el video MP4.
                  Esto se hace por separado porque el render del video tarda 2-3 minutos y Vercel tiene límite de 60s por request.
                </p>
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
                  <p className="font-inter text-amber-400/80 text-[10px] leading-relaxed">
                    <strong>Cómo seguir:</strong>
                  </p>
                  <ol className="font-inter text-white/60 text-[10px] space-y-1 mt-1 ml-3 list-decimal">
                    <li>Armá todas las escenas con sus imágenes y textos</li>
                    <li>Tomá captura de pantalla de esta página</li>
                    <li>Mandamela por WhatsApp o por acá</li>
                    <li>Yo te genero el MP4 con música incluida</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
