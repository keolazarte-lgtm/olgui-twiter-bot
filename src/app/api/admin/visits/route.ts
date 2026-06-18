import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, getVisitStats, getRecentVisits } from '@/lib/academy-db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('da_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    await initSchema()

    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)

    const [stats, recent] = await Promise.all([
      getVisitStats(),
      getRecentVisits(limit),
    ])

    return NextResponse.json({ stats, recent })
  } catch (error) {
    console.error('Admin visits error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
