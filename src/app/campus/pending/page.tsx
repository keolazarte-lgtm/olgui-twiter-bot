'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Clock, Crown, Loader2, RefreshCw, ArrowLeft, DollarSign, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

export default function PendingPage() {
  const [loading, setLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const router = useRouter()
  const { toast } = useToast()

  const handleRetryPayment = async () => {
    setLoading(true)
    try {
      const mpRes = await fetch('/api/mp/create-preference', { method: 'POST' })
      const mpData = await mpRes.json()

      if (mpData.initPoint) {
        window.location.href = mpData.initPoint
        return
      }
    } catch (error) {
      console.error('Retry payment error:', error)
    }

    toast({
      title: 'Error al crear el link de pago',
      description: 'Intentá de nuevo en unos minutos',
      variant: 'destructive',
    })
    setLoading(false)
    setRetryCount(prev => prev + 1)
  }

  const handleCheckStatus = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()

      if (data.user?.active === 1) {
        toast({
          title: '¡Cuenta activada!',
          description: 'Ya podés acceder al campus',
        })
        router.push('/campus')
        return
      }

      toast({
        title: 'Aún esperando activación',
        description: 'Escribinos por WhatsApp con tu comprobante de pago para que activemos tu cuenta.',
      })
    } catch (error) {
      console.error('Check status error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.08)_0%,_transparent_60%)]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-amber-500/50 hover:text-amber-400 transition-colors mb-6 font-cinzel text-xs tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          VOLVER AL INICIO
        </button>

        <Card className="bg-black/60 border-amber-500/20 backdrop-blur-md gold-border-glow">
          <CardContent className="p-6 sm:p-8 text-center">
            <Image
              src="/dinasty-crest-v3.png"
              alt="Dinasty Academy"
              width={64}
              height={64}
              className="mx-auto mb-4"
              priority
            />

            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-amber-400" />
            </div>

            <h1 className="font-cinzel-decorative text-white font-bold text-xl mb-2">
              Esperando <span className="gold-text">Activación</span>
            </h1>

            <p className="font-inter text-white/50 text-sm mb-6 leading-relaxed">
              Tu cuenta está registrada. Para activarla, escribinos por WhatsApp con tu comprobante de pago y te damos acceso al campus en minutos.
            </p>

            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-amber-400 text-xs mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-cinzel font-semibold tracking-wider">TIEMPO DE ACTIVACIÓN</span>
              </div>
              <p className="font-inter text-white/40 text-xs">
                Una vez que nos escribas por WhatsApp con el comprobante, activamos tu cuenta en pocos minutos.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleCheckStatus}
                className="w-full h-11 text-sm font-cinzel font-bold tracking-wider gold-btn-glow text-black rounded-xl border-0 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                VERIFICAR ESTADO DEL PAGO
              </Button>

              <a
                href="https://api.whatsapp.com/send?phone=5492246449032&text=Hola!%20Ya%20realic%C3%A9%20el%20pago%20del%20curso%20de%20Dinasty%20Academy.%20Mi%20email%20es%3A%20"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 flex items-center justify-center gap-2 text-sm font-cinzel font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-xl transition-colors no-underline"
              >
                <MessageCircle className="w-4 h-4" />
                AVISAR POR WHATSAPP
              </a>

              <Button
                onClick={handleRetryPayment}
                disabled={loading}
                className="w-full h-11 text-sm font-cinzel font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <DollarSign className="w-4 h-4 mr-2" />
                )}
                REINTENTAR PAGO
              </Button>

              <p className="font-inter text-white/30 text-[10px] leading-relaxed text-center px-4">
                Si ya pagaste y tu cuenta no se activa en 15 minutos, escribinos por WhatsApp con tu email y te lo activamos enseguida.
              </p>

              <Button
                onClick={() => {
                  document.cookie = 'da_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
                  router.push('/login')
                }}
                variant="ghost"
                className="w-full font-cinzel text-white/20 text-xs hover:text-white/40 tracking-wider"
              >
                CERRAR SESIÓN
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
