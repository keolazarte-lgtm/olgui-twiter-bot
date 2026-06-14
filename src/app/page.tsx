'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Eye, Lock, DollarSign, Brain, UserCheck, ArrowRight,
  Check, AlertTriangle, Clock, Star, Zap, ChevronDown, ChevronUp,
  MessageCircle, Send, Loader2, Crown, Sparkles, Users, Gem,
  Fingerprint, Banknote, TrendingUp, Award, X, Play, Timer,
  ShieldCheck, EyeOff, Wallet, HeartHandshake, Volume2, VolumeX
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

// ─── Constants ───────────────────────────────────────────────
const MODULE_ITEMS = [
  {
    icon: Shield,
    title: 'Geoblocking Absoluto',
    desc: 'Bloqueo geográfico total — Invisible en tu país o provincia. Nadie de tu entorno te encuentra, ni por accidente.',
    gradient: 'from-amber-600 to-yellow-500',
  },
  {
    icon: UserCheck,
    title: 'Bloqueo de Usuarios Específicos',
    desc: 'Control total sobre quién puede y quién NO puede ver tu contenido. Elegís vos quien entra y quien queda afuera.',
    gradient: 'from-yellow-600 to-amber-400',
  },
  {
    icon: Lock,
    title: 'Registro y Verificación Paso a Paso',
    desc: 'Guía técnica completa para crear tu cuenta y verificar sin errores ni rechazos. De la A a la Z.',
    gradient: 'from-amber-700 to-yellow-600',
  },
  {
    icon: DollarSign,
    title: 'Opciones de Retiro Seguras y Privadas',
    desc: 'Los métodos más seguros para cobrar sin exponer tu identidad. Tu plata, tu privacidad, tu control.',
    gradient: 'from-yellow-500 to-amber-300',
  },
  {
    icon: Banknote,
    title: 'Efectivo en la Mano',
    desc: 'El paso a paso para tener tu dinero disponible cuando quieras. Sin intermediarios innecesarios.',
    gradient: 'from-amber-600 to-yellow-400',
  },
  {
    icon: Brain,
    title: 'Mentalidad de Negocio y Marca Personal',
    desc: 'Con o sin rostro — aprendé a construir una marca que venda. Pensá como empresaria, no como empleada.',
    gradient: 'from-yellow-700 to-amber-500',
  },
]

const TESTIMONIALS = [
  {
    name: 'Luna M.',
    text: 'No tenía idea de cómo proteger mi identidad. Con este manual me sentí segura desde el día 1. Ahora cobro tranquila.',
    role: 'Creadora OF',
  },
  {
    name: 'Valentina R.',
    text: 'El geoblocking solo ya vale lo que cuesta todo el curso. Nadie de mi ciudad me encuentra. Impagable.',
    role: 'Creadora Fansly',
  },
  {
    name: 'Camila S.',
    text: 'Pensé que era imposible cobrar sin que nadie supiera quién soy. Me equivoqué. Este manual cambia todo.',
    role: 'Creadora OF',
  },
]

// Fake purchase notifications for social proof
const PURCHASE_NOTIFICATIONS = [
  { name: 'María G.', city: 'Buenos Aires', time: 'hace 3 min' },
  { name: 'Sofía L.', city: 'Córdoba', time: 'hace 7 min' },
  { name: 'Agustina R.', city: 'Rosario', time: 'hace 12 min' },
  { name: 'Luciana P.', city: 'Mendoza', time: 'hace 18 min' },
  { name: 'Florencia M.', city: 'La Plata', time: 'hace 25 min' },
  { name: 'Natalia D.', city: 'Tucumán', time: 'hace 31 min' },
  { name: 'Carla V.', city: 'Mar del Plata', time: 'hace 38 min' },
  { name: 'Romina S.', city: 'Salta', time: 'hace 45 min' },
  { name: 'Gabriela T.', city: 'Santa Fe', time: 'hace 52 min' },
  { name: 'Alejandra K.', city: 'Neuquén', time: 'hace 1 hora' },
]

