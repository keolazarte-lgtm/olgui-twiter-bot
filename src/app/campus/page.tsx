'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, UserCheck, Lock, DollarSign, Brain, Banknote,
  Crown, LogOut, Loader2, BookOpen, CheckCircle2,
  ChevronRight, ChevronDown, ChevronUp, AlertTriangle, Clock, Flame, Globe,
  Palette, Ghost, Sparkles, Instagram, Users, TrendingUp, X, Copy,
  Bitcoin, Wallet, Wand2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useContentProtection } from '@/hooks/use-content-protection'
import { useRouter } from 'next/navigation'

const ICON_MAP: Record<string, React.ElementType> = {
  Shield, UserCheck, Lock, DollarSign, Banknote, Brain,
  Flame, Globe, Palette, Ghost, AlertTriangle, Sparkles,
  BookOpen, Clock, Users, TrendingUp,
  Sparkle: Sparkles,
}

// Course metadata — note: order matters for display.
// Reddit is featured → goes first and is expanded by default.
const COURSE_META: Record<string, {
  title: string
  subtitle: string
  description: string
  icon: React.ElementType
  gradient: string
  accent: 'amber' | 'indigo' | 'orange'
  featuredGradient: string
}> = {
  reddit: {
    id: 'reddit',
    title: 'Curso de Reddit',
    subtitle: 'Producto separado · Tráfico orgánico',
    description: 'Anatomía de Reddit, Karma, nichos y fetiches, manual de operaciones, horarios pico, RedGifs y lista oficial de 26 categorías de comunidades NSFW.',
    icon: Globe,
    gradient: 'from-orange-600 via-red-600 to-rose-700',
    accent: 'orange',
    featuredGradient: 'from-amber-500 via-yellow-400 to-amber-500',
  },
  onlyfans: {
    id: 'onlyfans',
    title: 'Dinasty Academy — OnlyFans',
    subtitle: 'Curso principal · Mujeres creadoras',
    description: 'Mentalidad, configuración de élite, panel de control, tarifas y estrategia de tráfico. Tu camino completo de cero a facturar en dólares.',
    icon: Crown,
    gradient: 'from-amber-600 via-yellow-500 to-amber-400',
    accent: 'amber',
    featuredGradient: 'from-amber-500 via-yellow-400 to-amber-500',
  },
  hombres: {
    id: 'hombres',
    title: 'Curso para Hombres',
    subtitle: 'Producto separado · Creadores masculinos',
    description: 'Mentalidad del creador masculino, comunidad LGBTQ+ como mercado principal, privacidad, panel, tarifas y promoción en Reddit y Twitter (X).',
    icon: Users,
    gradient: 'from-blue-700 via-indigo-700 to-purple-800',
    accent: 'indigo',
    featuredGradient: 'from-amber-500 via-yellow-400 to-amber-500',
  },
} as const

const COURSE_ORDER = ['reddit', 'onlyfans', 'hombres']

interface Module {
  id: string
  title: string
  description: string | null
  orderNum: number
  icon: string | null
  isAlert: boolean
  course: string
  lessons: { id: string; title: string; contentType: string; orderNum: number }[]
}

interface Progress {
  lessonId: string
  completed: boolean
  completedAt: string | null
}

interface Pricing {
  course: string
  arsAmount: number
  arsStrike: number | null
  usdAmount: number
  usdStrike: number | null
  mpLink: string | null
  binanceId: string | null
  binanceInstructions: string | null
  isFeatured: boolean
  badgeText: string | null
}

