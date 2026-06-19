import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, toggleUserEditorAccess, getUserById } from '@/lib/academy-db'

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

    await initSchema()

    const currentUser = await getUserById(id)
    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const newAccess = currentUser.editor_access === 1 ? 0 : 1
    const updatedUser = await toggleUserEditorAccess(id, newAccess)

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        name: updatedUser?.name,
        editorAccess: Boolean(updatedUser?.editor_access),
      }
    })
  } catch (error) {
    console.error('Admin editor-access toggle error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
