import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import {
  initSchema,
  getEditorDailyLimit,
  setEditorDailyLimit,
  getEditorStats,
} from '@/lib/academy-db'

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

    const [dailyLimit, stats] = await Promise.all([
      getEditorDailyLimit(),
      getEditorStats(),
    ])

    return NextResponse.json({
      dailyLimit,
      stats,
    })
  } catch (error) {
    console.error('Admin editor config GET error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { dailyLimit } = body

    if (dailyLimit === undefined || dailyLimit === null) {
      return NextResponse.json({ error: 'dailyLimit requerido' }, { status: 400 })
    }

    // Accept number or 'unlimited' / -1
    let limit: number
    if (typeof dailyLimit === 'string' && (dailyLimit === 'unlimited' || dailyLimit === '∞')) {
      limit = -1
    } else {
      limit = Number(dailyLimit)
      if (isNaN(limit) || limit < -1) {
        return NextResponse.json({ error: 'dailyLimit debe ser un número >= 0 o -1 (ilimitado)' }, { status: 400 })
      }
    }

    const updated = await setEditorDailyLimit(limit)

    return NextResponse.json({
      success: true,
      dailyLimit: updated,
    })
  } catch (error) {
    console.error('Admin editor config PATCH error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
