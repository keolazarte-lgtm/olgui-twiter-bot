import Link from 'next/link'
import { Crown, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Crown className="w-10 h-10 text-amber-400" />
        </div>
        <p className="font-cinzel-decorative text-6xl font-bold gold-text mb-4">404</p>
        <h1 className="font-cinzel text-amber-400/80 text-xl tracking-widest mb-3">
          PÁGINA NO ENCONTRADA
        </h1>
        <p className="font-inter text-white/50 text-sm mb-8">
          La página que buscás no existe o fue movida. Volvé a la home para continuar.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 gold-btn-glow text-black font-cinzel font-bold tracking-wider text-xs px-6 py-3 rounded-lg no-underline">
          <ArrowLeft className="w-4 h-4" />
          VOLVER A LA HOME
        </Link>
      </div>
    </div>
  )
}
