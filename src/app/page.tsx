'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Eye, Lock, DollarSign, Brain, UserCheck, ArrowRight,
  Check, AlertTriangle, Clock, Star, Zap, ChevronDown, ChevronUp,
  MessageCircle, Send, Loader2, Crown, Sparkles, Users
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
    desc: 'Bloqueo geográfico total — Invisible en tu país o provincia. Nadie te encuentra.',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    icon: UserCheck,
    title: 'Bloqueo de Usuarios Específicos',
    desc: 'Control total sobre quién puede y quién NO puede ver tu contenido.',
    color: 'from-violet-500 to-purple-400',
  },
  {
    icon: Lock,
    title: 'Registro y Verificación Paso a Paso',
    desc: 'Guía técnica completa para crear tu cuenta y verificar sin errores.',
    color: 'from-emerald-500 to-green-400',
  },
  {
    icon: DollarSign,
    title: 'Opciones de Retiro Seguras y Privadas',
    desc: 'Los métodos más seguros para cobrar sin exponer tu identidad.',
    color: 'from-amber-500 to-yellow-400',
  },
  {
    icon: ArrowRight,
    title: 'Efectivo en la Mano',
    desc: 'El paso a paso para tener tu dinero disponible cuando quieras.',
    color: 'from-rose-500 to-pink-400',
  },
  {
    icon: Brain,
    title: 'Mentalidad de Negocio y Marca Personal',
    desc: 'Con o sin rostro — aprendé a construir una marca que venda.',
    color: 'from-fuchsia-500 to-purple-400',
  },
]

const TESTIMONIALS = [
  {
    name: 'Luna M.',
    text: 'No tenía idea de cómo proteger mi identidad. Con este manual me sentí segura desde el día 1.',
    role: 'Creadora OF',
  },
  {
    name: 'Valentina R.',
    text: 'El geoblocking solo ya vale lo que cuesta todo el curso. Nadie de mi ciudad me encuentra.',
    role: 'Creadora Fansly',
  },
  {
    name: 'Camila S.',
    text: 'Pensé que era imposible cobrar sin que nadie supiera quién soy. Me equivoqué.',
    role: 'Creadora OF',
  },
]

