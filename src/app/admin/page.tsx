'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function AdminRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard (layout will handle auth check)
    router.replace('/admin/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-4" />
        <p className="font-cinzel text-amber-400/60 text-xs tracking-wider">REDIRIGIENDO...</p>
      </div>
    </div>
  )
}
