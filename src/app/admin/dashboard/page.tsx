'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Users, Check, X, Loader2, Shield, BookOpen, Crown,
  LayoutDashboard, UserCheck, UserX, RefreshCw, Search,
  ChevronDown, Calendar, Mail, ToggleLeft, ToggleRight,
  DollarSign, TrendingUp, ArrowUpRight, Banknote, Plus, UserCircle
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
  const { toast } = useToast()

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [statsRes, usersRes, modulesRes, salesRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/modules'),
        fetch('/api/admin/sales'),
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
    if (tab && ['overview', 'users', 'modules', 'sales'].includes(tab)) {
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
          prev.map(u => u.id === userId ? { ...u, active: data.user.active } : u)
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
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-white/20" />
                            <span className="font-inter text-white/30 text-xs">{formatDate(u.createdAt)}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {u.role === 'admin' ? (
                            <span className="font-inter text-white/20 text-[10px]">Protegido</span>
                          ) : (
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
                        <span className="font-inter text-white/25 text-[10px]">{formatDate(u.createdAt)}</span>
                      </div>
                      {u.role !== 'admin' && (
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
        </Tabs>
      </motion.div>
    </div>
  )
}
