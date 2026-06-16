'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, Users, BookOpen, LogOut, LayoutDashboard,
  Menu, X, Loader2, Shield, ChevronRight, DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'

// Admin auth context
interface AdminUser {
  id: string
  email: string
  name: string | null
  role: string
  active: number
}

interface AdminContextType {
  user: AdminUser | null
  loading: boolean
  logout: () => void
}

const AdminContext = createContext<AdminContextType>({
  user: null,
  loading: true,
  logout: () => {},
})

export const useAdmin = () => useContext(AdminContext)

// Sidebar navigation items
const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
  { label: 'Ventas', icon: DollarSign, href: '/admin/dashboard?tab=sales' },
  { label: 'Usuarios', icon: Users, href: '/admin/dashboard?tab=users' },
  { label: 'Módulos', icon: BookOpen, href: '/admin/dashboard?tab=modules' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Skip layout for login page
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isLoginPage) {
      // For login page, check if already logged in as admin
      checkAdmin()
      return
    }

    checkAdmin()
  }, [isLoginPage])

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        if (!isLoginPage) {
          router.push('/admin/login')
        }
        return
      }

      const data = await res.json()

      if (data.user?.role !== 'admin') {
        if (!isLoginPage) {
          router.push('/admin/login')
        }
        return
      }

      setUser(data.user)

      // If on login page and already admin, redirect to dashboard
      if (isLoginPage) {
        router.push('/admin/dashboard')
      }
    } catch (error) {
      console.error('Admin auth check error:', error)
      if (!isLoginPage) {
        router.push('/admin/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } catch {
      // Fallback: try to clear cookie manually (won't work for httpOnly but doesn't hurt)
      document.cookie = 'da_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
    // Clear user state immediately
    setUser(null)
    // Force a full page reload to ensure the cookie is properly cleared
    // and the middleware re-checks auth on the server side
    window.location.href = '/admin/login'
  }

  // Login page - no sidebar layout
  if (isLoginPage) {
    return <>{children}</>
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="font-cinzel text-amber-400/60 text-xs tracking-wider">VERIFICANDO ACCESO...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return null
  }

  return (
    <AdminContext.Provider value={{ user, loading, logout: handleLogout }}>
      <div className="min-h-screen bg-[#050505] flex">
        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-amber-500/10 flex flex-col transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-amber-500/10">
            <div className="flex items-center gap-3">
              <Image
                src="/dinasty-crest-v3.png"
                alt="Dinasty Academy"
                width={36}
                height={36}
              />
              <div>
                <h1 className="font-cinzel-decorative text-white font-bold text-sm">
                  <span className="gold-text">DINASTY</span>
                </h1>
                <p className="font-cinzel text-amber-500/40 text-[9px] tracking-[0.25em]">ADMIN PANEL</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href.split('?')[0] ||
                (item.href.includes('?tab=') && typeof window !== 'undefined' && window.location.search === item.href.split(pathname)[1])

              return (
                <button
                  key={item.label}
                  onClick={() => {
                    router.push(item.href)
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-cinzel text-xs tracking-wider transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-white/25'}`} />
                  <span className="flex-1 text-left">{item.label.toUpperCase()}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-amber-500/50" />}
                </button>
              )
            })}
          </nav>

          {/* Admin User Info */}
          <div className="p-3 border-t border-amber-500/10">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-cinzel text-white text-xs truncate">{user.name || 'Admin'}</p>
                <p className="font-inter text-amber-500/40 text-[10px] truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-cinzel text-xs tracking-wider text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>CERRAR SESIÓN</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar (Mobile) */}
          <header className="lg:hidden border-b border-amber-500/10 bg-[#0a0a0a]/90 backdrop-blur-md sticky top-0 z-30">
            <div className="px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-amber-500/50 hover:text-amber-400 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="font-cinzel text-white text-xs tracking-wider">ADMIN</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-red-400/50 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  )
}