// ─── Binance Modal Component ─────────────────────────────
function BinanceModal({
  open, onClose, course, pricing, userEmail,
}: {
  open: boolean
  onClose: () => void
  course: string
  pricing: Pricing | null
  userEmail: string | undefined
}) {
  const { toast } = useToast()
  if (!open || !pricing) return null

  const instructions = pricing.binanceInstructions?.trim()
    ? pricing.binanceInstructions
    : `1. Abrí Binance → Pago → Enviar\n2. Enviá $${pricing.usdAmount} USD al Binance ID: ${pricing.binanceId || '(a configurar)'}\n3. En la nota poné tu email: ${userEmail || '(tu email)'}\n4. Mandanos el comprobante por WhatsApp\n5. Te activamos en menos de 1 hora`

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copiado`, description: 'Pegalo en Binance Pay' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-gradient-to-br from-[#1a1206] to-[#0a0a0a] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-amber-500/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center">
              <Bitcoin className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="font-cinzel-decorative text-white font-bold text-lg">Pago en USD</h3>
              <p className="font-inter text-amber-400/60 text-xs">{COURSE_META[course]?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-5 text-center">
          <p className="font-cinzel text-amber-400/60 text-[10px] tracking-wider mb-1">MONTO A ENVIAR</p>
          <p className="font-cinzel-decorative text-4xl font-bold gold-text">${pricing.usdAmount} USD</p>
          {pricing.usdStrike && (
            <p className="font-inter text-white/30 text-xs line-through mt-1">${pricing.usdStrike} USD</p>
          )}
        </div>

        {/* Binance ID */}
        <div className="bg-white/[0.03] border border-amber-500/10 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span className="font-cinzel text-white/80 text-xs tracking-wider">BINANCE PAY ID</span>
            </div>
            {pricing.binanceId && (
              <button
                onClick={() => copyToClipboard(pricing.binanceId!, 'Binance ID')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[10px] font-cinzel tracking-wider"
              >
                <Copy className="w-3 h-3" /> COPIAR
              </button>
            )}
          </div>
          <p className="font-mono text-amber-300 text-sm break-all">
            {pricing.binanceId || '— A configurar por el administrador —'}
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mb-5">
          <p className="font-cinzel text-amber-400/60 text-[10px] tracking-wider mb-3">INSTRUCCIONES PASO A PASO</p>
          <pre className="font-inter text-white/70 text-xs whitespace-pre-wrap leading-relaxed">{instructions}</pre>
        </div>

        <Button
          onClick={onClose}
          className="w-full gold-btn-glow text-black font-cinzel text-sm tracking-wider border-0 h-11"
        >
          ENTENDIDO, YA ENVIÉ EL PAGO
        </Button>
      </motion.div>
    </div>
  )
}

// ─── Buy Card Component ──────────────────────────────────
function BuyCard({
  course, pricing, onBuyArs, onBuyUsd,
}: {
  course: string
  pricing: Pricing | null
  onBuyArs: () => void
  onBuyUsd: () => void
}) {
  if (!pricing) return null

  return (
    <div className="bg-gradient-to-br from-amber-500/[0.04] to-transparent border border-amber-500/15 rounded-xl p-4 sm:p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-amber-400" />
        <p className="font-cinzel text-amber-400/80 text-xs tracking-wider">DESBLOQUEAR ESTE CURSO</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* ARS — MercadoPago */}
        <div className="bg-white/[0.03] border border-amber-500/15 rounded-lg p-4 text-center hover:border-amber-500/30 transition-colors">
          <p className="font-cinzel text-amber-500/60 text-[9px] tracking-wider mb-1">PESOS ARGENTINOS</p>
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="font-cinzel-decorative font-black text-2xl gold-text">${pricing.arsAmount.toLocaleString('es-AR')}</span>
            <span className="font-cinzel text-amber-500/50 text-xs">ARS</span>
          </div>
          {pricing.arsStrike && (
            <p className="font-inter text-white/25 text-[10px] line-through mb-2">
              ${pricing.arsStrike.toLocaleString('es-AR')} ARS
            </p>
          )}
          <Button
            onClick={onBuyArs}
            className="w-full gold-btn-glow text-black font-cinzel text-[11px] tracking-wider border-0 h-9 mt-2"
          >
            <DollarSign className="w-3 h-3 mr-1" />
            COMPRAR ARS
          </Button>
          <p className="font-inter text-amber-500/30 text-[9px] mt-1.5">MercadoPago · Activación automática</p>
        </div>

        {/* USD — Binance */}
        <div className="bg-amber-500/[0.04] border border-amber-500/20 rounded-lg p-4 text-center hover:border-amber-500/40 transition-colors">
          <p className="font-cinzel text-amber-500/60 text-[9px] tracking-wider mb-1">DÓLARES</p>
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="font-cinzel-decorative font-black text-2xl gold-text">${pricing.usdAmount}</span>
            <span className="font-cinzel text-amber-500/50 text-xs">USD</span>
          </div>
          {pricing.usdStrike && (
            <p className="font-inter text-white/25 text-[10px] line-through mb-2">
              ${pricing.usdStrike} USD
            </p>
          )}
          <Button
            onClick={onBuyUsd}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:opacity-90 text-black font-cinzel text-[11px] tracking-wider border-0 h-9 mt-2"
          >
            <Bitcoin className="w-3 h-3 mr-1" />
            COMPRAR USD
          </Button>
          <p className="font-inter text-amber-500/30 text-[9px] mt-1.5">Binance Pay · Activación manual</p>
        </div>
      </div>

      <p className="font-inter text-white/30 text-[10px] text-center mt-3 leading-relaxed">
        Al adquirir este curso, accedés a <strong className="text-amber-400/70">todos los módulos y lecciones</strong> de manera permanente.
      </p>
    </div>
  )
}

// ─── Course Accordion Card ───────────────────────────────
function CourseCard({
  courseKey, modules, pricing, isActive, progress, getModuleProgress, onOpenModule, onBuyArs, onBuyUsd,
  defaultExpanded,
}: {
  courseKey: string
  modules: Module[]
  pricing: Pricing | null
  isActive: boolean
  progress: Progress[]
  getModuleProgress: (moduleId: string) => number
  onOpenModule: (moduleId: string) => void
  onBuyArs: () => void
  onBuyUsd: () => void
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const meta = COURSE_META[courseKey]
  if (!meta) return null

  const Icon = meta.icon
  const isFeatured = pricing?.isFeatured || false
  const courseLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)
  const courseCompleted = modules.reduce((acc, m) =>
    acc + m.lessons.filter(l => progress.some(p => p.lessonId === l.id && p.completed)).length, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${isFeatured ? 'super-gold-glow' : ''}`}
    >
      <Card className={`overflow-hidden transition-all duration-300 ${
        isFeatured
          ? 'bg-gradient-to-br from-amber-950/40 via-[#0a0a0a] to-[#0a0a0a] border-2 border-amber-400/50'
          : 'bg-white/[0.02] border border-amber-500/[0.08]'
      }`}>
        {/* Featured badge */}
        {isFeatured && (
          <div className="absolute top-0 right-0 z-10">
            <div className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-cinzel font-black text-[10px] tracking-[0.2em] px-3 py-1 rounded-bl-xl flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3 h-3" />
              {pricing?.badgeText || 'SUPER GOLD'}
            </div>
          </div>
        )}

        {/* Course header — clickable to expand/collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-4 sm:p-5 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
              isFeatured ? meta.featuredGradient : meta.gradient
            } flex items-center justify-center shrink-0 shadow-lg`}>
              <Icon className={`w-6 h-6 ${isFeatured ? 'text-black' : 'text-white'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-cinzel-decorative text-base sm:text-xl font-bold ${
                isFeatured ? 'gold-text' : 'text-white'
              }`}>
                {meta.title}
              </h3>
              <p className="font-inter text-amber-400/50 text-[11px] sm:text-xs">{meta.subtitle}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="font-cinzel text-amber-400/70 text-[10px] tracking-wider">
                  {modules.length} MÓDULOS
                </span>
                <span className="text-amber-500/20">·</span>
                <span className="font-cinzel text-amber-400/70 text-[10px] tracking-wider">
                  {courseLessons} LECCIONES
                </span>
                {isActive && (
                  <>
                    <span className="text-amber-500/20">·</span>
                    <span className="font-cinzel text-green-400/70 text-[10px] tracking-wider">
                      {courseCompleted} COMPLETADAS
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="shrink-0 text-amber-400/60">
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </button>

        {/* Expanded body: temario + buy card */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 sm:px-5 pb-5">
                {/* Featured hero text */}
                {isFeatured && (
                  <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20">
                    <p className="font-playfair italic text-amber-300 text-xs sm:text-sm text-center">
                      ★ El curso estrella de Dinasty Academy ★<br/>
                      <span className="text-amber-400/60">Estrategias para atraer miles de seguidores a tu contenido</span>
                    </p>
                  </div>
                )}

                <p className="font-inter text-white/50 text-xs sm:text-sm mb-4 leading-relaxed">
                  {meta.description}
                </p>

                <p className="font-cinzel text-amber-400/60 text-[10px] tracking-wider mb-3">TEMARIO</p>

                {/* Modules list */}
                <div className="space-y-2 mb-2">
                  {modules.map((mod, i) => {
                    const IconComp = ICON_MAP[mod.icon || ''] || Shield
                    const prog = isActive ? getModuleProgress(mod.id) : 0
                    const completedLessons = isActive ? mod.lessons.filter(l =>
                      progress.some(p => p.lessonId === l.id && p.completed)
                    ).length : 0

                    return (
                      <div
                        key={mod.id}
                        onClick={() => isActive && onOpenModule(mod.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-all cursor-${
                          isActive ? 'pointer hover:bg-white/[0.03]' : 'default opacity-60'
                        } ${
                          mod.isAlert
                            ? 'bg-red-950/20 border border-red-500/30 hover:border-red-400/50'
                            : 'bg-white/[0.02] border border-amber-500/[0.05] hover:border-amber-500/20'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          mod.isAlert
                            ? (isActive ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-red-950/50')
                            : (isActive ? 'bg-gradient-to-br from-amber-600 to-yellow-500' : 'bg-white/5')
                        }`}>
                          {mod.isAlert ? (
                            <AlertTriangle className="w-4 h-4 text-white" />
                          ) : (
                            <IconComp className={`w-4 h-4 ${isActive ? 'text-black' : 'text-amber-500/30'}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`font-cinzel font-semibold text-xs sm:text-sm ${
                              mod.isAlert ? 'text-red-300' : 'text-white'
                            }`}>
                              {mod.isAlert ? (
                                <span className="text-red-400 text-[9px] tracking-widest mr-2">⚠ ALERTA</span>
                              ) : (
                                <span className="text-amber-500/60 text-[10px] mr-2">M{mod.orderNum}</span>
                              )}
                              {mod.title}
                            </h4>
                            {!isActive && <Lock className="w-3.5 h-3.5 text-amber-500/20 shrink-0" />}
                            {isActive && <ChevronRight className={`w-4 h-4 shrink-0 ${mod.isAlert ? 'text-red-500/40' : 'text-amber-500/30'}`} />}
                          </div>
                          <p className={`font-inter text-[11px] leading-snug mt-0.5 line-clamp-1 ${
                            mod.isAlert ? 'text-red-200/40' : 'text-white/35'
                          }`}>
                            {mod.description}
                          </p>
                          {isActive && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    mod.isAlert
                                      ? 'bg-gradient-to-r from-red-600 to-red-400'
                                      : 'bg-gradient-to-r from-amber-600 to-yellow-400'
                                  }`}
                                  style={{ width: `${prog}%` }}
                                />
                              </div>
                              <span className={`font-inter text-[9px] ${mod.isAlert ? 'text-red-400/60' : 'text-amber-400/60'}`}>
                                {completedLessons}/{mod.lessons.length}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Buy card — ALWAYS visible under each course (even when collapsed) */}
                {!isActive && (
                  <BuyCard
                    course={courseKey}
                    pricing={pricing}
                    onBuyArs={onBuyArs}
                    onBuyUsd={onBuyUsd}
                  />
                )}

                {isActive && (
                  <div className="mt-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-center">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <p className="font-cinzel text-green-400 text-[10px] tracking-wider">CURSO DESBLOQUEADO</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buy card OUTSIDE the accordion — ALWAYS visible, even when course is collapsed */}
        {!isActive && !expanded && (
          <div className="px-4 sm:px-5 pb-5 pt-1">
            <BuyCard
              course={courseKey}
              pricing={pricing}
              onBuyArs={onBuyArs}
              onBuyUsd={onBuyUsd}
            />
            <p className="font-inter text-amber-500/40 text-[10px] text-center mt-2 italic">
              ↑ Tocá el curso para ver el temario completo
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

// ─── Main Page ───────────────────────────────────────────
export default function CampusPage() {
  const [user, setUser] = useState<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    active: number;
    editorAccess?: boolean;
    courseAccess?: { onlyfans: boolean; reddit: boolean; hombres: boolean };
  } | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [pricing, setPricing] = useState<Pricing[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [binanceModal, setBinanceModal] = useState<{ open: boolean; course: string; pricing: Pricing | null }>({
    open: false, course: '', pricing: null,
  })
  const { toast } = useToast()
  const router = useRouter()

  useContentProtection()

  useEffect(() => {
    async function load() {
      try {
        const userRes = await fetch('/api/auth/me')
        if (!userRes.ok) {
          router.push('/login')
          return
        }
        const userData = await userRes.json()
        setUser(userData.user)

        const [modRes, pricingRes] = await Promise.all([
          fetch('/api/modules'),
          fetch('/api/pricing'),
        ])
        const modData = await modRes.json()
        setModules(modData.modules || [])
        const pricingData = await pricingRes.json()
        setPricing(pricingData.pricing || [])

        if (userData.user.active === 1 || userData.user.courseAccess) {
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

  const handleBuyArs = async (courseKey: string, mpLink?: string | null) => {
    setPaying(true)
    try {
      // If admin set a direct MP link, use it; otherwise generate via API
      if (mpLink && mpLink.startsWith('http')) {
        window.location.href = mpLink
        return
      }
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

  const handleBuyUsd = (courseKey: string) => {
    const p = pricing.find(p => p.course === courseKey) || null
    setBinanceModal({ open: true, course: courseKey, pricing: p })
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

  const isActive = user?.active === 1 // legacy global (por compatibilidad)
  const courseAccess = user?.courseAccess || { onlyfans: false, reddit: false, hombres: false }
  const isAdmin = user?.role === 'admin'
  // Helper: ¿tiene acceso a un curso específico?
  const isActiveForCourse = (courseKey: string): boolean => {
    if (isAdmin) return true
    return Boolean((courseAccess as any)[courseKey])
  }
  // Helper: ¿tiene acceso a ALGÚN curso? (para mostrar stats, sticky CTA, etc.)
  const hasAnyCourse = isAdmin || (courseAccess.onlyfans || courseAccess.reddit || courseAccess.hombres)

  return (
    <div className="min-h-screen bg-[#050505] content-protected">
      <style jsx global>{`
        .super-gold-glow {
          animation: goldPulse 3s ease-in-out infinite;
        }
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.15), 0 0 40px rgba(212, 175, 55, 0.08); }
          50% { box-shadow: 0 0 30px rgba(212, 175, 55, 0.3), 0 0 60px rgba(212, 175, 55, 0.15); }
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <header className="border-b border-amber-500/10 bg-[#050505]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/dinasty-crest-v3.png" alt="Dinasty Academy" width={36} height={36} />
            <div>
              <h1 className="font-cinzel-decorative text-white font-bold text-sm">
                <span className="gold-text">DINASTY</span> ACADEMY
              </h1>
              <p className="font-inter text-amber-400/40 text-[10px]">Campus Exclusivo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="font-cinzel text-white text-xs tracking-wide">{user?.name || 'Creadora'}</p>
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

      {/* ─── MAIN ─── */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="font-cinzel-decorative text-2xl sm:text-3xl font-bold text-white mb-2">
            Bienvenida, <span className="gold-text">{user?.name || 'Creadora'}</span>
          </h2>
          <p className="font-inter text-white/40 text-sm">
            {hasAnyCourse
              ? 'Tocá un curso para ver su temario completo. Marcá las lecciones como completadas a medida que avances.'
              : 'Tocá un curso para ver su temario y precio. Desbloqueá el curso que elijas para acceder a todo su contenido.'}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {[
            { label: 'CURSOS', value: COURSE_ORDER.length },
            { label: 'MÓDULOS', value: modules.length },
            { label: 'LECCIONES', value: modules.reduce((acc, m) => acc + m.lessons.length, 0) },
          ].map((stat, i) => (
            <Card key={i} className="bg-white/[0.02] border-amber-500/[0.08]">
              <CardContent className="p-4 text-center">
                <p className="font-cinzel-decorative text-2xl font-bold text-amber-400">{stat.value}</p>
                <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Courses (Reddit featured first) */}
        <div className="space-y-5">
          {COURSE_ORDER.map((courseKey, idx) => {
            const courseModules = modules.filter(m => (m.course || 'onlyfans') === courseKey)
            if (courseModules.length === 0) return null
            const coursePricing = pricing.find(p => p.course === courseKey) || null
            const isFeatured = coursePricing?.isFeatured || false

            return (
              <CourseCard
                key={courseKey}
                courseKey={courseKey}
                modules={courseModules}
                pricing={coursePricing}
                isActive={isActiveForCourse(courseKey)}
                progress={progress}
                getModuleProgress={getModuleProgress}
                onOpenModule={(modId) => router.push(`/campus/modulo/${modId}`)}
                onBuyArs={() => handleBuyArs(courseKey, coursePricing?.mpLink)}
                onBuyUsd={() => handleBuyUsd(courseKey)}
                defaultExpanded={isFeatured}
              />
            )
          })}
        </div>

        {/* Editor de Fotos IA link */}
        {(user?.editorAccess || user?.role === 'admin') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Button
              onClick={() => router.push('/editor')}
              className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 font-cinzel text-xs tracking-wider"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              EDITOR DE FOTOS IA
            </Button>
          </motion.div>
        )}

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
          <div className="flex items-center justify-center gap-4 mb-4">
            <a
              href="https://www.instagram.com/dinastyacademy"
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

      {/* Binance modal */}
      <BinanceModal
        open={binanceModal.open}
        onClose={() => setBinanceModal({ open: false, course: '', pricing: null })}
        course={binanceModal.course}
        pricing={binanceModal.pricing}
        userEmail={user?.email}
      />

      {/* Paying overlay */}
      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto mb-4" />
            <p className="font-cinzel text-amber-400/70 text-xs tracking-wider">REDIRIGIENDO A MERCADOPAGO...</p>
          </div>
        </div>
      )}
    </div>
  )
}
