'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Mail, Lock, User, Phone, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !email.includes('@')) {
      toast({ title: 'Ingresá un email válido', variant: 'destructive' })
      return
    }

    if (!password || password.length < 6) {
      toast({ title: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' })
      return
    }

    if (mode === 'register' && !name.trim()) {
      toast({ title: 'Ingresá tu nombre', variant: 'destructive' })
      return
    }

    setLoading(true)

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login'
        ? { email, password }
        : { email, password, name, phone }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: data.error || 'Error', variant: 'destructive' })
        setLoading(false)
        return
      }

      // If register, create MP preference and redirect to payment
      if (mode === 'register') {
        try {
          const mpRes = await fetch('/api/mp/create-preference', { method: 'POST' })
          const mpData = await mpRes.json()

          if (mpData.initPoint) {
            // Redirect to MP payment
            window.location.href = mpData.initPoint
            return
          }
        } catch {
          // Fallback to campus
        }
      }

      // For login, redirect to campus
      router.push('/campus')
    } catch (error) {
      console.error('Auth error:', error)
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setLoading(false)
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
        {/* Back to home */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-amber-500/50 hover:text-amber-400 transition-colors mb-6 font-cinzel text-xs tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          VOLVER AL INICIO
        </button>

        <Card className="bg-black/60 border-amber-500/20 backdrop-blur-md gold-border-glow">
          <CardContent className="p-6 sm:p-8">
            {/* Logo */}
            <div className="text-center mb-6">
              <Image
                src="/dinasty-crest-v3.png"
                alt="Dinasty Academy"
                width={80}
                height={80}
                className="mx-auto mb-3"
                priority
              />
              <h1 className="font-cinzel-decorative text-2xl font-bold text-white">
                <span className="gold-text">DINASTY</span>
              </h1>
              <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.3em] mt-1">ACADEMY</p>
            </div>

            {/* Mode toggle */}
            <div className="flex bg-white/5 rounded-lg p-1 mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 px-4 rounded-md font-cinzel text-xs tracking-wider transition-all ${
                  mode === 'login'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-white/30 hover:text-white/50'
                }`}
              >
                INGRESAR
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2 px-4 rounded-md font-cinzel text-xs tracking-wider transition-all ${
                  mode === 'register'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-white/30 hover:text-white/50'
                }`}
              >
                CREAR CUENTA
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name (register only) */}
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="font-cinzel text-amber-500/50 text-xs tracking-wider mb-1.5 block">
                      NOMBRE *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/30" />
                      <Input
                        type="text"
                        placeholder="Tu nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-11 pl-10"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div>
                <label className="font-cinzel text-amber-500/50 text-xs tracking-wider mb-1.5 block">
                  EMAIL *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/30" />
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-11 pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="font-cinzel text-amber-500/50 text-xs tracking-wider mb-1.5 block">
                  CONTRASEÑA *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/30" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-11 pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500/30 hover:text-amber-500/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Phone (register only) */}
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="font-cinzel text-amber-500/50 text-xs tracking-wider mb-1.5 block">
                      WHATSAPP (OPCIONAL)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/30" />
                      <Input
                        type="tel"
                        placeholder="+54 11 1234-5678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-11 pl-10"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-sm font-cinzel font-bold tracking-wider gold-btn-glow text-black rounded-xl border-0 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <Crown className="w-5 h-5 mr-2" />
                    INGRESAR AL CAMPUS
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5 mr-2" />
                    CREAR CUENTA Y PAGAR
                  </>
                )}
              </Button>
            </form>

            {mode === 'register' && (
              <p className="font-inter text-white/20 text-[10px] text-center mt-3">
                Al registrarte serás redirigida a MercadoPago para completar el pago de $15.000 ARS
              </p>
            )}

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 mt-6 text-amber-500/20 text-[10px] font-cinzel tracking-wider">
              <span>PAGO SEGURO</span>
              <span>·</span>
              <span>100% PRIVADO</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
