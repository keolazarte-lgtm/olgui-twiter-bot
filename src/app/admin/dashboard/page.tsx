'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Users, Check, X, Loader2, Shield, BookOpen, Crown,
  LayoutDashboard, UserCheck, UserX, RefreshCw, Search,
  ChevronDown, Calendar, Mail, ToggleLeft, ToggleRight,
  DollarSign, TrendingUp, ArrowUpRight, Banknote, Plus, UserCircle,
  Eye, Globe, Monitor, Smartphone, Tablet, Bot, Activity, MapPin, Wand2,
  Trash2, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAdmin } from '../layout'

// ─── Types ──────────────────────────────────────────

interface UserItem {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
  active: number
  editorAccess?: boolean
  courseAccess?: { onlyfans: boolean; reddit: boolean; hombres: boolean; fetiches: boolean }
  isLegacy?: boolean
  mpPaymentId: string | null
  createdAt: string
}

interface ModuleItem {
  id: string
  title: string
  description: string | null
  orderNum: number
  icon: string | null
  createdAt: string
  lessons: {
    id: string
    moduleId: string
    title: string
    contentType: string
    content: string | null
    orderNum: number
    createdAt: string
  }[]
}

interface Stats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  totalModules: number
  totalLessons: number
}

interface SaleItem {
  id: string
  userId: string
  userEmail: string
  userName: string | null
  amount: number
  currency: string
  mpPaymentId: string | null
  status: string
  createdAt: string
}

interface SalesStats {
  total: { count: number; amount: number }
  today: { count: number; amount: number }
  thisWeek: { count: number; amount: number }
  thisMonth: { count: number; amount: number }
}

interface PricingItem {
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

interface VisitStats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  uniqueIps: number
  bots: number
  byDevice: { device: string; count: number }[]
  byBrowser: { browser: string; count: number }[]
  byPath: { path: string; count: number }[]
  last7Days: { date: string; count: number }[]
}

interface VisitItem {
  id: string
  ip: string | null
  userAgent: string | null
  path: string
  referer: string | null
  method: string
  country: string | null
  city: string | null
  device: string
  browser: string
  isBot: number
  createdAt: string
}

// ─── Component ──────────────────────────────────────

