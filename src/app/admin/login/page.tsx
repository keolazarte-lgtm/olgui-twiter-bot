'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Crown, Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

    if (!password) {
      toast({ title: 'Ingresá la contraseña', variant: 'destructive' })
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: data.error || 'Error al iniciar sesión', variant: 'destructive' })
        setLoading(false)
        return
      }

      // Check if the user is admin
      if (data.user?.role !== 'admin') {
        toast({
          title: 'Acceso denegado',
          description: 'Solo los administradores pueden acceder a este panel',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // Redirect to admin dashboard
      router.push('/admin/dashboard')
    } catch (error) {
      console.error('Admin login error:', error)
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
              <div className="flex items-center justify-center gap-2 mt-3">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="font-cinzel text-amber-400/80 text-sm tracking-wider">PANEL DE ADMINISTRACIÓN</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="font-cinzel text-amber-500/50 text-xs tracking-wider mb-1.5 block">
                  EMAIL DE ADMINISTRADOR
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/30" />
                  <Input
                    type="email"
                    placeholder="admin@dinastyacademy.com"
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
                  CONTRASEÑA
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/30" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Contraseña de administrador"
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

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-sm font-cinzel font-bold tracking-wider gold-btn-glow text-black rounded-xl border-0 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Crown className="w-5 h-5 mr-2" />
                    INGRESAR AL PANEL
                  </>
                )}
              </Button>
            </form>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 mt-6 text-amber-500/20 text-[10px] font-cinzel tracking-wider">
              <span>ACCESO RESTRINGIDO</span>
              <span>·</span>
              <span>SOLO ADMINISTRADORES</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