// Comparison table data
const COMPARISON = [
  { feature: 'Privacidad de ubicación', without: 'Cualquiera te encuentra', with_: 'Geoblocking total' },
  { feature: 'Control de usuarios', without: 'No podés bloquear', with_: 'Bloqueo selectivo' },
  { feature: 'Cobro seguro', without: 'Exponés tu identidad', with_: 'Métodos 100% privados' },
  { feature: 'Verificación', without: 'Errores y rechazos', with_: 'Aprobación garantizada' },
  { feature: 'Mentalidad', without: 'Dudas e inseguridad', with_: 'Marca que vende' },
  { feature: 'Soporte', without: 'Estás sola', with_: 'Canal Telegram exclusivo' },
]

// ─── Countdown Timer Hook ──────────────────────────────────
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime()
      const distance = targetDate.getTime() - now

      if (distance < 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setTimeLeft({
        hours: Math.floor(distance / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

// ─── Gold Particles Component ──────────────────────────────
// Pre-computed particle positions to avoid Math.random() hydration mismatch
const PARTICLE_DATA = [
  { x: 12, y1: 45, y2: 78, dur: 8, del: 0.5 },
  { x: 28, y1: 22, y2: 67, dur: 10, del: 1.2 },
  { x: 45, y1: 83, y2: 15, dur: 7, del: 2.1 },
  { x: 62, y1: 35, y2: 90, dur: 9, del: 0.8 },
  { x: 78, y1: 58, y2: 12, dur: 11, del: 3.0 },
  { x: 91, y1: 40, y2: 72, dur: 8, del: 1.5 },
  { x: 5, y1: 70, y2: 25, dur: 10, del: 2.5 },
  { x: 37, y1: 15, y2: 55, dur: 7, del: 0.3 },
  { x: 55, y1: 62, y2: 8, dur: 9, del: 1.8 },
  { x: 72, y1: 48, y2: 85, dur: 12, del: 3.5 },
  { x: 18, y1: 90, y2: 33, dur: 8, del: 0.9 },
  { x: 33, y1: 5, y2: 50, dur: 10, del: 2.3 },
  { x: 50, y1: 72, y2: 18, dur: 7, del: 1.1 },
  { x: 67, y1: 28, y2: 65, dur: 11, del: 3.2 },
  { x: 85, y1: 55, y2: 30, dur: 9, del: 0.6 },
  { x: 8, y1: 38, y2: 82, dur: 8, del: 2.8 },
  { x: 23, y1: 68, y2: 10, dur: 10, del: 1.6 },
  { x: 42, y1: 12, y2: 58, dur: 7, del: 3.8 },
  { x: 58, y1: 85, y2: 40, dur: 12, del: 0.4 },
  { x: 75, y1: 20, y2: 95, dur: 9, del: 2.0 },
]

function GoldParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLE_DATA.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-amber-400/40"
          initial={{
            x: `${p.x}%`,
            y: `${p.y1}%`,
            opacity: 0,
          }}
          animate={{
            y: [`${p.y1}%`, `${p.y2}%`],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            delay: p.del,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ─── Decorative Components ──────────────────────────────────
function OrnamentalLine() {
  return (
    <div className="flex items-center justify-center gap-3 my-6">
      <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-amber-500/50" />
      <span className="text-amber-500/60 text-xs">◆</span>
      <div className="h-px w-16 bg-gradient-to-r from-amber-500/50 to-amber-500/50" />
      <span className="text-amber-500/60 text-xs">◆</span>
      <div className="h-px flex-1 max-w-24 bg-gradient-to-l from-transparent to-amber-500/50" />
    </div>
  )
}

// ─── Dynasty Crest Image Component ──
// Uses mix-blend-mode: screen so black background becomes transparent
// Only the gold parts of the logo are visible — no background removal needed
function DynastyCrest({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-black rounded-2xl p-2 inline-block ${className}`}>
      <Image
        src="/dinasty-crest-v2.png"
        alt="Dinasty Academy"
        width={240}
        height={240}
        className="mix-blend-screen w-full h-full"
        priority
        quality={100}
      />
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────
export default function DinastiaAcademy() {
  const TOTAL_SPOTS = 30
  const [spotsLeft, setSpotsLeft] = useState(17)
  const [showPayment, setShowPayment] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showStickyCta, setShowStickyCta] = useState(false)
  const [notification, setNotification] = useState<typeof PURCHASE_NOTIFICATIONS[0] | null>(null)
  const [notifVisible, setNotifVisible] = useState(false)
  const [buyerCount] = useState(47)
  const { toast } = useToast()

  // Countdown — 2 days from now (resets each visit for urgency)
  const [countdownTarget, setCountdownTarget] = useState<Date | null>(null)
  const timeLeft = useCountdown(countdownTarget ?? new Date(Date.now() + 48 * 60 * 60 * 1000))

  useEffect(() => {
    const stored = localStorage.getItem('da_countdown')
    if (stored) {
      const date = new Date(stored)
      if (date.getTime() > Date.now()) {
        setCountdownTarget(date)
        return
      }
    }
    const newDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
    localStorage.setItem('da_countdown', newDate.toISOString())
    setCountdownTarget(newDate)
  }, [])

  // Scroll detection for sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCta(window.scrollY > 600)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Spots fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setSpotsLeft(prev => {
        const random = Math.floor(Math.random() * 4) + 14
        return random
      })
    }, 45000)
    return () => clearInterval(interval)
  }, [])

  // Purchase notification rotation
  useEffect(() => {
    let idx = 0
    const showNotif = () => {
      setNotification(PURCHASE_NOTIFICATIONS[idx % PURCHASE_NOTIFICATIONS.length])
      setNotifVisible(true)
      idx++

      setTimeout(() => {
        setNotifVisible(false)
      }, 4000)
    }

    // Show first one after 8 seconds, then every 15-25 seconds
    const initialTimeout = setTimeout(() => {
      showNotif()
      const interval = setInterval(showNotif, 15000 + Math.random() * 10000)
      return () => clearInterval(interval)
    }, 8000)

    return () => clearTimeout(initialTimeout)
  }, [])

  const handlePurchase = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast({
        title: 'Ingresá tu email',
        description: 'Necesitamos tu email para enviarte el material',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      await fetch('/api/academy/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      })
    } catch { /* silent */ }

    const MP_LINK = 'https://mpago.la/PLACEHOLDER'
    window.open(MP_LINK, '_blank')

    setTimeout(() => {
      setPaid(true)
      setLoading(false)
    }, 2000)
  }

  const spotsUsed = TOTAL_SPOTS - spotsLeft
  const spotsPercent = (spotsUsed / TOTAL_SPOTS) * 100

  const faqs = [
    {
      q: '¿Necesito mostrar mi cara?',
      a: 'No. Todo el manual está diseñado para que puedas trabajar con o sin rostro. La privacidad es prioridad número uno. Aprendé a ganar dinero sin que nadie sepa quién sos.',
    },
    {
      q: '¿Funciona para Argentina?',
      a: 'Sí. Los métodos de cobro, verificación y retiro están explicados paso a paso para Argentina y también para otros países de Latam. Todo adaptado a la realidad local.',
    },
    {
      q: '¿Es para OnlyFans nomás?',
      a: 'No. Los principios sirven para OnlyFans, Fansly, y cualquier plataforma de contenido para adultos. La configuración de privacidad es universal y aplica a todas.',
    },
    {
      q: '¿Cómo recibo el material?',
      a: 'Una vez confirmado el pago, recibís el PDF completo en tu email en 5 a 10 minutos. También te llega por WhatsApp si dejás tu número. Rápido y discreto.',
    },
    {
      q: '¿Hay soporte si tengo dudas?',
      a: 'Sí. Accedés a un canal de Telegram exclusivo donde podés consultar cualquier duda sobre el manual. No estás sola en esto.',
    },
  ]

  const pad = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col overflow-x-hidden">
      {/* ═══════════════ COUNTDOWN BAR ═══════════════ */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-900/90 via-amber-800/90 to-amber-900/90 backdrop-blur-md border-b border-amber-500/20 py-2 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <Timer className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="font-cinzel text-amber-200 tracking-wider">OFERTA TERMINA EN</span>
          <div className="flex items-center gap-1">
            {[pad(timeLeft.hours), pad(timeLeft.minutes), pad(timeLeft.seconds)].map((val, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="bg-black/40 px-1.5 py-0.5 rounded font-cinzel font-bold text-amber-300 min-w-[28px] text-center">
                  {val}
                </span>
                {i < 2 && <span className="text-amber-500/60">:</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative overflow-hidden min-h-screen flex items-center justify-center pt-10">
        {/* Hero background image */}
        <div className="absolute inset-0">
          <Image
            src="/gold-hero.png"
            alt=""
            fill
            className="object-cover opacity-20"
            priority
          />
        </div>
        {/* Gold particles */}
        <GoldParticles />
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.12)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(184,134,11,0.08)_0%,_transparent_50%)]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-yellow-600/5 rounded-full blur-[100px]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(212,175,55,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
          {/* Crown */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <DynastyCrest className="w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto" />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs sm:text-sm px-4 py-1.5 mb-6 font-cinzel tracking-widest">
              <Gem className="w-3.5 h-3.5 mr-2" />
              LANZAMIENTO OFICIAL
            </Badge>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="font-cinzel-decorative font-black text-5xl sm:text-7xl md:text-8xl mb-2 tracking-wide leading-none"
          >
            <span className="gold-shimmer">DINASTY</span>
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-cinzel font-semibold text-2xl sm:text-4xl md:text-5xl tracking-[0.3em] mb-6 gold-text"
          >
            ACADEMY
          </motion.h2>

          <OrnamentalLine />

          {/* Buyer count social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 bg-amber-500/5 border border-amber-500/10 rounded-full px-4 py-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-inter text-amber-400/80 text-xs">
                <span className="font-bold">+{buyerCount}</span> creadoras ya confiaron en Dinasty Academy
              </span>
            </div>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="font-playfair text-white/70 text-lg sm:text-xl max-w-xl mx-auto mb-10 italic"
          >
            Aprendé a crear contenido de élite, proteger tu identidad y cobrar —{' '}
            <span className="text-amber-400 font-semibold not-italic">con o sin rostro</span>
          </motion.p>

          {/* Price Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="max-w-sm mx-auto mb-10"
          >
            <Card className="bg-black/60 border border-amber-500/20 backdrop-blur-md gold-border-glow">
              <CardContent className="p-6 sm:p-8 text-center">
                <p className="font-cinzel text-amber-500/70 text-xs sm:text-sm tracking-[0.25em] mb-3">
                  MÓDULO 1 — CONFIGURACIÓN DE ÉLITE
                </p>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="font-cinzel-decorative font-black text-4xl sm:text-5xl gold-text">
                    $20.000
                  </span>
                  <span className="font-cinzel text-amber-500/50 text-sm">ARS</span>
                </div>
                <p className="font-playfair text-amber-400/60 text-xs italic mb-5">
                  Manual completo + Acceso a canal exclusivo
                </p>

                {/* Spots progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-cinzel text-amber-400/70 tracking-wider">CUPOS OCUPADOS</span>
                    <span className="font-inter text-amber-400">{spotsUsed}/{TOTAL_SPOTS}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${spotsPercent}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Urgency */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 mb-5 pulse-gold">
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-cinzel font-semibold tracking-wide">
                      ¡Quedan {spotsLeft} cupos!
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowPayment(true)}
                  className="w-full h-13 text-sm sm:text-base font-cinzel font-bold tracking-wider gold-btn-glow text-black rounded-xl border-0 cursor-pointer"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  ADQUIRIR MANUAL COMPLETO
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-amber-500/30 text-xs font-cinzel tracking-wider"
          >
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> PAGO SEGURO
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> ENTREGA INMEDIATA
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> 100% PRIVADO
            </span>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-12"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-amber-500/20 text-2xl"
            >
              ↓
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ WHAT YOU'LL LEARN ═══════════════ */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.3em] mb-3">
              MÓDULO 1
            </p>
            <h2 className="font-cinzel-decorative text-2xl sm:text-4xl font-bold text-white mb-3">
              Configuración de{' '}
              <span className="gold-text">Élite</span> y Privacidad{' '}
              <span className="gold-text">Total</span>
            </h2>
            <OrnamentalLine />
            <p className="font-playfair text-white/50 text-sm sm:text-base max-w-lg mx-auto italic">
              Todo lo que necesitás para arrancar segura, protegida y cobrando desde el primer día
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {MODULE_ITEMS.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-all duration-300 h-full group">
                  <CardContent className="p-5 sm:p-6">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 opacity-80 group-hover:opacity-100 transition-opacity`}>
                      <item.icon className="w-5 h-5 text-black" />
                    </div>
                    <h3 className="font-cinzel text-white font-semibold text-sm mb-2 tracking-wide">
                      {item.title}
                    </h3>
                    <p className="font-inter text-white/45 text-xs leading-relaxed">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ COMPARISON TABLE ═══════════════ */}
      <section className="bg-[#080808] py-16 sm:py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.3em] mb-3">
              COMPARACIÓN
            </p>
            <h2 className="font-cinzel-decorative text-2xl sm:text-3xl font-bold text-white mb-3">
              Sin el manual vs <span className="gold-text">Con el manual</span>
            </h2>
            <OrnamentalLine />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-black/40 border-amber-500/10 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-3 gap-0 border-b border-amber-500/10">
                <div className="p-3 sm:p-4" />
                <div className="p-3 sm:p-4 text-center border-x border-amber-500/10">
                  <span className="font-cinzel text-white/30 text-xs tracking-wider">SIN MANUAL</span>
                </div>
                <div className="p-3 sm:p-4 text-center bg-amber-500/5">
                  <span className="font-cinzel text-amber-400 text-xs tracking-wider">CON MANUAL</span>
                </div>
              </div>
              {/* Table Rows */}
              {COMPARISON.map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-0 border-b border-amber-500/5 last:border-0">
                  <div className="p-3 sm:p-4 flex items-center">
                    <span className="font-inter text-white/60 text-xs sm:text-sm">{row.feature}</span>
                  </div>
                  <div className="p-3 sm:p-4 flex items-center justify-center border-x border-amber-500/5">
                    <span className="font-inter text-red-400/60 text-xs text-center">{row.without}</span>
                  </div>
                  <div className="p-3 sm:p-4 flex items-center justify-center bg-amber-500/[0.02]">
                    <span className="font-inter text-amber-400 text-xs text-center font-medium">{row.with_}</span>
                  </div>
                </div>
              ))}
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ SOCIAL PROOF / TESTIMONIALS ═══════════════ */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.3em] mb-3">
              TESTIMONIOS
            </p>
            <h2 className="font-cinzel-decorative text-2xl sm:text-4xl font-bold text-white mb-3">
              Lo que dicen{' '}
              <span className="gold-text">las creadoras</span>
            </h2>
            <OrnamentalLine />
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-white/[0.02] border-amber-500/[0.08] h-full">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="font-playfair text-white/60 text-sm leading-relaxed mb-4 italic">
                      &ldquo;{t.text}&rdquo;
                    </p>
                    <div className="border-t border-amber-500/10 pt-3">
                      <p className="font-cinzel text-white font-medium text-sm tracking-wide">{t.name}</p>
                      <p className="font-inter text-amber-500/40 text-xs">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ QUIÉNES SOMOS ═══════════════ */}
      <section className="bg-[#080808] py-16 sm:py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.3em] mb-3">
              NUESTRA MISIÓN
            </p>
            <h2 className="font-cinzel-decorative text-2xl sm:text-3xl font-bold text-white mb-3">
              Quiénes <span className="gold-text">somos</span>
            </h2>
            <OrnamentalLine />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-black/40 border-amber-500/15 gold-border-glow">
              <CardContent className="p-6 sm:p-8 text-center">
                <DynastyCrest className="w-20 h-20 sm:w-24 sm:h-24 mx-auto" />
                <h3 className="font-cinzel text-white font-bold text-lg mt-3 mb-4 tracking-wider">
                  DINASTY ACADEMY
                </h3>
                <p className="font-playfair text-white/60 text-sm sm:text-base leading-relaxed mb-4 italic">
                  Nacimos de la necesidad real de creadoras que querían trabajar con seguridad y privacidad,
                  sin depender de nadie. Sabemos lo que es empezar con dudas, miedo a ser descubierta y
                  sin saber cómo cobrar. Por eso armamos este manual: para que ninguna mujer tenga que
                  pasar por eso sola.
                </p>
                <p className="font-inter text-white/40 text-xs leading-relaxed">
                  Dinasty Academy no es solo un curso. Es una comunidad de creadoras que eligieron
                  tomar el control de su negocio, su privacidad y su futuro. Con o sin rostro,
                  vos decidís cómo mostrarte al mundo.
                </p>
                <div className="mt-6 flex items-center justify-center gap-6 text-amber-500/30">
                  <div className="text-center">
                    <p className="font-cinzel-decorative text-2xl font-bold text-amber-400">{buyerCount}+</p>
                    <p className="font-inter text-[10px] tracking-wider mt-1">CREADORAS</p>
                  </div>
                  <div className="w-px h-10 bg-amber-500/10" />
                  <div className="text-center">
                    <p className="font-cinzel-decorative text-2xl font-bold text-amber-400">6</p>
                    <p className="font-inter text-[10px] tracking-wider mt-1">MÓDULOS</p>
                  </div>
                  <div className="w-px h-10 bg-amber-500/10" />
                  <div className="text-center">
                    <p className="font-cinzel-decorative text-2xl font-bold text-amber-400">24/7</p>
                    <p className="font-inter text-[10px] tracking-wider mt-1">SOPORTE</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ VALUE STACK ═══════════════ */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.3em] mb-3">
              TODO LO QUE INCLUYE
            </p>
            <h2 className="font-cinzel-decorative text-2xl sm:text-3xl font-bold text-white">
              Tu inversión <span className="gold-text">incluye</span>
            </h2>
            <OrnamentalLine />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-black/40 border-amber-500/20 gold-border-glow">
              <CardContent className="p-6 sm:p-8">
                <ul className="space-y-4">
                  {[
                    'Manual PDF completo — 6 módulos de configuración de élite',
                    'Guía paso a paso de Geoblocking + Bloqueo de usuarios',
                    'Registro y Verificación sin errores',
                    'Métodos de retiro seguros y privados para Argentina y Latam',
                    'Acceso al canal exclusivo de Telegram',
                    'Actualizaciones gratuitas del manual',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                      <span className="font-inter text-white/70 text-sm leading-relaxed">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="gold-divider my-6" />

                <div className="text-center">
                  <p className="font-inter text-white/30 text-xs line-through mb-1">
                    Valor real: $50.000 ARS
                  </p>
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="font-cinzel-decorative font-black text-3xl sm:text-4xl gold-text">
                      $20.000
                    </span>
                    <span className="font-cinzel text-amber-500/50 text-sm">ARS</span>
                  </div>
                  <p className="font-playfair text-amber-400/50 text-xs italic">
                    Precio de lanzamiento — Cupos limitados
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section className="bg-[#080808] py-16 sm:py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.3em] mb-3">
              DUDAS
            </p>
            <h2 className="font-cinzel-decorative text-2xl sm:text-3xl font-bold text-white">
              Preguntas <span className="gold-text">Frecuentes</span>
            </h2>
            <OrnamentalLine />
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full text-left p-4 flex items-center justify-between gap-3"
                  >
                    <span className="font-cinzel text-white text-sm font-medium tracking-wide">
                      {faq.q}
                    </span>
                    {expandedFaq === i ? (
                      <ChevronUp className="w-4 h-4 text-amber-500/40 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-amber-500/40 shrink-0" />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 font-inter text-white/50 text-sm leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-md mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <DynastyCrest className="w-20 h-20 sm:w-24 sm:h-24 mx-auto" />

            <h2 className="font-cinzel-decorative text-2xl sm:text-3xl font-bold text-white mb-3 mt-4">
              Convertite en{' '}
              <span className="gold-text">Creadora de Élite</span>
            </h2>
            <OrnamentalLine />
            <p className="font-playfair text-white/50 text-sm mb-8 italic">
              Dejá de perder tiempo y dinero. Arrancá hoy con la configuración correcta.
            </p>

            <Card className="bg-black/60 border-amber-500/20 backdrop-blur-md gold-border-glow mb-6">
              <CardContent className="p-6 sm:p-8">
                <p className="font-cinzel text-amber-500/70 text-xs tracking-[0.25em] mb-3">
                  MÓDULO 1 — CONFIGURACIÓN DE ÉLITE
                </p>
                <div className="flex items-baseline justify-center gap-2 mb-4">
                  <span className="font-cinzel-decorative font-black text-4xl gold-text">
                    $20.000
                  </span>
                  <span className="font-cinzel text-amber-500/50 text-sm">ARS</span>
                </div>
                {/* Spots progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-cinzel text-amber-400/70 tracking-wider">CUPOS</span>
                    <span className="font-inter text-amber-400">{spotsUsed}/{TOTAL_SPOTS}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 rounded-full"
                      style={{ width: `${spotsPercent}%` }}
                    />
                  </div>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 mb-5 pulse-gold">
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-cinzel font-semibold tracking-wide">
                      ¡Quedan {spotsLeft} cupos!
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowPayment(true)}
                  className="w-full h-13 text-sm sm:text-base font-cinzel font-bold tracking-wider gold-btn-glow text-black rounded-xl border-0 cursor-pointer"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  ADQUIRIR MANUAL COMPLETO
                </Button>
              </CardContent>
            </Card>

            <p className="font-cinzel text-white/20 text-[10px] tracking-widest">
              PAGO SEGURO POR MERCADOPAGO · ENTREGA INMEDIATA · 100% PRIVADO
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="mt-auto bg-[#050505] border-t border-amber-500/5 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-cinzel text-amber-500/20 text-xs tracking-[0.2em]">
            © 2026 DINASTY ACADEMY · TODOS LOS DERECHOS RESERVADOS
          </p>
          <p className="font-inter text-white/10 text-[10px] mt-2">
            Este producto es para mayores de 18 años
          </p>
        </div>
      </footer>

      {/* ═══════════════ STICKY CTA (MOBILE) ═══════════════ */}
      <AnimatePresence>
        {showStickyCta && !showPayment && !paid && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-[#0a0a0a]/95 backdrop-blur-md border-t border-amber-500/20 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-cinzel text-white text-xs tracking-wider truncate">
                  MÓDULO 1 — <span className="gold-text">$20.000</span>
                </p>
                <p className="font-inter text-amber-400/60 text-[10px]">
                  ¡Quedan {spotsLeft} cupos!
                </p>
              </div>
              <Button
                onClick={() => setShowPayment(true)}
                className="gold-btn-glow text-black font-cinzel font-bold tracking-wider text-xs px-4 h-10 rounded-lg border-0 shrink-0 cursor-pointer"
              >
                <Crown className="w-4 h-4 mr-1" />
                ADQUIRIR
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ PURCHASE NOTIFICATION TOAST ═══════════════ */}
      <AnimatePresence>
        {notifVisible && notification && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="fixed bottom-20 sm:bottom-6 left-4 z-40 bg-[#0a0a0a]/95 border border-amber-500/20 rounded-xl p-3 max-w-[260px] shadow-xl shadow-amber-500/5 backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 text-black" />
              </div>
              <div className="min-w-0">
                <p className="font-inter text-white text-xs font-medium truncate">
                  {notification.name}
                </p>
                <p className="font-inter text-amber-400/70 text-[10px]">
                  {notification.city} · {notification.time}
                </p>
                <p className="font-inter text-white/40 text-[10px] mt-0.5">
                  Adquirió el Manual Completo
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ PAYMENT MODAL ═══════════════ */}
      <AnimatePresence>
        {showPayment && !paid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPayment(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0a0a] border border-amber-500/20 rounded-2xl p-6 sm:p-8 max-w-sm w-full gold-border-glow"
            >
              <div className="text-center mb-6">
                <DynastyCrest className="w-20 h-20 sm:w-24 sm:h-24 mx-auto" />
                <h3 className="font-cinzel-decorative text-white font-bold text-lg mt-2">
                  Finalizar Compra
                </h3>
                <p className="font-cinzel text-amber-500/50 text-xs tracking-wider mt-1">
                  Manual Completo — $20.000 ARS
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="font-cinzel text-amber-500/50 text-xs tracking-wider mb-1.5 block">
                    EMAIL *
                  </label>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-11"
                  />
                </div>
                <div>
                  <label className="font-cinzel text-amber-500/50 text-xs tracking-wider mb-1.5 block">
                    WHATSAPP (OPCIONAL)
                  </label>
                  <Input
                    type="tel"
                    placeholder="+54 11 1234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-11"
                  />
                  <p className="font-inter text-white/20 text-[10px] mt-1">
                    Para recibir el material también por WhatsApp
                  </p>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-cinzel font-semibold tracking-wide">
                      ENTREGA EN 5 A 10 MINUTOS
                    </span>
                  </div>
                  <p className="font-inter text-white/30 text-[10px]">
                    Una vez confirmado el pago, recibís el PDF completo en tu email y/o WhatsApp
                  </p>
                </div>

                <Button
                  onClick={handlePurchase}
                  disabled={loading}
                  className="w-full h-12 text-sm font-cinzel font-bold tracking-wider gold-btn-glow text-black rounded-xl border-0 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5 mr-2" />
                      PAGAR CON MERCADOPAGO
                    </>
                  )}
                </Button>

                <button
                  onClick={() => setShowPayment(false)}
                  className="w-full font-cinzel text-white/30 text-xs hover:text-white/50 transition-colors py-2 tracking-wider"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ PAYMENT SUCCESS / THANK YOU ═══════════════ */}
      <AnimatePresence>
        {paid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0a] border border-amber-500/20 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center gold-border-glow"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="font-cinzel-decorative text-white font-bold text-xl mb-2">
                ¡Gracias por tu compra!
              </h3>
              <p className="font-playfair text-white/60 text-sm mb-4 italic">
                Tu material llega en{' '}
                <span className="text-amber-400 font-semibold not-italic">5 a 10 minutos</span>{' '}
                a tu email y WhatsApp.
              </p>

              {/* Thank you details */}
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 mb-5 text-left space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-black" />
                  </div>
                  <span className="font-inter text-white/60 text-xs">PDF completo del Módulo 1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-black" />
                  </div>
                  <span className="font-inter text-white/60 text-xs">Acceso al canal de Telegram</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-black" />
                  </div>
                  <span className="font-inter text-white/60 text-xs">Actualizaciones gratuitas</span>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-3 mb-5">
                <p className="font-inter text-white/30 text-xs">
                  Revisá también la carpeta de spam o correo no deseado.
                </p>
              </div>
              <Button
                onClick={() => {
                  setPaid(false)
                  setShowPayment(false)
                }}
                className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-black font-cinzel font-bold tracking-wider border-0"
              >
                ENTENDIDO
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ FLOATING WHATSAPP ═══════════════ */}
      <a
        href="https://wa.me/5492246449032?text=Hola!%20Quiero%20info%20sobre%20Dinasty%20Academy"
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed right-6 z-40 w-14 h-14 bg-amber-600 hover:bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20 transition-all ${showStickyCta && !showPayment ? 'bottom-20 sm:bottom-6' : 'bottom-6'}`}
      >
        <MessageCircle className="w-6 h-6 text-black" />
      </a>
    </div>
  )
}
