import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, getUserById, getUserCourseAccess } from '@/lib/academy-db'

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

    // Get fresh user data from DB
    const user = await getUserById(payload.id)
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Si es admin, tiene acceso a todos los cursos
    let courseAccess = { onlyfans: false, reddit: false, hombres: false, fetiches: false }
    if (user.role === 'admin') {
      courseAccess = { onlyfans: true, reddit: true, hombres: true, fetiches: true }
    } else {
      courseAccess = await getUserCourseAccess(user.id)
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        active: user.active,
        editorAccess: Boolean(user.editor_access),
        courseAccess,
        mpPaymentId: user.mp_payment_id,
        createdAt: user.created_at,
      }
    })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 })
  }
}
