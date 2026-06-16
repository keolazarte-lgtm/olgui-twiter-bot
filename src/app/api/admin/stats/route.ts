import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, getAllUsers, getModulesWithLessons } from '@/lib/academy-db'

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

    const users = await getAllUsers()
    const modules = await getModulesWithLessons()

    const totalUsers = users.length
    const activeUsers = users.filter(u => u.active === 1).length
    const inactiveUsers = users.filter(u => u.active === 0).length
    const totalModules = modules.length
    const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalModules,
        totalLessons,
      }
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
