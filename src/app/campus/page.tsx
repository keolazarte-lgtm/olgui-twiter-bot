'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Shield, UserCheck, Lock, DollarSign, Brain, Banknote,
  Crown, LogOut, Loader2, BookOpen, CheckCircle2, Circle,
  ChevronRight, AlertTriangle, Clock, Flame, Globe,
  Palette, Ghost, Sparkles, Instagram
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useContentProtection } from '@/hooks/use-content-protection'
import { useRouter } from 'next/navigation'

const ICON_MAP: Record<string, React.ElementType> = {
  Shield, UserCheck, Lock, DollarSign, Banknote, Brain,
  Flame, Globe, Palette, Ghost,
}

// Premium content inside campus
const PREMIUM_COURSES = [
  {
    icon: Flame,
    title: 'Curso Avanzado de Fetiches Psicológicos',
    subtitle: 'Control mental, sumisión y monetización',
    desc: 'Explorá los fetiches más buscados y aprendé a crear contenido que conecte con la psicología de tus suscriptores. Técnicas avanzadas de seducción mental.',
    gradient: 'from-amber-700 to-red-800',
  },
  {
    icon: Globe,
    title: 'Curso de Reddit',
    subtitle: 'Estrategia de Tráfico Orgánico',
    desc: 'Aprendé a usar Reddit como fuente principal de tráfico orgánico. Conseguí suscriptores sin gastar un centavo en publicidad.',
    gradient: 'from-amber-600 to-orange-700',
  },
  {
    icon: Palette,
    title: 'Diseño de Identidad Digital',
    subtitle: 'Mentoría Personalizada',
    desc: 'Desarrollá una marca personal que te diferencie. Diseño de perfil, estética, contenido visual y estrategia de identidad.',
    gradient: 'from-yellow-600 to-amber-700',
  },
  {
    icon: Ghost,
    title: 'El Arte de ser Invisible',
    subtitle: 'Cómo usar las redes sociales en anonimato',
    desc: 'Manejá redes, promocioná tu contenido y crecé tu audiencia sin que nadie sepa quién sos. Técnicas de anonimato avanzadas.',
    gradient: 'from-amber-800 to-stone-800',
  },
]

interface Module {
  id: string
  title: string
  description: string | null
  orderNum: number
  icon: string | null
  lessons: { id: string; title: string; contentType: string; orderNum: number }[]
}

interface Progress {
  lessonId: string
  completed: boolean
  completedAt: string | null
}