// ─── Main Page ───────────────────────────────────────────────
export default function DinastiaAcademy() {
  const [spotsLeft, setSpotsLeft] = useState(23)
  const [showPayment, setShowPayment] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const { toast } = useToast()

  // Countdown timer - reset "spots" periodically for urgency
  useEffect(() => {
    const interval = setInterval(() => {
      setSpotsLeft(prev => {
        const random = Math.floor(Math.random() * 3) + 18
        return random
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const handlePurchase = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast({ title: 'Ingresá tu email', description: 'Necesitamos tu email para enviarte el material', variant: 'destructive' })
      return
    }

    setLoading(true)

    // Register the lead in our database
    try {
      await fetch('/api/academy/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      })
    } catch { /* silent */ }

    // Open MercadoPago payment link
    // Olgui creates this link in her MP account and we put it here
    const MP_LINK = 'https://mpago.la/PLACEHOLDER' // TODO: Replace with real MP link

    // For now, simulate the payment flow
    window.open(MP_LINK, '_blank')

    // Show confirmation message
    setTimeout(() => {
      setPaid(true)
      setLoading(false)
    }, 2000)
  }

  const faqs = [
    {
      q: '¿Necesito mostrar mi cara?',
      a: 'No. Todo el manual está diseñado para que puedas trabajar con o sin rostro. La privacidad es prioridad número uno.',
    },
    {
      q: '¿Funciona para Argentina?',
      a: 'Sí. Los métodos de cobro, verificación y retiro están explicados paso a paso para Argentina y también para otros países de Latam.',
    },
    {
      q: '¿Es para OnlyFans nomás?',
      a: 'No. Los principios sirven para OnlyFans, Fansly, y cualquier plataforma de contenido para adultos. La configuración de privacidad es universal.',
    },
    {
      q: '¿Cómo recibo el material?',
      a: 'Una vez confirmado el pago, recibís el PDF completo en tu email en 5 a 10 minutos. También te llega por WhatsApp si dejás tu número.',
    },
    {
      q: '¿Hay soporte si tengo dudas?',
      a: 'Sí. Accedés a un canal de Telegram exclusivo donde podés consultar cualquier duda sobre el manual.',
    },
  ]

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-rose-900/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-rose-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-16 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/30 text-sm px-4 py-1.5 mb-6">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              LANZAMIENTO OFICIAL
            </Badge>
          </motion.div>

          {/* Logo / Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black text-white mb-3 tracking-tight"
          >
            DINASTÍA
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent"> ACADEMY</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/60 text-lg sm:text-xl max-w-xl mx-auto mb-8"
          >
            Aprendé a crear contenido de élite, proteger tu identidad y cobrar — <span className="text-white font-semibold">con o sin rostro</span>
          </motion.p>

          {/* Price Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-sm mx-auto mb-8"
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-rose-500/10 border-purple-500/20 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <p className="text-white/50 text-sm mb-1">MÓDULO 1 — CONFIGURACIÓN DE ÉLITE</p>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-4xl sm:text-5xl font-black text-white">$20.000</span>
                  <span className="text-white/40 text-sm">ARS</span>
                </div>
                <p className="text-purple-300 text-xs mb-4">Manual completo + Acceso a canal exclusivo</p>

                {/* Urgency */}
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 mb-4">
                  <div className="flex items-center justify-center gap-2 text-rose-300 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold">¡Quedan {spotsLeft} cupos!</span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowPayment(true)}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white border-0 rounded-xl shadow-lg shadow-purple-500/20"
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
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4 text-white/30 text-xs"
          >
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Pago seguro</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Entrega inmediata</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> 100% privado</span>
          </motion.div>
        </div>
      </section>

      {/* What You'll Learn */}
      <section className="bg-zinc-950 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Módulo 1: <span className="bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent">Configuración de Élite y Privacidad Total</span>
            </h2>
            <p className="text-white/50 text-sm sm:text-base max-w-lg mx-auto">
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
                <Card className="bg-white/[0.03] border-white/[0.06] hover:border-purple-500/20 transition-all h-full">
                  <CardContent className="p-5">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 opacity-80`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-white/50 text-xs leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Lo que dicen <span className="bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent">las creadoras</span>
            </h2>
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
                <Card className="bg-white/[0.03] border-white/[0.06] h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                    <div>
                      <p className="text-white font-medium text-sm">{t.name}</p>
                      <p className="text-white/40 text-xs">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-zinc-950 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Preguntas Frecuentes</h2>
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
                <Card className="bg-white/[0.03] border-white/[0.06]">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full text-left p-4 flex items-center justify-between gap-3"
                  >
                    <span className="text-white text-sm font-medium">{faq.q}</span>
                    {expandedFaq === i ? (
                      <ChevronUp className="w-4 h-4 text-white/40 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
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
                        <div className="px-4 pb-4 text-white/60 text-sm leading-relaxed">
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

      {/* Final CTA */}
      <section className="py-16 px-4">
        <div className="max-w-md mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Convertite en <span className="bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent">Creadora de Élite</span>
            </h2>
            <p className="text-white/50 text-sm mb-8">
              Dejá de perder tiempo y dinero. Arrancá hoy con la configuración correcta.
            </p>

            <Card className="bg-gradient-to-br from-purple-500/10 to-rose-500/10 border-purple-500/20 mb-6">
              <CardContent className="p-6">
                <div className="flex items-baseline justify-center gap-2 mb-4">
                  <span className="text-4xl font-black text-white">$20.000</span>
                  <span className="text-white/40 text-sm">ARS</span>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 mb-4">
                  <div className="flex items-center justify-center gap-2 text-rose-300 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold">¡Quedan {spotsLeft} cupos!</span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowPayment(true)}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white border-0 rounded-xl shadow-lg shadow-purple-500/20"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  ADQUIRIR MANUAL COMPLETO
                </Button>
              </CardContent>
            </Card>

            <p className="text-white/30 text-xs">
              Pago seguro por MercadoPago · Entrega inmediata · 100% privado
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-zinc-950 border-t border-white/5 py-6 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-white/20 text-xs">
            © 2026 Dinastía Academy · Todos los derechos reservados
          </p>
          <p className="text-white/10 text-[10px] mt-1">
            Este producto es para mayores de 18 años
          </p>
        </div>
      </footer>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && !paid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPayment(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full"
            >
              <h3 className="text-white font-bold text-lg mb-1 text-center">Finalizar Compra</h3>
              <p className="text-white/50 text-sm text-center mb-6">Manual Completo — $20.000 ARS</p>

              <div className="space-y-4">
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Email *</label>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">WhatsApp (opcional)</label>
                  <Input
                    type="tel"
                    placeholder="+54 11 1234-5678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500"
                  />
                  <p className="text-white/30 text-[10px] mt-1">Para recibir el material también por WhatsApp</p>
                </div>

                <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-purple-300 text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-medium">Entrega en 5 a 10 minutos</span>
                  </div>
                  <p className="text-white/40 text-[10px]">
                    Una vez confirmado el pago, recibís el PDF completo en tu email y/o WhatsApp
                  </p>
                </div>

                <Button
                  onClick={handlePurchase}
                  disabled={loading}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white border-0 rounded-xl"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5 mr-2" />
                      Pagar con MercadoPago
                    </>
                  )}
                </Button>

                <button
                  onClick={() => setShowPayment(false)}
                  className="w-full text-white/40 text-xs hover:text-white/60 transition-colors py-2"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Success Modal */}
      <AnimatePresence>
        {paid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">¡Pago en proceso!</h3>
              <p className="text-white/60 text-sm mb-4">
                Una vez que se confirme el pago, tu material llega en <span className="text-emerald-400 font-semibold">5 a 10 minutos</span> a tu email y WhatsApp.
              </p>
              <div className="bg-white/5 rounded-lg p-3 mb-4">
                <p className="text-white/40 text-xs">Revisá también la carpeta de spam o correo no deseado.</p>
              </div>
              <Button
                onClick={() => { setPaid(false); setShowPayment(false) }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              >
                Entendido
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/?text=Hola!%20Quiero%20info%20sobre%20Dinastía%20Academy"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-colors"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </a>
    </div>
  )
}
