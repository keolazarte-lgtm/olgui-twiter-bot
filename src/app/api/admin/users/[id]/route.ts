import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, deleteUser, getUserById } from '@/lib/academy-db'

export async function DELETE(
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

    const user = await getUserById(id)
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // No se puede eliminar a un admin
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'No se puede eliminar un usuario administrador' },
        { status: 400 }
      )
    }

    // No se puede eliminar a si mismo (por si acaso)
    if (user.id === payload.id) {
      return NextResponse.json(
        { error: 'No podés eliminar tu propia cuenta' },
        { status: 400 }
      )
    }

    await deleteUser(id)

    return NextResponse.json({
      success: true,
      deletedId: id,
      email: user.email,
    })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
