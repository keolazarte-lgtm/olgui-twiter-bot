import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, getAllSales, getSalesStats, recordSale, getUserById } from '@/lib/academy-db'

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

    const [sales, stats] = await Promise.all([
      getAllSales(),
      getSalesStats(),
    ])

    return NextResponse.json({
      sales: sales.map(s => ({
        id: s.id,
        userId: s.user_id,
        userEmail: s.user_email,
        userName: s.user_name,
        amount: s.amount,
        currency: s.currency,
        mpPaymentId: s.mp_payment_id,
        status: s.status,
        createdAt: s.created_at,
      })),
      stats,
    })
  } catch (error) {
    console.error('Admin sales error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('da_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, amount, currency, mpPaymentId, status } = body

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Usuario y monto son requeridos' }, { status: 400 })
    }

    await initSchema()

    // Get user info to store with the sale
    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const sale = await recordSale({
      userId,
      userEmail: user.email as string,
      userName: user.name as string | null,
      amount: Number(amount),
      currency: currency || 'ARS',
      mpPaymentId: mpPaymentId || null,
      status: status || 'approved',
    })

    return NextResponse.json({
      sale: {
        id: (sale as any).id,
        userId: (sale as any).user_id,
        userEmail: (sale as any).user_email,
        userName: (sale as any).user_name,
        amount: (sale as any).amount,
        currency: (sale as any).currency,
        mpPaymentId: (sale as any).mp_payment_id,
        status: (sale as any).status,
        createdAt: (sale as any).created_at,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Create sale error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
