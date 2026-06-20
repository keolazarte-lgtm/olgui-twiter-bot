import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, setUserRole, getUserById } from '@/lib/academy-db'

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
    const { role } = body

    if (!role || !['admin', 'student'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido (debe ser "admin" o "student")' }, { status: 400 })
    }

    await initSchema()

    const currentUser = await getUserById(id)
    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Evitar que el admin se quite el rol a sí mismo (para no quedarse sin acceso admin)
    if (currentUser.id === payload.id && role !== 'admin') {
      return NextResponse.json(
        { error: 'No podés quitarte el rol admin a vos mismo' },
        { status: 400 }
      )
    }

    const updatedUser = await setUserRole(id, role)

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        name: updatedUser?.name,
        role: updatedUser?.role,
        active: updatedUser?.active,
        editorAccess: Boolean(updatedUser?.editor_access),
      }
    })
  } catch (error) {
    console.error('Admin role change error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