export default function AdminDashboardPage() {
  const { user } = useAdmin()
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserItem[]>([])
  const [modules, setModules] = useState<ModuleItem[]>([])
  const [sales, setSales] = useState<SaleItem[]>([])
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [showSaleForm, setShowSaleForm] = useState(false)
  const [saleForm, setSaleForm] = useState({
    userId: '',
    amount: '',
    currency: 'ARS',
    mpPaymentId: '',
    status: 'approved',
  })
  const [creatingSale, setCreatingSale] = useState(false)
  const [pricing, setPricing] = useState<PricingItem[]>([])
  const [savingPricing, setSavingPricing] = useState<string | null>(null)
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null)
  const [recentVisits, setRecentVisits] = useState<VisitItem[]>([])
  const [editorConfig, setEditorConfig] = useState<{ dailyLimit: number; stats: any } | null>(null)
  const [editorLimitInput, setEditorLimitInput] = useState('')
  const [savingEditorLimit, setSavingEditorLimit] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingUser, setDeletingUser] = useState(false)
  const { toast } = useToast()

  // Pricing form state — one entry per course
  const [pricingForms, setPricingForms] = useState<Record<string, {
    arsAmount: string
    arsStrike: string
    usdAmount: string
    usdStrike: string
    mpLink: string
    binanceId: string
    binanceInstructions: string
    isFeatured: boolean
    badgeText: string
  }>>({})

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [statsRes, usersRes, modulesRes, salesRes, pricingRes, visitsRes, editorConfigRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/modules'),
        fetch('/api/admin/sales'),
        fetch('/api/admin/pricing'),
        fetch('/api/admin/visits?limit=50'),
        fetch('/api/admin/editor/config'),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }

      if (modulesRes.ok) {
        const modulesData = await modulesRes.json()
        setModules(modulesData.modules || [])
      }

      if (salesRes.ok) {
        const salesData = await salesRes.json()
        setSales(salesData.sales || [])
        setSalesStats(salesData.stats || null)
      }

      if (pricingRes.ok) {
        const pricingData = await pricingRes.json()
        const pricingList: PricingItem[] = pricingData.pricing || []
        setPricing(pricingList)
        // Initialize forms
        const forms: Record<string, typeof pricingForms[string]> = {}
        for (const p of pricingList) {
          forms[p.course] = {
            arsAmount: String(p.arsAmount ?? ''),
            arsStrike: p.arsStrike ? String(p.arsStrike) : '',
            usdAmount: String(p.usdAmount ?? ''),
            usdStrike: p.usdStrike ? String(p.usdStrike) : '',
            mpLink: p.mpLink || '',
            binanceId: p.binanceId || '',
            binanceInstructions: p.binanceInstructions || '',
            isFeatured: Boolean(p.isFeatured),
            badgeText: p.badgeText || '',
          }
        }
        setPricingForms(forms)
      }

      if (visitsRes.ok) {
        const visitsData = await visitsRes.json()
        setVisitStats(visitsData.stats || null)
        setRecentVisits(visitsData.recent || [])
      }

      if (editorConfigRes.ok) {
        const editorData = await editorConfigRes.json()
        setEditorConfig(editorData)
        setEditorLimitInput(editorData.dailyLimit < 0 ? 'unlimited' : String(editorData.dailyLimit))
      }
    } catch (error) {
      console.error('Dashboard load error:', error)
      toast({ title: 'Error al cargar datos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Check URL tab param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && ['overview', 'users', 'modules', 'sales', 'pricing', 'visits', 'editor'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [])

  // Toggle user active status
  const handleToggleActive = async (userId: string, currentActive: number) => {
    setTogglingId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle`, {
        method: 'PATCH',
      })

      if (res.ok) {
        const data = await res.json()
        setUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, active: data.user.active, editorAccess: data.user.editorAccess } : u)
        )
        // Update stats too
        setStats(prev => prev ? {
          ...prev,
          activeUsers: prev.activeUsers + (currentActive ? -1 : 1),
          inactiveUsers: prev.inactiveUsers + (currentActive ? 1 : -1),
        } : prev)

        toast({
          title: currentActive ? 'Usuario desactivado' : 'Usuario activado',
          description: currentActive
            ? 'El usuario ya no tiene acceso al campus'
            : 'El usuario ahora tiene acceso al campus',
        })
      } else {
        const data = await res.json()
        toast({ title: data.error || 'Error al cambiar estado', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Toggle error:', error)
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  // Toggle user editor access
  const handleToggleEditor = async (userId: string, currentAccess: boolean) => {
    setTogglingId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/editor-access`, {
        method: 'PATCH',
      })

      if (res.ok) {
        const data = await res.json()
        setUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, editorAccess: data.user.editorAccess } : u)
        )
        toast({
          title: currentAccess ? 'Editor desactivado' : 'Editor activado',
          description: currentAccess
            ? 'La usuaria ya no ve el editor en el campus'
            : 'La usuaria ahora ve el botón Editor de Fotos IA en el campus',
        })
      } else {
        const data = await res.json()
        toast({ title: data.error || 'Error al cambiar acceso al editor', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Toggle editor error:', error)
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  // Toggle user role (admin <-> student)
  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'student' : 'admin'
    setTogglingId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (res.ok) {
        const data = await res.json()
        setUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, role: data.user.role, editorAccess: data.user.editorAccess } : u)
        )
        toast({
          title: newRole === 'admin' ? 'Rol cambiado a ADMIN' : 'Rol cambiado a ESTUDIANTE',
          description: newRole === 'admin'
            ? 'La usuaria ahora ve el panel admin, el editor y todo el campus'
            : 'La usuaria ahora ve solo el campus (y el editor si se lo das aparte)',
        })
      } else {
        const data = await res.json()
        toast({ title: data.error || 'Error al cambiar rol', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Toggle role error:', error)
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  // Toggle user course access (onlyfans / reddit / hombres)
  const handleToggleCourse = async (userId: string, course: 'onlyfans' | 'reddit' | 'hombres', currentAccess: boolean) => {
    setTogglingId(`${userId}-${course}`)
    try {
      const res = await fetch(`/api/admin/users/${userId}/course-access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course, active: !currentAccess }),
      })

      if (res.ok) {
        const data = await res.json()
        setUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, courseAccess: data.access, isLegacy: false } : u)
        )
        toast({
          title: !currentAccess ? `Curso ${course.toUpperCase()} activado` : `Curso ${course.toUpperCase()} desactivado`,
          description: !currentAccess
            ? `La usuaria ahora tiene acceso al curso ${course}`
            : `Se le quitó el acceso al curso ${course}`,
        })
      } else {
        const data = await res.json()
        toast({ title: data.error || 'Error al cambiar acceso al curso', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Toggle course error:', error)
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  // Eliminar usuario
  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    if (deleteConfirmText.trim().toLowerCase() !== deleteTarget.email.toLowerCase()) {
      toast({
        title: 'El email no coincide',
        description: 'Escribí el email exactamente como aparece para confirmar.',
        variant: 'destructive',
      })
      return
    }

    setDeletingUser(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const data = await res.json()
        setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
        toast({
          title: 'Usuario eliminado',
          description: `Se eliminó la cuenta ${data.email} y todos sus datos asociados.`,
        })
        setDeleteTarget(null)
        setDeleteConfirmText('')
      } else {
        const data = await res.json()
        toast({ title: data.error || 'Error al eliminar', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Delete user error:', error)
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setDeletingUser(false)
    }
  }

  // Save editor daily limit
  const handleSaveEditorLimit = async () => {
    setSavingEditorLimit(true)
    try {
      const value = editorLimitInput.trim()
      const body: any = {}
      if (value === 'unlimited' || value === '∞' || value === '-1') {
        body.dailyLimit = 'unlimited'
      } else {
        const n = Number(value)
        if (isNaN(n) || n < 0) {
          toast({ title: 'Número inválido', description: 'Poné un número >= 0 o "unlimited"', variant: 'destructive' })
          setSavingEditorLimit(false)
          return
        }
        body.dailyLimit = n
      }

      const res = await fetch('/api/admin/editor/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        setEditorConfig(prev => prev ? { ...prev, dailyLimit: data.dailyLimit } : prev)
        setEditorLimitInput(data.dailyLimit < 0 ? 'unlimited' : String(data.dailyLimit))
        toast({
          title: 'Límite actualizado',
          description: data.dailyLimit < 0
            ? 'Las usuarias tienen uso ilimitado'
            : `Cada usuaria puede procesar ${data.dailyLimit} fotos por día`,
        })
      } else {
        const data = await res.json()
        toast({ title: data.error || 'Error al guardar', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Save editor limit error:', error)
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSavingEditorLimit(false)
    }
  }

  // Create a new sale
  const handleCreateSale = async () => {
    if (!saleForm.userId || !saleForm.amount) return

    setCreatingSale(true)
    try {
      const res = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: saleForm.userId,
          amount: parseFloat(saleForm.amount),
          currency: saleForm.currency,
          mpPaymentId: saleForm.mpPaymentId || null,
          status: saleForm.status,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Add new sale to list
        setSales(prev => [data.sale, ...prev])
        // Refresh sales stats
        try {
          const statsRes = await fetch('/api/admin/sales')
          if (statsRes.ok) {
            const statsData = await statsRes.json()
            setSalesStats(statsData.stats || null)
          }
        } catch {}

        // Reset form
        setSaleForm({
          userId: '',
          amount: '',
          currency: 'ARS',
          mpPaymentId: '',
          status: 'approved',
        })
        setShowSaleForm(false)

        toast({
          title: 'Venta registrada',
          description: `Se registró la venta de $${parseFloat(saleForm.amount).toLocaleString('es-AR')} ${saleForm.currency}`,
        })
      } else {
        const data = await res.json()
        toast({ title: data.error || 'Error al registrar venta', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Create sale error:', error)
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setCreatingSale(false)
    }
  }

  // Save pricing for one course
  const handleSavePricing = async (course: string) => {
    const form = pricingForms[course]
    if (!form) return
    setSavingPricing(course)
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course,
          arsAmount: form.arsAmount,
          arsStrike: form.arsStrike || null,
          usdAmount: form.usdAmount,
          usdStrike: form.usdStrike || null,
          mpLink: form.mpLink || null,
          binanceId: form.binanceId || null,
          binanceInstructions: form.binanceInstructions || null,
          isFeatured: form.isFeatured,
          badgeText: form.badgeText || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setPricing(prev => prev.map(p => p.course === course ? data.pricing : p))
        toast({ title: 'Precios guardados', description: `Curso ${course} actualizado` })
      } else {
        const data = await res.json()
        toast({ title: data.error || 'Error al guardar', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Save pricing error:', error)
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSavingPricing(null)
    }
  }

  // Filter users by search
  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  })

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="font-cinzel text-amber-400/60 text-xs tracking-wider">CARGANDO DATOS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-cinzel-decorative text-2xl sm:text-3xl font-bold text-white">
            Panel de <span className="gold-text">Administración</span>
          </h1>
          <p className="font-inter text-white/40 text-sm mt-1">
            Gestión de usuarios, módulos y estadísticas de la plataforma
          </p>
        </div>
        <Button
          onClick={loadData}
          variant="ghost"
          className="text-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10 font-cinzel text-xs tracking-wider h-9 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          ACTUALIZAR
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        <Card className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-colors">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 text-white/30 mx-auto mb-2" />
            <p className="font-cinzel-decorative text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
            <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">TOTAL USUARIOS</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-colors">
          <CardContent className="p-4 text-center">
            <UserCheck className="w-5 h-5 text-amber-400/60 mx-auto mb-2" />
            <p className="font-cinzel-decorative text-2xl font-bold text-amber-400">{stats?.activeUsers || 0}</p>
            <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">ACTIVOS</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-colors">
          <CardContent className="p-4 text-center">
            <UserX className="w-5 h-5 text-red-400/60 mx-auto mb-2" />
            <p className="font-cinzel-decorative text-2xl font-bold text-red-400">{stats?.inactiveUsers || 0}</p>
            <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">INACTIVOS</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-colors">
          <CardContent className="p-4 text-center">
            <BookOpen className="w-5 h-5 text-amber-400/60 mx-auto mb-2" />
            <p className="font-cinzel-decorative text-2xl font-bold text-white">{stats?.totalModules || 0}</p>
            <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">MÓDULOS</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-colors col-span-2 sm:col-span-1">
          <CardContent className="p-4 text-center">
            <LayoutDashboard className="w-5 h-5 text-amber-400/60 mx-auto mb-2" />
            <p className="font-cinzel-decorative text-2xl font-bold text-white">{stats?.totalLessons || 0}</p>
            <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">LECCIONES</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white/[0.03] border border-amber-500/10 p-1 h-auto">
            <TabsTrigger
              value="overview"
              className="font-cinzel text-xs tracking-wider data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/20 text-white/40 px-4 py-2"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              RESUMEN
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="font-cinzel text-xs tracking-wider data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/20 text-white/40 px-4 py-2"
            >
              <Users className="w-4 h-4 mr-2" />
              USUARIOS
            </TabsTrigger>
            <TabsTrigger
              value="modules"
              className="font-cinzel text-xs tracking-wider data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/20 text-white/40 px-4 py-2"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              MÓDULOS
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="font-cinzel text-xs tracking-wider data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/20 text-white/40 px-4 py-2"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              VENTAS
            </TabsTrigger>
            <TabsTrigger
              value="pricing"
              className="font-cinzel text-xs tracking-wider data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/20 text-white/40 px-4 py-2"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              PRECIOS
            </TabsTrigger>
            <TabsTrigger
              value="visits"
              className="font-cinzel text-xs tracking-wider data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/20 text-white/40 px-4 py-2"
            >
              <Eye className="w-4 h-4 mr-2" />
              VISITAS
            </TabsTrigger>
            <TabsTrigger
              value="editor"
              className="font-cinzel text-xs tracking-wider data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/20 text-white/40 px-4 py-2"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              EDITOR
            </TabsTrigger>
          </TabsList>

          {/* ─── OVERVIEW TAB ─── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Recent Users */}
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardHeader className="pb-3">
                  <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    ÚLTIMOS USUARIOS REGISTRADOS
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {users.slice(0, 10).map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            u.role === 'admin' ? 'bg-amber-500/15' : 'bg-white/5'
                          }`}>
                            {u.role === 'admin' ? (
                              <Crown className="w-4 h-4 text-amber-400" />
                            ) : (
                              <span className="font-cinzel text-white/50 text-xs">
                                {(u.name || u.email)[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-inter text-white text-xs font-medium truncate">
                              {u.name || 'Sin nombre'}
                            </p>
                            <p className="font-inter text-white/30 text-[10px] truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {u.active ? (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] px-2">
                              ACTIVO
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] px-2">
                              INACTIVO
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && (
                      <p className="font-inter text-white/20 text-xs text-center py-6">No hay usuarios registrados</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Modules Overview */}
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardHeader className="pb-3">
                  <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    RESUMEN DE VENTAS
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                      <p className="font-inter text-white/40 text-[10px]">TOTAL FACTURADO</p>
                      <p className="font-cinzel-decorative text-lg font-bold text-green-400 mt-1">
                        ${salesStats?.total?.amount?.toLocaleString('es-AR') || 0}
                      </p>
                      <p className="font-inter text-white/25 text-[10px] mt-0.5">
                        {salesStats?.total?.count || 0} ventas
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <p className="font-inter text-white/40 text-[10px]">ESTE MES</p>
                      <p className="font-cinzel-decorative text-lg font-bold text-amber-400 mt-1">
                        ${salesStats?.thisMonth?.amount?.toLocaleString('es-AR') || 0}
                      </p>
                      <p className="font-inter text-white/25 text-[10px] mt-0.5">
                        {salesStats?.thisMonth?.count || 0} ventas
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Platform Info */}
            <Card className="bg-white/[0.02] border-amber-500/[0.08]">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="font-cinzel text-white/60 text-xs tracking-wider">INFORMACIÓN DE LA PLATAFORMA</span>
                </div>
                <div className="flex items-center gap-4 font-inter text-white/30 text-[10px]">
                  <span>{stats?.totalUsers || 0} usuarios registrados</span>
                  <span>·</span>
                  <span>{stats?.totalModules || 0} módulos activos</span>
                  <span>·</span>
                  <span>{stats?.totalLessons || 0} lecciones totales</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── USERS TAB ─── */}
          <TabsContent value="users" className="space-y-4">
            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/30" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, email o rol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-10 pl-10 font-inter text-sm"
                />
              </div>
              <div className="font-inter text-white/30 text-xs flex items-center gap-2 shrink-0">
                <span>{filteredUsers.length} de {users.length} usuarios</span>
              </div>
            </div>

            {/* Users Table */}
            <Card className="bg-white/[0.02] border-amber-500/[0.08] overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-amber-500/10">
                      <th className="text-left p-4 font-cinzel text-amber-500/40 text-[10px] tracking-wider">NOMBRE</th>
                      <th className="text-left p-4 font-cinzel text-amber-500/40 text-[10px] tracking-wider">EMAIL</th>
                      <th className="text-left p-4 font-cinzel text-amber-500/40 text-[10px] tracking-wider">ESTADO</th>
                      <th className="text-left p-4 font-cinzel text-amber-500/40 text-[10px] tracking-wider">ROL</th>
                      <th className="text-left p-4 font-cinzel text-amber-500/40 text-[10px] tracking-wider">CURSOS</th>
                      <th className="text-left p-4 font-cinzel text-amber-500/40 text-[10px] tracking-wider">EDITOR</th>
                      <th className="text-left p-4 font-cinzel text-amber-500/40 text-[10px] tracking-wider">REGISTRO</th>
                      <th className="text-right p-4 font-cinzel text-amber-500/40 text-[10px] tracking-wider">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-amber-500/5 hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              u.role === 'admin' ? 'bg-amber-500/15' : 'bg-white/5'
                            }`}>
                              {u.role === 'admin' ? (
                                <Crown className="w-4 h-4 text-amber-400" />
                              ) : (
                                <span className="font-cinzel text-white/50 text-xs">
                                  {(u.name || u.email)[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="font-inter text-white text-xs font-medium">
                              {u.name || 'Sin nombre'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-inter text-white/50 text-xs">{u.email}</span>
                        </td>
                        <td className="p-4">
                          {u.active ? (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                              <Check className="w-3 h-3 mr-1" />
                              ACTIVO
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                              <X className="w-3 h-3 mr-1" />
                              INACTIVO
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={`text-[10px] ${
                            u.role === 'admin'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-white/5 text-white/40 border-white/10'
                          }`}>
                            {u.role === 'admin' ? 'ADMIN' : 'ESTUDIANTE'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {u.role === 'admin' ? (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                              TODOS
                            </Badge>
                          ) : u.isLegacy ? (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                              TODOS (legacy)
                            </Badge>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {(['onlyfans', 'reddit', 'hombres', 'fetiches'] as const).map(course => {
                                const access = u.courseAccess?.[course] ?? false
                                return (
                                  <button
                                    key={course}
                                    onClick={() => handleToggleCourse(u.id, course, access)}
                                    disabled={togglingId === `${u.id}-${course}`}
                                    title={access ? `Quitar ${course}` : `Dar ${course}`}
                                    className={`text-[9px] font-cinzel tracking-wider px-2 py-0.5 rounded border transition-colors ${
                                      access
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                        : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'
                                    }`}
                                  >
                                    {togglingId === `${u.id}-${course}` ? '...' : course.toUpperCase()}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {u.role === 'admin' ? (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                              <Wand2 className="w-3 h-3 mr-1" />
                              SIEMPRE
                            </Badge>
                          ) : u.editorAccess ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                              <Wand2 className="w-3 h-3 mr-1" />
                              CON ACCESO
                            </Badge>
                          ) : (
                            <Badge className="bg-white/5 text-white/30 border-white/10 text-[10px]">
                              SIN ACCESO
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-white/20" />
                            <span className="font-inter text-white/30 text-xs">{formatDate(u.createdAt)}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {u.role === 'admin' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                onClick={() => handleToggleRole(u.id, u.role)}
                                disabled={togglingId === u.id}
                                size="sm"
                                title="Cambiar rol a estudiante (solo campus)"
                                className="font-cinzel text-[10px] tracking-wider h-8 px-2.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                              >
                                {togglingId === u.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Crown className="w-3 h-3 mr-1" />
                                    QUITAR ADMIN
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                onClick={() => handleToggleRole(u.id, u.role)}
                                disabled={togglingId === u.id}
                                size="sm"
                                title="Cambiar rol a admin (ve todo)"
                                className="font-cinzel text-[10px] tracking-wider h-8 px-2.5 bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                              >
                                {togglingId === u.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  'HACER ADMIN'
                                )}
                              </Button>
                              <Button
                                onClick={() => handleToggleEditor(u.id, Boolean(u.editorAccess))}
                                disabled={togglingId === u.id}
                                size="sm"
                                title={u.editorAccess ? 'Quitar acceso al editor' : 'Dar acceso al editor'}
                                className={`font-cinzel text-[10px] tracking-wider h-8 px-2.5 ${
                                  u.editorAccess
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                }`}
                              >
                                {togglingId === u.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Wand2 className="w-3 h-3 mr-1" />
                                    {u.editorAccess ? 'QUITAR' : 'EDITOR'}
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => handleToggleActive(u.id, u.active)}
                                disabled={togglingId === u.id}
                                size="sm"
                                className={`font-cinzel text-[10px] tracking-wider h-8 px-3 ${
                                  u.active
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                                }`}
                              >
                                {togglingId === u.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : u.active ? (
                                  <>
                                    <ToggleRight className="w-3 h-3 mr-1" />
                                    DESACTIVAR
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-3 h-3 mr-1" />
                                    ACTIVAR
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => {
                                  setDeleteTarget(u)
                                  setDeleteConfirmText('')
                                }}
                                disabled={togglingId === u.id}
                                size="sm"
                                title="Eliminar usuario (no se puede deshacer)"
                                className="font-cinzel text-[10px] tracking-wider h-8 px-2.5 bg-red-500/5 text-red-400/70 border border-red-500/20 hover:bg-red-500/15 hover:text-red-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2 p-3 max-h-[500px] overflow-y-auto">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-lg bg-white/[0.02] border border-amber-500/[0.05] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          u.role === 'admin' ? 'bg-amber-500/15' : 'bg-white/5'
                        }`}>
                          {u.role === 'admin' ? (
                            <Crown className="w-4 h-4 text-amber-400" />
                          ) : (
                            <span className="font-cinzel text-white/50 text-xs">
                              {(u.name || u.email)[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-inter text-white text-xs font-medium truncate">{u.name || 'Sin nombre'}</p>
                          <p className="font-inter text-white/30 text-[10px] truncate">{u.email}</p>
                        </div>
                      </div>
                      {u.active ? (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] shrink-0">ACTIVO</Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] shrink-0">INACTIVO</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[9px] ${
                          u.role === 'admin'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}>
                          {u.role === 'admin' ? 'ADMIN' : 'ESTUDIANTE'}
                        </Badge>
                        {u.role === 'admin' ? (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">
                            <Wand2 className="w-2.5 h-2.5 mr-1" />EDITOR
                          </Badge>
                        ) : u.editorAccess ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
                            <Wand2 className="w-2.5 h-2.5 mr-1" />EDITOR
                          </Badge>
                        ) : null}
                        <span className="font-inter text-white/25 text-[10px]">{formatDate(u.createdAt)}</span>
                      </div>
                    </div>

                    {/* Cursos (mobile) */}
                    {u.role !== 'admin' && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-cinzel text-amber-500/40 text-[9px] tracking-wider">CURSOS:</span>
                        {(['onlyfans', 'reddit', 'hombres'] as const).map(course => {
                          const access = u.courseAccess?.[course] ?? false
                          return (
                            <button
                              key={course}
                              onClick={() => handleToggleCourse(u.id, course, access)}
                              disabled={togglingId === `${u.id}-${course}`}
                              className={`text-[9px] font-cinzel tracking-wider px-2 py-0.5 rounded border transition-colors ${
                                access
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              {togglingId === `${u.id}-${course}` ? '...' : course.toUpperCase()}
                            </button>
                          )
                        })}
                        {u.isLegacy && (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px] ml-1">
                            LEGACY
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      {u.role !== 'admin' ? (
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <Button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            disabled={togglingId === u.id}
                            size="sm"
                            title="Hacer admin (ve todo)"
                            className="font-cinzel text-[9px] tracking-wider h-7 px-2 bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                          >
                            {togglingId === u.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'HACER ADMIN'
                            )}
                          </Button>
                          <Button
                            onClick={() => handleToggleEditor(u.id, Boolean(u.editorAccess))}
                            disabled={togglingId === u.id}
                            size="sm"
                            title={u.editorAccess ? 'Quitar acceso al editor' : 'Dar acceso al editor'}
                            className={`font-cinzel text-[9px] tracking-wider h-7 px-2 ${
                              u.editorAccess
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {togglingId === u.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : u.editorAccess ? (
                              'QUITAR EDITOR'
                            ) : (
                              'DAR EDITOR'
                            )}
                          </Button>
                          <Button
                            onClick={() => handleToggleActive(u.id, u.active)}
                            disabled={togglingId === u.id}
                            size="sm"
                            className={`font-cinzel text-[9px] tracking-wider h-7 px-2.5 ${
                              u.active
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                            }`}
                          >
                            {togglingId === u.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : u.active ? (
                              'DESACTIVAR'
                            ) : (
                              'ACTIVAR'
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              setDeleteTarget(u)
                              setDeleteConfirmText('')
                            }}
                            disabled={togglingId === u.id}
                            size="sm"
                            title="Eliminar usuario"
                            className="font-cinzel text-[9px] tracking-wider h-7 px-2 bg-red-500/5 text-red-400/70 border border-red-500/20 hover:bg-red-500/15 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            disabled={togglingId === u.id}
                            size="sm"
                            title="Quitar admin (solo campus)"
                            className="font-cinzel text-[9px] tracking-wider h-7 px-2 bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                          >
                            {togglingId === u.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'QUITAR ADMIN'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredUsers.length === 0 && (
                <div className="p-8 text-center">
                  <Users className="w-8 h-8 text-amber-500/20 mx-auto mb-3" />
                  <p className="font-inter text-white/20 text-xs">
                    {searchQuery ? 'No se encontraron usuarios con esa búsqueda' : 'No hay usuarios registrados'}
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ─── MODULES TAB ─── */}
          <TabsContent value="modules" className="space-y-4">
            {modules.map((mod, i) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-white/[0.02] border-amber-500/[0.08] overflow-hidden">
                  {/* Module Header */}
                  <div className="p-4 sm:p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-600 to-yellow-500 flex items-center justify-center shrink-0">
                      <span className="font-cinzel text-black font-bold text-sm">{mod.orderNum}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-cinzel text-white font-semibold text-sm tracking-wide">
                        {mod.title}
                      </h3>
                      {mod.description && (
                        <p className="font-inter text-white/35 text-xs mt-1 line-clamp-2">
                          {mod.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {mod.lessons.length} LECCIONES
                        </Badge>
                        <span className="font-inter text-white/20 text-[10px]">
                          Creado: {formatDate(mod.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lessons List */}
                  {mod.lessons.length > 0 && (
                    <div className="border-t border-amber-500/[0.05]">
                      <div className="max-h-60 overflow-y-auto">
                        {mod.lessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            className="px-4 sm:px-5 py-2.5 border-b border-amber-500/[0.03] last:border-0 flex items-center justify-between gap-3 hover:bg-white/[0.01] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center shrink-0">
                                <span className="font-inter text-white/40 text-[10px]">{lesson.orderNum}</span>
                              </div>
                              <span className="font-inter text-white/60 text-xs truncate">{lesson.title}</span>
                            </div>
                            <Badge className="bg-white/5 text-white/30 border-white/10 text-[8px] shrink-0">
                              {lesson.contentType.toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mod.lessons.length === 0 && (
                    <div className="border-t border-amber-500/[0.05] p-4 text-center">
                      <p className="font-inter text-white/20 text-[10px]">Sin lecciones</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}

            {modules.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-8 h-8 text-amber-500/20 mx-auto mb-3" />
                <p className="font-inter text-white/20 text-xs">No hay módulos disponibles</p>
              </div>
            )}
          </TabsContent>

          {/* ─── SALES TAB ─── */}
          <TabsContent value="sales" className="space-y-4">
            {/* Register Sale Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setShowSaleForm(true)}
                className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-cinzel text-xs tracking-wider h-9"
              >
                <Plus className="w-4 h-4 mr-2" />
                REGISTRAR VENTA
              </Button>
            </div>

            {/* Sale Form Modal */}
            {showSaleForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="bg-white/[0.03] border-amber-500/20 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-amber-400" />
                        REGISTRAR NUEVA VENTA
                      </CardTitle>
                      <button
                        onClick={() => setShowSaleForm(false)}
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* User Selection */}
                      <div className="space-y-2">
                        <label className="font-cinzel text-amber-500/60 text-[10px] tracking-wider">CLIENTE</label>
                        <div className="relative">
                          <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/30" />
                          <select
                            value={saleForm.userId}
                            onChange={(e) => setSaleForm(prev => ({ ...prev, userId: e.target.value }))}
                            className="w-full bg-white/5 border border-amber-500/10 text-white rounded-md h-10 pl-10 pr-3 font-inter text-sm focus:border-amber-500/40 focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-[#0a0a0a]">Seleccionar cliente...</option>
                            {users.filter(u => u.role !== 'admin').map(u => (
                              <option key={u.id} value={u.id} className="bg-[#0a0a0a]">
                                {u.name || u.email} {u.active ? '' : '(Inactivo)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="space-y-2">
                        <label className="font-cinzel text-amber-500/60 text-[10px] tracking-wider">MONTO</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/30" />
                          <Input
                            type="number"
                            placeholder="0"
                            value={saleForm.amount}
                            onChange={(e) => setSaleForm(prev => ({ ...prev, amount: e.target.value }))}
                            className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-10 pl-10 font-inter text-sm"
                          />
                        </div>
                      </div>

                      {/* Currency */}
                      <div className="space-y-2">
                        <label className="font-cinzel text-amber-500/60 text-[10px] tracking-wider">MONEDA</label>
                        <select
                          value={saleForm.currency}
                          onChange={(e) => setSaleForm(prev => ({ ...prev, currency: e.target.value }))}
                          className="w-full bg-white/5 border border-amber-500/10 text-white rounded-md h-10 px-3 font-inter text-sm focus:border-amber-500/40 focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="ARS" className="bg-[#0a0a0a]">ARS (Pesos Argentinos)</option>
                          <option value="USD" className="bg-[#0a0a0a]">USD (Dólares)</option>
                        </select>
                      </div>

                      {/* Status */}
                      <div className="space-y-2">
                        <label className="font-cinzel text-amber-500/60 text-[10px] tracking-wider">ESTADO DEL PAGO</label>
                        <select
                          value={saleForm.status}
                          onChange={(e) => setSaleForm(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full bg-white/5 border border-amber-500/10 text-white rounded-md h-10 px-3 font-inter text-sm focus:border-amber-500/40 focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="approved" className="bg-[#0a0a0a]">Aprobado</option>
                          <option value="pending" className="bg-[#0a0a0a]">Pendiente</option>
                          <option value="rejected" className="bg-[#0a0a0a]">Rechazado</option>
                        </select>
                      </div>

                      {/* MP Payment ID (full width) */}
                      <div className="space-y-2 sm:col-span-2">
                        <label className="font-cinzel text-amber-500/60 text-[10px] tracking-wider">ID DE PAGO MERCADO PAGO (OPCIONAL)</label>
                        <Input
                          type="text"
                          placeholder="Ej: 1234567890"
                          value={saleForm.mpPaymentId}
                          onChange={(e) => setSaleForm(prev => ({ ...prev, mpPaymentId: e.target.value }))}
                          className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-10 font-inter text-sm"
                        />
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        onClick={() => setShowSaleForm(false)}
                        variant="ghost"
                        className="text-white/40 hover:text-white/70 font-cinzel text-xs tracking-wider h-9"
                      >
                        CANCELAR
                      </Button>
                      <Button
                        onClick={handleCreateSale}
                        disabled={creatingSale || !saleForm.userId || !saleForm.amount}
                        className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-cinzel text-xs tracking-wider h-9 disabled:opacity-50"
                      >
                        {creatingSale ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        {creatingSale ? 'REGISTRANDO...' : 'CONFIRMAR VENTA'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Sales Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-colors">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-5 h-5 text-amber-400/60 mx-auto mb-2" />
                  <p className="font-cinzel-decorative text-2xl font-bold text-white">
                    {salesStats?.total?.count || 0}
                  </p>
                  <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">VENTAS TOTALES</p>
                  <p className="font-inter text-amber-400 text-[10px] mt-1">
                    ${salesStats?.total?.amount?.toLocaleString('es-AR') || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-colors">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-5 h-5 text-green-400/60 mx-auto mb-2" />
                  <p className="font-cinzel-decorative text-2xl font-bold text-green-400">
                    {salesStats?.today?.count || 0}
                  </p>
                  <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">HOY</p>
                  <p className="font-inter text-green-400 text-[10px] mt-1">
                    ${salesStats?.today?.amount?.toLocaleString('es-AR') || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-colors">
                <CardContent className="p-4 text-center">
                  <ArrowUpRight className="w-5 h-5 text-blue-400/60 mx-auto mb-2" />
                  <p className="font-cinzel-decorative text-2xl font-bold text-blue-400">
                    {salesStats?.thisWeek?.count || 0}
                  </p>
                  <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">ESTA SEMANA</p>
                  <p className="font-inter text-blue-400 text-[10px] mt-1">
                    ${salesStats?.thisWeek?.amount?.toLocaleString('es-AR') || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/[0.02] border-amber-500/[0.08] hover:border-amber-500/20 transition-colors">
                <CardContent className="p-4 text-center">
                  <Banknote className="w-5 h-5 text-purple-400/60 mx-auto mb-2" />
                  <p className="font-cinzel-decorative text-2xl font-bold text-purple-400">
                    {salesStats?.thisMonth?.count || 0}
                  </p>
                  <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">ESTE MES</p>
                  <p className="font-inter text-purple-400 text-[10px] mt-1">
                    ${salesStats?.thisMonth?.amount?.toLocaleString('es-AR') || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sales List */}
            <Card className="bg-white/[0.02] border-amber-500/[0.08] overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  HISTORIAL DE VENTAS
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-amber-500/10">
                        <th className="text-left p-3 font-cinzel text-amber-500/40 text-[10px] tracking-wider">CLIENTE</th>
                        <th className="text-left p-3 font-cinzel text-amber-500/40 text-[10px] tracking-wider">EMAIL</th>
                        <th className="text-left p-3 font-cinzel text-amber-500/40 text-[10px] tracking-wider">MONTO</th>
                        <th className="text-left p-3 font-cinzel text-amber-500/40 text-[10px] tracking-wider">ESTADO</th>
                        <th className="text-left p-3 font-cinzel text-amber-500/40 text-[10px] tracking-wider">PAGO MP</th>
                        <th className="text-left p-3 font-cinzel text-amber-500/40 text-[10px] tracking-wider">FECHA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale) => (
                        <tr key={sale.id} className="border-b border-amber-500/5 hover:bg-white/[0.01] transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                <DollarSign className="w-4 h-4 text-green-400" />
                              </div>
                              <span className="font-inter text-white text-xs font-medium">
                                {sale.userName || 'Sin nombre'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-inter text-white/50 text-xs">{sale.userEmail}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-inter text-green-400 text-xs font-semibold">
                              ${sale.amount?.toLocaleString('es-AR')} {sale.currency}
                            </span>
                          </td>
                          <td className="p-3">
                            {sale.status === 'approved' ? (
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                                <Check className="w-3 h-3 mr-1" />
                                APROBADO
                              </Badge>
                            ) : sale.status === 'pending' ? (
                              <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px]">
                                PENDIENTE
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                                <X className="w-3 h-3 mr-1" />
                                RECHAZADO
                              </Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-inter text-white/30 text-[10px]">
                              {sale.mpPaymentId || '—'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-white/20" />
                              <span className="font-inter text-white/30 text-xs">{formatDate(sale.createdAt)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2 max-h-[500px] overflow-y-auto">
                  {sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3 rounded-lg bg-white/[0.02] border border-amber-500/[0.05] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                            <DollarSign className="w-3.5 h-3.5 text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-inter text-white text-xs font-medium truncate">{sale.userName || 'Sin nombre'}</p>
                            <p className="font-inter text-white/30 text-[10px] truncate">{sale.userEmail}</p>
                          </div>
                        </div>
                        <span className="font-inter text-green-400 text-xs font-semibold shrink-0">
                          ${sale.amount?.toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        {sale.status === 'approved' ? (
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[9px]">APROBADO</Badge>
                        ) : sale.status === 'pending' ? (
                          <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[9px]">PENDIENTE</Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px]">RECHAZADO</Badge>
                        )}
                        <span className="font-inter text-white/25 text-[10px]">{formatDate(sale.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {sales.length === 0 && (
                  <div className="p-8 text-center">
                    <DollarSign className="w-8 h-8 text-amber-500/20 mx-auto mb-3" />
                    <p className="font-inter text-white/20 text-xs">No hay ventas registradas todavía</p>
                    <p className="font-inter text-white/10 text-[10px] mt-1">Las ventas aparecerán cuando los alumnos paguen con Mercado Pago</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── PRICING TAB ─── */}
          <TabsContent value="pricing" className="space-y-4">
            <Card className="bg-white/[0.02] border-amber-500/[0.08]">
              <CardHeader>
                <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  PRECIOS POR CURSO
                </CardTitle>
                <p className="font-inter text-white/40 text-xs mt-1">
                  Configurá el precio en ARS (MercadoPago) y USD (Binance Pay) para cada curso. El curso marcado como destacado aparecerá primero en el campus con el badge SUPER GOLD.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {pricing.length === 0 && (
                  <div className="text-center py-8">
                    <DollarSign className="w-8 h-8 text-amber-500/20 mx-auto mb-3" />
                    <p className="font-inter text-white/20 text-xs">Cargando precios...</p>
                  </div>
                )}

                {pricing.map((p) => {
                  const form = pricingForms[p.course]
                  if (!form) return null
                  const courseLabel = p.course === 'onlyfans' ? 'OnlyFans' : p.course === 'hombres' ? 'Hombres' : 'Reddit'
                  const courseIcon = p.course === 'onlyfans' ? '👑' : p.course === 'hombres' ? '👥' : '🌐'
                  const courseGradient = p.course === 'onlyfans'
                    ? 'from-amber-600 to-yellow-500'
                    : p.course === 'hombres'
                    ? 'from-blue-700 to-purple-800'
                    : 'from-orange-600 to-rose-700'

                  return (
                    <div key={p.course} className="rounded-xl bg-white/[0.02] border border-amber-500/10 overflow-hidden">
                      {/* Course header */}
                      <div className={`p-3 bg-gradient-to-r ${courseGradient} bg-opacity-20`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{courseIcon}</span>
                            <span className="font-cinzel text-white font-semibold text-sm tracking-wide">
                              {courseLabel}
                            </span>
                          </div>
                          {p.isFeatured && (
                            <span className="bg-amber-400 text-black text-[9px] font-cinzel font-black tracking-widest px-2 py-0.5 rounded">
                              ⭐ SUPER GOLD
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Featured toggle + badge */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.isFeatured}
                              onChange={(e) => setPricingForms(prev => ({
                                ...prev,
                                [p.course]: { ...form, isFeatured: e.target.checked }
                              }))}
                              className="w-4 h-4 accent-amber-500"
                            />
                            <span className="font-cinzel text-amber-400/70 text-xs tracking-wider">
                              DESTACADO (aparece primero + badge)
                            </span>
                          </label>
                          <div>
                            <label className="font-cinzel text-amber-500/50 text-[10px] tracking-wider block mb-1">
                              TEXTO DEL BADGE (si está destacado)
                            </label>
                            <Input
                              type="text"
                              placeholder="SUPER GOLD"
                              value={form.badgeText}
                              onChange={(e) => setPricingForms(prev => ({
                                ...prev,
                                [p.course]: { ...form, badgeText: e.target.value }
                              }))}
                              className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-9 font-inter text-sm"
                            />
                          </div>
                        </div>

                        {/* ARS section */}
                        <div className="rounded-lg bg-amber-500/[0.03] border border-amber-500/10 p-3">
                          <p className="font-cinzel text-amber-400 text-xs tracking-wider mb-3 flex items-center gap-2">
                            <DollarSign className="w-3 h-3" />
                            PAGO EN PESOS (ARS · MERCADOPAGO)
                          </p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="font-cinzel text-amber-500/50 text-[10px] tracking-wider block mb-1">
                                MONTO ARS
                              </label>
                              <Input
                                type="number"
                                placeholder="15000"
                                value={form.arsAmount}
                                onChange={(e) => setPricingForms(prev => ({
                                  ...prev,
                                  [p.course]: { ...form, arsAmount: e.target.value }
                                }))}
                                className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-9 font-inter text-sm"
                              />
                            </div>
                            <div>
                              <label className="font-cinzel text-amber-500/50 text-[10px] tracking-wider block mb-1">
                                PRECIO TACHADO ARS (opcional)
                              </label>
                              <Input
                                type="number"
                                placeholder="50000"
                                value={form.arsStrike}
                                onChange={(e) => setPricingForms(prev => ({
                                  ...prev,
                                  [p.course]: { ...form, arsStrike: e.target.value }
                                }))}
                                className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-9 font-inter text-sm"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="font-cinzel text-amber-500/50 text-[10px] tracking-wider block mb-1">
                                LINK MERCADOPAGO DIRECTO (opcional — si lo dejás vacío, se genera automático)
                              </label>
                              <Input
                                type="url"
                                placeholder="https://mpago.la/..."
                                value={form.mpLink}
                                onChange={(e) => setPricingForms(prev => ({
                                  ...prev,
                                  [p.course]: { ...form, mpLink: e.target.value }
                                }))}
                                className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-9 font-inter text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* USD section */}
                        <div className="rounded-lg bg-amber-500/[0.03] border border-amber-500/10 p-3">
                          <p className="font-cinzel text-amber-400 text-xs tracking-wider mb-3 flex items-center gap-2">
                            <DollarSign className="w-3 h-3" />
                            PAGO EN DÓLARES (USD · BINANCE PAY)
                          </p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="font-cinzel text-amber-500/50 text-[10px] tracking-wider block mb-1">
                                MONTO USD
                              </label>
                              <Input
                                type="number"
                                placeholder="25"
                                value={form.usdAmount}
                                onChange={(e) => setPricingForms(prev => ({
                                  ...prev,
                                  [p.course]: { ...form, usdAmount: e.target.value }
                                }))}
                                className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-9 font-inter text-sm"
                              />
                            </div>
                            <div>
                              <label className="font-cinzel text-amber-500/50 text-[10px] tracking-wider block mb-1">
                                PRECIO TACHADO USD (opcional)
                              </label>
                              <Input
                                type="number"
                                placeholder="80"
                                value={form.usdStrike}
                                onChange={(e) => setPricingForms(prev => ({
                                  ...prev,
                                  [p.course]: { ...form, usdStrike: e.target.value }
                                }))}
                                className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-9 font-inter text-sm"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="font-cinzel text-amber-500/50 text-[10px] tracking-wider block mb-1">
                                BINANCE PAY ID (email, teléfono o ID de Binance)
                              </label>
                              <Input
                                type="text"
                                placeholder="olgui@example.com o 123456789"
                                value={form.binanceId}
                                onChange={(e) => setPricingForms(prev => ({
                                  ...prev,
                                  [p.course]: { ...form, binanceId: e.target.value }
                                }))}
                                className="bg-white/5 border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 h-9 font-inter text-sm"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="font-cinzel text-amber-500/50 text-[10px] tracking-wider block mb-1">
                                INSTRUCCIONES CUSTOM (opcional — si lo dejás vacío, se generan automático)
                              </label>
                              <textarea
                                rows={3}
                                placeholder="1. Abrí Binance...&#10;2. Enviá $X USD al...&#10;3. ..."
                                value={form.binanceInstructions}
                                onChange={(e) => setPricingForms(prev => ({
                                  ...prev,
                                  [p.course]: { ...form, binanceInstructions: e.target.value }
                                }))}
                                className="w-full bg-white/5 border border-amber-500/10 text-white placeholder:text-white/20 focus:border-amber-500/40 rounded-md p-2 font-inter text-sm resize-y"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Save button */}
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleSavePricing(p.course)}
                            disabled={savingPricing === p.course}
                            className="gold-btn-glow text-black font-cinzel text-xs tracking-wider border-0 h-9 px-5"
                          >
                            {savingPricing === p.course ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> GUARDANDO...</>
                            ) : (
                              <><DollarSign className="w-4 h-4 mr-2" /> GUARDAR {courseLabel.toUpperCase()}</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── VISITS TAB ─── */}
          <TabsContent value="visits" className="space-y-4">
            {/* Visit stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardContent className="p-3 text-center">
                  <Eye className="w-4 h-4 text-amber-400/60 mx-auto mb-1" />
                  <p className="font-cinzel-decorative text-lg font-bold text-white">{visitStats?.total || 0}</p>
                  <p className="font-cinzel text-amber-500/40 text-[9px] tracking-wider">TOTAL</p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardContent className="p-3 text-center">
                  <Activity className="w-4 h-4 text-green-400/60 mx-auto mb-1" />
                  <p className="font-cinzel-decorative text-lg font-bold text-green-400">{visitStats?.today || 0}</p>
                  <p className="font-cinzel text-amber-500/40 text-[9px] tracking-wider">HOY</p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardContent className="p-3 text-center">
                  <TrendingUp className="w-4 h-4 text-amber-400/60 mx-auto mb-1" />
                  <p className="font-cinzel-decorative text-lg font-bold text-amber-400">{visitStats?.thisWeek || 0}</p>
                  <p className="font-cinzel text-amber-500/40 text-[9px] tracking-wider">SEMANA</p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardContent className="p-3 text-center">
                  <Calendar className="w-4 h-4 text-amber-400/60 mx-auto mb-1" />
                  <p className="font-cinzel-decorative text-lg font-bold text-white">{visitStats?.thisMonth || 0}</p>
                  <p className="font-cinzel text-amber-500/40 text-[9px] tracking-wider">MES</p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardContent className="p-3 text-center">
                  <MapPin className="w-4 h-4 text-amber-400/60 mx-auto mb-1" />
                  <p className="font-cinzel-decorative text-lg font-bold text-white">{visitStats?.uniqueIps || 0}</p>
                  <p className="font-cinzel text-amber-500/40 text-[9px] tracking-wider">ÚNICOS</p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardContent className="p-3 text-center">
                  <Bot className="w-4 h-4 text-red-400/60 mx-auto mb-1" />
                  <p className="font-cinzel-decorative text-lg font-bold text-red-400">{visitStats?.bots || 0}</p>
                  <p className="font-cinzel text-amber-500/40 text-[9px] tracking-wider">BOTS</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* Last 7 days chart */}
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardHeader className="pb-3">
                  <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    VISITAS ÚLTIMOS 7 DÍAS
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {visitStats && visitStats.last7Days.length > 0 ? (
                    <div className="space-y-2">
                      {(() => {
                        const max = Math.max(...visitStats.last7Days.map(d => d.count), 1)
                        return visitStats.last7Days.map(d => (
                          <div key={d.date} className="flex items-center gap-3">
                            <span className="font-inter text-white/40 text-[10px] w-16 shrink-0">
                              {new Date(d.date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                            </span>
                            <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all"
                                style={{ width: `${(d.count / max) * 100}%` }}
                              />
                            </div>
                            <span className="font-cinzel text-amber-400 text-xs w-8 text-right shrink-0">{d.count}</span>
                          </div>
                        ))
                      })()}
                    </div>
                  ) : (
                    <p className="font-inter text-white/20 text-xs text-center py-6">Sin datos todavía</p>
                  )}
                </CardContent>
              </Card>

              {/* Device + Browser breakdown */}
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardHeader className="pb-3">
                  <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-amber-400" />
                    DISPOSITIVOS Y NAVEGADORES
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div>
                    <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mb-2">DISPOSITIVOS</p>
                    <div className="flex flex-wrap gap-2">
                      {visitStats?.byDevice.map(d => {
                        const Icon = d.device === 'mobile' ? Smartphone : d.device === 'tablet' ? Tablet : Monitor
                        const total = visitStats.byDevice.reduce((a, b) => a + b.count, 0) || 1
                        return (
                          <Badge key={d.device} className="bg-white/5 text-white/60 border-white/10 text-[10px]">
                            <Icon className="w-3 h-3 mr-1" />
                            {d.device} · {d.count} ({Math.round((d.count / total) * 100)}%)
                          </Badge>
                        )
                      })}
                      {(!visitStats?.byDevice || visitStats.byDevice.length === 0) && (
                        <p className="font-inter text-white/20 text-[10px]">Sin datos</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mb-2">NAVEGADORES</p>
                    <div className="flex flex-wrap gap-2">
                      {visitStats?.byBrowser.map(b => (
                        <Badge key={b.browser} className="bg-white/5 text-white/60 border-white/10 text-[10px]">
                          <Globe className="w-3 h-3 mr-1" />
                          {b.browser} · {b.count}
                        </Badge>
                      ))}
                      {(!visitStats?.byBrowser || visitStats.byBrowser.length === 0) && (
                        <p className="font-inter text-white/20 text-[10px]">Sin datos</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mb-2">PÁGINAS MÁS VISITADAS</p>
                    <div className="space-y-1">
                      {visitStats?.byPath.map(p => (
                        <div key={p.path} className="flex items-center justify-between text-[10px]">
                          <span className="font-inter text-white/60 truncate">{p.path}</span>
                          <span className="font-cinzel text-amber-400 ml-2">{p.count}</span>
                        </div>
                      ))}
                      {(!visitStats?.byPath || visitStats.byPath.length === 0) && (
                        <p className="font-inter text-white/20 text-[10px]">Sin datos</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent visits list */}
            <Card className="bg-white/[0.02] border-amber-500/[0.08] overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  ÚLTIMAS 50 VISITAS
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#0a0a0a]">
                      <tr className="border-b border-amber-500/10">
                        <th className="text-left p-2 font-cinzel text-amber-500/40 text-[9px] tracking-wider">FECHA</th>
                        <th className="text-left p-2 font-cinzel text-amber-500/40 text-[9px] tracking-wider">RUTA</th>
                        <th className="text-left p-2 font-cinzel text-amber-500/40 text-[9px] tracking-wider">IP</th>
                        <th className="text-left p-2 font-cinzel text-amber-500/40 text-[9px] tracking-wider">DISP</th>
                        <th className="text-left p-2 font-cinzel text-amber-500/40 text-[9px] tracking-wider">NAVEGADOR</th>
                        <th className="text-left p-2 font-cinzel text-amber-500/40 text-[9px] tracking-wider">TIPO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentVisits.map(v => (
                        <tr key={v.id} className="border-b border-amber-500/5 hover:bg-white/[0.01]">
                          <td className="p-2 font-inter text-white/40 text-[10px] whitespace-nowrap">
                            {new Date(v.createdAt + (v.createdAt.includes('Z') ? '' : 'Z')).toLocaleString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-2 font-mono text-white/70 text-[10px] truncate max-w-[180px]">{v.path}</td>
                          <td className="p-2 font-mono text-white/40 text-[10px]">{v.ip || '—'}</td>
                          <td className="p-2">
                            <span className="font-cinzel text-white/60 text-[9px] uppercase">{v.device}</span>
                          </td>
                          <td className="p-2">
                            <span className="font-cinzel text-white/60 text-[9px] uppercase">{v.browser}</span>
                          </td>
                          <td className="p-2">
                            {v.isBot ? (
                              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[8px]">
                                <Bot className="w-2.5 h-2.5 mr-0.5" /> BOT
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[8px]">HUMANO</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {recentVisits.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center">
                            <Eye className="w-8 h-8 text-amber-500/20 mx-auto mb-3" />
                            <p className="font-inter text-white/20 text-xs">No hay visitas registradas todavía</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── EDITOR TAB ─── */}
          <TabsContent value="editor" className="space-y-4">
            {/* Config del límite */}
            <Card className="bg-white/[0.02] border-amber-500/[0.08]">
              <CardHeader className="pb-3">
                <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-amber-400" />
                  LÍMITE DIARIO DEL EDITOR
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
                  <p className="font-inter text-white/60 text-xs leading-relaxed">
                    Este límite aplica a <strong className="text-amber-400">todas las usuarias con acceso al editor</strong>.
                    Vos (admin) siempre tenés uso ilimitado. El contador se reinicia todos los días a la medianoche UTC.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <label className="block font-cinzel text-amber-500/60 text-[10px] tracking-wider mb-1.5">
                      FOTOS POR DÍA POR USUARIA
                    </label>
                    <Input
                      type="text"
                      value={editorLimitInput}
                      onChange={(e) => setEditorLimitInput(e.target.value)}
                      placeholder="20"
                      disabled={savingEditorLimit}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditorLimit() }}
                      className="bg-white/[0.02] border-amber-500/20 text-white font-cinzel text-lg"
                    />
                    <p className="font-inter text-white/30 text-[10px] mt-1.5">
                      Poné un número (ej: 20, 50, 100) o <code className="text-amber-400">unlimited</code> para ilimitado
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveEditorLimit}
                    disabled={savingEditorLimit}
                    className="gold-btn-glow text-black font-cinzel font-bold tracking-wider text-xs h-10 px-6"
                  >
                    {savingEditorLimit ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'GUARDAR'
                    )}
                  </Button>
                </div>

                {editorConfig && (
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-amber-500/10">
                    <div className="text-center">
                      <p className="font-cinzel-decorative text-2xl font-bold text-amber-400">
                        {editorConfig.dailyLimit < 0 ? '∞' : editorConfig.dailyLimit}
                      </p>
                      <p className="font-inter text-white/30 text-[10px] tracking-wider mt-1">LÍMITE ACTUAL</p>
                    </div>
                    <div className="text-center">
                      <p className="font-cinzel-decorative text-2xl font-bold text-amber-400">
                        {editorConfig.stats?.total ?? 0}
                      </p>
                      <p className="font-inter text-white/30 text-[10px] tracking-wider mt-1">TOTAL PROCESADAS</p>
                    </div>
                    <div className="text-center">
                      <p className="font-cinzel-decorative text-2xl font-bold text-amber-400">
                        {editorConfig.stats?.today ?? 0}
                      </p>
                      <p className="font-inter text-white/30 text-[10px] tracking-wider mt-1">HOY</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Por modo */}
            {editorConfig?.stats?.byMode && editorConfig.stats.byMode.length > 0 && (
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardHeader className="pb-3">
                  <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    USO POR MODO
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {editorConfig.stats.byMode.map((m: any) => (
                      <div key={m.mode} className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
                        <span className="font-cinzel text-white text-xs uppercase tracking-wider">{m.mode}</span>
                        <span className="font-cinzel text-amber-400 text-xs">{m.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top usuarias */}
            {editorConfig?.stats?.byUser && editorConfig.stats.byUser.length > 0 && (
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardHeader className="pb-3">
                  <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    TOP USUARIAS (MÁS USO)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {editorConfig.stats.byUser.map((u: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-white/[0.02]">
                        <div className="min-w-0 flex-1">
                          <p className="font-inter text-white text-xs truncate">{u.name || u.email}</p>
                          <p className="font-inter text-white/30 text-[10px] truncate">{u.email}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="font-cinzel text-amber-400 text-sm">{u.count}</p>
                          <p className="font-inter text-white/20 text-[9px]">
                            {u.last_used ? new Date(u.last_used).toLocaleDateString('es-AR') : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cómo activar el editor a una usuaria */}
            <Card className="bg-white/[0.02] border-amber-500/[0.08]">
              <CardHeader className="pb-3">
                <CardTitle className="font-cinzel text-white text-sm tracking-wider flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-amber-400" />
                  CÓMO DAR ACCESO A UNA USUARIA
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="space-y-2 list-decimal list-inside font-inter text-white/60 text-xs">
                  <li>Andá a la pestaña <strong className="text-amber-400">USUARIOS</strong></li>
                  <li>Buscá a la usuaria por email o nombre</li>
                  <li>Hacé click en el botón <strong className="text-emerald-400">"DAR EDITOR"</strong> (verde)</li>
                  <li>La usuaria va a ver el botón <strong className="text-amber-400">"EDITOR DE FOTOS IA"</strong> en su campus</li>
                  <li>Para quitarle el acceso, hacé click en <strong className="text-red-400">"QUITAR"</strong></li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ─── MODAL ELIMINAR USUARIO ─── */}
        {deleteTarget && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !deletingUser && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0a0a0a] border border-red-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>

              <h3 className="font-cinzel-decorative text-white font-bold text-xl mb-2 text-center">
                Eliminar usuario
              </h3>
              <p className="font-inter text-white/60 text-sm mb-4 text-center">
                Vas a eliminar la cuenta <strong className="text-red-400">{deleteTarget.email}</strong>
                {deleteTarget.name && <span> ({deleteTarget.name})</span>}.
                Esta acción <strong className="text-red-400">no se puede deshacer</strong>.
              </p>

              <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3 mb-5">
                <p className="font-inter text-white/50 text-xs mb-1">Se van a borrar:</p>
                <ul className="font-inter text-white/40 text-xs space-y-1 ml-4 list-disc">
                  <li>Su cuenta y datos de acceso</li>
                  <li>Su progreso en todos los cursos</li>
                  <li>Los cursos que tenga activos</li>
                  <li>El acceso al editor de fotos IA</li>
                  <li>El registro de uso del editor</li>
                  <li>Los registros de ventas asociados</li>
                </ul>
              </div>

              <p className="font-inter text-white/60 text-xs mb-2">
                Para confirmar, escribí el email del usuario:
              </p>
              <Input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget.email}
                disabled={deletingUser}
                autoFocus
                className="bg-white/5 border-red-500/20 text-white font-inter mb-4"
                onKeyDown={(e) => { if (e.key === 'Enter' && deleteConfirmText.trim().toLowerCase() === deleteTarget.email.toLowerCase()) handleDeleteUser() }}
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setDeleteTarget(null)
                    setDeleteConfirmText('')
                  }}
                  disabled={deletingUser}
                  variant="ghost"
                  className="flex-1 font-cinzel text-white/60 text-xs hover:text-white/80 tracking-wider border border-white/10"
                >
                  CANCELAR
                </Button>
                <Button
                  onClick={handleDeleteUser}
                  disabled={deletingUser || deleteConfirmText.trim().toLowerCase() !== deleteTarget.email.toLowerCase()}
                  className="flex-1 bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 font-cinzel font-bold text-xs tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {deletingUser ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> ELIMINANDO...</>
                  ) : (
                    <><Trash2 className="w-3 h-3 mr-1" /> ELIMINAR</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
