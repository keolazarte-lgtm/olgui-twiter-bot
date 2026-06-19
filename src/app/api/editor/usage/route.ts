import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, getEditorUsageToday, EDITOR_DAILY_LIMIT, getUserById } from '@/lib/academy-db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('da_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    await initSchema()

    const user = await getUserById(payload.id)
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const isAdmin = user.role === 'admin'
    const usedToday = isAdmin ? 0 : await getEditorUsageToday(user.id)
    const remaining = isAdmin ? EDITOR_DAILY_LIMIT : Math.max(0, EDITOR_DAILY_LIMIT - usedToday)

    return NextResponse.json({
      hasAccess: Boolean(user.editor_access) || isAdmin,
      usedToday,
      remaining: isAdmin ? '∞' : remaining,
      limit: isAdmin ? '∞' : EDITOR_DAILY_LIMIT,
    })
  } catch (error) {
    console.error('Editor usage error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
