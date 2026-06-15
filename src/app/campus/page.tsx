'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Shield, UserCheck, Lock, DollarSign, Brain, Banknote,
  Crown, LogOut, Loader2, BookOpen, CheckCircle2, Circle,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

const ICON_MAP: Record<string, React.ElementType> = {
  Shield, UserCheck, Lock, DollarSign, Banknote, Brain,
}

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
  const { toast } = useToast()
  const router = useRouter()

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

        // If inactive, redirect to pending
        if (userData.user.active === 0) {
          router.push('/campus/pending')
          return
        }

        // Load modules
        const modRes = await fetch('/api/modules')
        const modData = await modRes.json()
        setModules(modData.modules || [])

        // Load progress
        const progRes = await fetch('/api/progress')
        const progData = await progRes.json()
        setProgress(progData.progress || [])
      } catch (error) {
        console.error('Campus load error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handleLogout = async () => {
    document.cookie = 'da_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
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

  return (
    <div className="min-h-screen bg-[#050505]">
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
            Accedé a todos los módulos de configuración de élite. Marcá las lecciones como completadas a medida que avances.
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

        {/* Modules grid */}
        <div className="space-y-4">
          {modules.map((mod, i) => {
            const IconComp = ICON_MAP[mod.icon || ''] || Shield
            const prog = getModuleProgress(mod.id)
            const completedLessons = mod.lessons.filter(l =>
              progress.some(p => p.lessonId === l.id && p.completed)
            ).length

            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <Card
                  className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-all duration-300 cursor-pointer group"
                  onClick={() => router.push(`/campus/modulo/${mod.id}`)}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-600 to-yellow-500 flex items-center justify-center shrink-0">
                        <IconComp className="w-6 h-6 text-black" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-cinzel text-white font-semibold text-sm sm:text-base tracking-wide">
                            Módulo {mod.orderNum}: {mod.title}
                          </h3>
                          <ChevronRight className="w-5 h-5 text-amber-500/20 group-hover:text-amber-400 transition-colors shrink-0" />
                        </div>
                        <p className="font-inter text-white/35 text-xs leading-relaxed mb-3 line-clamp-2">
                          {mod.description}
                        </p>

                        {/* Progress bar */}
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
              onClick={() => router.push('/admin')}
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
          <p className="font-cinzel text-amber-500/20 text-xs tracking-[0.2em]">
            © 2026 DINASTY ACADEMY · TODOS LOS DERECHOS RESERVADOS
          </p>
        </div>
      </footer>
    </div>
  )
}
