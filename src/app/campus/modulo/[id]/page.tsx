'use client'

import { useState, useEffect, use } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, UserCheck, Lock, DollarSign, Brain, Banknote,
  ArrowLeft, ChevronRight, CheckCircle2, Circle, Loader2,
  BookOpen, Crown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useContentProtection } from '@/hooks/use-content-protection'
import { useRouter } from 'next/navigation'

const ICON_MAP: Record<string, React.ElementType> = {
  Shield, UserCheck, Lock, DollarSign, Banknote, Brain,
}

interface Lesson {
  id: string
  moduleId: string
  title: string
  contentType: string
  content: string | null
  orderNum: number
}

interface ModuleData {
  id: string
  title: string
  description: string | null
  orderNum: number
  icon: string | null
  lessons: Lesson[]
}

interface Progress {
  lessonId: string
  completed: boolean
  completedAt: string | null
}

export default function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [moduleData, setModuleData] = useState<ModuleData | null>(null)
  const [allModules, setAllModules] = useState<ModuleData[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingProgress, setTogglingProgress] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Activate content protection (blocks copy, right-click, shortcuts)
  useContentProtection()

  useEffect(() => {
    async function load() {
      try {
        // Load modules
        const modRes = await fetch('/api/modules')
        const modData = await modRes.json()
        const modules: ModuleData[] = modData.modules || []
        setAllModules(modules)

        const currentModule = modules.find((m: ModuleData) => m.id === id)
        if (currentModule) {
          setModuleData(currentModule)
          if (currentModule.lessons.length > 0) {
            setSelectedLesson(currentModule.lessons[0])
          }
        }

        // Load progress
        const progRes = await fetch('/api/progress')
        const progData = await progRes.json()
        setProgress(progData.progress || [])
      } catch (error) {
        console.error('Module load error:', error)
        router.push('/campus')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  const isLessonCompleted = (lessonId: string) => {
    return progress.some(p => p.lessonId === lessonId && p.completed)
  }

  const handleToggleProgress = async (lessonId: string) => {
    setTogglingProgress(true)
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      })
      const data = await res.json()
      if (data.success) {
        setProgress(data.progress)
      }
    } catch (error) {
      console.error('Progress toggle error:', error)
    } finally {
      setTogglingProgress(false)
    }
  }

  const getModuleProgress = (mod: ModuleData) => {
    if (mod.lessons.length === 0) return 0
    const completed = mod.lessons.filter(l => isLessonCompleted(l.id)).length
    return Math.round((completed / mod.lessons.length) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  if (!moduleData) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <p className="font-cinzel text-amber-400/60 text-xs tracking-wider">Módulo no encontrado</p>
      </div>
    )
  }

  const IconComp = ICON_MAP[moduleData.icon || ''] || Shield
  const completedCount = moduleData.lessons.filter(l => isLessonCompleted(l.id)).length
  const moduleProgress = getModuleProgress(moduleData)

  // Find prev/next modules
  const currentIdx = allModules.findIndex(m => m.id === id)
  const prevModule = currentIdx > 0 ? allModules[currentIdx - 1] : null
  const nextModule = currentIdx < allModules.length - 1 ? allModules[currentIdx + 1] : null

  return (
    <div className="min-h-screen bg-[#050505] content-protected">
      {/* ─── HEADER ─── */}
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
              <IconComp className="w-4 h-4 text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="font-cinzel text-white font-semibold text-xs sm:text-sm tracking-wide truncate">
                Módulo {moduleData.orderNum}
              </h1>
              <p className="font-inter text-amber-400/40 text-[10px] truncate">
                {completedCount}/{moduleData.lessons.length} lecciones completadas
              </p>
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

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── SIDEBAR: Lessons List ─── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-80 shrink-0"
          >
            <Card className="bg-white/[0.02] border-amber-500/[0.08]">
              <CardContent className="p-4">
                <h2 className="font-cinzel text-white font-semibold text-sm mb-1 tracking-wide">
                  {moduleData.title}
                </h2>
                <p className="font-inter text-white/30 text-xs mb-4">
                  {moduleData.description}
                </p>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-cinzel text-amber-400/60 tracking-wider">PROGRESO</span>
                    <span className="font-inter text-amber-400">{moduleProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${moduleProgress}%` }}
                    />
                  </div>
                </div>

                {/* Lessons list */}
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {moduleData.lessons.map((lesson) => {
                    const completed = isLessonCompleted(lesson.id)
                    const isActive = selectedLesson?.id === lesson.id

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLesson(lesson)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-start gap-3 ${
                          isActive
                            ? 'bg-amber-500/10 border border-amber-500/20'
                            : 'hover:bg-white/[0.02] border border-transparent'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {completed ? (
                            <CheckCircle2 className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-white/15" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-inter text-xs leading-relaxed ${
                            isActive ? 'text-white' : completed ? 'text-amber-400/60' : 'text-white/50'
                          }`}>
                            {lesson.title}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ─── MAIN: Lesson Content ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            {selectedLesson ? (
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardContent className="p-6 sm:p-8">
                  {/* Lesson header */}
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="min-w-0">
                      <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mb-1">
                        LECCIÓN {selectedLesson.orderNum}
                      </p>
                      <h2 className="font-cinzel text-white font-semibold text-lg sm:text-xl tracking-wide">
                        {selectedLesson.title}
                      </h2>
                    </div>
                    <Button
                      onClick={() => handleToggleProgress(selectedLesson.id)}
                      disabled={togglingProgress}
                      className={`shrink-0 font-cinzel text-xs tracking-wider h-9 px-4 ${
                        isLessonCompleted(selectedLesson.id)
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          : 'gold-btn-glow text-black border-0'
                      }`}
                    >
                      {togglingProgress ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isLessonCompleted(selectedLesson.id) ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          COMPLETADA
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          MARCAR COMO COMPLETADA
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="gold-divider mb-6" />

                  {/* Lesson content — protected with watermark overlay */}
                  <div className="relative">
                    <div
                      className="font-inter text-white/70 text-sm leading-relaxed prose prose-invert prose-amber max-w-none
                        [&_h2]:font-cinzel [&_h2]:text-white [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4
                        [&_h3]:font-cinzel [&_h3]:text-amber-400 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3
                        [&_p]:mb-4 [&_p]:text-white/60
                        [&_ul]:space-y-2 [&_ul]:mb-4 [&_ul]:ml-4
                        [&_ol]:space-y-2 [&_ol]:mb-4 [&_ol]:ml-4 [&_ol]:list-decimal
                        [&_li]:text-white/50 [&_li]:text-sm
                        [&_strong]:text-amber-400 [&_strong]:font-semibold
                      "
                      dangerouslySetInnerHTML={{ __html: selectedLesson.content || '<p>Contenido próximamente...</p>' }}
                    />
                    {/* Watermark overlay — only visible on screenshots */}
                    <div
                      className="absolute inset-0 pointer-events-none overflow-hidden"
                      aria-hidden="true"
                    >
                      <div className="absolute inset-0" style={{
                        backgroundImage: `repeating-linear-gradient(
                          -45deg,
                          transparent,
                          transparent 120px,
                          rgba(212, 175, 55, 0.03) 120px,
                          rgba(212, 175, 55, 0.03) 121px
                        )`
                      }} />
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute font-cinzel text-amber-400/[0.04] text-sm tracking-[0.3em] whitespace-nowrap select-none"
                          style={{
                            top: `${15 + i * 16}%`,
                            left: `${i % 2 === 0 ? '5%' : '25%'}`,
                            transform: 'rotate(-25deg)',
                          }}
                        >
                          DINASTY ACADEMY — CONTENIDO PROTEGIDO
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Navigation between lessons */}
                  <div className="gold-divider my-6" />
                  <div className="flex items-center justify-between gap-4">
                    {(() => {
                      const lessonIdx = moduleData.lessons.findIndex(l => l.id === selectedLesson.id)
                      const prevLesson = lessonIdx > 0 ? moduleData.lessons[lessonIdx - 1] : null
                      const nextLesson = lessonIdx < moduleData.lessons.length - 1 ? moduleData.lessons[lessonIdx + 1] : null

                      return (
                        <>
                          {prevLesson ? (
                            <Button
                              onClick={() => setSelectedLesson(prevLesson)}
                              variant="ghost"
                              className="text-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10 font-cinzel text-xs tracking-wider"
                            >
                              <ArrowLeft className="w-4 h-4 mr-1" />
                              ANTERIOR
                            </Button>
                          ) : <div />}

                          {nextLesson ? (
                            <Button
                              onClick={() => setSelectedLesson(nextLesson)}
                              className="gold-btn-glow text-black font-cinzel text-xs tracking-wider border-0 h-9 px-4"
                            >
                              SIGUIENTE
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          ) : (
                            <Button
                              onClick={() => router.push('/campus')}
                              className="gold-btn-glow text-black font-cinzel text-xs tracking-wider border-0 h-9 px-4"
                            >
                              <Crown className="w-4 h-4 mr-1" />
                              VOLVER AL CAMPUS
                            </Button>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-amber-500/20 mx-auto mb-4" />
                  <p className="font-cinzel text-white/30 text-sm tracking-wider">
                    Seleccioná una lección del menú lateral
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Module navigation */}
            <div className="flex items-center justify-between mt-6 gap-4">
              {prevModule ? (
                <Button
                  onClick={() => router.push(`/campus/modulo/${prevModule.id}`)}
                  variant="ghost"
                  className="text-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10 font-cinzel text-xs tracking-wider"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  MÓDULO {prevModule.orderNum}
                </Button>
              ) : <div />}

              {nextModule ? (
                <Button
                  onClick={() => router.push(`/campus/modulo/${nextModule.id}`)}
                  className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 font-cinzel text-xs tracking-wider h-9 px-4"
                >
                  MÓDULO {nextModule.orderNum}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : <div />}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
