import { NextRequest, NextResponse } from 'next/server'
import { initSchema, createUser, getUserByEmail } from '@/lib/academy-db'
import { hashPassword, createToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    await initSchema()

    // Check if user already exists
    const existing = await getUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const user = await createUser({
      email,
      passwordHash,
      name: name || undefined,
      phone: phone || undefined,
      role: 'student',
      active: 0,
    })

    const token = await createToken({
      id: user.id as string,
      email: user.email as string,
      role: user.role as string,
      active: user.active as number,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
      }
    })

    response.cookies.set('da_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Error al registrar' }, { status: 500 })
  }
}