export default function CampusPage() {
  const [user, setUser] = useState<{ id: string; email: string; name: string | null; role: string; active: number } | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Activate content protection (blocks copy, right-click, shortcuts)
  useContentProtection()

  useEffect(() => {
    async function load() {
      try {
        // Load user
        const userRes = await fetch('/api/auth/me')
        if (!userRes.ok) {
          router.push('/login')
          return
        }
        const userData = await userRes.json()
        setUser(userData.user)

        // Load modules
        const modRes = await fetch('/api/modules')
        const modData = await modRes.json()
        setModules(modData.modules || [])

        // Load progress only if active
        if (userData.user.active === 1) {
          const progRes = await fetch('/api/progress')
          const progData = await progRes.json()
          setProgress(progData.progress || [])
        }
      } catch (error) {
        console.error('Campus load error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handlePurchase = async () => {
    setPaying(true)
    try {
      const mpRes = await fetch('/api/mp/create-preference', { method: 'POST' })
      const mpData = await mpRes.json()

      if (mpData.initPoint) {
        window.location.href = mpData.initPoint
        return
      }

      toast({
        title: 'Error al generar el link de pago',
        description: 'Intentá de nuevo o contactanos por WhatsApp',
        variant: 'destructive',
      })
    } catch (error) {
      toast({
        title: 'Error de conexión',
        description: 'Intentá de nuevo en unos segundos',
        variant: 'destructive',
      })
    } finally {
      setPaying(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      document.cookie = 'da_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
    router.push('/')
  }

  const getModuleProgress = (moduleId: string) => {
    const mod = modules.find(m => m.id === moduleId)
    if (!mod || mod.lessons.length === 0) return 0
    const completed = mod.lessons.filter(l =>
      progress.some(p => p.lessonId === l.id && p.completed)
    ).length
    return Math.round((completed / mod.lessons.length) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="font-cinzel text-amber-400/60 text-xs tracking-wider">CARGANDO CAMPUS...</p>
        </div>
      </div>
    )
  }

  const isActive = user?.active === 1

  return (
    <div className="min-h-screen bg-[#050505] content-protected">
      {/* ─── HEADER ─── */}
      <header className="border-b border-amber-500/10 bg-[#050505]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/dinasty-crest-v3.png"
              alt="Dinasty Academy"
              width={36}
              height={36}
            />
            <div>
              <h1 className="font-cinzel-decorative text-white font-bold text-sm">
                <span className="gold-text">DINASTY</span> ACADEMY
              </h1>
              <p className="font-inter text-amber-400/40 text-[10px]">Campus Exclusivo</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="font-cinzel text-white text-xs tracking-wide">
                {user?.name || 'Creadora'}
              </p>
              <p className="font-inter text-amber-400/40 text-[10px]">{user?.email}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-amber-500/40 hover:text-amber-400 hover:bg-amber-500/10 font-cinzel text-xs tracking-wider h-9"
            >
              <LogOut className="w-4 h-4 mr-1" />
              SALIR
            </Button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="font-cinzel-decorative text-2xl sm:text-3xl font-bold text-white mb-2">
            Bienvenida, <span className="gold-text">{user?.name || 'Creadora'}</span>
          </h2>
          <p className="font-inter text-white/40 text-sm">
            {isActive
              ? 'Accedé a todos los módulos de configuración de élite. Marcá las lecciones como completadas a medida que avances.'
              : 'Tu cuenta fue creada sin costo. Adquirí el material de estudio para acceder a todo el contenido del campus.'
            }
          </p>
        </motion.div>

        {/* ─── INACTIVE USER: SHOW PAYMENT ─── */}
        {!isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="bg-black/60 border border-amber-500/20 backdrop-blur-md gold-border-glow">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-amber-400" />
                </div>
                <p className="font-cinzel text-amber-500/70 text-xs sm:text-sm tracking-[0.25em] mb-3">
                  MÓDULO 1 — CONFIGURACIÓN DE ÉLITE
                </p>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="font-cinzel-decorative font-black text-4xl sm:text-5xl gold-text">
                    $15.000
                  </span>
                  <span className="font-cinzel text-amber-500/50 text-sm">ARS</span>
                </div>
                <p className="font-inter text-white/30 text-xs line-through mb-1">
                  Valor real: $50.000 ARS
                </p>
                <p className="font-playfair text-amber-400/60 text-xs italic mb-5">
                  6 módulos completos + Campus exclusivo
                </p>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 mb-5 pulse-gold">
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-cinzel font-semibold tracking-wide">
                      ¡Cupos limitados!
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handlePurchase}
                  disabled={paying}
                  className="w-full h-13 text-sm sm:text-base font-cinzel font-bold tracking-wider gold-btn-glow text-black rounded-xl border-0 cursor-pointer"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      GENERANDO LINK DE PAGO...
                    </>
                  ) : (
                    <>
                      <Crown className="w-5 h-5 mr-2" />
                      ADQUIRIR MATERIAL DE ESTUDIO
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-center gap-4 mt-4 text-amber-500/30 text-[10px] font-cinzel tracking-wider">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" /> PAGO SEGURO
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> ACTIVACIÓN INMEDIATA
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── ACTIVE USER: STATS ─── */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            {[
              { label: 'MÓDULOS', value: modules.length },
              { label: 'LECCIONES', value: modules.reduce((acc, m) => acc + m.lessons.length, 0) },
              { label: 'COMPLETADAS', value: progress.filter(p => p.completed).length },
            ].map((stat, i) => (
              <Card key={i} className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardContent className="p-4 text-center">
                  <p className="font-cinzel-decorative text-2xl font-bold text-amber-400">{stat.value}</p>
                  <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        {/* ─── CONTENIDO PREMIUM ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-cinzel-decorative text-lg sm:text-xl font-bold text-white">
              Contenido <span className="gold-text">Premium</span>
            </h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {PREMIUM_COURSES.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
              >
                <Card className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/25 transition-all duration-500 h-full group overflow-hidden relative">
                  {/* Large gradient image area */}
                  <div className={`relative h-36 sm:h-44 bg-gradient-to-br ${item.gradient} flex items-center justify-center overflow-hidden`}>
                    {/* Decorative pattern */}
                    <div className="absolute inset-0 opacity-10" style={{
                      backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)`,
                    }} />
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                      backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
                      backgroundSize: '30px 30px',
                    }} />
                    {/* Large icon */}
                    <item.icon className="w-14 h-14 sm:w-18 sm:h-18 text-white/20 absolute" />
                    {/* Title integrated in the image */}
                    <div className="relative z-10 text-center px-5">
                      <h4 className="font-cinzel text-white font-bold text-sm sm:text-base tracking-wide drop-shadow-lg leading-tight">
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="font-inter text-white/70 text-[11px] sm:text-xs mt-1 drop-shadow-md">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    {/* Próximamente badge */}
                    <div className="absolute top-2.5 right-2.5 z-20">
                      <span className="bg-black/50 backdrop-blur-sm text-amber-300 font-cinzel text-[9px] tracking-widest px-2.5 py-0.5 rounded-full border border-amber-400/30">
                        PROXIMAMENTE
                      </span>
                    </div>
                    {/* Lock overlay for inactive users */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
                        <Lock className="w-6 h-6 text-amber-400/60" />
                      </div>
                    )}
                  </div>
                  {/* Bottom section */}
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0`}>
                        <item.icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-cinzel text-white font-semibold text-xs tracking-wide truncate">
                          {item.title}
                        </h4>
                        {item.subtitle && (
                          <p className="font-inter text-amber-400/50 text-[10px] truncate">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    {!isActive && (
                      <p className="font-inter text-amber-500/30 text-[10px] mt-2 text-center">
                        Disponible al adquirir el curso
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Modules grid — show preview if inactive, full access if active */}
        <div className="space-y-4">
          {modules.map((mod, i) => {
            const IconComp = ICON_MAP[mod.icon || ''] || Shield
            const prog = isActive ? getModuleProgress(mod.id) : 0
            const completedLessons = isActive ? mod.lessons.filter(l =>
              progress.some(p => p.lessonId === l.id && p.completed)
            ).length : 0

            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <Card
                  className={`bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-all duration-300 group ${isActive ? 'cursor-pointer' : 'opacity-60'}`}
                  onClick={() => isActive && router.push(`/campus/modulo/${mod.id}`)}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-gradient-to-br from-amber-600 to-yellow-500' : 'bg-white/5'}`}>
                        <IconComp className={`w-6 h-6 ${isActive ? 'text-black' : 'text-amber-500/30'}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-cinzel text-white font-semibold text-sm sm:text-base tracking-wide">
                            Módulo {mod.orderNum}: {mod.title}
                          </h3>
                          {isActive && (
                            <ChevronRight className="w-5 h-5 text-amber-500/20 group-hover:text-amber-400 transition-colors shrink-0" />
                          )}
                          {!isActive && (
                            <Lock className="w-4 h-4 text-amber-500/20 shrink-0" />
                          )}
                        </div>
                        <p className="font-inter text-white/35 text-xs leading-relaxed mb-3 line-clamp-2">
                          {mod.description}
                        </p>

                        {/* Progress bar */}
                        {isActive && (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${prog}%` }}
                              />
                            </div>
                            <span className="font-inter text-amber-400/60 text-[10px] shrink-0">
                              {completedLessons}/{mod.lessons.length} lecciones
                            </span>
                          </div>
                        )}
                        {!isActive && (
                          <p className="font-inter text-amber-400/40 text-[10px]">
                            {mod.lessons.length} lecciones — Disponible al adquirir el material
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Admin link */}
        {user?.role === 'admin' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Button
              onClick={() => router.push('/admin/dashboard')}
              className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 font-cinzel text-xs tracking-wider"
            >
              <Crown className="w-4 h-4 mr-2" />
              PANEL DE ADMINISTRACIÓN
            </Button>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-amber-500/5 py-6 px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Social links */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <a
              href="https://www.instagram.com/dinastyacadamy?igsh=a2NoNHRxdGgzeGVx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/15 text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/30 transition-all duration-300"
            >
              <Instagram className="w-4 h-4" />
            </a>
          </div>
          <p className="font-cinzel text-amber-500/20 text-xs tracking-[0.2em]">
            © 2026 DINASTY ACADEMY · TODOS LOS DERECHOS RESERVADOS
          </p>
        </div>
      </footer>
    </div>
  )
}
