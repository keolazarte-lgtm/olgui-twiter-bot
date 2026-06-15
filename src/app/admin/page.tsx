'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Crown, Users, Check, X, ArrowLeft, Loader2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

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

export default function AdminPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        router.push('/login')
        return
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Admin load error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (userId: string, currentActive: number) => {
    setTogglingId(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, active: currentActive ? 0 : 1 }),
      })

      if (res.ok) {
        setUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, active: currentActive ? 0 : 1 } : u)
        )
        toast({
          title: currentActive ? 'Usuario desactivado' : 'Usuario activado',
          description: currentActive ? 'El usuario ya no tiene acceso al campus' : 'El usuario ahora tiene acceso al campus',
        })
      }
    } catch (error) {
      console.error('Toggle error:', error)
    } finally {
      setTogglingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  const activeUsers = users.filter(u => u.active === 1)
  const inactiveUsers = users.filter(u => u.active === 0)

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="border-b border-amber-500/10 bg-[#050505]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/campus')}
              variant="ghost"
              className="text-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10 h-9 px-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="font-cinzel text-xs tracking-wider">CAMPUS</span>
            </Button>
            <div className="w-px h-6 bg-amber-500/10" />
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h1 className="font-cinzel text-white font-semibold text-sm tracking-wider">
                ADMIN PANEL
              </h1>
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

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'TOTAL', value: users.length, color: 'text-white' },
            { label: 'ACTIVOS', value: activeUsers.length, color: 'text-amber-400' },
            { label: 'PENDIENTES', value: inactiveUsers.length, color: 'text-red-400' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-white/[0.02] border-amber-500/[0.08]">
                <CardContent className="p-4 text-center">
                  <p className={`font-cinzel-decorative text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="font-cinzel text-amber-500/40 text-[10px] tracking-wider mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Users table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/[0.02] border-amber-500/[0.08] overflow-hidden">
            <div className="p-4 border-b border-amber-500/10 flex items-center justify-between">
              <h2 className="font-cinzel text-white font-semibold text-sm tracking-wider">
                <Users className="w-4 h-4 inline mr-2 text-amber-400" />
                USUARIOS
              </h2>
              <Button
                onClick={loadUsers}
                variant="ghost"
                className="text-amber-500/40 hover:text-amber-400 text-xs font-cinzel tracking-wider h-8"
              >
                ACTUALIZAR
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-amber-500/10">
                    <th className="text-left p-3 font-cinzel text-amber-500/40 text-[10px] tracking-wider">USUARIO</th>
                    <th className="text-left p-3 font-cinzel text-amber-500/40 text-[10px] tracking-wider hidden sm:table-cell">TELÉFONO</th>
                    <th className="text-left p-3 font-cinzel text-amber-500/40 text-[10px] tracking-wider">ESTADO</th>
                    <th className="text-left p-3 font-cinzel text-amber-500/40 text-[10px] tracking-wider hidden md:table-cell">PAGO</th>
                    <th className="text-right p-3 font-cinzel text-amber-500/40 text-[10px] tracking-wider">ACCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-amber-500/5 hover:bg-white/[0.01]">
                      <td className="p-3">
                        <div className="min-w-0">
                          <p className="font-inter text-white text-xs font-medium truncate">
                            {user.name || 'Sin nombre'}
                          </p>
                          <p className="font-inter text-white/30 text-[10px] truncate">{user.email}</p>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className="font-inter text-white/30 text-xs">{user.phone || '—'}</span>
                      </td>
                      <td className="p-3">
                        {user.active ? (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                            <Check className="w-3 h-3 mr-1" />
                            ACTIVO
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                            <X className="w-3 h-3 mr-1" />
                            PENDIENTE
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <span className="font-inter text-white/20 text-[10px]">
                          {user.mpPaymentId || 'Sin pago'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          onClick={() => handleToggleActive(user.id, user.active)}
                          disabled={togglingId === user.id}
                          size="sm"
                          className={`font-cinzel text-[10px] tracking-wider h-7 px-3 ${
                            user.active
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          {togglingId === user.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : user.active ? (
                            'DESACTIVAR'
                          ) : (
                            'ACTIVAR'
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="p-8 text-center">
                <Users className="w-8 h-8 text-amber-500/20 mx-auto mb-3" />
                <p className="font-inter text-white/20 text-xs">No hay usuarios registrados</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Seed button */}
        <div className="mt-6">
          <Button
            onClick={async () => {
              try {
                const res = await fetch('/api/seed', { method: 'POST' })
                const data = await res.json()
                if (data.success) {
                  toast({ title: 'Base de datos inicializada', description: `${data.modules.modules} módulos, ${data.modules.lessons} lecciones` })
                }
              } catch {
                toast({ title: 'Error al inicializar', variant: 'destructive' })
              }
            }}
            className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 font-cinzel text-xs tracking-wider"
          >
            <Shield className="w-4 h-4 mr-2" />
            INICIALIZAR BD (SEED)
          </Button>
        </div>
      </main>
    </div>
  )
}
