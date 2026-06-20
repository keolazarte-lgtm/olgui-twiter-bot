import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, setUserCourseAccess, getUserById, getUserCourseAccess, VALID_COURSES } from '@/lib/academy-db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('da_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    await initSchema()
    const access = await getUserCourseAccess(id)
    return NextResponse.json({ access })
  } catch (error) {
    console.error('Course access GET error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('da_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    const body = await request.json()
    const { course, active } = body

    if (!course || !VALID_COURSES.includes(course)) {
      return NextResponse.json(
        { error: `Curso inválido. Debe ser uno de: ${VALID_COURSES.join(', ')}` },
        { status: 400 }
      )
    }

    if (typeof active !== 'boolean') {
      return NextResponse.json({ error: 'active debe ser true o false' }, { status: 400 })
    }

    await initSchema()

    const currentUser = await getUserById(id)
    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const access = await setUserCourseAccess(id, course, active)

    return NextResponse.json({
      success: true,
      course,
      active,
      access,
    })
  } catch (error) {
    console.error('Course access PATCH error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
